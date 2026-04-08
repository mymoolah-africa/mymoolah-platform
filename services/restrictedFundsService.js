'use strict';

const ledgerService = require('./ledgerService');

const ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
const ACCOUNT_CLIENT_FLOAT_RESTRICTED = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT_RESTRICTED || '2100-01-02';
const ACCOUNT_FLASH_FLOAT = process.env.LEDGER_ACCOUNT_FLASH_FLOAT || '1200-10-04';

/**
 * Post the main deposit journal entry for a Flash voucher top-up.
 * Flash deducts 4% acceptance fee at source before daily net settlement.
 * Our Flash Float increases by the NET amount only (faceValue - fee).
 *
 * DR  Flash Float (1200-10-04)      netDeposit  (what Flash settles to us)
 * CR  Client Float (2100-01-01)     netDeposit  (what user wallet receives)
 *
 * Commission/fee accounting is handled separately by commissionVatService.
 *
 * Then post the restriction tracking journal:
 * DR  Client Float (2100-01-01)     netDeposit
 * CR  Client Float Restricted       netDeposit
 */
async function postVoucherDepositAndRestriction({ reference, netDepositRand, faceValueRand, description }) {
  const depositJE = await ledgerService.postJournalEntry({
    reference: `VTOP-DEP-${reference}`,
    description: description || `Flash voucher deposit: ${reference}`,
    lines: [
      { accountCode: ACCOUNT_FLASH_FLOAT, dc: 'debit', amount: netDepositRand, memo: 'Flash float (net of Flash 4% fee)' },
      { accountCode: ACCOUNT_CLIENT_FLOAT, dc: 'credit', amount: netDepositRand, memo: 'Client wallet credit' },
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

  return { depositJE, restrictionJE };
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
