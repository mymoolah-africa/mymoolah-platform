'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../models');
const ledgerService = require('../ledgerService');
const { OttClient, redact } = require('./ottClient');

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function isEnabled() {
  return String(process.env.OTT_PAYOUT_ENABLED || '').toLowerCase() === 'true';
}

function requireEnabled() {
  if (!isEnabled()) {
    const err = new Error('OTT Payout is not enabled');
    err.statusCode = 403;
    err.code = 'OTT_PAYOUT_DISABLED';
    throw err;
  }
}

function getConfiguredFee(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    const err = new Error(`${name} is required before OTT Payout can debit wallets`);
    err.statusCode = 500;
    err.code = 'OTT_FEE_CONFIG_MISSING';
    throw err;
  }
  const amount = roundMoney(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    const err = new Error(`${name} must be a non-negative amount`);
    err.statusCode = 500;
    err.code = 'OTT_FEE_CONFIG_INVALID';
    throw err;
  }
  return amount;
}

function calculateFees() {
  const providerFeeAmount = getConfiguredFee('OTT_PAYOUT_PROVIDER_FEE_ZAR');
  const mmtpFeeAmount = getConfiguredFee('OTT_PAYOUT_MM_FEE_ZAR');
  return {
    providerFeeAmount,
    mmtpFeeAmount,
  };
}

function sanitizeText(value, max = 80) {
  return String(value || '')
    .replace(/[^\w\s\-.,/()+]/g, '')
    .trim()
    .slice(0, max);
}

function last4(value) {
  return String(value || '').replace(/\D/g, '').slice(-4) || null;
}

function maskName(firstName, surname) {
  const raw = `${firstName || ''} ${surname || ''}`.trim();
  if (!raw) return null;
  return raw
    .split(/\s+/)
    .map((part) => `${part.slice(0, 1)}***`)
    .join(' ');
}

function normalizeProviderStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (['completed', 'success', 'successful', 'paid', 'processed'].includes(normalized)) return 'completed';
  if (['failed', 'declined', 'rejected', 'error'].includes(normalized)) return 'failed';
  if (['reversed', 'refunded'].includes(normalized)) return 'reversed';
  if (['cancelled', 'canceled', 'expired'].includes(normalized)) return 'cancelled';
  if (['accepted', 'processing', 'pending', 'submitted'].includes(normalized)) return 'processing';
  return 'processing';
}

function extractProviderRefs(data = {}) {
  return {
    ottPaymentReference: data.paymentReference || data.payment_reference || data.ottPaymentReference || data.transactionId || null,
    providerTransactionReference: data.providerTransactionReference || data.provider_reference || data.providerRef || null,
    status: normalizeProviderStatus(data.status || data.Status || data.transactionStatus || data.responseStatus),
  };
}

function buildPayoutPayload({ payment, request }) {
  return {
    uniqueReferenceId: payment.uniqueReferenceId,
    provider_providerCode: request.providerCode,
    amount: roundMoney(payment.amount).toFixed(2),
    mobile: request.mobile,
    accountName: sanitizeText(request.accountName || `${request.firstName || ''} ${request.surname || ''}`.trim(), 120),
    accountNumber: request.accountNumber || '',
    bankId: request.bankId || '',
    branchCode: request.branchCode || '',
    branchName: sanitizeText(request.branchName, 80),
    countryOfIssue: request.countryOfIssue || 'ZA',
    middleName: sanitizeText(request.middleName, 80),
    nationality: request.nationality || 'ZA',
    surname: sanitizeText(request.surname, 80),
    swiftCode: request.swiftCode || '',
  };
}

function buildOttPayoutLedgerLines({
  amount,
  providerFeeAmount,
  mmtpFeeAmount,
  clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01',
  ottFloatCode = process.env.LEDGER_ACCOUNT_OTT_FLOAT || '1200-10-08',
  feeRevenueCode = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE || '4000-20-01',
  vatControlCode = process.env.LEDGER_ACCOUNT_VAT_CONTROL || '2300-10-01',
  vatRate = Number(process.env.VAT_RATE || 0.15),
} = {}) {
  const principal = roundMoney(amount);
  const providerFee = roundMoney(providerFeeAmount);
  const mmtpFee = roundMoney(mmtpFeeAmount);
  const totalDebit = roundMoney(principal + providerFee + mmtpFee);
  const lines = [
    { accountCode: clientFloatCode, dc: 'debit', amount: totalDebit, memo: 'OTT payout wallet debit' },
    { accountCode: ottFloatCode, dc: 'credit', amount: roundMoney(principal + providerFee), memo: 'OTT payout principal and provider pass-through fee' },
  ];

  if (mmtpFee > 0) {
    const feeExVat = roundMoney(mmtpFee / (1 + vatRate));
    const vatAmount = roundMoney(mmtpFee - feeExVat);
    lines.push({ accountCode: feeRevenueCode, dc: 'credit', amount: feeExVat, memo: 'OTT payout MMTP fee revenue ex-VAT' });
    if (vatAmount > 0) {
      lines.push({ accountCode: vatControlCode, dc: 'credit', amount: vatAmount, memo: 'OTT payout MMTP fee output VAT' });
    }
  }

  return lines;
}

function reverseLedgerLines(lines) {
  return lines.map((line) => ({
    ...line,
    dc: line.dc === 'debit' ? 'credit' : 'debit',
    memo: `REVERSAL: ${line.memo || ''}`.trim(),
  }));
}

function toSafePayout(payment) {
  if (!payment) return null;
  const plain = typeof payment.toJSON === 'function' ? payment.toJSON() : payment;
  return {
    payoutId: plain.payoutId,
    uniqueReferenceId: plain.uniqueReferenceId,
    status: plain.status,
    amount: plain.amount,
    providerFeeAmount: plain.providerFeeAmount,
    mmtpFeeAmount: plain.mmtpFeeAmount,
    totalDebit: plain.totalDebit,
    currency: plain.currency,
    providerCode: plain.providerCode,
    recipientMobileLast4: plain.recipientMobileLast4,
    recipientNameMasked: plain.recipientNameMasked,
    accountNumberLast4: plain.accountNumberLast4,
    branchCode: plain.branchCode,
    reference: plain.reference,
    ottPaymentReference: plain.ottPaymentReference,
    providerTransactionReference: plain.providerTransactionReference,
    rejectionReason: plain.rejectionReason,
    processedAt: plain.processedAt,
    reversedAt: plain.reversedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

async function quoteOttPayout({ amount, providerCode }) {
  requireEnabled();
  const numericAmount = roundMoney(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const err = new Error('Amount must be greater than zero');
    err.statusCode = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }
  if (!providerCode) {
    const err = new Error('Provider code is required');
    err.statusCode = 400;
    err.code = 'PROVIDER_REQUIRED';
    throw err;
  }
  const fees = calculateFees();
  return {
    amount: numericAmount,
    providerCode,
    currency: 'ZAR',
    providerFeeAmount: fees.providerFeeAmount,
    mmtpFeeAmount: fees.mmtpFeeAmount,
    totalDebit: roundMoney(numericAmount + fees.providerFeeAmount + fees.mmtpFeeAmount),
    feePolicy: {
      source: 'environment',
      providerFeeEnv: 'OTT_PAYOUT_PROVIDER_FEE_ZAR',
      mmtpFeeEnv: 'OTT_PAYOUT_MM_FEE_ZAR',
    },
  };
}

async function getWalletForUser(userId, transaction) {
  const wallet = await db.Wallet.findOne({
    where: { userId },
    lock: transaction ? db.Sequelize.Transaction.LOCK.UPDATE : undefined,
    transaction,
  });
  if (!wallet) {
    const err = new Error('Wallet not found');
    err.statusCode = 404;
    err.code = 'WALLET_NOT_FOUND';
    throw err;
  }
  return wallet;
}

async function postLedger(payment) {
  const lines = buildOttPayoutLedgerLines({
    amount: payment.amount,
    providerFeeAmount: payment.providerFeeAmount,
    mmtpFeeAmount: payment.mmtpFeeAmount,
  });
  const entry = await ledgerService.postJournalEntry({
    reference: `OTT-PAYOUT-${payment.payoutId}`,
    description: `OTT payout: ${payment.payoutId}`,
    lines,
  });
  await payment.update({
    metadata: {
      ...(payment.metadata || {}),
      ledgerPostedAt: new Date().toISOString(),
      ledgerReference: `OTT-PAYOUT-${payment.payoutId}`,
    },
  });
  return entry;
}

async function postReversalLedger(payment, reason) {
  if (!payment.metadata?.ledgerPostedAt) return null;
  const originalLines = buildOttPayoutLedgerLines({
    amount: payment.amount,
    providerFeeAmount: payment.providerFeeAmount,
    mmtpFeeAmount: payment.mmtpFeeAmount,
  });
  const entry = await ledgerService.postJournalEntry({
    reference: `OTT-PAYOUT-REV-${payment.payoutId}`,
    description: `OTT payout reversal: ${payment.payoutId} - ${reason}`,
    lines: reverseLedgerLines(originalLines),
  });
  await payment.update({
    metadata: {
      ...(payment.metadata || {}),
      reversalLedgerPostedAt: new Date().toISOString(),
      reversalLedgerReference: `OTT-PAYOUT-REV-${payment.payoutId}`,
    },
  });
  return entry;
}

async function reverseWalletDebit(payment, reason) {
  const txn = await db.sequelize.transaction();
  let committed = false;
  try {
    const wallet = await db.Wallet.findOne({
      where: { walletId: payment.walletId },
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
      transaction: txn,
    });
    if (!wallet) throw new Error('Wallet not found for OTT payout reversal');
    await wallet.credit(payment.totalDebit, 'credit', { transaction: txn });
    await db.Transaction.create({
      transactionId: `OTT-REV-${payment.payoutId}`.slice(0, 50),
      userId: payment.userId,
      walletId: payment.walletId,
      amount: roundMoney(payment.totalDebit),
      type: 'refund',
      status: 'completed',
      description: `OTT payout reversal: ${reason}`,
      reference: payment.uniqueReferenceId,
      currency: payment.currency,
      metadata: { ottPayoutId: payment.payoutId, reason },
    }, { transaction: txn });
    await payment.update({
      status: 'reversed',
      rejectionReason: reason,
      reversedAt: new Date(),
      processedAt: new Date(),
    }, { transaction: txn });
    await txn.commit();
    committed = true;
  } catch (error) {
    if (!committed) await txn.rollback();
    throw error;
  }
  await postReversalLedger(payment, reason);
}

async function submitOttPayout({ userId, amount, providerCode, recipient = {}, reference, idempotencyKey }) {
  requireEnabled();
  const quote = await quoteOttPayout({ amount, providerCode });
  const payoutId = `OTT-${Date.now()}-${uuidv4().slice(0, 8)}`;
  const uniqueReferenceId = `MM-${payoutId}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  let payment;

  const txn = await db.sequelize.transaction();
  try {
    const wallet = await getWalletForUser(userId, txn);
    const canCashOut = wallet.canCashOut(quote.totalDebit, { kycTier: recipient.kycTier });
    if (!canCashOut.allowed) {
      const err = new Error(canCashOut.reason || 'Insufficient unrestricted balance for cash-out');
      err.statusCode = 400;
      err.code = 'WALLET_CASH_WITHDRAW_RESTRICTED';
      throw err;
    }

    await wallet.debit(quote.totalDebit, 'debit', { transaction: txn });
    payment = await db.OttPayout.create({
      payoutId,
      uniqueReferenceId,
      userId,
      walletId: wallet.walletId,
      status: 'processing',
      amount: quote.amount,
      providerFeeAmount: quote.providerFeeAmount,
      mmtpFeeAmount: quote.mmtpFeeAmount,
      totalDebit: quote.totalDebit,
      currency: quote.currency,
      providerCode,
      recipientMobileLast4: last4(recipient.mobile),
      recipientNameMasked: maskName(recipient.firstName || recipient.accountName, recipient.surname),
      accountNumberLast4: last4(recipient.accountNumber),
      branchCode: recipient.branchCode || null,
      reference: sanitizeText(reference, 80) || null,
      idempotencyKey: idempotencyKey || null,
      feeSnapshot: quote,
      metadata: { phase: 'payout_submit' },
    }, { transaction: txn });

    await db.Transaction.create({
      transactionId: `OTT-PAY-${payoutId}`.slice(0, 50),
      userId,
      walletId: wallet.walletId,
      amount: -quote.amount,
      type: 'withdraw',
      status: 'processing',
      description: reference || 'OTT payout',
      reference: uniqueReferenceId,
      fee: roundMoney(quote.providerFeeAmount + quote.mmtpFeeAmount),
      currency: quote.currency,
      metadata: { ottPayoutId: payoutId, providerCode },
    }, { transaction: txn });

    if (quote.providerFeeAmount + quote.mmtpFeeAmount > 0) {
      await db.Transaction.create({
        transactionId: `OTT-FEE-${payoutId}`.slice(0, 50),
        userId,
        walletId: wallet.walletId,
        amount: -roundMoney(quote.providerFeeAmount + quote.mmtpFeeAmount),
        type: 'fee',
        status: 'completed',
        description: 'OTT payout fee',
        reference: uniqueReferenceId,
        currency: quote.currency,
        metadata: {
          ottPayoutId: payoutId,
          providerFeeAmount: quote.providerFeeAmount,
          mmtpFeeAmount: quote.mmtpFeeAmount,
        },
      }, { transaction: txn });
    }

    await txn.commit();
  } catch (error) {
    await txn.rollback();
    throw error;
  }

  const client = new OttClient();
  const requestPayload = buildPayoutPayload({ payment, request: { ...recipient, providerCode } });
  let response;
  try {
    response = await client.performPayout(requestPayload);
  } catch (error) {
    await reverseWalletDebit(payment, error.message);
    error.statusCode = error.statusCode || 502;
    throw error;
  }

  const refs = extractProviderRefs(response.data);
  await payment.update({
    status: refs.status,
    ottPaymentReference: refs.ottPaymentReference,
    providerTransactionReference: refs.providerTransactionReference,
    providerResponse: redact(response.data || {}),
    processedAt: refs.status === 'completed' ? new Date() : null,
    metadata: {
      ...(payment.metadata || {}),
      request: response.request,
    },
  });
  payment.status = refs.status;

  if (['failed', 'cancelled', 'reversed'].includes(refs.status)) {
    await reverseWalletDebit(payment, response.data?.message || `OTT payout ${refs.status}`);
  } else {
    try {
      await postLedger(payment);
    } catch (error) {
      await payment.update({
        status: 'ledger_post_failed',
        rejectionReason: error.message,
        metadata: {
          ...(payment.metadata || {}),
          ledgerError: error.message,
          ledgerErrorAt: new Date().toISOString(),
        },
      });
      error.statusCode = 500;
      error.code = 'OTT_LEDGER_POST_FAILED';
      throw error;
    }
  }

  return {
    payoutId,
    uniqueReferenceId,
    status: payment.status,
    amount: quote.amount,
    providerFeeAmount: quote.providerFeeAmount,
    mmtpFeeAmount: quote.mmtpFeeAmount,
    totalDebit: quote.totalDebit,
    currency: quote.currency,
  };
}

async function getPayoutStatus({ userId, payoutId }) {
  const payment = await db.OttPayout.findOne({ where: { payoutId, userId } });
  if (!payment) {
    const err = new Error('OTT payout not found');
    err.statusCode = 404;
    err.code = 'OTT_PAYOUT_NOT_FOUND';
    throw err;
  }
  return toSafePayout(payment);
}

async function pollPayoutStatus({ userId, payoutId }) {
  requireEnabled();
  const paymentRecord = await db.OttPayout.findOne({ where: { payoutId, userId } });
  if (!paymentRecord) {
    const err = new Error('OTT payout not found');
    err.statusCode = 404;
    err.code = 'OTT_PAYOUT_NOT_FOUND';
    throw err;
  }
  const client = new OttClient();
  const response = await client.getPaymentStatus({
    uniqueReferenceId: paymentRecord.uniqueReferenceId,
    paymentReference: paymentRecord.ottPaymentReference || '',
  });
  const updateResult = await updatePayoutFromWebhook({
    ...(response.data || {}),
    uniqueReferenceId: paymentRecord.uniqueReferenceId,
  });
  return {
    payoutId: paymentRecord.payoutId,
    uniqueReferenceId: paymentRecord.uniqueReferenceId,
    providerResponse: redact(response.data || {}),
    updateResult,
  };
}

async function updatePayoutFromWebhook(payload = {}) {
  const uniqueReferenceId = payload.uniqueReferenceId || payload.merchantUniqueReference || payload.merchant_reference;
  if (!uniqueReferenceId) {
    const err = new Error('Webhook unique reference is required');
    err.statusCode = 400;
    err.code = 'OTT_WEBHOOK_REFERENCE_REQUIRED';
    throw err;
  }

  const payment = await db.OttPayout.findOne({ where: { uniqueReferenceId } });
  if (!payment) {
    return { processed: false, reason: 'not_found' };
  }

  const eventId = payload.eventId || payload.webhookEventId || payload.transactionId || null;
  if (eventId && payment.webhookEventId === eventId) {
    return { processed: false, duplicate: true, payoutId: payment.payoutId };
  }

  const refs = extractProviderRefs(payload);
  const updates = {
    status: refs.status,
    webhookEventId: eventId,
    ottPaymentReference: refs.ottPaymentReference || payment.ottPaymentReference,
    providerTransactionReference: refs.providerTransactionReference || payment.providerTransactionReference,
    providerResponse: redact(payload),
    processedAt: refs.status === 'completed' ? new Date() : payment.processedAt,
  };

  if (['failed', 'cancelled', 'reversed'].includes(refs.status) && !payment.reversedAt) {
    await reverseWalletDebit(payment, payload.reason || payload.message || `OTT payout ${refs.status}`);
    return { processed: true, payoutId: payment.payoutId, status: refs.status, reversed: true };
  }

  await payment.update(updates);
  return { processed: true, payoutId: payment.payoutId, status: refs.status };
}

module.exports = {
  isEnabled,
  quoteOttPayout,
  submitOttPayout,
  getPayoutStatus,
  pollPayoutStatus,
  updatePayoutFromWebhook,
  buildOttPayoutLedgerLines,
  buildPayoutPayload,
  normalizeProviderStatus,
  toSafePayout,
};
