#!/usr/bin/env node
/**
 * Update MobileMart Commission Tiers in supplier_commission_tiers
 *
 * This table is what supplierPricingService.getCommissionInfo() reads
 * at purchase time. Upserts rows per MobileMart service type with contractual rates.
 *
 * MobileMart Annexure A (effective 1 Aug 2024):
 *   Airtime/Data: Vodacom 4.5%, MTN 4.5%, Cell C 4.8%, Telkom 3.5% (all incl. VAT)
 *   For service-level tiers we use 4.5% as default (MTN/Vodacom — highest volume).
 *   Product-specific tiers override per network where rates differ.
 *
 * Usage (proxies must be running):
 *   node scripts/update-mobilemart-commission-tiers.js --uat
 *   node scripts/update-mobilemart-commission-tiers.js --staging
 *   node scripts/update-mobilemart-commission-tiers.js --production
 *   node scripts/update-mobilemart-commission-tiers.js --all
 *
 * Safe to re-run (idempotent — upsert pattern).
 */

require('dotenv').config();
const {
  getUATClient, getStagingClient, getProductionClient,
} = require('./db-connection-helper');

// Service-level tiers (default rates for pricing service lookups)
// Using weighted-average or most-common rate per service type.
const TIERS = [
  { serviceType: 'airtime',         ratePct: 4.50,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'data',            ratePct: 4.50,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'voucher',         ratePct: 3.50,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'digital_voucher', ratePct: 3.50,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'electricity',     ratePct: 1.00,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'bill_payment',    ratePct: 0,     commissionType: 'fixed_amount', fixedAmountCents: 190 },
];

// Voucher-specific overrides (need product ID lookup)
const VOUCHER_OVERRIDES = {
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

async function updateEnvironment(getClient, envName) {
  const client = await getClient();
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Updating supplier_commission_tiers: ${envName.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    const { rows: suppliers } = await client.query(
      `SELECT id FROM suppliers WHERE code = 'MOBILEMART' AND "isActive" = true LIMIT 1`
    );
    if (suppliers.length === 0) {
      console.log(`  No active MOBILEMART supplier found in ${envName} — skipping`);
      return;
    }
    const mmSupplierId = suppliers[0].id;
    console.log(`  MobileMart supplier ID: ${mmSupplierId}`);

    const colCheckResult = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'supplier_commission_tiers' AND column_name = 'commissionType'"
    );
    const hasNewColumns = colCheckResult.rows.length > 0;

    let upserted = 0;

    // ── Service-level tiers ─────────────────────────────────────────
    for (const tier of TIERS) {
      const { rowCount } = await client.query(
        `UPDATE supplier_commission_tiers
         SET "ratePct" = $1, "isActive" = true, "updatedAt" = NOW()
             ${hasNewColumns ? ', "commissionType" = $4, "fixedAmountCents" = $5' : ''}
         WHERE "supplierId" = $2 AND "serviceType" = $3 AND "productId" IS NULL`,
        hasNewColumns
          ? [tier.ratePct, mmSupplierId, tier.serviceType, tier.commissionType, tier.fixedAmountCents]
          : [tier.ratePct, mmSupplierId, tier.serviceType]
      );

      if (rowCount === 0) {
        const insertSql = hasNewColumns
          ? `INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "minVolume", "ratePct", "isActive", "commissionType", "fixedAmountCents", "createdAt", "updatedAt")
             VALUES ($1, $2, 0, $3, true, $4, $5, NOW(), NOW())`
          : `INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "minVolume", "ratePct", "isActive", "createdAt", "updatedAt")
             VALUES ($1, $2, 0, $3, true, NOW(), NOW())`;
        const insertParams = hasNewColumns
          ? [mmSupplierId, tier.serviceType, tier.ratePct, tier.commissionType, tier.fixedAmountCents]
          : [mmSupplierId, tier.serviceType, tier.ratePct];

        try {
          await client.query(insertSql, insertParams);
        } catch (dupErr) {
          if (dupErr.code !== '23505') throw dupErr;
        }
      }

      console.log(`  ${tier.serviceType}: ${tier.ratePct}% / ${tier.fixedAmountCents}c (${tier.commissionType})`);
      upserted++;
    }

    // ── Voucher-specific overrides ──────────────────────────────────
    for (const [name, rate] of Object.entries(VOUCHER_OVERRIDES)) {
      const { rows: products } = await client.query(
        `SELECT p.id FROM products p
         JOIN product_variants pv ON pv."productId" = p.id
         WHERE pv."supplierId" = $1
           AND (
             LOWER(p.name) LIKE LOWER($2)
             OR LOWER(pv.provider) LIKE LOWER($2)
             OR LOWER(pv.metadata->>'mobilemart_product_name') LIKE LOWER($2)
             OR LOWER(pv.metadata->>'mobilemart_content_creator') LIKE LOWER($2)
           )
         LIMIT 1`,
        [mmSupplierId, `%${name}%`]
      );

      if (products.length > 0) {
        const productId = products[0].id;
        for (const svcType of ['voucher', 'digital_voucher']) {
          const { rowCount } = await client.query(
            `UPDATE supplier_commission_tiers
             SET "ratePct" = $1, "isActive" = true, "updatedAt" = NOW()
             WHERE "supplierId" = $2 AND "serviceType" = $3 AND "productId" = $4`,
            [rate, mmSupplierId, svcType, productId]
          );
          if (rowCount === 0) {
            try {
              await client.query(
                `INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "minVolume", "ratePct", "productId", "isActive", "createdAt", "updatedAt")
                 VALUES ($1, $2, 0, $3, $4, true, NOW(), NOW())`,
                [mmSupplierId, svcType, rate, productId]
              );
            } catch (dupErr) {
              if (dupErr.code !== '23505') throw dupErr;
            }
          }
        }
        console.log(`  Voucher override ${name} (product ${productId}): ${rate}%`);
        upserted++;
      }
    }

    console.log(`\n  ${envName.toUpperCase()} Summary: ${upserted} tier rows upserted`);
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
