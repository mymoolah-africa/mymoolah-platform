#!/usr/bin/env node
'use strict';

/**
 * Correct historical PayShap RPP ledger entries where the SBSA fee was posted
 * as MMTP cost/VAT instead of pass-through clearing.
 *
 * NON-DESTRUCTIVE: only INSERTs correcting journal entries.
 * IDEMPOTENT: correction references are unique and skipped if already posted.
 *
 * Usage:
 *   node scripts/correct-production-rpp-pass-through-ledger.js --production --dry-run
 *   node scripts/correct-production-rpp-pass-through-ledger.js --production --apply
 */

require('dotenv').config();
const path = require('path');
const dbHelper = require(path.resolve(__dirname, 'db-connection-helper'));

const ENV_ARG = process.argv.find(arg => ['--production'].includes(arg));
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

if (ENV_ARG !== '--production' || (!DRY_RUN && !APPLY)) {
  console.error('Usage: node scripts/correct-production-rpp-pass-through-ledger.js --production --dry-run');
  console.error('   or: node scripts/correct-production-rpp-pass-through-ledger.js --production --apply');
  process.exit(1);
}

const ACCOUNT_BANK = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';
const ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
const ACCOUNT_SBSA_COST = process.env.LEDGER_ACCOUNT_PAYSHAP_SBSA_COST || '5000-10-01';
const ACCOUNT_SBSA_CLEARING = process.env.LEDGER_ACCOUNT_PAYSHAP_SBSA_CLEARING || process.env.LEDGER_ACCOUNT_SUPPLIER_CLEARING || '2200-02-01';
const ACCOUNT_FEE_REVENUE = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE || '4000-20-01';
const ACCOUNT_VAT_CONTROL = process.env.LEDGER_ACCOUNT_VAT_CONTROL || '2300-10-01';

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function money(value) {
  return `R ${roundMoney(value).toFixed(2)}`;
}

function sum(lines, code, dc) {
  return roundMoney(lines
    .filter(line => line.code === code && (!dc || line.dc === dc))
    .reduce((total, line) => total + Number(line.amount), 0));
}

function correctionReference(entry) {
  return `CORR-RPP-PASS-${entry.id}`;
}

(async () => {
  console.log(`\nPayShap RPP pass-through correction (${DRY_RUN ? 'dry-run' : 'apply'})`);
  console.log('This script does not edit historical rows; it inserts correcting journal entries only.\n');

  const client = await dbHelper.getProductionClient();
  let eligible = 0;
  let skipped = 0;
  let posted = 0;
  let failed = 0;
  const totals = {
    sbsaCostDebit: 0,
    vatDebit: 0,
    sbsaClearingCredit: 0,
  };

  try {
    const accountsResult = await client.query(
      `SELECT id, code, name FROM ledger_accounts WHERE code = ANY($1::text[])`,
      [[
        ACCOUNT_BANK,
        ACCOUNT_CLIENT_FLOAT,
        ACCOUNT_SBSA_COST,
        ACCOUNT_SBSA_CLEARING,
        ACCOUNT_FEE_REVENUE,
        ACCOUNT_VAT_CONTROL,
      ]]
    );
    const accounts = new Map(accountsResult.rows.map(row => [row.code, row]));
    for (const code of [ACCOUNT_SBSA_COST, ACCOUNT_SBSA_CLEARING, ACCOUNT_VAT_CONTROL]) {
      if (!accounts.has(code)) throw new Error(`Required ledger account missing: ${code}`);
    }

    const entriesResult = await client.query(`
      SELECT
        je.id,
        je.reference,
        je.description,
        je."postedAt",
        json_agg(json_build_object(
          'accountId', jl."accountId",
          'code', la.code,
          'name', la.name,
          'dc', jl.dc,
          'amount', jl.amount,
          'memo', jl.memo
        ) ORDER BY jl.id) AS lines
      FROM journal_entries je
      JOIN journal_lines jl ON jl."entryId" = je.id
      JOIN ledger_accounts la ON la.id = jl."accountId"
      WHERE je.reference LIKE 'SBSA-RPP-%'
      GROUP BY je.id, je.reference, je.description, je."postedAt"
      ORDER BY je."postedAt", je.id
    `);

    const existingCorrections = await client.query(
      `SELECT reference FROM journal_entries WHERE reference LIKE 'CORR-RPP-PASS-%'`
    );
    const correctionRefs = new Set(existingCorrections.rows.map(row => row.reference));

    for (const entry of entriesResult.rows) {
      const lines = entry.lines || [];
      const ref = correctionReference(entry);
      const oldSbsaCostCredit = sum(lines, ACCOUNT_SBSA_COST, 'credit');
      const oldVatCredit = sum(lines, ACCOUNT_VAT_CONTROL, 'credit');
      const oldClearingCredit = sum(lines, ACCOUNT_SBSA_CLEARING, 'credit');

      if (correctionRefs.has(ref) || oldClearingCredit > 0 || oldSbsaCostCredit <= 0) {
        skipped++;
        continue;
      }

      const sbsaVatPortion = roundMoney(oldSbsaCostCredit * 0.15);
      if (oldVatCredit + 0.001 < sbsaVatPortion) {
        failed++;
        console.error(`SKIP ${entry.reference}: VAT credit ${money(oldVatCredit)} is less than SBSA VAT portion ${money(sbsaVatPortion)}`);
        continue;
      }

      const sbsaFeeVatIncl = roundMoney(oldSbsaCostCredit + sbsaVatPortion);
      const correctionLines = [
        {
          accountId: accounts.get(ACCOUNT_SBSA_COST).id,
          dc: 'debit',
          amount: oldSbsaCostCredit,
          memo: `Reverse historical RPP SBSA fee cost credit from ${entry.reference}`,
        },
        {
          accountId: accounts.get(ACCOUNT_VAT_CONTROL).id,
          dc: 'debit',
          amount: sbsaVatPortion,
          memo: `Reverse SBSA pass-through VAT from MMTP VAT control for ${entry.reference}`,
        },
        {
          accountId: accounts.get(ACCOUNT_SBSA_CLEARING).id,
          dc: 'credit',
          amount: sbsaFeeVatIncl,
          memo: `Reclassify SBSA RPP fee as pass-through payable for ${entry.reference}`,
        },
      ];

      eligible++;
      totals.sbsaCostDebit = roundMoney(totals.sbsaCostDebit + oldSbsaCostCredit);
      totals.vatDebit = roundMoney(totals.vatDebit + sbsaVatPortion);
      totals.sbsaClearingCredit = roundMoney(totals.sbsaClearingCredit + sbsaFeeVatIncl);

      if (DRY_RUN) {
        console.log(`DRY  ${ref}: DR ${ACCOUNT_SBSA_COST} ${money(oldSbsaCostCredit)}, DR ${ACCOUNT_VAT_CONTROL} ${money(sbsaVatPortion)}, CR ${ACCOUNT_SBSA_CLEARING} ${money(sbsaFeeVatIncl)}`);
        continue;
      }

      try {
        await client.query('BEGIN');
        const je = await client.query(
          `INSERT INTO journal_entries (reference, description, "postedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, NOW(), NOW(), NOW()) RETURNING id`,
          [ref, `Correct PayShap RPP SBSA fee pass-through treatment for ${entry.reference}`]
        );
        for (const line of correctionLines) {
          await client.query(
            `INSERT INTO journal_lines ("entryId", "accountId", dc, amount, memo, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [je.rows[0].id, line.accountId, line.dc, line.amount, line.memo]
          );
        }
        await client.query('COMMIT');
        posted++;
        console.log(`POST ${ref}: ${money(sbsaFeeVatIncl)}`);
      } catch (err) {
        await client.query('ROLLBACK');
        failed++;
        console.error(`FAIL ${ref}: ${err.message}`);
      }
    }

    console.log('\nSummary');
    console.log(`Found RPP journal entries: ${entriesResult.rowCount}`);
    console.log(`Eligible corrections: ${eligible}`);
    console.log(`${DRY_RUN ? 'Would post' : 'Posted'} corrections: ${DRY_RUN ? eligible : posted}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed/manual review: ${failed}`);
    console.log(`DR ${ACCOUNT_SBSA_COST}: ${money(totals.sbsaCostDebit)}`);
    console.log(`DR ${ACCOUNT_VAT_CONTROL}: ${money(totals.vatDebit)}`);
    console.log(`CR ${ACCOUNT_SBSA_CLEARING}: ${money(totals.sbsaClearingCredit)}`);
  } finally {
    client.release();
    await dbHelper.closeAll();
  }
})().catch(err => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
