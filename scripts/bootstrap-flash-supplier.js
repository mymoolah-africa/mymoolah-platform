#!/usr/bin/env node
/**
 * Bootstrap Flash Supplier into Staging and/or Production
 *
 * Problem: The FLASH supplier row (and all dependent data) exists in UAT
 * but is missing from Staging and Production databases.
 *
 * This script copies from UAT:
 *   1. suppliers row (FLASH)
 *   2. supplier_fee_schedule rows
 *   3. supplier_commission_tiers rows
 *   4. supplier_floats row (if table exists)
 *   5. ledger_accounts row (1200-10-04 Flash Float)
 *   6. product_brands (Flash-related)
 *   7. products (all Flash products)
 *   8. product_variants (all Flash variants)
 *
 * Usage (in Codespaces, proxies must be running):
 *   # Staging only (default):
 *   node scripts/bootstrap-flash-supplier.js
 *
 *   # Production only:
 *   node scripts/bootstrap-flash-supplier.js --production
 *
 *   # Both Staging and Production:
 *   node scripts/bootstrap-flash-supplier.js --all
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');

// ── colours ──────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  cyan: '\x1b[36m', red: '\x1b[31m', magenta: '\x1b[35m'
};
const log = {
  ok:   (m) => console.log(`${C.green}✅  ${m}${C.reset}`),
  err:  (m) => console.log(`${C.red}❌  ${m}${C.reset}`),
  warn: (m) => console.log(`${C.yellow}⚠️   ${m}${C.reset}`),
  info: (m) => console.log(`${C.blue}ℹ️   ${m}${C.reset}`),
  hdr:  (m) => console.log(`\n${C.bright}${C.cyan}${m}${C.reset}\n${'─'.repeat(60)}`),
  step: (m) => console.log(`${C.magenta}▶️   ${m}${C.reset}`),
  data: (m) => console.log(`     ${m}`),
};

// ── config ────────────────────────────────────────────────────────────────────
const PROJECT = 'mymoolah-db';

const ENVS = {
  UAT: {
    host: '127.0.0.1', port: 6543,
    database: 'mymoolah', user: 'mymoolah_app',
  },
  STAGING: {
    host: '127.0.0.1', port: 6544,
    database: 'mymoolah_staging', user: 'mymoolah_app',
    secret: 'db-mmtp-pg-staging-password',
  },
  PRODUCTION: {
    host: '127.0.0.1', port: 6545,
    database: 'mymoolah_production', user: 'mymoolah_app',
    secret: 'db-mmtp-pg-production-password',
  },
};

// ── password helpers ──────────────────────────────────────────────────────────
function getUATPassword() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) return decodeURIComponent(url.password);
    } catch (_) {
      const s = process.env.DATABASE_URL;
      const hi = s.indexOf('@127.0.0.1:');
      if (hi > 0) {
        const ps = s.indexOf(':', s.indexOf('://') + 3) + 1;
        if (ps > 0 && ps < hi) {
          try { return decodeURIComponent(s.substring(ps, hi)); } catch { return s.substring(ps, hi); }
        }
      }
    }
  }
  if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
  throw new Error('UAT password not found — set DB_PASSWORD or DATABASE_URL in .env');
}

function getSecretPassword(secretName) {
  const pw = execSync(
    `gcloud secrets versions access latest --secret="${secretName}" --project=${PROJECT}`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(/[\r\n\s]+$/g, '').trim();
  if (!pw) throw new Error(`Empty password returned for secret: ${secretName}`);
  return pw;
}

// ── pool factory ──────────────────────────────────────────────────────────────
function makePool(cfg, password) {
  return new Pool({
    host: cfg.host, port: cfg.port,
    database: cfg.database, user: cfg.user,
    password,
    ssl: false,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
  });
}

// ── safe query helper ─────────────────────────────────────────────────────────
async function q(pool, sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ── table existence check ─────────────────────────────────────────────────────
async function tableExists(pool, tableName) {
  const r = await q(pool,
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema='public' AND table_name=$1
     )`, [tableName]);
  return r.rows[0].exists;
}

// ── bootstrap one target environment ─────────────────────────────────────────
async function bootstrapTarget(uatPool, targetPool, targetLabel) {
  log.hdr(`BOOTSTRAPPING FLASH → ${targetLabel}`);

  // ── 1. Supplier row ────────────────────────────────────────────────────────
  log.step('1. Syncing FLASH supplier row...');
  const uatSupplier = (await q(uatPool,
    `SELECT id, name, code, "isActive", "createdAt", "updatedAt"
     FROM suppliers WHERE code='FLASH' LIMIT 1`
  )).rows[0];
  if (!uatSupplier) throw new Error('FLASH supplier not found in UAT');

  let targetSupplierId;
  const existingSupplier = (await q(targetPool,
    `SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1`
  )).rows[0];

  if (existingSupplier) {
    targetSupplierId = existingSupplier.id;
    log.info(`FLASH supplier already exists in ${targetLabel} (id=${targetSupplierId})`);
  } else {
    // Insert with explicit id to match UAT (simpler for FK consistency)
    // But check if that id is taken first
    const idTaken = (await q(targetPool,
      `SELECT id FROM suppliers WHERE id=$1`, [uatSupplier.id]
    )).rows[0];

    if (idTaken) {
      // Insert without id, let DB assign
      const r = await q(targetPool,
        `INSERT INTO suppliers (name, code, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
        [uatSupplier.name, uatSupplier.code, uatSupplier.isActive]
      );
      targetSupplierId = r.rows[0].id;
    } else {
      const r = await q(targetPool,
        `INSERT INTO suppliers (id, name, code, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [uatSupplier.id, uatSupplier.name, uatSupplier.code, uatSupplier.isActive]
      );
      targetSupplierId = r.rows[0].id;
    }
    log.ok(`FLASH supplier inserted into ${targetLabel} (id=${targetSupplierId})`);
  }

  // ── 2. Ledger account (Flash Float 1200-10-04) ────────────────────────────
  log.step('2. Syncing Flash float ledger account (1200-10-04)...');
  if (await tableExists(targetPool, 'ledger_accounts')) {
    const uatLedger = (await q(uatPool,
      `SELECT code, name, type, "normalSide" FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`
    )).rows[0];

    if (uatLedger) {
      const existingLedger = (await q(targetPool,
        `SELECT id FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`
      )).rows[0];
      if (!existingLedger) {
        await q(targetPool,
          `INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [uatLedger.code, uatLedger.name, uatLedger.type, uatLedger.normalSide]
        );
        log.ok('Flash float ledger account (1200-10-04) created');
      } else {
        log.info('Flash float ledger account (1200-10-04) already exists');
      }
    } else {
      log.warn('Flash float ledger account not found in UAT — skipping');
    }
  } else {
    log.warn('ledger_accounts table does not exist in target — skipping');
  }

  // ── 3. Supplier floats ────────────────────────────────────────────────────
  log.step('3. Syncing supplier_floats row...');
  if (await tableExists(targetPool, 'supplier_floats')) {
    const uatFloat = (await q(uatPool,
      `SELECT sf.*, la.code as ledger_code
       FROM supplier_floats sf
       LEFT JOIN ledger_accounts la ON sf."ledgerAccountId"=la.id
       WHERE sf."supplierId"=$1 LIMIT 1`,
      [uatSupplier.id]
    )).rows[0];

    if (uatFloat) {
      const existingFloat = (await q(targetPool,
        `SELECT id FROM supplier_floats WHERE "supplierId"=$1 LIMIT 1`,
        [targetSupplierId]
      )).rows[0];

      if (!existingFloat) {
        // Resolve ledger account id in target
        let targetLedgerId = null;
        if (uatFloat.ledger_code) {
          const tl = (await q(targetPool,
            `SELECT id FROM ledger_accounts WHERE code=$1 LIMIT 1`,
            [uatFloat.ledger_code]
          )).rows[0];
          targetLedgerId = tl ? tl.id : null;
        }

        // Build insert dynamically based on columns present
        const cols = Object.keys(uatFloat).filter(k =>
          !['id', 'supplierId', 'ledgerAccountId', 'ledger_code', 'createdAt', 'updatedAt'].includes(k)
        );
        const vals = cols.map(k => uatFloat[k]);
        const colList = cols.map(c => `"${c}"`).join(', ');
        const placeholders = cols.map((_, i) => `$${i + 3}`).join(', ');

        await q(targetPool,
          `INSERT INTO supplier_floats ("supplierId", "ledgerAccountId", ${colList}, "createdAt", "updatedAt")
           VALUES ($1, $2, ${placeholders}, NOW(), NOW())`,
          [targetSupplierId, targetLedgerId, ...vals]
        );
        log.ok('supplier_floats row created');
      } else {
        log.info('supplier_floats row already exists');
      }
    } else {
      log.warn('No supplier_floats row found for FLASH in UAT — skipping');
    }
  } else {
    log.warn('supplier_floats table does not exist in target — skipping');
  }

  // ── 4. Fee schedule ───────────────────────────────────────────────────────
  log.step('4. Syncing supplier_fee_schedule...');
  const uatFees = (await q(uatPool,
    `SELECT "serviceType", "feeType", "amountCents", "isVatExclusive", "isActive"
     FROM supplier_fee_schedule WHERE "supplierId"=$1`,
    [uatSupplier.id]
  )).rows;

  let feesCreated = 0, feesSkipped = 0;
  for (const fee of uatFees) {
    const existing = (await q(targetPool,
      `SELECT id FROM supplier_fee_schedule
       WHERE "supplierId"=$1 AND "serviceType"=$2 AND "feeType"=$3`,
      [targetSupplierId, fee.serviceType, fee.feeType]
    )).rows[0];
    if (!existing) {
      await q(targetPool,
        `INSERT INTO supplier_fee_schedule
         ("supplierId", "serviceType", "feeType", "amountCents", "isVatExclusive", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [targetSupplierId, fee.serviceType, fee.feeType, fee.amountCents, fee.isVatExclusive, fee.isActive]
      );
      feesCreated++;
    } else {
      feesSkipped++;
    }
  }
  log.ok(`Fee schedule: ${feesCreated} created, ${feesSkipped} already existed`);

  // ── 5. Commission tiers ───────────────────────────────────────────────────
  log.step('5. Syncing supplier_commission_tiers...');
  const uatTiers = (await q(uatPool,
    `SELECT "serviceType", "minVolume", "maxVolume", "ratePct", "isActive"
     FROM supplier_commission_tiers WHERE "supplierId"=$1`,
    [uatSupplier.id]
  )).rows;

  let tiersCreated = 0, tiersSkipped = 0;
  for (const tier of uatTiers) {
    const existing = (await q(targetPool,
      `SELECT id FROM supplier_commission_tiers
       WHERE "supplierId"=$1 AND "serviceType"=$2 AND "minVolume"=$3`,
      [targetSupplierId, tier.serviceType, tier.minVolume]
    )).rows[0];
    if (!existing) {
      await q(targetPool,
        `INSERT INTO supplier_commission_tiers
         ("supplierId", "serviceType", "minVolume", "maxVolume", "ratePct", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [targetSupplierId, tier.serviceType, tier.minVolume, tier.maxVolume, tier.ratePct, tier.isActive]
      );
      tiersCreated++;
    } else {
      tiersSkipped++;
    }
  }
  log.ok(`Commission tiers: ${tiersCreated} created, ${tiersSkipped} already existed`);

  // ── 6. Product brands ─────────────────────────────────────────────────────
  log.step('6. Syncing product_brands...');
  const uatBrands = (await q(uatPool,
    `SELECT DISTINCT pb.id, pb.name, pb.category, pb."logoUrl", pb.metadata
     FROM product_brands pb
     JOIN products p ON p."brandId"=pb.id
     WHERE p."supplierId"=$1`,
    [uatSupplier.id]
  )).rows;

  const brandMap = {};
  let brandsCreated = 0, brandsExisting = 0;
  for (const brand of uatBrands) {
    const existing = (await q(targetPool,
      `SELECT id FROM product_brands WHERE name=$1 LIMIT 1`, [brand.name]
    )).rows[0];
    if (existing) {
      brandMap[brand.id] = existing.id;
      brandsExisting++;
    } else {
      const r = await q(targetPool,
        `INSERT INTO product_brands (name, category, "logoUrl", metadata, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [brand.name, brand.category, brand.logoUrl, brand.metadata ? JSON.stringify(brand.metadata) : null]
      );
      brandMap[brand.id] = r.rows[0].id;
      brandsCreated++;
    }
  }
  log.ok(`Product brands: ${brandsCreated} created, ${brandsExisting} already existed`);

  // ── 7. Products ───────────────────────────────────────────────────────────
  log.step('7. Syncing products...');
  const uatProducts = (await q(uatPool,
    `SELECT id, name, type, status, "brandId", "supplierProductId",
            denominations, constraints, metadata
     FROM products WHERE "supplierId"=$1 ORDER BY id`,
    [uatSupplier.id]
  )).rows;

  const productMap = {};
  let prodsCreated = 0, prodsUpdated = 0, prodsFailed = 0;
  for (const p of uatProducts) {
    try {
      const targetBrandId = brandMap[p.brandId];
      if (!targetBrandId) {
        log.warn(`No brand mapping for product "${p.name}" (brandId=${p.brandId}) — skipping`);
        prodsFailed++;
        continue;
      }
      const existing = (await q(targetPool,
        `SELECT id FROM products WHERE name=$1 AND "supplierId"=$2 LIMIT 1`,
        [p.name, targetSupplierId]
      )).rows[0];

      if (existing) {
        await q(targetPool,
          `UPDATE products SET type=$1, status=$2, "brandId"=$3, "supplierProductId"=$4,
           denominations=$5::jsonb, constraints=$6::jsonb, metadata=$7::jsonb, "updatedAt"=NOW()
           WHERE id=$8`,
          [p.type, p.status, targetBrandId, p.supplierProductId,
           JSON.stringify(p.denominations ?? []),
           p.constraints ? JSON.stringify(p.constraints) : null,
           p.metadata ? JSON.stringify(p.metadata) : null,
           existing.id]
        );
        productMap[p.id] = existing.id;
        prodsUpdated++;
      } else {
        const r = await q(targetPool,
          `INSERT INTO products
           (name, type, status, "supplierId", "brandId", "supplierProductId",
            denominations, constraints, metadata, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,NOW(),NOW()) RETURNING id`,
          [p.name, p.type, p.status, targetSupplierId, targetBrandId, p.supplierProductId,
           JSON.stringify(p.denominations ?? []),
           p.constraints ? JSON.stringify(p.constraints) : null,
           p.metadata ? JSON.stringify(p.metadata) : null]
        );
        productMap[p.id] = r.rows[0].id;
        prodsCreated++;
      }
    } catch (err) {
      log.err(`Failed to sync product "${p.name}": ${err.message}`);
      prodsFailed++;
    }
  }
  log.ok(`Products: ${prodsCreated} created, ${prodsUpdated} updated, ${prodsFailed} failed`);

  // ── 8. Product variants ───────────────────────────────────────────────────
  log.step('8. Syncing product_variants...');
  const uatVariants = (await q(uatPool,
    `SELECT pv.*, p.name as product_name
     FROM product_variants pv
     JOIN products p ON pv."productId"=p.id
     WHERE pv."supplierId"=$1 ORDER BY pv.id`,
    [uatSupplier.id]
  )).rows;

  let varsCreated = 0, varsUpdated = 0, varsFailed = 0;
  for (const v of uatVariants) {
    try {
      const targetProductId = productMap[v.productId];
      if (!targetProductId) {
        log.warn(`No product mapping for variant of "${v.product_name}" — skipping`);
        varsFailed++;
        continue;
      }
      const provider = v.provider || 'Flash';
      const existing = (await q(targetPool,
        `SELECT id FROM product_variants
         WHERE "productId"=$1 AND "supplierId"=$2 AND provider=$3 LIMIT 1`,
        [targetProductId, targetSupplierId, provider]
      )).rows[0];

      const fields = [
        v.supplierProductId, v.vasType, v.transactionType, v.networkType,
        v.predefinedAmounts ? JSON.stringify(v.predefinedAmounts) : null,
        v.denominations ? JSON.stringify(v.denominations) : null,
        v.pricing ? JSON.stringify(v.pricing) : null,
        v.minAmount, v.maxAmount, v.commission, v.fixedFee,
        v.isPromotional, v.promotionalDiscount,
        v.constraints ? JSON.stringify(v.constraints) : null,
        v.status, v.isPreferred, v.priority, v.sortOrder,
        v.metadata ? JSON.stringify(v.metadata) : null,
      ];

      if (existing) {
        await q(targetPool,
          `UPDATE product_variants SET
           "supplierProductId"=$1, "vasType"=$2, "transactionType"=$3, "networkType"=$4,
           "predefinedAmounts"=$5::jsonb, denominations=$6::jsonb, pricing=$7::jsonb,
           "minAmount"=$8, "maxAmount"=$9, commission=$10, "fixedFee"=$11,
           "isPromotional"=$12, "promotionalDiscount"=$13, constraints=$14::jsonb,
           status=$15, "isPreferred"=$16, priority=$17, "sortOrder"=$18,
           metadata=$19::jsonb, "updatedAt"=NOW()
           WHERE id=$20`,
          [...fields, existing.id]
        );
        varsUpdated++;
      } else {
        await q(targetPool,
          `INSERT INTO product_variants
           ("productId","supplierId","supplierProductId","vasType","transactionType",
            provider,"networkType","predefinedAmounts",denominations,pricing,
            "minAmount","maxAmount",commission,"fixedFee","isPromotional",
            "promotionalDiscount",constraints,status,"isPreferred",priority,
            "sortOrder",metadata,"createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,
                   $11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21,$22::jsonb,NOW(),NOW())`,
          [targetProductId, targetSupplierId, ...fields.slice(0, -1), provider, fields[fields.length - 1]]
        );
        varsCreated++;
      }
    } catch (err) {
      log.err(`Failed to sync variant for "${v.product_name}": ${err.message}`);
      varsFailed++;
    }
  }
  log.ok(`ProductVariants: ${varsCreated} created, ${varsUpdated} updated, ${varsFailed} failed`);

  // ── summary ───────────────────────────────────────────────────────────────
  const finalP = (await q(targetPool,
    `SELECT COUNT(*) FROM products WHERE "supplierId"=$1`, [targetSupplierId]
  )).rows[0].count;
  const finalV = (await q(targetPool,
    `SELECT COUNT(*) FROM product_variants WHERE "supplierId"=$1`, [targetSupplierId]
  )).rows[0].count;

  log.hdr(`${targetLabel} BOOTSTRAP COMPLETE`);
  log.data(`Supplier ID : ${targetSupplierId}`);
  log.data(`Products    : ${finalP}`);
  log.data(`Variants    : ${finalV}`);
  log.data(`Brands      : ${Object.keys(brandMap).length}`);
  log.data(`Fee rows    : ${uatFees.length}`);
  log.data(`Tier rows   : ${uatTiers.length}`);

  return { products: parseInt(finalP), variants: parseInt(finalV) };
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const doStaging    = args.includes('--all') || args.includes('--staging')    || (!args.includes('--production'));
  const doProduction = args.includes('--all') || args.includes('--production');

  log.hdr('FLASH SUPPLIER BOOTSTRAP');
  log.info(`Targets: ${[doStaging && 'Staging', doProduction && 'Production'].filter(Boolean).join(', ')}`);

  // Passwords
  log.step('Retrieving passwords...');
  const uatPass = getUATPassword();
  log.ok(`UAT password: ${uatPass.substring(0, 3)}***`);

  let stgPass, prdPass;
  if (doStaging) {
    stgPass = getSecretPassword(ENVS.STAGING.secret);
    log.ok(`Staging password: ${stgPass.substring(0, 3)}***`);
  }
  if (doProduction) {
    prdPass = getSecretPassword(ENVS.PRODUCTION.secret);
    log.ok(`Production password: ${prdPass.substring(0, 3)}***`);
  }

  // Pools
  const uatPool = makePool(ENVS.UAT, uatPass);

  // Test UAT connection
  await q(uatPool, 'SELECT 1');
  log.ok('UAT connection OK');

  const results = {};

  if (doStaging) {
    const stgPool = makePool(ENVS.STAGING, stgPass);
    try {
      await q(stgPool, 'SELECT 1');
      log.ok('Staging connection OK');
      results.staging = await bootstrapTarget(uatPool, stgPool, 'STAGING');
    } finally {
      await stgPool.end();
    }
  }

  if (doProduction) {
    const prdPool = makePool(ENVS.PRODUCTION, prdPass);
    try {
      await q(prdPool, 'SELECT 1');
      log.ok('Production connection OK');
      results.production = await bootstrapTarget(uatPool, prdPool, 'PRODUCTION');
    } finally {
      await prdPool.end();
    }
  }

  await uatPool.end();

  // Final summary
  log.hdr('ALL DONE — FINAL SUMMARY');
  const uatP = (await (async () => {
    const p = makePool(ENVS.UAT, uatPass);
    const r = await q(p, `SELECT COUNT(*) FROM products p JOIN suppliers s ON p."supplierId"=s.id WHERE s.code='FLASH'`);
    await p.end();
    return r;
  })()).rows[0].count;

  console.log(`\n  ${'Environment'.padEnd(15)} ${'Products'.padEnd(10)} Variants`);
  console.log(`  ${'─'.repeat(40)}`);
  console.log(`  ${'UAT'.padEnd(15)} ${uatP.padEnd(10)} (source of truth)`);
  if (results.staging)    console.log(`  ${'Staging'.padEnd(15)} ${String(results.staging.products).padEnd(10)} ${results.staging.variants}`);
  if (results.production) console.log(`  ${'Production'.padEnd(15)} ${String(results.production.products).padEnd(10)} ${results.production.variants}`);
  console.log();
}

main().catch(err => {
  log.err(`Fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
