'use strict';

const ledgerService = require('./ledgerService');

const ACCOUNT_EASYPAY_FLOAT = '1200-10-02';
const ACCOUNT_CLIENT_FLOAT  = '2100-01-01';

/**
 * Calculate EasyPay fee for a cash-in deposit.
 *
 * Fee structure: R5.50 fixed (excl VAT) + cash handling % + 15% VAT on total fee.
 * EasyPay deducts the fee at source — MMTP receives net in T+2 settlement.
 * MMTP earns zero margin; full cost is passed through to the user.
 *
 * @param {number} grossAmountRand - Gross deposit amount in Rands (what customer pays at POS)
 * @returns {{ feeExclVat: number, vat: number, totalFee: number, netAmount: number }}
 */
function calculateEasyPayFee(grossAmountRand) {
  const fixedFeeCents = parseInt(process.env.EASYPAY_TOPUP_FIXED_FEE_EXCL_VAT || '550', 10);
  const fixedFee = fixedFeeCents / 100;
  const handlingPct = parseFloat(process.env.EASYPAY_TOPUP_CASH_HANDLING_PCT || '0.003');
  const vatRate = parseFloat(process.env.EASYPAY_TOPUP_VAT_RATE || '0.15');

  const handlingFee = grossAmountRand * handlingPct;
  const feeExclVat = fixedFee + handlingFee;
  const vat = Math.round(feeExclVat * vatRate * 100) / 100;
  const totalFee = Math.round((feeExclVat + vat) * 100) / 100;
  const netAmount = Math.round((grossAmountRand - totalFee) * 100) / 100;

  return { feeExclVat: Math.round(feeExclVat * 100) / 100, vat, totalFee, netAmount };
}

/**
 * Post the 2-JE pattern for an EasyPay cash-in deposit.
 *
 * JE1 — Gross Deposit (face value):
 *   DR  1200-10-02  EasyPay Top-up Float    grossAmount  (receivable from EasyPay T+2)
 *   CR  2100-01-01  Client Float Liability   grossAmount  (gross credit to user)
 *
 * JE2 — Fee Deduction (EasyPay fee, pass-through):
 *   DR  2100-01-01  Client Float Liability   totalFee     (fee charged to user)
 *   CR  1200-10-02  EasyPay Top-up Float     totalFee     (EasyPay retains from settlement)
 *
 * Net ledger effect:
 *   EasyPay Float: DR grossAmount - CR totalFee = DR netAmount (what MMTP receives in settlement)
 *   Client Float:  CR grossAmount - DR totalFee = CR netAmount (user net balance increase)
 *
 * @param {object} params
 * @param {string} params.reference - Unique transaction reference
 * @param {number} params.grossAmountRand - Gross deposit in Rands
 * @param {number} params.totalFeeRand - Total fee in Rands (incl VAT)
 * @param {string} [params.description] - Optional description override
 * @returns {Promise<{ depositJE: object, feeJE: object }>}
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
    description: `EasyPay fee (pass-through, deducted at source): ${reference}`,
    lines: [
      { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: totalFeeRand, memo: 'Fee charged to user (R5.50 + handling% + VAT)' },
      { accountCode: ACCOUNT_EASYPAY_FLOAT, dc: 'credit', amount: totalFeeRand, memo: 'EasyPay retains fee from settlement' },
    ],
  });

  return { depositJE, feeJE };
}

module.exports = {
  calculateEasyPayFee,
  postEasyPayDeposit,
  ACCOUNT_EASYPAY_FLOAT,
  ACCOUNT_CLIENT_FLOAT,
};
