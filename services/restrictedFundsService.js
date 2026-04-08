'use strict';

const ledgerService = require('./ledgerService');

const ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
const ACCOUNT_CLIENT_FLOAT_RESTRICTED = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT_RESTRICTED || '2100-01-02';
const ACCOUNT_FLASH_FLOAT = process.env.LEDGER_ACCOUNT_FLASH_FLOAT || '1200-10-04';

/**
 * Post three balanced journal entries for a Flash voucher top-up:
 *
 * JE1 — Gross Deposit (face value):
 *   DR  Flash Float (1200-10-04)    faceValue   (gross receivable from Flash)
 *   CR  Client Float (2100-01-01)   faceValue   (gross credit to user)
 *
 * JE2 — Fee Deduction (Flash's 4% excl VAT + 15% VAT):
 *   DR  Client Float (2100-01-01)   fee         (fee charged to user)
 *   CR  Flash Float (1200-10-04)    fee         (Flash retains this from settlement)
 *
 * JE3 — Restriction Tracking (AML ringfence):
 *   DR  Client Float (2100-01-01)   netDeposit  (reclassify to restricted)
 *   CR  Client Float Restricted     netDeposit  (ringfenced voucher deposit)
 *
 * Net ledger effect:
 *   Flash Float:           DR faceValue - CR fee = DR netDeposit (what Flash settles)
 *   Client Float:          CR faceValue - DR fee - DR netDeposit = 0
 *   Client Float Restricted: CR netDeposit (user's restricted balance)
 */
async function postVoucherDepositAndRestriction({ reference, netDepositRand, faceValueRand, feeRand, description }) {
  const depositJE = await ledgerService.postJournalEntry({
    reference: `VTOP-DEP-${reference}`,
    description: description || `Flash voucher deposit (gross face value): ${reference}`,
    lines: [
      { accountCode: ACCOUNT_FLASH_FLOAT, dc: 'debit', amount: faceValueRand, memo: 'Flash float — gross face value' },
      { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'credit', amount: faceValueRand, memo: 'Client wallet credit — gross face value' },
    ],
  });

  const feeJE = await ledgerService.postJournalEntry({
    reference: `VTOP-FEE-${reference}`,
    description: `Flash voucher fee (4% excl VAT + 15% VAT): ${reference}`,
    lines: [
      { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: feeRand, memo: 'Fee charged to user (Flash 4% excl VAT + VAT)' },
      { accountCode: ACCOUNT_FLASH_FLOAT, dc: 'credit', amount: feeRand, memo: 'Flash retains fee from settlement' },
    ],
  });

  const restrictionJE = await ledgerService.postJournalEntry({
    reference: `VTOP-RESTRICT-${reference}`,
    description: `Restriction: voucher deposit ringfenced — ${reference}`,
    lines: [
      { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: netDepositRand, memo: 'Reclassify to restricted' },
      { accountCode: ACCOUNT_CLIENT_FLOAT_RESTRICTED, dc: 'credit', amount: netDepositRand, memo: 'Voucher deposit restricted' },
    ],
  });

  return { depositJE, feeJE, restrictionJE };
}

/**
 * Release restricted funds when a user spends on an allowed service.
 * Posts a release journal entry and decrements wallet.restricted_balance.
 *
 * @param {Object} wallet - Sequelize Wallet instance (must have restricted_balance loaded)
 * @param {number} spendAmountRand - The total spend amount in Rand
 * @param {string} transactionId - For idempotent JE reference
 * @param {Object} [options] - Sequelize save options (e.g. { transaction })
 * @returns {number} The amount actually released (0 if no restricted funds)
 */
async function releaseRestrictedFunds(wallet, spendAmountRand, transactionId, options = {}) {
  const restricted = parseFloat(wallet.restrictedBalance || 0);
  if (restricted <= 0) return 0;

  const releaseAmount = Math.min(restricted, parseFloat(spendAmountRand));
  if (releaseAmount <= 0) return 0;

  const releaseAmountRounded = parseFloat(releaseAmount.toFixed(2));

  wallet.restrictedBalance = parseFloat((restricted - releaseAmountRounded).toFixed(2));
  await wallet.save(options);

  try {
    await ledgerService.postJournalEntry({
      reference: `RESTRICT-RELEASE-${transactionId}`,
      description: `Restriction release: spend on allowed service — ${transactionId}`,
      lines: [
        { accountCode: ACCOUNT_CLIENT_FLOAT_RESTRICTED, dc: 'debit', amount: releaseAmountRounded, memo: 'Release restricted funds' },
        { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'credit', amount: releaseAmountRounded, memo: 'Funds reclassified to unrestricted' },
      ],
    });
  } catch (err) {
    console.error(`[restrictedFundsService] Release JE failed for ${transactionId}:`, err.message);
  }

  return releaseAmountRounded;
}

module.exports = {
  postVoucherDepositAndRestriction,
  releaseRestrictedFunds,
  ACCOUNT_CLIENT_FLOAT,
  ACCOUNT_CLIENT_FLOAT_RESTRICTED,
  ACCOUNT_FLASH_FLOAT,
};
