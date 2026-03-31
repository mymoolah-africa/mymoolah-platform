#!/usr/bin/env node
/**
 * Update Flash Commission Tiers in supplier_commission_tiers
 *
 * This table is what supplierPricingService.getCommissionRatePct() reads
 * at purchase time. Upserts rows per Flash service type with contractual rates.
 *
 * Usage (proxies must be running):
 *   node scripts/update-flash-commission-tiers.js --uat
 *   node scripts/update-flash-commission-tiers.js --staging
 *   node scripts/update-flash-commission-tiers.js --production
 *   node scripts/update-flash-commission-tiers.js --all
 *
 * Safe to re-run (idempotent — upsert pattern).
 */

require('dotenv').config();
const {
  getUATClient, getStagingClient, getProductionClient,
} = require('./db-connection-helper');

// ── Flash contractual rates ─────────────────────────────────────────────────
// All percentage rates are VAT-inclusive.
// Volume tier: minVolume=0, maxVolume=NULL (flat rate, no volume tiers in current contract).

const TIERS = [
  // Cellular (airtime + data)
  { serviceType: 'airtime',         ratePct: 3.00,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'data',            ratePct: 3.00,  commissionType: 'percentage', fixedAmountCents: 0 },

  // Eezi vouchers
  { serviceType: 'eezi_voucher',    ratePct: 3.50,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'eezi_power',      ratePct: 1.00,  commissionType: 'percentage', fixedAmountCents: 0 },

  // Electricity
  { serviceType: 'electricity',     ratePct: 0.85,  commissionType: 'percentage', fixedAmountCents: 0 },

  // Digital vouchers / gift vouchers (default — product-specific overrides below)
  { serviceType: 'voucher',         ratePct: 3.50,  commissionType: 'percentage', fixedAmountCents: 0 },
  { serviceType: 'digital_voucher', ratePct: 3.50,  commissionType: 'percentage', fixedAmountCents: 0 },

  // Bill payment (default for bill_payment, overrides per product below)
  { serviceType: 'bill_payment',    ratePct: 2.50,  commissionType: 'percentage', fixedAmountCents: 0 },

  // Cash-out — not a commission tier; fees handled via supplier_fee_schedule
  // (no entry needed here — eeziCash uses fee schedule, not commission tiers)

  // 1Voucher
  { serviceType: '1voucher',        ratePct: 1.00,  commissionType: 'percentage', fixedAmountCents: 0 },

  // Voucher top-up (wallet deposit via 1Voucher/FNB/FlashPay)
  // Flash charges 4% acceptance/redemption fee (excl VAT) — Mar 2026 contract
  // This is a COST to MyMoolah, not a commission earned. Stored here for ledger posting.
  { serviceType: 'voucher_topup',   ratePct: 4.00,  commissionType: 'percentage', fixedAmountCents: 0 },
];

// Product-specific gift voucher overrides (need product ID lookup)
const GIFT_VOUCHER_OVERRIDES = {
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

async function updateEnvironment(getClient, envName) {
  const client = await getClient();
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Updating supplier_commission_tiers: ${envName.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    // Find Flash supplier
    const { rows: suppliers } = await client.query(
      `SELECT id FROM suppliers WHERE code = 'FLASH' AND "isActive" = true LIMIT 1`
    );
    if (suppliers.length === 0) {
      console.log(`  No active FLASH supplier found in ${envName} — skipping`);
      return;
    }
    const flashSupplierId = suppliers[0].id;
    console.log(`  Flash supplier ID: ${flashSupplierId}`);

    // Check if new columns exist (migration may not have run yet)
    const colCheckResult = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'supplier_commission_tiers' AND column_name = 'commissionType'"
    );
    const hasNewColumns = colCheckResult.rows.length > 0;

    let upserted = 0;

    // ── Service-level tiers ─────────────────────────────────────────
    for (const tier of TIERS) {
      const setClauses = [
        `"ratePct" = $4`,
        `"isActive" = true`,
        `"updatedAt" = NOW()`,
      ];
      const insertCols = ['"supplierId"', '"serviceType"', '"minVolume"', '"ratePct"', '"isActive"', '"createdAt"', '"updatedAt"'];
      const insertVals = ['$1', '$2', '$3', '$4', 'true', 'NOW()', 'NOW()'];

      if (hasNewColumns) {
        setClauses.push(`"commissionType" = $5`);
        setClauses.push(`"fixedAmountCents" = $6`);
        insertCols.push('"commissionType"', '"fixedAmountCents"');
        insertVals.push('$5', '$6');
      }

      const sql = `
        INSERT INTO supplier_commission_tiers (${insertCols.join(', ')})
        VALUES (${insertVals.join(', ')})
        ON CONFLICT ("supplierId", "serviceType")
        WHERE "productId" IS NULL AND "minVolume" = 0
        DO UPDATE SET ${setClauses.join(', ')}
      `;

      const params = hasNewColumns
        ? [flashSupplierId, tier.serviceType, 0, tier.ratePct, tier.commissionType, tier.fixedAmountCents]
        : [flashSupplierId, tier.serviceType, 0, tier.ratePct];

      try {
        await client.query(sql, params);
        console.log(`  ${tier.serviceType}: ${tier.ratePct}% (${tier.commissionType})`);
        upserted++;
      } catch (err) {
        // If ON CONFLICT fails (no unique constraint on these columns), fall back to update + insert
        if (err.code === '42P10' || err.message.includes('ON CONFLICT')) {
          const { rowCount } = await client.query(
            `UPDATE supplier_commission_tiers
             SET "ratePct" = $1, "isActive" = true, "updatedAt" = NOW()
             WHERE "supplierId" = $2 AND "serviceType" = $3 AND "productId" IS NULL`,
            [tier.ratePct, flashSupplierId, tier.serviceType]
          );
          if (rowCount === 0) {
            const insertSql = hasNewColumns
              ? `INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "minVolume", "ratePct", "isActive", "commissionType", "fixedAmountCents", "createdAt", "updatedAt")
                 VALUES ($1, $2, 0, $3, true, $4, $5, NOW(), NOW())`
              : `INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "minVolume", "ratePct", "isActive", "createdAt", "updatedAt")
                 VALUES ($1, $2, 0, $3, true, NOW(), NOW())`;
            const insertParams = hasNewColumns
              ? [flashSupplierId, tier.serviceType, tier.ratePct, tier.commissionType, tier.fixedAmountCents]
              : [flashSupplierId, tier.serviceType, tier.ratePct];
            await client.query(insertSql, insertParams);
          }
          console.log(`  ${tier.serviceType}: ${tier.ratePct}% (fallback path)`);
          upserted++;
        } else {
          throw err;
        }
      }
    }

    // ── Product-specific gift voucher overrides ─────────────────────
    for (const [name, rate] of Object.entries(GIFT_VOUCHER_OVERRIDES)) {
      const { rows: products } = await client.query(
        `SELECT p.id FROM products p
         JOIN product_variants pv ON pv."productId" = p.id
         WHERE pv."supplierId" = $1
           AND (
             LOWER(p.name) LIKE LOWER($2)
             OR LOWER(pv.provider) LIKE LOWER($2)
             OR LOWER(pv.metadata->>'flash_product_name') LIKE LOWER($2)
           )
         LIMIT 1`,
        [flashSupplierId, `%${name}%`]
      );

      if (products.length > 0) {
        const productId = products[0].id;
        const svcTypes = ['voucher', 'digital_voucher'];
        for (const svcType of svcTypes) {
          const { rowCount } = await client.query(
            `UPDATE supplier_commission_tiers
             SET "ratePct" = $1, "isActive" = true, "updatedAt" = NOW()
             WHERE "supplierId" = $2 AND "serviceType" = $3 AND "productId" = $4`,
            [rate, flashSupplierId, svcType, productId]
          );
          if (rowCount === 0) {
            try {
              await client.query(
                `INSERT INTO supplier_commission_tiers ("supplierId", "serviceType", "minVolume", "ratePct", "productId", "isActive", "createdAt", "updatedAt")
                 VALUES ($1, $2, 0, $3, $4, true, NOW(), NOW())`,
                [flashSupplierId, svcType, rate, productId]
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
