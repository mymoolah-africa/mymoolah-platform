'use strict';

const ledgerService = require('./ledgerService');

const ACCOUNT_EASYPAY_FLOAT = '1200-10-02';
const ACCOUNT_CLIENT_FLOAT  = '2100-01-01';
const ACCOUNT_EASYPAY_CASH_HANDLING = process.env.LEDGER_ACCOUNT_EASYPAY_CASH_HANDLING || '5000-10-02';

/**
 * Calculate EasyPay fee for a cash-in deposit.
 *
 * Fee structure (confirmed 10 April 2026 meeting with EasyPay):
 *   - User pays: R5.50 fixed (excl VAT) + 15% VAT = R6.33 flat per transaction
 *   - Cash handling fee: variable per merchant, known only from daily SFTP recon file
 *   - MMTP absorbs the cash handling cost as Cost of Sales (5000-10-02)
 *
 * @param {number} grossAmountRand - Gross deposit amount in Rands (what customer pays at POS)
 * @returns {{ feeExclVat: number, vat: number, totalFee: number, netAmount: number }}
 */
function calculateEasyPayFee(grossAmountRand) {
  const fixedFeeCents = parseInt(process.env.EASYPAY_TOPUP_FIXED_FEE_EXCL_VAT || '550', 10);
  const fixedFee = fixedFeeCents / 100;
  const vatRate = parseFloat(process.env.EASYPAY_TOPUP_VAT_RATE || '0.15');

  const feeExclVat = fixedFee;
  const vat = Math.round(feeExclVat * vatRate * 100) / 100;
  const totalFee = Math.round((feeExclVat + vat) * 100) / 100;
  const netAmount = Math.round((grossAmountRand - totalFee) * 100) / 100;

  return { feeExclVat: Math.round(feeExclVat * 100) / 100, vat, totalFee, netAmount };
}

/**
 * Post the 2-JE pattern for an EasyPay cash-in deposit (realtime, on paymentNotification).
 *
 * JE1 — Gross Deposit (face value):
 *   DR  1200-10-02  EasyPay Top-up Float    grossAmount  (receivable from EasyPay T+2)
 *   CR  2100-01-01  Client Float Liability   grossAmount  (gross credit to user)
 *
 * JE2 — Fee Deduction (flat R6.33 user fee):
 *   DR  2100-01-01  Client Float Liability   totalFee     (fee charged to user)
 *   CR  1200-10-02  EasyPay Top-up Float     totalFee     (EasyPay retains from settlement)
 *
 * Net ledger effect:
 *   EasyPay Float: DR grossAmount - CR totalFee = DR netAmount (what MMTP receives in settlement)
 *   Client Float:  CR grossAmount - DR totalFee = CR netAmount (user net balance increase)
 */
async function postEasyPayDeposit({ reference, grossAmountRand, totalFeeRand, description }) {
  const depositJE = await ledgerService.postJournalEntry({
    reference: `EP-DEP-${reference}`,
    description: description || `EasyPay deposit (gross face value): ${reference}`,
    lines: [
      { accountCode: ACCOUNT_EASYPAY_FLOAT, dc: 'debit', amount: grossAmountRand, memo: 'EasyPay float — gross face value receivable T+2' },
      { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'credit', amount: grossAmountRand, memo: 'Client wallet credit — gross face value' },
    ],
  });

  const feeJE = await ledgerService.postJournalEntry({
    reference: `EP-FEE-${reference}`,
    description: `EasyPay user fee (R5.50 + VAT, pass-through): ${reference}`,
    lines: [
      { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: totalFeeRand, memo: 'Flat fee charged to user (R5.50 excl VAT + 15% VAT)' },
      { accountCode: ACCOUNT_EASYPAY_FLOAT, dc: 'credit', amount: totalFeeRand, memo: 'EasyPay retains fee from settlement' },
    ],
  });

  return { depositJE, feeJE };
}

/**
 * Post cash handling cost JE (batch, called by recon job after SFTP file).
 *
 * JE3 — Cash Handling Cost (MMTP absorbs):
 *   DR  5000-10-02  CoS: EasyPay Cash Handling   amount  (MMTP expense)
 *   CR  1200-10-02  EasyPay Top-up Float          amount  (reduces float receivable)
 *
 * This reduces the EasyPay float to match the actual net settlement amount
 * that EasyPay will credit to MMTP's bank account.
 *
 * @param {object} params
 * @param {string} params.reference - Unique reference (e.g. EP-HANDLING-{batchRef}-{txnId})
 * @param {number} params.amount - Cash handling cost in Rands (from SFTP recon file)
 * @param {string} [params.description] - Optional description
 * @returns {Promise<object>} The posted journal entry
 */
async function postCashHandlingCost({ reference, amount, description }) {
  return ledgerService.postJournalEntry({
    reference,
    description: description || `EasyPay cash handling cost: ${reference}`,
    lines: [
      { accountCode: ACCOUNT_EASYPAY_CASH_HANDLING, dc: 'debit', amount, memo: 'Cash handling fee — MMTP cost of deposit service' },
      { accountCode: ACCOUNT_EASYPAY_FLOAT, dc: 'credit', amount, memo: 'Reduces EasyPay float receivable to match net settlement' },
    ],
  });
}

module.exports = {
  calculateEasyPayFee,
  postEasyPayDeposit,
  postCashHandlingCost,
  ACCOUNT_EASYPAY_FLOAT,
  ACCOUNT_CLIENT_FLOAT,
  ACCOUNT_EASYPAY_CASH_HANDLING,
};
