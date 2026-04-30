'use strict';

const crypto = require('crypto');
const db = require('../../models');

const CREDIT_STATUSES = ['processing', 'credited'];
const GATED_SOURCES = new Set(['payshap_inbound', 'payshap_rpp_callback', 'h2h_statement_trf']);

const logger = {
  info:  (...a) => console.log('[InboundCreditEvent]', ...a),
  warn:  (...a) => console.warn('[InboundCreditEvent]', ...a),
  error: (...a) => console.error('[InboundCreditEvent]', ...a),
};

function sha(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function toAmountCents(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function normalizeReference(referenceNumber) {
  const raw = String(referenceNumber || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (/^0[6-8]\d{8}$/.test(digits)) {
    return `+27${digits.slice(1)}`;
  }
  if (/^27[6-8]\d{8}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^[6-8]\d{8}$/.test(digits)) {
    return `+27${digits}`;
  }

  return raw.toUpperCase().replace(/\s+/g, ' ').slice(0, 128);
}

function buildReconciliationKey({ referenceNumber, amount, currency }) {
  const normalizedReference = normalizeReference(referenceNumber);
  const amountCents = toAmountCents(amount);
  const normalizedCurrency = String(currency || 'ZAR').toUpperCase();
  return {
    normalizedReference,
    amountCents,
    reconciliationKey: `SBSA-IN-${sha(`${normalizedReference}|${amountCents}|${normalizedCurrency}`).slice(0, 48)}`,
  };
}

function buildSourceFingerprint({ sourceType, transactionId, statementTransactionId, sourceReference, referenceNumber, amount, currency }) {
  const type = String(sourceType || 'unknown').toLowerCase();
  const strongestId = transactionId || statementTransactionId || sourceReference;
  if (strongestId) {
    return `SBSA-SRC-${sha(`${type}|${strongestId}`).slice(0, 48)}`;
  }

  const { normalizedReference, amountCents } = buildReconciliationKey({ referenceNumber, amount, currency });
  return `SBSA-SRC-${sha(`${type}|${normalizedReference}|${amountCents}|${currency || 'ZAR'}`).slice(0, 48)}`;
}

function buildClaim(payload = {}) {
  const event = payload.inboundCreditEvent || {};
  const sourceType = event.sourceType || payload.source;
  if (!GATED_SOURCES.has(sourceType)) {
    return { gated: false };
  }

  const transactionId = payload.transactionId || payload.transaction_id || payload.id;
  const referenceNumber = payload.referenceNumber || payload.reference_number || payload.reference || payload.cid;
  const amount = Number(payload.amount || (payload.amountCents ? Number(payload.amountCents) / 100 : 0));
  const currency = String(payload.currency || payload.currencyCode || 'ZAR').toUpperCase();
  const { normalizedReference, amountCents, reconciliationKey } = buildReconciliationKey({ referenceNumber, amount, currency });
  const sourceFingerprint = event.sourceFingerprint || buildSourceFingerprint({
    sourceType,
    transactionId,
    statementTransactionId: event.statementTransactionId,
    sourceReference: event.sourceReference,
    referenceNumber,
    amount,
    currency,
  });

  return {
    gated: true,
    sourceType,
    transactionId,
    referenceNumber,
    normalizedReference,
    amount,
    amountCents,
    currency,
    sourceFingerprint,
    reconciliationKey,
    canonicalFingerprint: event.canonicalFingerprint || `SBSA-EVT-${sha(sourceFingerprint).slice(0, 48)}`,
    sourceReference: event.sourceReference || transactionId || referenceNumber,
    statementRunId: event.statementRunId ? String(event.statementRunId) : null,
    statementTransactionId: event.statementTransactionId || null,
    valueDate: event.valueDate || null,
    rawPayload: event.rawPayload || payload,
    metadata: event.metadata || {},
  };
}

async function findEventBySource(sourceFingerprint, options = {}) {
  const source = await db.SBSAInboundCreditEventSource.findOne({
    where: { sourceFingerprint },
    transaction: options.transaction,
  });
  if (!source) return null;

  const event = await db.SBSAInboundCreditEvent.findByPk(source.eventId, {
    transaction: options.transaction,
    lock: options.lock,
  });
  return { event, source };
}

async function recordSource(event, claim, status, options = {}) {
  try {
    await db.SBSAInboundCreditEventSource.create(
      {
        eventId: event.id,
        sourceType: claim.sourceType,
        sourceFingerprint: claim.sourceFingerprint,
        sourceTransactionId: claim.transactionId || null,
        sourceReference: claim.sourceReference || null,
        statementRunId: claim.statementRunId || null,
        statementTransactionId: claim.statementTransactionId || null,
        valueDate: claim.valueDate || null,
        status,
        rawPayload: claim.rawPayload || {},
        metadata: claim.metadata || {},
      },
      { transaction: options.transaction }
    );
  } catch (err) {
    if (err.name !== 'SequelizeUniqueConstraintError') {
      throw err;
    }
  }
}

async function claimOrDuplicate(payload) {
  const claim = buildClaim(payload);
  if (!claim.gated) {
    return { action: 'process_without_gate', claim };
  }

  if (!claim.referenceNumber || !claim.amountCents || claim.amountCents <= 0) {
    return { action: 'suspense', claim, reason: 'invalid_claim' };
  }

  const tx = await db.sequelize.transaction();
  try {
    const sourceMatch = await findEventBySource(claim.sourceFingerprint, {
      transaction: tx,
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
    });
    if (sourceMatch?.event) {
      await tx.commit();
      return { action: 'duplicate', claim, event: sourceMatch.event, reason: 'source_replay' };
    }

    const reconciliationMatch = await db.SBSAInboundCreditEvent.findOne({
      where: {
        reconciliationKey: claim.reconciliationKey,
        status: { [db.Sequelize.Op.in]: CREDIT_STATUSES },
      },
      transaction: tx,
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
    });

    if (reconciliationMatch) {
      await recordSource(reconciliationMatch, claim, 'duplicate', { transaction: tx });
      await tx.commit();
      return { action: 'duplicate', claim, event: reconciliationMatch, reason: 'reconciliation_key_claimed' };
    }

    let event;
    try {
      event = await db.SBSAInboundCreditEvent.create(
        {
          canonicalFingerprint: claim.canonicalFingerprint,
          reconciliationKey: claim.reconciliationKey,
          status: 'processing',
          referenceNumber: claim.referenceNumber,
          normalizedReference: claim.normalizedReference,
          amount: claim.amount,
          amountCents: claim.amountCents,
          currency: claim.currency,
          firstSource: claim.sourceType,
          metadata: { claim: claim.metadata || {} },
        },
        { transaction: tx }
      );
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError') {
        throw err;
      }
      event = await db.SBSAInboundCreditEvent.findOne({
        where: { reconciliationKey: claim.reconciliationKey },
        transaction: tx,
        lock: db.Sequelize.Transaction.LOCK.UPDATE,
      });
      await recordSource(event, claim, 'duplicate', { transaction: tx });
      await tx.commit();
      return { action: 'duplicate', claim, event, reason: 'concurrent_reconciliation_claim' };
    }

    await recordSource(event, claim, 'primary', { transaction: tx });
    await tx.commit();
    return { action: 'process', claim, event };
  } catch (err) {
    await tx.rollback();
    logger.error('Inbound credit claim failed', { error: err.message, sourceType: claim.sourceType });
    throw err;
  }
}

async function markCredited(eventId, details) {
  if (!eventId) return;
  await db.SBSAInboundCreditEvent.update(
    {
      status: 'credited',
      accountType: details.accountType || null,
      accountId: details.accountId || null,
      userId: details.userId || null,
      walletId: details.walletId || null,
      creditedStandardBankTransactionId: details.standardBankTransactionId || null,
      creditedWalletTransactionId: details.walletTransactionId || null,
      journalReference: details.journalReference || null,
      processedAt: new Date(),
      metadata: details.metadata || {},
    },
    { where: { id: eventId } }
  );
}

async function markSuspense(eventId, details = {}) {
  if (!eventId) return;
  await db.SBSAInboundCreditEvent.update(
    {
      status: 'suspense',
      accountType: details.accountType || 'unallocated',
      metadata: details.metadata || {},
      processedAt: new Date(),
    },
    { where: { id: eventId } }
  );
}

async function markFailed(eventId, error) {
  if (!eventId) return;
  await db.SBSAInboundCreditEvent.update(
    {
      status: 'failed',
      metadata: { error: error?.message || String(error) },
      processedAt: new Date(),
    },
    { where: { id: eventId } }
  );
}

module.exports = {
  buildClaim,
  buildReconciliationKey,
  buildSourceFingerprint,
  claimOrDuplicate,
  markCredited,
  markSuspense,
  markFailed,
  normalizeReference,
};
