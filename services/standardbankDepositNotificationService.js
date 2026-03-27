'use strict';

/**
 * SBSA Deposit Notification Service
 * When a deposit hits the MM SBSA main account, SBSA notifies us.
 * Reference number (CID) = MSISDN → wallet to credit, or float account identifier.
 * Unresolved references are parked in a suspense ledger and flagged for ops review.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const db = require('../models');
const { normalizeToE164 } = require('../utils/msisdn');

const logger = {
  info:  (...a) => console.log('[DepositNotification]', ...a),
  warn:  (...a) => console.warn('[DepositNotification]', ...a),
  error: (...a) => console.error('[DepositNotification]', ...a),
};

/**
 * Normalize reference to E.164 for lookup (safe - returns null on invalid)
 */
function safeNormalizeToE164(input) {
  if (!input || typeof input !== 'string') return null;
  try {
    return normalizeToE164(input.trim());
  } catch {
    return null;
  }
}

/**
 * Generate fuzzy MSISDN variants for a reference string.
 * Handles the most common customer typos:
 *   1. Formatting noise (spaces, dashes, dots, parentheses)
 *   2. Missing leading zero (9-digit "82XXXXXXX" → "082XXXXXXX")
 *   3. Adjacent-digit transpositions (e.g., "0823" → "0832")
 *
 * Returns an array of unique E.164 strings to try, excluding the canonical form
 * already attempted.
 *
 * @param {string} ref - Raw reference from deposit notification
 * @param {string|null} canonicalE164 - Already-tried canonical form (excluded from output)
 * @returns {string[]}
 */
function buildFuzzyMsisdnVariants(ref, canonicalE164) {
  const seen = new Set(canonicalE164 ? [canonicalE164] : []);
  const candidates = [];

  // Strip all formatting noise, then re-normalize
  const digits = ref.replace(/\D/g, '');

  // Missing leading zero: 9 digits starting with 6/7/8 → "0{digits}"
  if (/^[6-8]\d{8}$/.test(digits)) {
    const v = safeNormalizeToE164(`0${digits}`);
    if (v && !seen.has(v)) { seen.add(v); candidates.push(v); }
  }

  // Re-normalize the stripped-digit string directly (covers spaces, dashes, etc.)
  const vDigits = safeNormalizeToE164(digits);
  if (vDigits && !seen.has(vDigits)) { seen.add(vDigits); candidates.push(vDigits); }

  // Build a 10-digit local string to generate transposition variants
  let local10 = null;
  if (/^0[6-8]\d{8}$/.test(digits)) {
    local10 = digits;
  } else if (/^27[6-8]\d{8}$/.test(digits) && digits.length === 11) {
    local10 = `0${digits.slice(2)}`;
  } else if (/^[6-8]\d{8}$/.test(digits)) {
    local10 = `0${digits}`;
  }

  if (local10) {
    // Generate all adjacent-swap transpositions of the 10-digit local number
    for (let i = 0; i < local10.length - 1; i++) {
      if (local10[i] !== local10[i + 1]) {
        const swapped = local10.slice(0, i) + local10[i + 1] + local10[i] + local10.slice(i + 2);
        const v = safeNormalizeToE164(swapped);
        if (v && !seen.has(v)) { seen.add(v); candidates.push(v); }
      }
    }
  }

  return candidates;
}

/**
 * Extract valid SA mobile numbers from a reference that may contain extra digits.
 * Banks (especially PayShap) often prepend/append batch IDs, reference codes, or
 * zero-padding around the payer's MSISDN proxy. This scans the digit sequence
 * using a sliding window to find all valid SA mobile patterns.
 *
 * Priority: 10-digit local (0[6-8]...) → 11-digit intl (27[6-8]...) → 9-digit
 * without leading zero ([6-8]...). Returns E.164 candidates, longest match first.
 *
 * @param {string} ref - Raw reference from PayShap/deposit notification
 * @param {string|null} alreadyTried - E.164 already attempted (excluded from output)
 * @returns {string[]} Array of unique E.164 candidates found within the reference
 */
function extractMsisdnFromReference(ref, alreadyTried) {
  if (!ref || typeof ref !== 'string') return [];

  const digits = ref.replace(/\D/g, '');
  if (digits.length < 9) return [];

  const seen = new Set(alreadyTried ? [alreadyTried] : []);
  const candidates = [];

  const addCandidate = (e164) => {
    if (e164 && !seen.has(e164)) { seen.add(e164); candidates.push(e164); }
  };

  // 11-digit international 27[6-8]XXXXXXXX — highest confidence
  for (let i = 0; i <= digits.length - 11; i++) {
    const chunk = digits.substring(i, i + 11);
    if (/^27[6-8]\d{8}$/.test(chunk)) {
      addCandidate(`+${chunk}`);
    }
  }

  // 10-digit local 0[6-8]XXXXXXXX
  for (let i = 0; i <= digits.length - 10; i++) {
    const chunk = digits.substring(i, i + 10);
    if (/^0[6-8]\d{8}$/.test(chunk)) {
      addCandidate(`+27${chunk.slice(1)}`);
    }
  }

  // 9-digit without leading zero [6-8]XXXXXXXX — only when total digits ≤ 12
  // (avoids false positives in very long numeric references)
  if (digits.length <= 12) {
    for (let i = 0; i <= digits.length - 9; i++) {
      const chunk = digits.substring(i, i + 9);
      if (/^[6-8]\d{8}$/.test(chunk)) {
        addCandidate(`+27${chunk}`);
      }
    }
  }

  return candidates;
}

/**
 * Look up a wallet by E.164 phone number.
 * @param {string} e164
 * @returns {Promise<{ type: 'wallet', wallet: Object, userId: number, walletId: string }|null>}
 */
async function lookupWalletByE164(e164) {
  const user = await db.User.findOne({
    where: { phoneNumber: e164 },
    attributes: ['id'],
  });
  if (!user) return null;
  const wallet = await db.Wallet.findOne({
    where: { userId: user.id },
    attributes: ['walletId', 'id', 'userId'],
  });
  if (!wallet) return null;
  return { type: 'wallet', wallet, userId: user.id, walletId: wallet.walletId };
}

/**
 * Resolve reference number to account to credit.
 * Phase 1: Exact MSISDN lookup
 * Phase 2: Float account prefix lookup
 * Phase 3: Fuzzy MSISDN variants (transpositions, formatting noise, missing zero)
 *
 * @param {string} referenceNumber - CID from notification payload
 * @returns {Promise<{ type: string, wallet?: Object, userId?: number, walletId?: string, floatAccount?: Object, ledgerAccountCode?: string, fuzzyMatch?: boolean }|null>}
 */
async function resolveReference(referenceNumber) {
  if (!referenceNumber || typeof referenceNumber !== 'string') {
    return null;
  }

  const ref = referenceNumber.trim();

  // Phase 1: Exact MSISDN → wallet
  const e164 = safeNormalizeToE164(ref);
  if (e164) {
    const result = await lookupWalletByE164(e164);
    if (result) return result;
  }

  // Phase 1.5: Extract MSISDN from reference with extra digits (bank prefixes/suffixes)
  const extractedCandidates = extractMsisdnFromReference(ref, e164);
  for (const candidate of extractedCandidates) {
    const result = await lookupWalletByE164(candidate);
    if (result) {
      logger.info('MSISDN extracted from padded reference', {
        originalRef: ref,
        extractedE164: candidate,
        userId: result.userId,
      });
      return { ...result, extractedFromRef: true, originalRef: ref };
    }
  }

  // Phase 2: Float account prefixes (SUP-, CLI-, SP-, RES-)
  const upperRef = ref.toUpperCase();
  if (upperRef.startsWith('SUP')) {
    const sf = await db.SupplierFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (sf) return { type: 'supplier_float', floatAccount: sf, ledgerAccountCode: sf.ledgerAccountCode };
  }
  if (upperRef.startsWith('CLI')) {
    const cf = await db.ClientFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (cf) return { type: 'client_float', floatAccount: cf, ledgerAccountCode: cf.ledgerAccountCode };
  }
  if (upperRef.startsWith('SP-')) {
    const mf = await db.MerchantFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (mf) return { type: 'merchant_float', floatAccount: mf, ledgerAccountCode: mf.ledgerAccountCode };
  }
  if (upperRef.startsWith('RES')) {
    const rf = await db.ResellerFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (rf) return { type: 'reseller_float', floatAccount: rf, ledgerAccountCode: rf.ledgerAccountCode };
  }

  // Phase 3: Fuzzy MSISDN variants (transpositions + formatting noise + missing zero)
  const fuzzyVariants = buildFuzzyMsisdnVariants(ref, e164);
  for (const variant of fuzzyVariants) {
    const result = await lookupWalletByE164(variant);
    if (result) {
      logger.warn('[DepositNotification] Fuzzy MSISDN match', {
        originalRef: ref,
        matchedE164: variant,
        userId: result.userId,
      });
      return { ...result, fuzzyMatch: true, fuzzyOriginalRef: ref };
    }
  }

  return null;
}

/**
 * Send ops alert for an unallocated deposit.
 * Uses AlertService if SMTP is configured; otherwise logs a structured warning.
 */
async function sendUnallocatedAlert({ transactionId, referenceNumber, amount, currency }) {
  const message = `UNALLOCATED DEPOSIT: TxID=${transactionId} | Ref="${referenceNumber}" | Amount=${currency} ${amount}`;
  logger.warn(`[DepositNotification] ${message}`);

  try {
    const AlertService = require('./reconciliation/AlertService');
    const alertService = new AlertService();
    const opsEmail = process.env.OPS_ALERT_EMAIL || process.env.SMTP_USER || 'ops@mymoolah.africa';
    if (alertService.smtpConfigured) {
      await alertService.transporter.sendMail({
        from: `"MyMoolah Treasury Alerts" <${process.env.SMTP_USER}>`,
        to: opsEmail,
        subject: `[ACTION REQUIRED] Unallocated Deposit — R${Number(amount).toFixed(2)} — Ref: ${referenceNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px">
            <h2 style="color:#c0392b">⚠️ Unallocated Deposit — Manual Allocation Required</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Transaction ID</td><td style="padding:8px">${transactionId}</td></tr>
              <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Reference (CID)</td><td style="padding:8px">${referenceNumber}</td></tr>
              <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Amount</td><td style="padding:8px;color:#27ae60;font-weight:bold">${currency} ${Number(amount).toFixed(2)}</td></tr>
              <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Status</td><td style="padding:8px">Parked in Suspense / Unallocated Receipts</td></tr>
              <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Action Required</td><td style="padding:8px">Log in to the Admin Portal → Unallocated Deposits and manually match this deposit to a wallet.</td></tr>
            </table>
            <p style="margin-top:16px;color:#7f8c8d;font-size:12px">This is an automated alert from the MyMoolah Treasury Platform. Do not reply.</p>
          </div>`,
      });
      logger.info('[DepositNotification] Unallocated alert email sent', { transactionId, referenceNumber });
    }
  } catch (alertErr) {
    logger.warn('[DepositNotification] Alert send failed (non-critical)', { error: alertErr.message });
  }
}

/**
 * Park an unresolvable deposit in the suspense / unallocated receipts ledger.
 * Returns HTTP 200 to SBSA (so they do not retry), and flags the deposit for ops.
 */
async function parkInSuspense({ transactionId, referenceNumber, amount, currency, payload, bankCode, suspenseCode }) {
  const sequelize = db.sequelize;
  const dbTx = await sequelize.transaction();

  try {
    await db.StandardBankTransaction.create(
      {
        transactionId,
        merchantTransactionId: `DEP-${transactionId}`,
        originalMessageId: transactionId,
        type: 'deposit',
        direction: 'credit',
        amount,
        currency,
        referenceNumber,
        accountType: 'unallocated',
        status: 'pending',
        rawRequest: payload,
        webhookReceivedAt: new Date(),
      },
      { transaction: dbTx }
    );

    await dbTx.commit();
  } catch (err) {
    await dbTx.rollback();
    throw err;
  }

  // Post to suspense ledger outside the DB transaction (non-critical if ledger fails)
  try {
    const ledgerService = require('./ledgerService');
    await ledgerService.postJournalEntry({
      reference: `SBSA-UNALLOC-${transactionId}`,
      description: `Unallocated deposit — ref: ${referenceNumber}`,
      lines: [
        { accountCode: bankCode,    dc: 'debit',  amount, memo: 'Bank inflow — unallocated deposit' },
        { accountCode: suspenseCode, dc: 'credit', amount, memo: `Suspense — unmatched ref: ${referenceNumber}` },
      ],
    });
  } catch (ledgerErr) {
    logger.warn('[DepositNotification] Suspense ledger posting skipped', { error: ledgerErr.message });
  }

  // Fire-and-forget ops alert
  sendUnallocatedAlert({ transactionId, referenceNumber, amount, currency }).catch(() => {});

  return {
    success: true,
    credited: 'suspense',
    message: 'Deposit parked in unallocated receipts — manual allocation required',
  };
}

/**
 * Process deposit notification: resolve reference, credit account, post ledger.
 *
 * @param {Object} payload - Notification payload
 * @param {string} payload.transactionId - SBSA transaction ID (for idempotency)
 * @param {string} payload.referenceNumber - CID (MSISDN or float identifier)
 * @param {number} payload.amount - Amount
 * @param {string} [payload.currency] - Currency (default ZAR)
 * @param {string} [payload.description] - Optional description
 * @returns {Promise<{ success: boolean, credited?: string, error?: string }>}
 */
async function processDepositNotification(payload) {
  const transactionId = payload.transactionId || payload.transaction_id || payload.id;
  const referenceNumber = payload.referenceNumber || payload.reference_number || payload.reference || payload.cid;
  const amount = parseFloat(payload.amount || payload.amountCents / 100 || 0);
  const currency = payload.currency || payload.currencyCode || 'ZAR';

  if (!transactionId) {
    return { success: false, error: 'Missing transactionId' };
  }
  if (!referenceNumber) {
    return { success: false, error: 'Missing referenceNumber (CID)' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount' };
  }

  // Idempotency — primary: exact transactionId match
  const existing = await db.StandardBankTransaction.findOne({
    where: { transactionId, type: 'deposit' },
  });
  if (existing) {
    return { success: true, credited: 'already_processed', message: 'Duplicate' };
  }

  // Idempotency — cross-channel: PayShap and H2H SOAP may notify for the same
  // deposit with different transactionId prefixes (PAYSHAP-IN-* vs SBSA-SOAP-*).
  // Guard against double-credit by checking for same reference + amount within 90s.
  const { Op } = require('sequelize');
  const crossChannelCutoff = new Date(Date.now() - 90_000);
  const crossMatch = await db.StandardBankTransaction.findOne({
    where: {
      type: 'deposit',
      referenceNumber,
      amount,
      status: 'completed',
      processedAt: { [Op.gte]: crossChannelCutoff },
      transactionId: { [Op.ne]: transactionId },
    },
  });
  if (crossMatch) {
    logger.info('Cross-channel duplicate detected', {
      newTxId: transactionId,
      existingTxId: crossMatch.transactionId,
      referenceNumber,
      amount,
    });
    return { success: true, credited: 'already_processed', message: 'Cross-channel duplicate' };
  }

  const resolved = await resolveReference(referenceNumber);

  const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
  const bankCode        = process.env.LEDGER_ACCOUNT_BANK           || '1100-01-01';
  const suspenseCode    = process.env.LEDGER_ACCOUNT_UNALLOCATED    || '2600-01-01';

  if (!resolved) {
    return await parkInSuspense({ transactionId, referenceNumber, amount, currency, payload, bankCode, suspenseCode });
  }

  if (resolved.type === 'wallet') {
    const { wallet, userId } = resolved;
    const sequelize = db.sequelize;
    const transaction = await sequelize.transaction();

    try {
      const lockedWallet = await db.Wallet.findOne({
        where: { walletId: wallet.walletId },
        lock: db.Sequelize.Transaction.LOCK.UPDATE,
        transaction,
      });
      if (!lockedWallet) {
        await transaction.rollback();
        return { success: false, error: 'Wallet not found' };
      }

      await lockedWallet.credit(amount, 'credit', { transaction });

      await db.StandardBankTransaction.create(
        {
          transactionId,
          merchantTransactionId: `DEP-${transactionId}`,
          originalMessageId: transactionId,
          type: 'deposit',
          direction: 'credit',
          amount,
          currency,
          referenceNumber,
          accountType: 'wallet',
          accountId: lockedWallet.id,
          userId,
          walletId: lockedWallet.walletId,
          status: 'completed',
          rawRequest: payload,
          rawResponse: null,
          webhookReceivedAt: new Date(),
          processedAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      try {
        const ledgerService = require('./ledgerService');
        await ledgerService.postJournalEntry({
          reference: `SBSA-DEP-${transactionId}`,
          description: `Deposit notification: ${referenceNumber}`,
          lines: [
            { accountCode: bankCode, dc: 'debit', amount, memo: 'Bank inflow (deposit)' },
            { accountCode: clientFloatCode, dc: 'credit', amount, memo: 'Wallet credit (deposit)' },
          ],
        });
      } catch (ledgerErr) {
        console.warn('SBSA deposit ledger posting skipped:', ledgerErr.message);
      }

      return { success: true, credited: 'wallet', walletId: lockedWallet.walletId };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Float accounts (SUP-, CLI-, SP-, RES-) - credit float balance
  const ledgerCode = resolved.ledgerAccountCode || clientFloatCode;
  try {
    if (resolved.type === 'supplier_float') {
      await db.SupplierFloat.increment(
        'currentBalance',
        { by: amount, where: { id: resolved.floatAccount.id } }
      );
    } else if (resolved.type === 'client_float') {
      await db.ClientFloat.increment(
        'currentBalance',
        { by: amount, where: { id: resolved.floatAccount.id } }
      );
    } else if (resolved.type === 'merchant_float') {
      await db.MerchantFloat.increment(
        'currentBalance',
        { by: amount, where: { id: resolved.floatAccount.id } }
      );
    } else if (resolved.type === 'reseller_float') {
      await db.ResellerFloat.increment(
        'currentBalance',
        { by: amount, where: { id: resolved.floatAccount.id } }
      );
    }

    await db.StandardBankTransaction.create({
      transactionId,
      merchantTransactionId: `DEP-${transactionId}`,
      originalMessageId: transactionId,
      type: 'deposit',
      direction: 'credit',
      amount,
      currency,
      referenceNumber,
      accountType: resolved.type,
      accountId: resolved.floatAccount?.id,
      status: 'completed',
      rawRequest: payload,
      webhookReceivedAt: new Date(),
      processedAt: new Date(),
    });

    try {
      const ledgerService = require('./ledgerService');
      await ledgerService.postJournalEntry({
        reference: `SBSA-DEP-${transactionId}`,
        description: `Deposit notification: ${referenceNumber}`,
        lines: [
          { accountCode: bankCode, dc: 'debit', amount, memo: 'Bank inflow (deposit)' },
          { accountCode: ledgerCode, dc: 'credit', amount, memo: 'Float credit (deposit)' },
        ],
      });
    } catch (ledgerErr) {
      console.warn('SBSA deposit ledger posting skipped:', ledgerErr.message);
    }

    return { success: true, credited: resolved.type };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  resolveReference,
  processDepositNotification,
  parkInSuspense,
  extractMsisdnFromReference,
};
