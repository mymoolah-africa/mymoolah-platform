'use strict';

/**
 * SBSA Deposit Notification Service
 * When a deposit hits the MM SBSA main account, SBSA notifies us.
 * Reference number (CID) = MSISDN → wallet to credit, or float account identifier.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const db = require('../models');
const { normalizeToE164 } = require('../utils/msisdn');

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
 * Resolve reference number to account to credit.
 * 1. MSISDN (0[6-8]XXXXXXXX or 27XXXXXXXXX) → wallet
 * 2. SUP-, CLI-, SP-, RES- prefixes → float account
 *
 * @param {string} referenceNumber - CID from notification payload
 * @returns {Promise<{ type: string, wallet?: Object, userId?: number, walletId?: string, floatAccount?: Object, ledgerAccountCode?: string }|null>}
 */
async function resolveReference(referenceNumber) {
  if (!referenceNumber || typeof referenceNumber !== 'string') {
    return null;
  }

  const ref = referenceNumber.trim();

  // Step 1: Try MSISDN → wallet
  const e164 = safeNormalizeToE164(ref);
  if (e164) {
    const user = await db.User.findOne({
      where: { phoneNumber: e164 },
      attributes: ['id'],
    });
    if (user) {
      const wallet = await db.Wallet.findOne({
        where: { userId: user.id },
        attributes: ['walletId', 'id', 'userId'],
      });
      if (wallet) {
        return { type: 'wallet', wallet, userId: user.id, walletId: wallet.walletId };
      }
    }
  }

  // Step 2: Float account prefixes (SUP-, CLI-, SP-, RES-)
  if (ref.startsWith('SUP-') || ref.startsWith('SUP')) {
    const sf = await db.SupplierFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (sf) return { type: 'supplier_float', floatAccount: sf, ledgerAccountCode: sf.ledgerAccountCode };
  }
  if (ref.startsWith('CLI-') || ref.startsWith('CLI')) {
    const cf = await db.ClientFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (cf) return { type: 'client_float', floatAccount: cf, ledgerAccountCode: cf.ledgerAccountCode };
  }
  if (ref.startsWith('SP-')) {
    const mf = await db.MerchantFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (mf) return { type: 'merchant_float', floatAccount: mf, ledgerAccountCode: mf.ledgerAccountCode };
  }
  if (ref.startsWith('RES-') || ref.startsWith('RES')) {
    const rf = await db.ResellerFloat.findOne({
      where: { floatAccountNumber: ref },
      attributes: ['id', 'floatAccountNumber', 'ledgerAccountCode'],
    });
    if (rf) return { type: 'reseller_float', floatAccount: rf, ledgerAccountCode: rf.ledgerAccountCode };
  }

  return null;
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

  // Idempotency
  const existing = await db.StandardBankTransaction.findOne({
    where: { transactionId, type: 'deposit' },
  });
  if (existing) {
    return { success: true, credited: 'already_processed', message: 'Duplicate' };
  }

  const resolved = await resolveReference(referenceNumber);
  if (!resolved) {
    return { success: false, error: 'Account not found for reference' };
  }

  const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
  const bankCode = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';

  if (resolved.type === 'wallet') {
    const { wallet, userId } = resolved;
    const sequelize = db.sequelize;
    const transaction = await sequelize.transaction();

    try {
      const lockedWallet = await db.Wallet.findOne({
        where: { walletId: wallet.walletId },
        lock: sequelize.Transaction.LOCK.UPDATE,
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
};
