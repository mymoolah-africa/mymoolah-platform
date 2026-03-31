#!/usr/bin/env node
/**
 * Update Flash Commission Rates in product_variants
 *
 * Sets contractual commission rates from the Flash agreement (March 2026).
 * All rates are VAT-inclusive unless noted otherwise.
 *
 * Usage (proxies must be running):
 *   node scripts/update-flash-commission-rates.js --uat
 *   node scripts/update-flash-commission-rates.js --staging
 *   node scripts/update-flash-commission-rates.js --production
 *   node scripts/update-flash-commission-rates.js --all
 *
 * Safe to re-run (idempotent).
 */

require('dotenv').config();
const {
  getUATClient, getStagingClient, getProductionClient,
} = require('./db-connection-helper');

// ── Flash contractual rates (VAT-inclusive) ────────────────────────────────
const CELLULAR_RATE = 3.00;

const CELLULAR_PROVIDERS = [
  'Cell C', 'CellC', 'cell c',
  'MTN', 'mtn',
  'Telkom', 'telkom', 'Telkom Mobile',
  'Vodacom', 'vodacom',
  'FNB Connect', 'fnb connect',
];

const EEZI_AIRTIME_DATA_RATE = 3.50;
const EEZI_POWER_RATE = 1.00;
const ELECTRICITY_RATE = 0.85;

const GIFT_VOUCHER_RATES = {
  'Amazon':               2.80,
  'Apple':                4.50,
  'BettaBets':            4.10,
  'Betway':               3.00,
  'BLU':                  3.00,
  'Bolt':                 3.50,
  'EasyBet':              4.10,
  'EasyLoad':             3.50,
  'EA FC Mobile':         4.80,
  'Free Fire':            3.50,
  'Gbets':                3.50,
  'Google Play':          3.10,
  'Gold Rush':            3.50,
  'HollywoodBets':        3.00,
  'Lottostar':            3.50,
  'Netflix':              3.25,
  'OTT':                  3.00,
  'Playstation':          3.50,
  'PubG':                 7.00,
  'Razer Gold':           3.50,
  'Roblox':               6.00,
  'Showmax':              3.10,
  'Steam':                3.50,
  'Supabets':             3.80,
  'Takealot':             2.40,
  'Uber':                 2.80,
  'Uber Eats':            2.80,
  'World Sports Betting': 3.50,
  'YesPlay':              3.00,
};

const FLASH_PAY_RATES = {
  'Nyaradzo':             4.10,
  'Ackermans':            2.50,
  'PEP':                  2.50,
  'Talk360':              6.00,
  'Intercape':            5.00,
  'Ria Sikhona':          0.40,
};

// Fixed-amount commissions (cents)
const FIXED_COMMISSION_PRODUCTS = {
  'Flash Token':          300,   // R3.00
  'DSTV':                 300,   // R3.00
};

// Municipality range: R2.00-R2.50 — using R2.00 as default
const MUNICIPALITY_FIXED_CENTS = 200;

const ONEVOUCHER_RATE = 1.00;

async function updateEnvironment(getClient, envName) {
  const client = await getClient();
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Updating Flash commission rates: ${envName.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    // Find Flash supplier ID
    const { rows: suppliers } = await client.query(
      `SELECT id FROM suppliers WHERE code = 'FLASH' AND "isActive" = true LIMIT 1`
    );
    if (suppliers.length === 0) {
      console.log(`  No active FLASH supplier found in ${envName} — skipping`);
      return { updated: 0, skipped: true };
    }
    const flashSupplierId = suppliers[0].id;
    console.log(`  Flash supplier ID: ${flashSupplierId}`);

    let totalUpdated = 0;

    // ── 1. Cellular (airtime + data) ─────────────────────────────────
    for (const provider of CELLULAR_PROVIDERS) {
      const { rowCount } = await client.query(
        `UPDATE product_variants
         SET commission = $1,
             "commissionType" = 'percentage',
             pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', $2::text::jsonb)
         WHERE "supplierId" = $3
           AND "vasType" IN ('airtime', 'data')
           AND LOWER(provider) = LOWER($4)`,
        [CELLULAR_RATE, JSON.stringify(CELLULAR_RATE), flashSupplierId, provider]
      );
      if (rowCount > 0) {
        console.log(`  Cellular ${provider}: ${rowCount} variants → ${CELLULAR_RATE}%`);
        totalUpdated += rowCount;
      }
    }

    // ── 2. Electricity ──────────────────────────────────────────────
    const elecResult = await client.query(
      `UPDATE product_variants
       SET commission = $1,
           "commissionType" = 'percentage',
           pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', $2::text::jsonb)
       WHERE "supplierId" = $3
         AND "vasType" = 'electricity'`,
      [ELECTRICITY_RATE, JSON.stringify(ELECTRICITY_RATE), flashSupplierId]
    );
    if (elecResult.rowCount > 0) {
      console.log(`  Electricity: ${elecResult.rowCount} variants → ${ELECTRICITY_RATE}%`);
      totalUpdated += elecResult.rowCount;
    }

    // ── 3. Gift Vouchers ────────────────────────────────────────────
    for (const [name, rate] of Object.entries(GIFT_VOUCHER_RATES)) {
      const { rowCount } = await client.query(
        `UPDATE product_variants
         SET commission = $1,
             "commissionType" = 'percentage',
             pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', $2::text::jsonb)
         WHERE "supplierId" = $3
           AND "vasType" IN ('voucher', 'gaming', 'streaming')
           AND (
             LOWER(provider) LIKE LOWER($4)
             OR LOWER(metadata->>'flash_product_name') LIKE LOWER($4)
           )`,
        [rate, JSON.stringify(rate), flashSupplierId, `%${name}%`]
      );
      if (rowCount > 0) {
        console.log(`  Gift Voucher ${name}: ${rowCount} variants → ${rate}%`);
        totalUpdated += rowCount;
      }
    }

    // ── 4. Flash Token (fixed R3.00) ────────────────────────────────
    const tokenResult = await client.query(
      `UPDATE product_variants
       SET "commissionType" = 'fixed_amount',
           "fixedFee" = $1,
           commission = 0,
           pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', '0'::jsonb)
       WHERE "supplierId" = $2
         AND (
           LOWER(provider) LIKE '%flash token%'
           OR LOWER(metadata->>'flash_product_name') LIKE '%flash token%'
         )`,
      [FIXED_COMMISSION_PRODUCTS['Flash Token'], flashSupplierId]
    );
    if (tokenResult.rowCount > 0) {
      console.log(`  Flash Token: ${tokenResult.rowCount} variants → R3.00 fixed`);
      totalUpdated += tokenResult.rowCount;
    }

    // ── 5. DSTV (fixed R3.00) ───────────────────────────────────────
    const dstvResult = await client.query(
      `UPDATE product_variants
       SET "commissionType" = 'fixed_amount',
           "fixedFee" = $1,
           commission = 0,
           pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', '0'::jsonb)
       WHERE "supplierId" = $2
         AND "vasType" = 'bill_payment'
         AND (
           LOWER(provider) LIKE '%dstv%'
           OR LOWER(metadata->>'flash_product_name') LIKE '%dstv%'
         )`,
      [FIXED_COMMISSION_PRODUCTS['DSTV'], flashSupplierId]
    );
    if (dstvResult.rowCount > 0) {
      console.log(`  DSTV: ${dstvResult.rowCount} variants → R3.00 fixed`);
      totalUpdated += dstvResult.rowCount;
    }

    // ── 6. Flash Pay bill_payment (percentage) ──────────────────────
    for (const [name, rate] of Object.entries(FLASH_PAY_RATES)) {
      const { rowCount } = await client.query(
        `UPDATE product_variants
         SET commission = $1,
             "commissionType" = 'percentage',
             pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', $2::text::jsonb)
         WHERE "supplierId" = $3
           AND "vasType" = 'bill_payment'
           AND (
             LOWER(provider) LIKE LOWER($4)
             OR LOWER(metadata->>'flash_product_name') LIKE LOWER($4)
           )`,
        [rate, JSON.stringify(rate), flashSupplierId, `%${name}%`]
      );
      if (rowCount > 0) {
        console.log(`  Flash Pay ${name}: ${rowCount} variants → ${rate}%`);
        totalUpdated += rowCount;
      }
    }

    // ── 7. Municipalities (fixed R2.00) ─────────────────────────────
    const muniResult = await client.query(
      `UPDATE product_variants
       SET "commissionType" = 'fixed_amount',
           "fixedFee" = $1,
           commission = 0,
           pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', '0'::jsonb)
       WHERE "supplierId" = $2
         AND "vasType" = 'bill_payment'
         AND (
           LOWER(provider) LIKE '%municipality%'
           OR LOWER(metadata->>'flash_product_name') LIKE '%municipality%'
           OR LOWER(metadata->>'flash_product_name') LIKE '%metro%'
         )`,
      [MUNICIPALITY_FIXED_CENTS, flashSupplierId]
    );
    if (muniResult.rowCount > 0) {
      console.log(`  Municipalities: ${muniResult.rowCount} variants → R2.00 fixed`);
      totalUpdated += muniResult.rowCount;
    }

    // ── 8. 1Voucher / FNB Voucher (1%) ─────────────────────────────
    const oneVoucherResult = await client.query(
      `UPDATE product_variants
       SET commission = $1,
           "commissionType" = 'percentage',
           pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', $2::text::jsonb)
       WHERE "supplierId" = $3
         AND (
           LOWER(provider) LIKE '%1voucher%'
           OR LOWER(provider) LIKE '%fnb voucher%'
           OR LOWER(metadata->>'flash_product_name') LIKE '%1voucher%'
           OR LOWER(metadata->>'flash_product_name') LIKE '%fnb voucher%'
         )`,
      [ONEVOUCHER_RATE, JSON.stringify(ONEVOUCHER_RATE), flashSupplierId]
    );
    if (oneVoucherResult.rowCount > 0) {
      console.log(`  1Voucher/FNB Voucher: ${oneVoucherResult.rowCount} variants → ${ONEVOUCHER_RATE}%`);
      totalUpdated += oneVoucherResult.rowCount;
    }

    // ── Summary ─────────────────────────────────────────────────────
    const { rows: remaining } = await client.query(
      `SELECT COUNT(*) as cnt FROM product_variants
       WHERE "supplierId" = $1 AND commission = 2.50 AND status = 'active'`,
      [flashSupplierId]
    );
    const stillDefault = Number(remaining[0]?.cnt || 0);

    console.log(`\n  ${envName.toUpperCase()} Summary:`);
    console.log(`    Updated: ${totalUpdated} product_variants`);
    console.log(`    Still at default 2.50%: ${stillDefault} active variants`);

    return { updated: totalUpdated, stillDefault };
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
