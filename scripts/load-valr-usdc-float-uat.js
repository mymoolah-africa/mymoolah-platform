#!/usr/bin/env node
'use strict';

/**
 * Load R2000 into the prefunded VALR USDC float account (1200-10-06) for UAT testing.
 * Posts a double-entry journal: Debit VALR float R2000, Credit UAT funding source R2000.
 *
 * Usage: node scripts/load-valr-usdc-float-uat.js
 * Requires: VALR float account 1200-10-06 to exist (run migration 20260207120001 if needed).
 */

const ledgerService = require('../services/ledgerService');
const { LedgerAccount } = require('../models');

const VALR_FLOAT_CODE = '1200-10-06';
const UAT_FUNDING_CODE = '9999-00-01';
const UAT_FUNDING_NAME = 'UAT Float Funding Source';
const AMOUNT_RAND = 2000;
const REFERENCE = 'UAT-VALR-FLOAT-LOAD-2000';

async function ensureUatFundingAccount() {
  const existing = await LedgerAccount.findOne({ where: { code: UAT_FUNDING_CODE }, raw: true });
  if (existing) return;
  try {
    await ledgerService.createAccount({
      code: UAT_FUNDING_CODE,
      name: UAT_FUNDING_NAME,
      type: 'liability',
      normalSide: 'credit'
    });
    console.log(`Created ledger account ${UAT_FUNDING_CODE} (${UAT_FUNDING_NAME}).`);
  } catch (err) {
    if (err.message && err.message.includes('already exists')) return;
    throw err;
  }
}

async function main() {
  console.log('Loading R2000 into VALR USDC float (1200-10-06) for UAT...\n');

  const valrAccount = await LedgerAccount.findOne({ where: { code: VALR_FLOAT_CODE }, raw: true });
  if (!valrAccount) {
    console.error(`Ledger account ${VALR_FLOAT_CODE} (VALR USDC Float) not found. Run migration 20260207120001-create-valr-float-account first.`);
    process.exit(1);
  }

  await ensureUatFundingAccount();

  const entry = await ledgerService.postJournalEntry({
    reference: REFERENCE,
    description: `Load R${AMOUNT_RAND} into VALR USDC float (UAT)`,
    lines: [
      { accountCode: VALR_FLOAT_CODE, dc: 'debit', amount: AMOUNT_RAND, memo: 'VALR float funding (UAT)' },
      { accountCode: UAT_FUNDING_CODE, dc: 'credit', amount: AMOUNT_RAND, memo: 'UAT float funding source' }
    ]
  });

  const balance = await ledgerService.getAccountBalanceByCode(VALR_FLOAT_CODE);
  console.log(`Posted journal entry: ${entry.id}`);
  console.log(`VALR float (${VALR_FLOAT_CODE}) balance after load: R${Number(balance).toFixed(2)}`);
  console.log('\nDone. UAT can now run USDC send tests against the prefunded float.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
