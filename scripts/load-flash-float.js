#!/usr/bin/env node
'use strict';

/**
 * Load R1000 into the Flash float account (1200-10-04) for UAT/Staging testing.
 * Posts a double-entry journal: Debit Flash float R1000, Credit UAT funding source R1000.
 *
 * Uses db-connection-helper.js for database connection.
 *
 * Usage:
 *   node scripts/load-flash-float.js             # UAT
 *   node scripts/load-flash-float.js --staging   # Staging
 *
 * Requires: .env with DATABASE_URL or DB_PASSWORD; proxy running for UAT/Staging.
 * Flash float ledger account 1200-10-04 must exist (migration 20260115_seed_supplier_float_ledger_accounts).
 */

const { getUATDatabaseURL, getStagingDatabaseURL, closeAll } = require('./db-connection-helper');

const isStaging = process.argv.includes('--staging');
process.env.DATABASE_URL = isStaging ? getStagingDatabaseURL() : getUATDatabaseURL();

const ledgerService = require('../services/ledgerService');
const { LedgerAccount, SupplierFloat } = require('../models');
const { Op } = require('sequelize');

const FLASH_FLOAT_CODE  = '1200-10-04';
const UAT_FUNDING_CODE  = '9999-00-01';
const UAT_FUNDING_NAME  = 'UAT Float Funding Source';
const AMOUNT_RAND       = 1000;

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
  const target = isStaging ? 'Staging' : 'UAT';
  console.log(`Loading R${AMOUNT_RAND} into Flash float (${FLASH_FLOAT_CODE}) for ${target}...\n`);

  const flashAccount = await LedgerAccount.findOne({ where: { code: FLASH_FLOAT_CODE }, raw: true });
  if (!flashAccount) {
    console.error(
      `Ledger account ${FLASH_FLOAT_CODE} (Flash Float) not found.\n` +
      `Run migration 20260115_seed_supplier_float_ledger_accounts first.`
    );
    process.exit(1);
  }

  await ensureUatFundingAccount();

  const reference = `FLASH-FLOAT-LOAD-${AMOUNT_RAND}-${target}-${Date.now()}`;
  const entry = await ledgerService.postJournalEntry({
    reference,
    description: `Load R${AMOUNT_RAND} into Flash float (${target})`,
    lines: [
      { accountCode: FLASH_FLOAT_CODE, dc: 'debit',  amount: AMOUNT_RAND, memo: 'Flash float funding' },
      { accountCode: UAT_FUNDING_CODE,  dc: 'credit', amount: AMOUNT_RAND, memo: 'UAT float funding source' }
    ]
  });

  const balance = await ledgerService.getAccountBalanceByCode(FLASH_FLOAT_CODE);
  console.log(`Posted journal entry: ${entry.id}`);
  console.log(`Flash float ledger (${FLASH_FLOAT_CODE}) balance: R${Number(balance).toFixed(2)}`);

  // Sync SupplierFloat.currentBalance so monitoring and checks reflect the same balance
  let flashFloat = await SupplierFloat.findOne({ where: { supplierId: { [Op.iLike]: 'flash' } } });
  if (!flashFloat) {
    flashFloat = await SupplierFloat.create({
      supplierId: 'flash',
      supplierName: 'Flash',
      floatAccountNumber: 'FLASH_FLOAT_001',
      floatAccountName: 'Flash VAS Float',
      ledgerAccountCode: FLASH_FLOAT_CODE,
      currentBalance: 0,
      initialBalance: 0,
      minimumBalance: 1000,
      maximumBalance: 500000,
      settlementPeriod: 'real_time',
      settlementMethod: 'prefunded',
      status: 'active',
      isActive: true,
      metadata: { supplierType: 'vas_provider', createdBy: 'load-flash-float' }
    });
    console.log(`Created Flash SupplierFloat (${flashFloat.floatAccountNumber}) — was missing in ${target}.`);
  }
  await flashFloat.updateBalance(AMOUNT_RAND, 'credit');
  await flashFloat.reload();
  console.log(`SupplierFloat (${flashFloat.floatAccountNumber}) credited R${AMOUNT_RAND}; new balance: R${parseFloat(flashFloat.currentBalance).toFixed(2)}`);

  console.log(`\nDone. ${target} can now run Flash VAS tests against the prefunded float.`);
}

main()
  .then(() => closeAll())
  .catch((err) => {
    console.error('Error:', err.message);
    if (err.errors) console.error('Details:', JSON.stringify(err.errors, null, 2));
    process.exit(1);
  });
