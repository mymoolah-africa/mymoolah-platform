#!/usr/bin/env node
/**
 * Mark Featured Data Products (API-driven, rule-based)
 *
 * Selects ~15 pinless data bundles per network targeting low-income
 * South African users. All products come from the API-synced catalog
 * in product_variants — no static spreadsheet references.
 *
 * Selection prioritizes:
 *  1. WhatsApp bundles (essential, most-used app in SA)
 *  2. Social media (TikTok, Facebook, YouTube)
 *  3. Affordable daily data (R5-R30)
 *  4. Value weekly data (R20-R60)
 *  5. Value monthly data (R30-R200)
 *  6. One larger monthly for those who can stretch
 *
 * All airtime products are also marked as featured.
 *
 * Usage (proxies must be running):
 *   node scripts/mark-featured-data-products.js --uat
 *   node scripts/mark-featured-data-products.js --staging
 *   node scripts/mark-featured-data-products.js --production
 *   node scripts/mark-featured-data-products.js --all
 *
 * Safe to re-run (idempotent). Can be scheduled after daily catalog sync.
 */

require('dotenv').config();
const {
  getUATClient, getStagingClient, getProductionClient,
} = require('./db-connection-helper');

// Selection rules: pattern, price range (cents), and max picks.
// Ordered by priority — first rules pick first.
const SELECTION_RULES = [
  // WhatsApp — most important for this audience
  { label: 'WhatsApp cheap',   pattern: '%WhatsApp%',  minPrice: 0,     maxPrice: 1500,  picks: 2 },
  { label: 'WhatsApp mid',     pattern: '%WhatsApp%',  minPrice: 1500,  maxPrice: 5000,  picks: 1 },

  // Social media bundles (TikTok, Facebook, YouTube, Instagram)
  { label: 'TikTok cheap',     pattern: '%TikTok%',    minPrice: 0,     maxPrice: 3000,  picks: 1 },
  { label: 'TikTok value',     pattern: '%TikTok%',    minPrice: 3000,  maxPrice: 12000, picks: 1 },
  { label: 'Facebook',         pattern: '%Facebook%',  minPrice: 0,     maxPrice: 3000,  picks: 1 },
  { label: 'YouTube',          pattern: '%YouTube%',   minPrice: 0,     maxPrice: 3000,  picks: 1 },

  // General daily data (affordable)
  { label: 'Daily cheap',      pattern: '%Daily%',     minPrice: 500,   maxPrice: 1500,  picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%' },
  { label: 'Daily mid',        pattern: '%Daily%',     minPrice: 1500,  maxPrice: 3500,  picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%' },

  // General weekly data
  { label: 'Weekly cheap',     pattern: '%Weekly%',    minPrice: 1500,  maxPrice: 5000,  picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%' },
  { label: 'Weekly mid',       pattern: '%Weekly%',    minPrice: 5000,  maxPrice: 12000, picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%' },

  // General monthly data (value range R30-R200)
  { label: 'Monthly budget',   pattern: '%Monthly%',   minPrice: 3000,  maxPrice: 6000,  picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%|%LTE%|%All Network%' },
  { label: 'Monthly mid',      pattern: '%Monthly%',   minPrice: 6000,  maxPrice: 10000, picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%|%LTE%|%All Network%' },
  { label: 'Monthly stretch',  pattern: '%Monthly%',   minPrice: 8000,  maxPrice: 15000, picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%|%LTE%|%All Network%' },
  { label: 'Monthly value',    pattern: '%Monthly%',   minPrice: 15000, maxPrice: 30000, picks: 1, exclude: '%WhatsApp%|%TikTok%|%Facebook%|%YouTube%|%Instagram%|%Social%|%Chat%|%LTE%|%All Network%' },

  // One All-Network or LTE bundle (bigger value for those who can afford)
  { label: 'All Network',      pattern: '%All Network%', minPrice: 5000, maxPrice: 20000, picks: 1 },
  { label: 'LTE value',        pattern: '%LTE%',       minPrice: 5000,  maxPrice: 20000, picks: 1 },
];

const NETWORKS = [
  { canonical: 'MTN',     providers: ['MTN', 'mtn'] },
  { canonical: 'Vodacom', providers: ['Vodacom', 'vodacom'] },
  { canonical: 'CellC',   providers: ['CellC', 'cellc', 'Cell C', 'cell c'] },
  { canonical: 'Telkom',  providers: ['Telkom', 'telkom', 'Telkom Mobile'] },
];

async function pickForRule(client, supplierId, providerList, rule, alreadyPicked) {
  let paramIdx = 1;
  const params = [];

  params.push(supplierId); // $1
  paramIdx++;
  params.push(rule.pattern); // $2
  paramIdx++;
  params.push(rule.minPrice); // $3
  paramIdx++;
  params.push(rule.maxPrice); // $4

  // Exclude already-picked IDs
  paramIdx++;
  params.push(alreadyPicked.length > 0 ? alreadyPicked : [0]); // $5

  // Build exclude pattern clauses (pipe-separated patterns)
  let excludeClauses = '';
  if (rule.exclude) {
    const excludePatterns = rule.exclude.split('|');
    for (const ep of excludePatterns) {
      paramIdx++;
      params.push(ep);
      excludeClauses += ` AND metadata->>'mobilemart_product_name' NOT ILIKE $${paramIdx}`;
    }
  }

  // Provider conditions
  const providerConds = providerList.map(p => {
    paramIdx++;
    params.push(p);
    return `LOWER(provider) = LOWER($${paramIdx})`;
  }).join(' OR ');

  paramIdx++;
  params.push(rule.picks);

  const sql = `
    SELECT id, "minAmount", metadata->>'mobilemart_product_name' as name
    FROM product_variants
    WHERE "supplierId" = $1
      AND "vasType" = 'data'
      AND status = 'active'
      AND metadata->>'mobilemart_product_name' ILIKE $2
      AND "minAmount" >= $3
      AND "minAmount" <= $4
      AND id != ALL($5::int[])
      ${excludeClauses}
      AND (${providerConds})
    ORDER BY "minAmount" ASC
    LIMIT $${paramIdx}
  `;

  const { rows } = await client.query(sql, params);
  return rows;
}

async function updateEnvironment(getClient, envName) {
  const client = await getClient();
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Marking featured products: ${envName.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    const colCheck = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'featured'"
    );
    if (colCheck.rows.length === 0) {
      console.log(`  featured column not found — run migration first`);
      return;
    }

    const { rows: suppliers } = await client.query(
      `SELECT id FROM suppliers WHERE code = 'MOBILEMART' AND "isActive" = true LIMIT 1`
    );
    const mmSupplierId = suppliers.length > 0 ? suppliers[0].id : null;

    // 1. All airtime = featured
    const { rowCount: airtimeFeatured } = await client.query(
      `UPDATE product_variants SET featured = true WHERE "vasType" = 'airtime' AND status = 'active'`
    );
    console.log(`  Airtime: ${airtimeFeatured} products marked as featured`);

    // 2. Reset all data
    const { rowCount: dataReset } = await client.query(
      `UPDATE product_variants SET featured = false WHERE "vasType" = 'data'`
    );
    console.log(`  Data: ${dataReset} products reset to featured=false`);

    if (!mmSupplierId) {
      console.log(`  No MOBILEMART supplier — skipping data curation`);
      return;
    }

    // 3. For each network, apply selection rules
    let grandTotal = 0;

    for (const network of NETWORKS) {
      const pickedIds = [];
      const pickedProducts = [];

      for (const rule of SELECTION_RULES) {
        const rows = await pickForRule(client, mmSupplierId, network.providers, rule, pickedIds);
        for (const r of rows) {
          pickedIds.push(r.id);
          pickedProducts.push({ ...r, rule: rule.label });
        }
      }

      // Mark picked products as featured
      if (pickedIds.length > 0) {
        await client.query(
          `UPDATE product_variants SET featured = true WHERE id = ANY($1::int[])`,
          [pickedIds]
        );
      }

      console.log(`  ${network.canonical}: ${pickedIds.length} data products featured`);
      for (const p of pickedProducts) {
        console.log(`    R${(p.minAmount / 100).toFixed(0).padStart(5)}  [${p.rule}] ${p.name}`);
      }
      grandTotal += pickedIds.length;
    }

    console.log(`\n  Total data featured: ${grandTotal}`);

    // Summary
    const { rows: counts } = await client.query(
      `SELECT "vasType", COUNT(*) as total,
              SUM(CASE WHEN featured = true THEN 1 ELSE 0 END) as featured_count
       FROM product_variants
       WHERE status = 'active' AND "vasType" IN ('airtime', 'data')
       GROUP BY "vasType"`
    );
    console.log(`\n  ${envName.toUpperCase()} Final:`);
    for (const row of counts) {
      console.log(`    ${row.vasType}: ${row.featured_count}/${row.total} featured`);
    }
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
