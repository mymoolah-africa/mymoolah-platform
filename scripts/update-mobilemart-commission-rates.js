#!/usr/bin/env node
/**
 * Update MobileMart Commission Rates in product_variants
 *
 * Sets contractual commission rates from MobileMart Annexure A (August 2024).
 * All MobileMart airtime/data/voucher rates are VAT-INCLUSIVE.
 *
 * Usage (proxies must be running):
 *   node scripts/update-mobilemart-commission-rates.js --uat
 *   node scripts/update-mobilemart-commission-rates.js --staging
 *   node scripts/update-mobilemart-commission-rates.js --production
 *   node scripts/update-mobilemart-commission-rates.js --all
 *
 * Safe to re-run (idempotent).
 */

require('dotenv').config();
const {
  getUATClient, getStagingClient, getProductionClient,
} = require('./db-connection-helper');

// ── MobileMart contractual rates (Annexure A, effective 1 Aug 2024) ──────
// "All pricing includes VAT unless otherwise stated."

const CELLULAR_RATES = {
  'Vodacom':  4.50,
  'vodacom':  4.50,
  'MTN':      4.50,
  'mtn':      4.50,
  'Telkom':   3.50,
  'telkom':   3.50,
  'Telkom Mobile': 3.50,
  'Cell C':   4.80,
  'CellC':    4.80,
  'cell c':   4.80,
  'cellc':    4.80,
};

const VOUCHER_RATES = {
  'Bok Squad':        10.00,
  'Hollywood Bets':    5.00,
  'HollywoodBets':     5.00,
  'PUBG':              5.00,
  'Showmax':           5.00,
  'Roblox':            4.50,
  'Spotify':           4.50,
  'Lottostar':         4.00,
  'Supabets':          4.00,
  'Sorbet':            4.00,
  'Ticketmaster':      4.00,
  'iTunes':            3.50,
  'OTT':               3.50,
  'Flybet':            3.50,
  'Netflix':           3.00,
  'PlayStation':       3.00,
  'Fifa Mobile':       3.00,
  'Razer Gold':        2.50,
  'Free Fire':         2.50,
  'Steam':             2.50,
  'Lottoland':         2.50,
  'Google':            2.20,
  'Uber':              2.00,
  'Pro Shop':          2.00,
  'Blu Voucher':       1.80,
  'Ringas':            1.80,
  'Cycle Lab':         1.50,
  'Makro':             1.00,
  'Pick n Pay':        1.00,
};

// DStv/Multichoice — fixed R3.30 per transaction (incl. VAT)
const DSTV_FIXED_CENTS = 330;

async function updateEnvironment(getClient, envName) {
  const client = await getClient();
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Updating MobileMart commission rates: ${envName.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    const { rows: suppliers } = await client.query(
      `SELECT id FROM suppliers WHERE code = 'MOBILEMART' AND "isActive" = true LIMIT 1`
    );
    if (suppliers.length === 0) {
      console.log(`  No active MOBILEMART supplier found in ${envName} — skipping`);
      return { updated: 0, skipped: true };
    }
    const mmSupplierId = suppliers[0].id;
    console.log(`  MobileMart supplier ID: ${mmSupplierId}`);

    let totalUpdated = 0;

    // ── 1. Cellular airtime + data (per-network rates) ──────────────
    const networkRates = [
      { providers: ['Vodacom', 'vodacom'], rate: 4.50 },
      { providers: ['MTN', 'mtn'], rate: 4.50 },
      { providers: ['Telkom', 'telkom', 'Telkom Mobile'], rate: 3.50 },
      { providers: ['Cell C', 'CellC', 'cell c', 'cellc'], rate: 4.80 },
    ];

    for (const { providers, rate } of networkRates) {
      for (const provider of providers) {
        const { rowCount } = await client.query(
          `UPDATE product_variants
           SET commission = $1,
               "commissionType" = 'percentage',
               pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', $2::text::jsonb)
           WHERE "supplierId" = $3
             AND "vasType" IN ('airtime', 'data')
             AND LOWER(provider) = LOWER($4)`,
          [rate, JSON.stringify(rate), mmSupplierId, provider]
        );
        if (rowCount > 0) {
          console.log(`  Cellular ${provider}: ${rowCount} variants → ${rate}%`);
          totalUpdated += rowCount;
        }
      }
    }

    // ── 2. Vouchers (percentage) ────────────────────────────────────
    for (const [name, rate] of Object.entries(VOUCHER_RATES)) {
      const { rowCount } = await client.query(
        `UPDATE product_variants
         SET commission = $1,
             "commissionType" = 'percentage',
             pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', $2::text::jsonb)
         WHERE "supplierId" = $3
           AND "vasType" IN ('voucher', 'gaming', 'streaming')
           AND (
             LOWER(provider) LIKE LOWER($4)
             OR LOWER(metadata->>'mobilemart_product_name') LIKE LOWER($4)
             OR LOWER(metadata->>'mobilemart_content_creator') LIKE LOWER($4)
           )`,
        [rate, JSON.stringify(rate), mmSupplierId, `%${name}%`]
      );
      if (rowCount > 0) {
        console.log(`  Voucher ${name}: ${rowCount} variants → ${rate}%`);
        totalUpdated += rowCount;
      }
    }

    // ── 3. DStv/Multichoice (fixed R3.30) ───────────────────────────
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
           OR LOWER(provider) LIKE '%multichoice%'
           OR LOWER(metadata->>'mobilemart_product_name') LIKE '%dstv%'
           OR LOWER(metadata->>'mobilemart_product_name') LIKE '%multichoice%'
         )`,
      [DSTV_FIXED_CENTS, mmSupplierId]
    );
    if (dstvResult.rowCount > 0) {
      console.log(`  DStv/Multichoice: ${dstvResult.rowCount} variants → R3.30 fixed`);
      totalUpdated += dstvResult.rowCount;
    }

    // ── 4. Bill payments — default R1.90 per transaction ────────────
    // Most bill payments are R1.90 or R1.00. Set R1.90 as default for all
    // bill_payment variants that haven't been set above (DStv handled separately).
    const billResult = await client.query(
      `UPDATE product_variants
       SET "commissionType" = 'fixed_amount',
           "fixedFee" = 190,
           commission = 0,
           pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', '0'::jsonb)
       WHERE "supplierId" = $1
         AND "vasType" = 'bill_payment'
         AND "fixedFee" = 0
         AND commission <= 2.50`,
      [mmSupplierId]
    );
    if (billResult.rowCount > 0) {
      console.log(`  Bill payments (default R1.90): ${billResult.rowCount} variants`);
      totalUpdated += billResult.rowCount;
    }

    // ── 5. Electricity — varies by municipality, set reasonable default ──
    // Electricity commissions range from R0.01/unit to 1.50% of face value.
    // Most Ontec municipalities: R0.01/unit. Most Syntell: 1.50%. Most Blue Label: 0.35-1.50%.
    // Setting 1.00% as a reasonable weighted average for now.
    const elecResult = await client.query(
      `UPDATE product_variants
       SET commission = 1.00,
           "commissionType" = 'percentage',
           pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), '{defaultCommissionRate}', '1.00'::jsonb)
       WHERE "supplierId" = $1
         AND "vasType" = 'electricity'
         AND commission <= 2.50`,
      [mmSupplierId]
    );
    if (elecResult.rowCount > 0) {
      console.log(`  Electricity (avg 1.00%): ${elecResult.rowCount} variants`);
      totalUpdated += elecResult.rowCount;
    }

    // ── Summary ─────────────────────────────────────────────────────
    const { rows: remaining } = await client.query(
      `SELECT COUNT(*) as cnt FROM product_variants
       WHERE "supplierId" = $1 AND commission = 2.50 AND status = 'active'`,
      [mmSupplierId]
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
