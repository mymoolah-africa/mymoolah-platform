#!/usr/bin/env node
/**
 * apply-variable-first-filter.js
 *
 * Implements the "variable-first" product catalog strategy across ALL suppliers
 * and service providers in UAT, Staging, and Production.
 *
 * STRATEGY (per brand, per product type):
 *   1. Classify every product_variant as 'variable' or 'fixed':
 *        variable  → denominations array has exactly 1 entry that equals minAmount or
 *                     the product name contains keywords like "variable", "open", "custom",
 *                     OR minAmount/maxAmount differ and denominations has ≤ 3 entries acting
 *                     as range markers, OR the name pattern matches known variable signals.
 *        fixed     → everything else (discrete fixed denominations).
 *
 *   2. For each (brandId, productType) group:
 *        a. If AT LEAST ONE variable variant exists:
 *             - Keep variable variants ACTIVE, mark priceType='variable'
 *             - Set fixed variants to status='inactive', mark priceType='fixed'
 *        b. If NO variable variant exists:
 *             - Keep all fixed variants ACTIVE, mark priceType='fixed'
 *
 *   3. For variable variants, populate minAmount & maxAmount from the denominations array
 *      or from the existing constraints JSONB if present.
 *
 *   4. Ensure products with ALL inactive variants are themselves marked inactive.
 *
 * EXCEPTIONS (never deactivate even if variable exists):
 *   - electricity  (meter-driven, always "variable" but uses reference-number lookup)
 *   - Netflix / DStv subscription tiers (inherently tiered fixed)
 *
 * USAGE (run in Codespaces with proxies running):
 *   node scripts/apply-variable-first-filter.js            # UAT only (safe preview)
 *   node scripts/apply-variable-first-filter.js --uat
 *   node scripts/apply-variable-first-filter.js --staging
 *   node scripts/apply-variable-first-filter.js --production
 *   node scripts/apply-variable-first-filter.js --all      # UAT + Staging + Production
 *   node scripts/apply-variable-first-filter.js --dry-run  # Print changes without applying
 */

require('dotenv').config();
const {
  getUATPool,
  getStagingPool,
  getProductionPool,
  closeAll,
} = require('./db-connection-helper');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const RUN_UAT    = args.includes('--uat') || args.includes('--all') || args.length === 0;
const RUN_STG    = args.includes('--staging') || args.includes('--all');
const RUN_PROD   = args.includes('--production') || args.includes('--all');

// ── colours ───────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  cyan: '\x1b[36m', red: '\x1b[31m', magenta: '\x1b[35m', gray: '\x1b[90m'
};
const log = {
  ok:   (m) => console.log(`${C.green}✅  ${m}${C.reset}`),
  err:  (m) => console.log(`${C.red}❌  ${m}${C.reset}`),
  warn: (m) => console.log(`${C.yellow}⚠️   ${m}${C.reset}`),
  info: (m) => console.log(`${C.blue}ℹ️   ${m}${C.reset}`),
  hdr:  (m) => console.log(`\n${C.bright}${C.cyan}${m}${C.reset}\n${'─'.repeat(70)}`),
  step: (m) => console.log(`${C.magenta}▶️   ${m}${C.reset}`),
  sub:  (m) => console.log(`${C.gray}     ${m}${C.reset}`),
};

// ── Query helper ──────────────────────────────────────────────────────────────
async function q(pool, sql, params = []) {
  return pool.query(sql, params);
}

// ── Product types where we preserve ALL variants (never suppress fixed) ────────
// Electricity: meter-driven, the "amount" is entered by customer always
// bill_payment: inherently variable (user enters utility amount)
const ALWAYS_KEEP_FIXED_TYPES = new Set(['electricity', 'bill_payment']);

// Brand name keywords that indicate a subscription tier (keep all tiers)
const SUBSCRIPTION_BRAND_KEYWORDS = [
  'netflix', 'dstv', 'showmax', 'apple tv', 'disney', 'xbox game pass',
  'playstation now', 'ps now', 'crunchyroll', 'intercape'
];

function isSubscriptionBrand(brandName) {
  const lower = (brandName || '').toLowerCase();
  return SUBSCRIPTION_BRAND_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Variable detection heuristics ─────────────────────────────────────────────
/**
 * Determine if a product_variants row is a true variable-amount product.
 *
 * A product is VARIABLE only when the user is expected to enter any amount
 * within a range (like "Betway — enter R10 to R1000"). It is NOT variable
 * just because it has a single fixed denomination (e.g. "OTT R5" = 500c fixed).
 *
 * Rules (ALL checks must point the same way — conservatively default to fixed):
 *
 *   VARIABLE signals (explicit opt-in required):
 *     1. Name contains explicit variable keywords ("variable", "open value", etc.)
 *     2. constraints JSONB has { type: 'range' } or { variable: true }
 *     3. priceType column already set to 'variable' (idempotent re-run)
 *     4. minAmount and maxAmount exist AND minAmount < maxAmount
 *        (this is the canonical signal — a true range product has a span)
 *
 *   NEVER classify as variable:
 *     - minAmount === maxAmount (single fixed price, just stored differently)
 *     - denominations array contains 2+ entries with distinct values (picker list)
 *     - Product name contains a price amount in Rands (e.g. "R5", "R100")
 *       without also containing a variable keyword (fixed branded product)
 */
function classifyVariant(row) {
  const name   = (row.productName || row.name || '').toLowerCase();
  const dens   = Array.isArray(row.denominations) ? row.denominations : [];
  const constr = row.constraints || {};
  const pType  = (row.priceType || '').toLowerCase();

  // Idempotent: already explicitly classified as variable
  if (pType === 'variable') return 'variable';

  // Explicit FIXED override: multiple distinct denominations = picker list
  if (dens.length >= 2) return 'fixed';

  // Explicit FIXED override: minAmount === maxAmount = one fixed price point
  if (row.minAmount && row.maxAmount && row.minAmount === row.maxAmount) return 'fixed';

  // Explicit FIXED override: single denomination that equals minAmount (same price stored twice)
  if (dens.length === 1 && row.minAmount && dens[0] === row.minAmount &&
      row.maxAmount && dens[0] === row.maxAmount) return 'fixed';

  // Constraints signal: explicit range marker
  if (constr.type === 'range' || constr.variable === true || constr.isVariable === true) return 'variable';

  // Name-based signals: explicit variable keywords
  const variableKeywords = [
    'variable', 'open value', 'open amount', 'custom', 'any amount',
    'any value', 'flexi', 'flexible', 'voucher +'
  ];
  if (variableKeywords.some(kw => name.includes(kw))) return 'variable';

  // True range: minAmount strictly less than maxAmount (user enters their own amount)
  if (row.minAmount && row.maxAmount && row.minAmount < row.maxAmount) return 'variable';

  // Default: fixed
  return 'fixed';
}

// ── Compute min/max for variable variants ─────────────────────────────────────
function computeRange(row) {
  const dens   = Array.isArray(row.denominations) ? row.denominations : [];
  const constr = row.constraints || {};

  // Use existing explicit values first
  const minA = row.minAmount || constr.minAmount || constr.min || (dens.length > 0 ? Math.min(...dens) : null);
  const maxA = row.maxAmount || constr.maxAmount || constr.max || (dens.length > 0 ? Math.max(...dens) : null);
  return { minAmount: minA, maxAmount: maxA };
}

// ── Ensure priceType column exists (schema guard) ─────────────────────────────
async function ensurePriceTypeColumn(pool) {
  const check = await q(pool, `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='product_variants'
      AND column_name='priceType'
  `);

  if (check.rows.length === 0) {
    log.info('priceType column missing — adding it now...');
    if (!DRY_RUN) {
      // Add ENUM type first (ignore if already exists)
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_product_variants_priceType" AS ENUM ('variable', 'fixed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await pool.query(`
        ALTER TABLE product_variants
          ADD COLUMN IF NOT EXISTS "priceType" "enum_product_variants_priceType" NOT NULL DEFAULT 'fixed',
          ADD COLUMN IF NOT EXISTS "minAmount" INTEGER,
          ADD COLUMN IF NOT EXISTS "maxAmount" INTEGER;
      `);
      // Add index
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_product_variants_price_type
          ON product_variants ("priceType");
      `);
    }
    log.ok('priceType, minAmount, maxAmount columns ready');
  } else {
    log.ok('priceType column already exists');
  }
}

// ── Main per-environment logic ────────────────────────────────────────────────
async function applyFilterToEnvironment(pool, envLabel) {
  log.hdr(`APPLYING VARIABLE-FIRST FILTER → ${envLabel}${DRY_RUN ? ' [DRY RUN]' : ''}`);

  // 0. Schema guard
  log.step('0. Checking schema...');
  await ensurePriceTypeColumn(pool);

  // 1. Load all active variants with their product and brand info
  log.step('1. Loading all product variants...');
  const variantsResult = await q(pool, `
    SELECT
      pv.id,
      pv."productId",
      pv."supplierId",
      pv."supplierProductId",
      pv.denominations,
      pv.constraints,
      pv.status,
      pv."isPreferred",
      pv."priceType",
      pv."minAmount",
      pv."maxAmount",
      p.name        AS "productName",
      p.type        AS "productType",
      p."brandId",
      pb.name       AS "brandName",
      s.code        AS "supplierCode"
    FROM product_variants pv
    JOIN products  p  ON p.id  = pv."productId"
    JOIN product_brands pb ON pb.id = p."brandId"
    JOIN suppliers s  ON s.id  = pv."supplierId"
    ORDER BY p."brandId", p.type, pv.id
  `);

  const allVariants = variantsResult.rows;
  log.info(`Loaded ${allVariants.length} product variants across all suppliers`);

  // 2. Group by (brandId, productType)
  const groups = new Map();
  for (const v of allVariants) {
    const key = `${v.brandId}::${v.productType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }

  // 3. Classify and compute actions
  const stats = {
    groups: groups.size,
    groupsWithVariable: 0,
    groupsFixedOnly: 0,
    groupsSkipped: 0,
    variantsMarkedVariable: 0,
    variantsDeactivated: 0,
    variantsMarkedFixed: 0,
    variantsAlreadyCorrect: 0,
  };

  const updates = []; // { id, priceType, status, minAmount, maxAmount, isPreferred }

  for (const [key, variants] of groups) {
    const [brandId, productType] = key.split('::');
    const brandName = variants[0].brandName;
    const supplierCode = variants[0].supplierCode;

    // Skip exceptions
    if (ALWAYS_KEEP_FIXED_TYPES.has(productType)) {
      // Still classify as 'fixed', keep all active — just update priceType
      for (const v of variants) {
        const range = computeRange(v);
        updates.push({
          id: v.id,
          priceType: 'fixed',
          status: v.status, // unchanged
          minAmount: range.minAmount,
          maxAmount: range.maxAmount,
          isPreferred: v.isPreferred
        });
        stats.variantsMarkedFixed++;
      }
      stats.groupsSkipped++;
      continue;
    }

    if (isSubscriptionBrand(brandName)) {
      // Keep all subscription tiers active as fixed
      for (const v of variants) {
        const range = computeRange(v);
        updates.push({
          id: v.id,
          priceType: 'fixed',
          status: v.status,
          minAmount: range.minAmount,
          maxAmount: range.maxAmount,
          isPreferred: v.isPreferred
        });
        stats.variantsMarkedFixed++;
      }
      stats.groupsSkipped++;
      continue;
    }

    // Classify each variant
    const classified = variants.map(v => ({ ...v, _class: classifyVariant(v) }));
    const variableOnes = classified.filter(v => v._class === 'variable');
    const fixedOnes    = classified.filter(v => v._class === 'fixed');

    if (variableOnes.length > 0) {
      stats.groupsWithVariable++;

      // Keep variable variants active
      for (const v of variableOnes) {
        const range = computeRange(v);
        updates.push({
          id: v.id,
          priceType: 'variable',
          status: 'active',
          minAmount: range.minAmount,
          maxAmount: range.maxAmount,
          isPreferred: true
        });
        stats.variantsMarkedVariable++;
      }

      // Deactivate fixed duplicates for the same brand+type
      for (const v of fixedOnes) {
        updates.push({
          id: v.id,
          priceType: 'fixed',
          status: 'inactive',
          minAmount: v.minAmount,
          maxAmount: v.maxAmount,
          isPreferred: false
        });
        stats.variantsDeactivated++;
        // Only log deactivations — these are the meaningful changes
        log.warn(`[${supplierCode}] HIDE fixed: "${v.productName}" (brand: ${brandName}) — variable version exists`);
      }

    } else {
      // No variable — keep all fixed active
      stats.groupsFixedOnly++;
      for (const v of fixedOnes) {
        const range = computeRange(v);
        updates.push({
          id: v.id,
          priceType: 'fixed',
          status: v.status, // keep original status
          minAmount: range.minAmount,
          maxAmount: range.maxAmount,
          isPreferred: v.isPreferred
        });
        stats.variantsMarkedFixed++;
      }
    }
  }

  log.step('2. Applying updates...');
  log.info(`Groups: ${stats.groups} total | ${stats.groupsWithVariable} have variable | ${stats.groupsFixedOnly} fixed-only | ${stats.groupsSkipped} skipped`);
  log.info(`Variants: ${stats.variantsMarkedVariable} → variable | ${stats.variantsDeactivated} → deactivated | ${stats.variantsMarkedFixed} → fixed`);

  if (!DRY_RUN) {
    let applied = 0;
    let failed  = 0;

    for (const u of updates) {
      try {
        await q(pool, `
          UPDATE product_variants SET
            "priceType"   = $1,
            status        = $2,
            "minAmount"   = $3,
            "maxAmount"   = $4,
            "isPreferred" = $5,
            "updatedAt"   = NOW()
          WHERE id = $6
        `, [u.priceType, u.status, u.minAmount, u.maxAmount, u.isPreferred, u.id]);
        applied++;
      } catch (err) {
        log.err(`Failed to update variant id=${u.id}: ${err.message}`);
        failed++;
      }
    }

    log.ok(`Updated ${applied} variants (${failed} failed)`);

    // 3. Deactivate products where ALL their variants are now inactive
    log.step('3. Deactivating products with no active variants...');
    const deactivateProducts = await q(pool, `
      UPDATE products
      SET status = 'inactive', "updatedAt" = NOW()
      WHERE id IN (
        SELECT DISTINCT p.id
        FROM products p
        WHERE p.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM product_variants pv
            WHERE pv."productId" = p.id
              AND pv.status = 'active'
          )
      )
      RETURNING id, name
    `);
    if (deactivateProducts.rows.length > 0) {
      log.warn(`Deactivated ${deactivateProducts.rows.length} products with no active variants:`);
      deactivateProducts.rows.forEach(r => log.sub(`  - id=${r.id} "${r.name}"`));
    } else {
      log.ok('All products have at least one active variant');
    }

  } else {
    log.warn('[DRY RUN] No changes written to database');
    log.info('Re-run without --dry-run to apply changes');
  }

  // 4. Final counts
  log.step('4. Final verification counts...');
  const counts = await q(pool, `
    SELECT
      COUNT(*) FILTER (WHERE pv."priceType" = 'variable' AND pv.status = 'active')  AS "activeVariable",
      COUNT(*) FILTER (WHERE pv."priceType" = 'fixed'    AND pv.status = 'active')  AS "activeFixed",
      COUNT(*) FILTER (WHERE pv.status = 'inactive')                                 AS "inactive",
      COUNT(*)                                                                        AS "total"
    FROM product_variants pv
  `);
  const c = counts.rows[0];
  log.info(`product_variants: ${c.total} total | ${c.activeVariable} active-variable | ${c.activeFixed} active-fixed | ${c.inactive} inactive`);

  const productCounts = await q(pool, `
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')   AS "activeProducts",
      COUNT(*) FILTER (WHERE status = 'inactive') AS "inactiveProducts",
      COUNT(*)                                      AS "total"
    FROM products
  `);
  const pc = productCounts.rows[0];
  log.info(`products: ${pc.total} total | ${pc.activeProducts} active | ${pc.inactiveProducts} inactive`);

  return { ...stats, counts: c, productCounts: pc };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log.hdr('VARIABLE-FIRST PRODUCT CATALOG FILTER');
  if (DRY_RUN) log.warn('DRY RUN MODE — no database changes will be made');

  const results = {};

  try {
    if (RUN_UAT) {
      log.info('Connecting to UAT...');
      const uatPool = await getUATPool();
      results.UAT = await applyFilterToEnvironment(uatPool, 'UAT');
    }

    if (RUN_STG) {
      log.info('Connecting to Staging...');
      const stgPool = await getStagingPool();
      results.STAGING = await applyFilterToEnvironment(stgPool, 'STAGING');
    }

    if (RUN_PROD) {
      log.info('Connecting to Production...');
      const prodPool = await getProductionPool();
      results.PRODUCTION = await applyFilterToEnvironment(prodPool, 'PRODUCTION');
    }

  } catch (err) {
    log.err(`Fatal: ${err.message}`);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await closeAll();
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  log.hdr('FINAL SUMMARY');
  const envWidth = 12;
  console.log(
    'Environment'.padEnd(envWidth) + '  ' +
    'ActiveVariable'.padStart(14) + '  ' +
    'ActiveFixed'.padStart(11) + '  ' +
    'Inactive'.padStart(8) + '  ' +
    'Total'.padStart(6)
  );
  console.log('─'.repeat(58));

  for (const [env, r] of Object.entries(results)) {
    const c = r.counts;
    console.log(
      env.padEnd(envWidth) + '  ' +
      String(c.activeVariable).padStart(14) + '  ' +
      String(c.activeFixed).padStart(11) + '  ' +
      String(c.inactive).padStart(8) + '  ' +
      String(c.total).padStart(6)
    );
  }

  if (DRY_RUN) {
    log.warn('\nDRY RUN complete — re-run without --dry-run to apply changes');
  } else {
    log.ok('\nVariable-first filter applied successfully across all target environments');
    log.info('Next: run ./scripts/run-migrations-master.sh <env> to ensure schema is up to date first');
  }
}

main();
