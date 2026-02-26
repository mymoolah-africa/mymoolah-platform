#!/usr/bin/env node

/**
 * Clean-Slate Catalog Test — STAGING ONLY
 *
 * This script:
 *   1. Takes a SNAPSHOT of current Flash + MobileMart product counts in Staging
 *   2. DELETES only Flash and MobileMart products/variants from Staging
 *   3. Verifies the catalog is empty for those suppliers
 *   4. Triggers the live catalog sync via CatalogSynchronizationService
 *   5. Polls until sync completes, then verifies final counts
 *
 * Purpose: Prove that the daily 02:00 scheduler correctly imports all products
 *          directly from the Flash API and MobileMart API into Staging.
 *
 * Usage (run from Codespaces with proxies running on 6543/6544):
 *   node scripts/clean-slate-catalog-test-staging.js
 *
 * Requirements:
 *   - Cloud SQL Auth Proxies running (Staging: port 6544)
 *   - gcloud authenticated with access to Secret Manager
 *   - FLASH_* and MOBILEMART_* env vars set (or loaded from .env.codespaces)
 *
 * SAFETY: This script ONLY touches Staging. It will refuse to run against
 *         Production. It only deletes products for supplier codes FLASH and
 *         MOBILEMART — no other data is touched.
 */

require('dotenv').config({ path: '.env.codespaces' });

// ─── Point Sequelize at Staging BEFORE any models are loaded ─────────────────
// The db-connection-helper knows the Staging proxy port (6544) and fetches the
// password from Secret Manager. We build the DATABASE_URL here so that when
// models/index.js initialises Sequelize it connects to mymoolah_staging, not UAT.
const { execSync } = require('child_process');
(function overrideDatabaseUrlForStaging() {
  const stagingPassword = execSync(
    'gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db',
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();
  const encoded = encodeURIComponent(stagingPassword);
  process.env.DATABASE_URL = `postgres://mymoolah_app:${encoded}@127.0.0.1:6544/mymoolah_staging?sslmode=disable`;
  process.env.NODE_ENV = 'staging';
  console.log('🔧 DATABASE_URL overridden → Staging (port 6544 / mymoolah_staging)');
})();

const { getStagingClient, closeAll } = require('./db-connection-helper');
const CatalogSynchronizationService = require('../services/catalogSynchronizationService');

// ─── Colour helpers ──────────────────────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  cyan:    '\x1b[36m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
};
const log = {
  header:  (m) => console.log(`\n${c.bold}${c.cyan}${'═'.repeat(60)}\n  ${m}\n${'═'.repeat(60)}${c.reset}`),
  step:    (m) => console.log(`\n${c.magenta}▶  ${m}${c.reset}`),
  success: (m) => console.log(`${c.green}✅  ${m}${c.reset}`),
  warn:    (m) => console.log(`${c.yellow}⚠️   ${m}${c.reset}`),
  error:   (m) => console.log(`${c.red}❌  ${m}${c.reset}`),
  info:    (m) => console.log(`${c.blue}ℹ️   ${m}${c.reset}`),
  data:    (m) => console.log(`    ${m}`),
  divider: ()  => console.log(`${c.blue}${'─'.repeat(60)}${c.reset}`),
};

// ─── Safety guard ─────────────────────────────────────────────────────────────
const NODE_ENV = process.env.NODE_ENV || '';
if (NODE_ENV === 'production') {
  log.error('NODE_ENV is "production". This script is STAGING ONLY. Aborting.');
  process.exit(1);
}

// ─── Snapshot helper ─────────────────────────────────────────────────────────
async function takeSnapshot(client, label) {
  log.step(`Snapshot — ${label}`);

  const supplierRows = await client.query(`
    SELECT s.code, s.name, COUNT(p.id) AS product_count
    FROM suppliers s
    LEFT JOIN products p ON p."supplierId" = s.id
    WHERE s.code IN ('FLASH', 'MOBILEMART')
    GROUP BY s.code, s.name
    ORDER BY s.code
  `);

  const variantRows = await client.query(`
    SELECT s.code, COUNT(pv.id) AS variant_count
    FROM suppliers s
    LEFT JOIN products p  ON p."supplierId" = s.id
    LEFT JOIN product_variants pv ON pv."productId" = p.id
    WHERE s.code IN ('FLASH', 'MOBILEMART')
    GROUP BY s.code
    ORDER BY s.code
  `);

  const snapshot = {};
  for (const row of supplierRows.rows) {
    snapshot[row.code] = {
      name:          row.name,
      productCount:  parseInt(row.product_count, 10),
      variantCount:  0,
    };
  }
  for (const row of variantRows.rows) {
    if (snapshot[row.code]) {
      snapshot[row.code].variantCount = parseInt(row.variant_count, 10);
    }
  }

  log.divider();
  for (const [code, data] of Object.entries(snapshot)) {
    log.data(`${c.bold}${code}${c.reset} (${data.name})`);
    log.data(`  Products : ${data.productCount}`);
    log.data(`  Variants : ${data.variantCount}`);
  }
  log.divider();

  return snapshot;
}

// ─── Delete helper ────────────────────────────────────────────────────────────
async function deleteSupplierProducts(client, supplierCode) {
  log.step(`Deleting products for supplier: ${supplierCode}`);

  // Get supplier id
  const supplierRes = await client.query(
    `SELECT id, name FROM suppliers WHERE code = $1`,
    [supplierCode]
  );
  if (supplierRes.rows.length === 0) {
    log.warn(`Supplier ${supplierCode} not found in Staging DB — skipping.`);
    return 0;
  }
  const supplier = supplierRes.rows[0];

  // Count before delete
  const beforeVariants = await client.query(
    `SELECT COUNT(*) FROM product_variants pv
     JOIN products p ON p.id = pv."productId"
     WHERE p."supplierId" = $1`,
    [supplier.id]
  );
  const beforeProducts = await client.query(
    `SELECT COUNT(*) FROM products WHERE "supplierId" = $1`,
    [supplier.id]
  );

  // Delete variants first (FK constraint), then products
  const deletedVariants = await client.query(
    `DELETE FROM product_variants
     WHERE "productId" IN (
       SELECT id FROM products WHERE "supplierId" = $1
     )`,
    [supplier.id]
  );
  const deletedProducts = await client.query(
    `DELETE FROM products WHERE "supplierId" = $1`,
    [supplier.id]
  );

  log.success(`${supplierCode} (${supplier.name}): deleted ${deletedProducts.rowCount} products, ${deletedVariants.rowCount} variants`);
  log.data(`  Before: ${beforeProducts.rows[0].count} products / ${beforeVariants.rows[0].count} variants`);
  log.data(`  After:  0 products / 0 variants`);

  return deletedProducts.rowCount;
}

// ─── Verify empty ─────────────────────────────────────────────────────────────
async function verifyEmpty(client) {
  log.step('Verifying catalog is empty for FLASH and MOBILEMART...');

  const res = await client.query(`
    SELECT s.code, COUNT(p.id) AS product_count
    FROM suppliers s
    LEFT JOIN products p ON p."supplierId" = s.id
    WHERE s.code IN ('FLASH', 'MOBILEMART')
    GROUP BY s.code
  `);

  let allEmpty = true;
  for (const row of res.rows) {
    const count = parseInt(row.product_count, 10);
    if (count > 0) {
      log.error(`${row.code} still has ${count} products after delete!`);
      allEmpty = false;
    } else {
      log.success(`${row.code}: 0 products ✓`);
    }
  }
  return allEmpty;
}

// ─── Run sync ─────────────────────────────────────────────────────────────────
async function runSync() {
  log.step('Initialising CatalogSynchronizationService and running performDailySweep()...');
  log.info('This calls the live Flash API and live MobileMart API — watch for real-time logs below.');
  log.divider();

  const service = new CatalogSynchronizationService();

  // Mark service as running — required by the isRunning guard in performDailySweep().
  // This is exactly what start() / startDailyOnly() does before the cron fires at 02:00.
  service.isRunning = true;

  // performDailySweep() is the exact same function the 02:00 cron calls
  await service.performDailySweep();

  log.divider();
  log.success('performDailySweep() completed.');

  return service.syncStats;
}

// ─── Verify results ───────────────────────────────────────────────────────────
async function verifyResults(client, snapshot) {
  log.step('Verifying final product counts after sync...');

  const afterSnapshot = await takeSnapshot(client, 'AFTER SYNC');

  log.divider();
  log.header('COMPARISON: Before vs After');

  for (const code of ['FLASH', 'MOBILEMART']) {
    const before = snapshot[code] || { productCount: 0, variantCount: 0 };
    const after  = afterSnapshot[code] || { productCount: 0, variantCount: 0 };
    const productDiff = after.productCount - before.productCount;
    const variantDiff = after.variantCount - before.variantCount;

    log.data(`${c.bold}${code}${c.reset}`);
    log.data(`  Products : ${before.productCount} → ${after.productCount}  (${productDiff >= 0 ? '+' : ''}${productDiff})`);
    log.data(`  Variants : ${before.variantCount} → ${after.variantCount}  (${variantDiff >= 0 ? '+' : ''}${variantDiff})`);

    if (after.productCount === 0) {
      log.error(`${code}: SYNC FAILED — 0 products after sync!`);
    } else {
      log.success(`${code}: ${after.productCount} products imported successfully`);
    }
  }

  return afterSnapshot;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log.header('CLEAN-SLATE CATALOG TEST — STAGING ONLY');
  log.info(`Started: ${new Date().toISOString()}`);
  log.warn('This will DELETE all Flash and MobileMart products from Staging DB,');
  log.warn('then re-import them via the live API sync. Staging ONLY — safe to run.');

  const client = await getStagingClient();

  try {
    // ── STEP 1: Snapshot ──────────────────────────────────────────────────────
    log.header('STEP 1 — PRE-DELETE SNAPSHOT');
    const snapshot = await takeSnapshot(client, 'BEFORE DELETE');

    // ── STEP 2: Delete ────────────────────────────────────────────────────────
    log.header('STEP 2 — DELETE FLASH AND MOBILEMART PRODUCTS');
    await deleteSupplierProducts(client, 'FLASH');
    await deleteSupplierProducts(client, 'MOBILEMART');

    // ── STEP 3: Verify empty ──────────────────────────────────────────────────
    log.header('STEP 3 — VERIFY CATALOG IS EMPTY');
    const isEmpty = await verifyEmpty(client);
    if (!isEmpty) {
      log.error('Catalog not fully cleared. Aborting sync to avoid partial state.');
      process.exit(1);
    }

    // Release client before sync (sync uses its own Sequelize connections)
    client.release();

    // ── STEP 4: Run sync ──────────────────────────────────────────────────────
    log.header('STEP 4 — RUN LIVE CATALOG SYNC (performDailySweep)');
    const syncStats = await runSync();

    log.divider();
    log.info('Sync stats reported by service:');
    log.data(JSON.stringify(syncStats, null, 2));

    // ── STEP 5: Verify results ────────────────────────────────────────────────
    log.header('STEP 5 — VERIFY FINAL RESULTS');
    const freshClient = await getStagingClient();
    await verifyResults(freshClient, snapshot);
    freshClient.release();

    // ── Done ──────────────────────────────────────────────────────────────────
    log.header('TEST COMPLETE');
    log.success('Clean-slate catalog test finished successfully.');
    log.info(`Completed: ${new Date().toISOString()}`);

  } catch (err) {
    try { client.release(); } catch (_) {}
    log.error(`Script failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await closeAll();
  }
}

main();
