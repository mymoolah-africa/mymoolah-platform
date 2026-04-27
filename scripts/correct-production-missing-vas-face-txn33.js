#!/usr/bin/env node
'use strict';

/**
 * Correct the missing VAS face-value journal for production TXN#33.
 *
 * NON-DESTRUCTIVE: inserts one balanced journal entry only.
 * IDEMPOTENT: refuses to apply if the correction reference already exists.
 *
 * Usage:
 *   node scripts/correct-production-missing-vas-face-txn33.js --production --dry-run
 *   node scripts/correct-production-missing-vas-face-txn33.js --production --apply
 */

require('dotenv').config();
const path = require('path');
const dbHelper = require(path.resolve(__dirname, 'db-connection-helper'));

const ENV_ARG = process.argv.find(arg => arg === '--production');
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

if (ENV_ARG !== '--production' || (!DRY_RUN && !APPLY) || (DRY_RUN && APPLY)) {
  console.error('Usage: node scripts/correct-production-missing-vas-face-txn33.js --production --dry-run');
  console.error('   or: node scripts/correct-production-missing-vas-face-txn33.js --production --apply');
  process.exit(1);
}

const TARGET_TRANSACTION_ID = 33;
const TARGET_WALLET_TRANSACTION_ID = 'TXN-1775385125460-oiwqno';
const TARGET_VAS_TRANSACTION_ID = 'VAS-1775385125439-bd3wsh';
const CORRECTION_REFERENCE = `VAS-FACE-${TARGET_WALLET_TRANSACTION_ID}`;
const ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
const ACCOUNT_MOBILEMART_FLOAT = process.env.LEDGER_ACCOUNT_MOBILEMART_FLOAT || '1200-10-05';
const EXPECTED_AMOUNT = 50.00;

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function money(value) {
  return `R ${roundMoney(value).toFixed(2)}`;
}

async function validateSourceData(client) {
  const accountsResult = await client.query(
    `SELECT id, code, name FROM ledger_accounts WHERE code = ANY($1::text[])`,
    [[ACCOUNT_CLIENT_FLOAT, ACCOUNT_MOBILEMART_FLOAT]]
  );
  const accounts = new Map(accountsResult.rows.map(row => [row.code, row]));
  for (const code of [ACCOUNT_CLIENT_FLOAT, ACCOUNT_MOBILEMART_FLOAT]) {
    if (!accounts.has(code)) {
      throw new Error(`Required ledger account missing: ${code}`);
    }
  }

  const txnResult = await client.query(
    `SELECT id, "transactionId", type, amount, status, description, metadata
     FROM transactions
     WHERE id = $1 AND "transactionId" = $2`,
    [TARGET_TRANSACTION_ID, TARGET_WALLET_TRANSACTION_ID]
  );
  if (txnResult.rowCount !== 1) {
    throw new Error(`Target transaction not found: #${TARGET_TRANSACTION_ID} / ${TARGET_WALLET_TRANSACTION_ID}`);
  }
  const txn = txnResult.rows[0];
  if (txn.status !== 'completed') {
    throw new Error(`Target transaction status is ${txn.status}, expected completed`);
  }
  if (!['payment', 'purchase'].includes(txn.type)) {
    throw new Error(`Target transaction type is ${txn.type}, expected payment/purchase`);
  }
  if (roundMoney(txn.amount) !== EXPECTED_AMOUNT) {
    throw new Error(`Target transaction amount is ${money(txn.amount)}, expected ${money(EXPECTED_AMOUNT)}`);
  }

  const vasResult = await client.query(
    `SELECT id, "transactionId", "vasType", amount, status, metadata
     FROM vas_transactions
     WHERE "transactionId" = $1`,
    [TARGET_VAS_TRANSACTION_ID]
  );
  if (vasResult.rowCount !== 1) {
    throw new Error(`Target VAS transaction not found: ${TARGET_VAS_TRANSACTION_ID}`);
  }
  const vas = vasResult.rows[0];
  if (vas.status !== 'completed') {
    throw new Error(`Target VAS transaction status is ${vas.status}, expected completed`);
  }
  if (roundMoney(Number(vas.amount) / 100) !== EXPECTED_AMOUNT) {
    throw new Error(`Target VAS amount is ${money(Number(vas.amount) / 100)}, expected ${money(EXPECTED_AMOUNT)}`);
  }
  if ((vas.metadata || {}).walletTransactionId !== TARGET_WALLET_TRANSACTION_ID) {
    throw new Error(`Target VAS walletTransactionId does not match ${TARGET_WALLET_TRANSACTION_ID}`);
  }

  const existingReference = await client.query(
    `SELECT id, reference FROM journal_entries WHERE reference = $1`,
    [CORRECTION_REFERENCE]
  );
  if (existingReference.rowCount > 0) {
    throw new Error(`Correction journal already exists: ${CORRECTION_REFERENCE}`);
  }

  const existingFaceByBusinessId = await client.query(
    `SELECT id, reference, description
     FROM journal_entries
     WHERE reference ILIKE ANY($1::text[])
        OR description ILIKE ANY($1::text[])`,
    [[
      `%${TARGET_WALLET_TRANSACTION_ID}%`,
      `%${TARGET_VAS_TRANSACTION_ID}%`,
      '%TXN#33%',
    ]]
  );

  return {
    accounts,
    txn,
    vas,
    relatedJournals: existingFaceByBusinessId.rows,
  };
}

(async () => {
  console.log(`\nMissing VAS face-value journal correction for TXN#33 (${DRY_RUN ? 'dry-run' : 'apply'})`);
  console.log('This script does not update or delete historical rows; it inserts one balanced journal entry only.\n');

  const client = await dbHelper.getProductionClient();

  try {
    const validation = await validateSourceData(client);

    console.log('Validated source data:');
    console.log(`  Transaction: #${validation.txn.id} ${validation.txn.transactionId} ${validation.txn.type} ${money(validation.txn.amount)} (${validation.txn.status})`);
    console.log(`  VAS: ${validation.vas.transactionId} ${validation.vas.vasType} ${money(Number(validation.vas.amount) / 100)} (${validation.vas.status})`);
    console.log(`  Accounts: DR ${ACCOUNT_CLIENT_FLOAT}, CR ${ACCOUNT_MOBILEMART_FLOAT}`);

    if (validation.relatedJournals.length > 0) {
      console.log('\nRelated existing journals found for context:');
      validation.relatedJournals.forEach(row => {
        console.log(`  #${row.id} ${row.reference} — ${row.description}`);
      });
    }

    const correctionLines = [
      {
        accountId: validation.accounts.get(ACCOUNT_CLIENT_FLOAT).id,
        dc: 'debit',
        amount: EXPECTED_AMOUNT,
        memo: `Correct missing VAS face value debit for TXN#${TARGET_TRANSACTION_ID}`,
      },
      {
        accountId: validation.accounts.get(ACCOUNT_MOBILEMART_FLOAT).id,
        dc: 'credit',
        amount: EXPECTED_AMOUNT,
        memo: `Correct MobileMart float consumption for ${TARGET_VAS_TRANSACTION_ID}`,
      },
    ];

    console.log('\nCorrection journal to post:');
    console.log(`  Reference: ${CORRECTION_REFERENCE}`);
    correctionLines.forEach(line => {
      const accountCode = line.accountId === validation.accounts.get(ACCOUNT_CLIENT_FLOAT).id
        ? ACCOUNT_CLIENT_FLOAT
        : ACCOUNT_MOBILEMART_FLOAT;
      console.log(`  ${line.dc.toUpperCase()} ${accountCode} ${money(line.amount)} — ${line.memo}`);
    });

    if (DRY_RUN) {
      console.log('\nDRY RUN ONLY: no production rows were inserted.');
      return;
    }

    await client.query('BEGIN');
    try {
      const je = await client.query(
        `INSERT INTO journal_entries (reference, description, "postedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, NOW(), NOW(), NOW())
         RETURNING id`,
        [
          CORRECTION_REFERENCE,
          `Correct missing VAS face value journal for TXN#${TARGET_TRANSACTION_ID} / ${TARGET_VAS_TRANSACTION_ID}`,
        ]
      );

      for (const line of correctionLines) {
        await client.query(
          `INSERT INTO journal_lines ("entryId", "accountId", dc, amount, memo, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [je.rows[0].id, line.accountId, line.dc, line.amount, line.memo]
        );
      }

      await client.query('COMMIT');
      console.log(`\nPOSTED ${CORRECTION_REFERENCE}: ${money(EXPECTED_AMOUNT)}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    client.release();
    await dbHelper.closeAll();
  }
})().catch(error => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
