#!/usr/bin/env node
/**
 * Update eeziCash Fees in supplier_fee_schedule
 *
 * Flash contract (March 2026) specifies:
 *   - R0.50 token generation fee (VAT exclusive)
 *   - R4.50 token redemption fee (VAT exclusive)
 *
 * These are costs MyMoolah PAYS to Flash, stored in supplier_fee_schedule.
 * The customer-facing R8.00 fee is handled in flashController.js (purchaseCashOutPin).
 *
 * Usage (proxies must be running):
 *   node scripts/update-eezicash-fees.js --uat
 *   node scripts/update-eezicash-fees.js --staging
 *   node scripts/update-eezicash-fees.js --production
 *   node scripts/update-eezicash-fees.js --all
 *
 * Safe to re-run (idempotent — upsert pattern).
 */

require('dotenv').config();
const {
  getUATClient, getStagingClient, getProductionClient,
} = require('./db-connection-helper');

const EEZICASH_FEES = [
  { serviceType: 'eezi_voucher', feeType: 'token_generation',  amountCents: 50,  isVatExclusive: true },
  { serviceType: 'eezi_voucher', feeType: 'token_redemption',  amountCents: 450, isVatExclusive: true },
  { serviceType: 'cash_out',    feeType: 'token_generation',  amountCents: 50,  isVatExclusive: true },
  { serviceType: 'cash_out',    feeType: 'token_redemption',  amountCents: 450, isVatExclusive: true },
];

async function updateEnvironment(getClient, envName) {
  const client = await getClient();
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Updating eeziCash fees: ${envName.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    const { rows: suppliers } = await client.query(
      `SELECT id FROM suppliers WHERE code = 'FLASH' AND "isActive" = true LIMIT 1`
    );
    if (suppliers.length === 0) {
      console.log(`  No active FLASH supplier found in ${envName} — skipping`);
      return;
    }
    const flashSupplierId = suppliers[0].id;
    console.log(`  Flash supplier ID: ${flashSupplierId}`);

    let upserted = 0;

    for (const fee of EEZICASH_FEES) {
      const { rowCount } = await client.query(
        `UPDATE supplier_fee_schedule
         SET "amountCents" = $1, "isVatExclusive" = $2, "isActive" = true, "updatedAt" = NOW()
         WHERE "supplierId" = $3 AND "serviceType" = $4 AND "feeType" = $5`,
        [fee.amountCents, fee.isVatExclusive, flashSupplierId, fee.serviceType, fee.feeType]
      );

      if (rowCount === 0) {
        try {
          await client.query(
            `INSERT INTO supplier_fee_schedule ("supplierId", "serviceType", "feeType", "amountCents", "isVatExclusive", "isActive", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
            [flashSupplierId, fee.serviceType, fee.feeType, fee.amountCents, fee.isVatExclusive]
          );
          console.log(`  INSERT ${fee.serviceType}/${fee.feeType}: ${fee.amountCents}c (VAT ${fee.isVatExclusive ? 'excl' : 'incl'})`);
        } catch (dupErr) {
          if (dupErr.code !== '23505') throw dupErr;
          console.log(`  ${fee.serviceType}/${fee.feeType}: already exists — skipped`);
        }
      } else {
        console.log(`  UPDATE ${fee.serviceType}/${fee.feeType}: ${fee.amountCents}c (VAT ${fee.isVatExclusive ? 'excl' : 'incl'})`);
      }
      upserted++;
    }

    console.log(`\n  ${envName.toUpperCase()} Summary: ${upserted} fee rows upserted`);
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runUat = args.includes('--uat') || args.includes('--all') || args.length === 0;
  const runStaging = args.includes('--staging') || args.includes('--all');
  const runProduction = args.includes('--production') || args.includes('--all');

  try {
    if (runUat) await updateEnvironment(getUATClient, 'UAT');
    if (runStaging) await updateEnvironment(getStagingClient, 'Staging');
    if (runProduction) await updateEnvironment(getProductionClient, 'Production');
    console.log('\nDone.');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
