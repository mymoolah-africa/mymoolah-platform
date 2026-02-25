#!/usr/bin/env node
/**
 * Bootstrap Flash Supplier into Staging and/or Production
 *
 * Copies from UAT:
 *   1. suppliers row (FLASH)
 *   2. supplier_fee_schedule rows
 *   3. supplier_commission_tiers rows
 *   4. ledger_accounts row (1200-10-04)
 *   5. supplier_floats row
 *   6. product_brands
 *   7. products
 *   8. product_variants
 *
 * Usage (in Codespaces, proxies must be running):
 *   node scripts/bootstrap-flash-supplier.js            # Staging only
 *   node scripts/bootstrap-flash-supplier.js --staging  # Staging only
 *   node scripts/bootstrap-flash-supplier.js --production
 *   node scripts/bootstrap-flash-supplier.js --all      # Both
 */

require('dotenv').config();
const {
  getUATPool,
  getStagingPool,
  getProductionPool,
  closeAll,
} = require('./db-connection-helper');

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

// ── query helper — uses pool.query() directly (same as sync-flash-products-uat-to-staging.js)
async function q(pool, sql, params = []) {
  return await pool.query(sql, params);
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

  // 1. Supplier row
  log.step('1. FLASH supplier row...');
  const uatSupplier = (await q(uatPool,
    `SELECT id, name, code, "isActive" FROM suppliers WHERE code='FLASH' LIMIT 1`
  )).rows[0];
  if (!uatSupplier) throw new Error('FLASH supplier not found in UAT');

  let targetSupplierId;
  const existingSupplier = (await q(targetPool,
    `SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1`
  )).rows[0];

  if (existingSupplier) {
    targetSupplierId = existingSupplier.id;
    log.info(`FLASH supplier already exists (id=${targetSupplierId})`);
  } else {
    const idTaken = (await q(targetPool,
      `SELECT id FROM suppliers WHERE id=$1 LIMIT 1`, [uatSupplier.id]
    )).rows[0];

    if (idTaken) {
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
    log.ok(`FLASH supplier inserted (id=${targetSupplierId})`);
  }

  // 2. Ledger account (1200-10-04)
  log.step('2. Flash float ledger account (1200-10-04)...');
  if (await tableExists(targetPool, 'ledger_accounts')) {
    const uatLedger = (await q(uatPool,
      `SELECT code, name, type, "normalSide" FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`
    )).rows[0];
    if (uatLedger) {
      const exists = (await q(targetPool,
        `SELECT id FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`
      )).rows[0];
      if (!exists) {
        await q(targetPool,
          `INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [uatLedger.code, uatLedger.name, uatLedger.type, uatLedger.normalSide]
        );
        log.ok('Ledger account 1200-10-04 created');
      } else {
        log.info('Ledger account 1200-10-04 already exists');
      }
    }
  } else {
    log.warn('ledger_accounts table not found — skipping');
  }

  // 3. Supplier floats — copy row from UAT using actual UAT schema
  log.step('3. supplier_floats row...');
  if (await tableExists(targetPool, 'supplier_floats')) {
    // Check using the string supplierId column (e.g. 'flash') not the integer FK
    const uatFloat = (await q(uatPool,
      `SELECT * FROM supplier_floats WHERE "supplierId" ILIKE 'flash' LIMIT 1`
    )).rows[0];

    if (!uatFloat) {
      log.warn('No supplier_floats row for FLASH in UAT — skipping');
    } else {
      const sfExists = (await q(targetPool,
        `SELECT id FROM supplier_floats WHERE "supplierId" ILIKE 'flash' LIMIT 1`
      )).rows[0];

      if (sfExists) {
        log.info('supplier_floats row already exists');
      } else {
        // Get actual columns in target supplier_floats to build insert safely
        const colsResult = await q(targetPool,
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema='public' AND table_name='supplier_floats'
           ORDER BY ordinal_position`
        );
        const targetCols = colsResult.rows.map(r => r.column_name);

        // Build insert from UAT row using only columns that exist in target
        const skipCols = ['id', 'createdAt', 'updatedAt'];
        const insertCols = Object.keys(uatFloat).filter(
          k => !skipCols.includes(k) && targetCols.includes(k)
        );
        const values = insertCols.map(k => uatFloat[k]);
        const colList = insertCols.map(c => `"${c}"`).join(', ');
        const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');

        await q(targetPool,
          `INSERT INTO supplier_floats (${colList}, "createdAt", "updatedAt")
           VALUES (${placeholders}, NOW(), NOW())`,
          values
        );
        log.ok('supplier_floats row created');
      }
    }
  } else {
    log.warn('supplier_floats table not found — skipping');
  }

  // 4. Fee schedule
  log.step('4. supplier_fee_schedule...');
  const uatFees = (await q(uatPool,
    `SELECT "serviceType", "feeType", "amountCents", "isVatExclusive", "isActive"
     FROM supplier_fee_schedule WHERE "supplierId"=$1`,
    [uatSupplier.id]
  )).rows;
  let feesOk = 0, feesSkip = 0;
  for (const fee of uatFees) {
    const exists = (await q(targetPool,
      `SELECT id FROM supplier_fee_schedule
       WHERE "supplierId"=$1 AND "serviceType"=$2 AND "feeType"=$3 LIMIT 1`,
      [targetSupplierId, fee.serviceType, fee.feeType]
    )).rows[0];
    if (!exists) {
      await q(targetPool,
        `INSERT INTO supplier_fee_schedule
         ("supplierId","serviceType","feeType","amountCents","isVatExclusive","isActive","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [targetSupplierId, fee.serviceType, fee.feeType, fee.amountCents, fee.isVatExclusive, fee.isActive]
      );
      feesOk++;
    } else { feesSkip++; }
  }
  log.ok(`Fee schedule: ${feesOk} created, ${feesSkip} already existed`);

  // 5. Commission tiers
  log.step('5. supplier_commission_tiers...');
  const uatTiers = (await q(uatPool,
    `SELECT "serviceType", "minVolume", "maxVolume", "ratePct", "isActive"
     FROM supplier_commission_tiers WHERE "supplierId"=$1`,
    [uatSupplier.id]
  )).rows;
  let tiersOk = 0, tiersSkip = 0;
  for (const tier of uatTiers) {
    const exists = (await q(targetPool,
      `SELECT id FROM supplier_commission_tiers
       WHERE "supplierId"=$1 AND "serviceType"=$2 AND "minVolume"=$3 LIMIT 1`,
      [targetSupplierId, tier.serviceType, tier.minVolume]
    )).rows[0];
    if (!exists) {
      await q(targetPool,
        `INSERT INTO supplier_commission_tiers
         ("supplierId","serviceType","minVolume","maxVolume","ratePct","isActive","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [targetSupplierId, tier.serviceType, tier.minVolume, tier.maxVolume, tier.ratePct, tier.isActive]
      );
      tiersOk++;
    } else { tiersSkip++; }
  }
  log.ok(`Commission tiers: ${tiersOk} created, ${tiersSkip} already existed`);

  // 6. Product brands
  log.step('6. product_brands...');
  const uatBrands = (await q(uatPool,
    `SELECT DISTINCT pb.id, pb.name, pb.category, pb."logoUrl", pb.metadata
     FROM product_brands pb
     JOIN products p ON p."brandId"=pb.id
     WHERE p."supplierId"=$1`,
    [uatSupplier.id]
  )).rows;
  const brandMap = {};
  let brandsOk = 0, brandsSkip = 0;
  for (const brand of uatBrands) {
    const existing = (await q(targetPool,
      `SELECT id FROM product_brands WHERE name=$1 LIMIT 1`, [brand.name]
    )).rows[0];
    if (existing) {
      brandMap[brand.id] = existing.id;
      brandsSkip++;
    } else {
      const r = await q(targetPool,
        `INSERT INTO product_brands (name, category, "logoUrl", metadata, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING id`,
        [brand.name, brand.category, brand.logoUrl,
         brand.metadata ? JSON.stringify(brand.metadata) : null]
      );
      brandMap[brand.id] = r.rows[0].id;
      brandsOk++;
    }
  }
  log.ok(`Product brands: ${brandsOk} created, ${brandsSkip} already existed`);

  // 7. Products
  log.step('7. products...');
  const uatProducts = (await q(uatPool,
    `SELECT id, name, type, status, "brandId", "supplierProductId",
            denominations, constraints, metadata
     FROM products WHERE "supplierId"=$1 ORDER BY id`,
    [uatSupplier.id]
  )).rows;
  const productMap = {};
  let prodsOk = 0, prodsUpdated = 0, prodsFail = 0;
  for (const p of uatProducts) {
    try {
      const targetBrandId = brandMap[p.brandId];
      if (!targetBrandId) { prodsFail++; continue; }
      const toJson = (val, fallback = null) => val == null ? fallback : (typeof val === 'string' ? val : JSON.stringify(val));
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
           toJson(p.denominations, '[]'),
           toJson(p.constraints),
           toJson(p.metadata),
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
           toJson(p.denominations, '[]'),
           toJson(p.constraints),
           toJson(p.metadata)]
        );
        productMap[p.id] = r.rows[0].id;
        prodsOk++;
      }
    } catch (err) {
      log.err(`Product "${p.name}": ${err.message}`);
      prodsFail++;
    }
  }
  log.ok(`Products: ${prodsOk} created, ${prodsUpdated} updated, ${prodsFail} failed`);

  // 8. Product variants
  log.step('8. product_variants...');
  const uatVariants = (await q(uatPool,
    `SELECT pv.*, p.name as product_name
     FROM product_variants pv
     JOIN products p ON pv."productId"=p.id
     WHERE pv."supplierId"=$1 ORDER BY pv.id`,
    [uatSupplier.id]
  )).rows;
  let varsOk = 0, varsUpdated = 0, varsFail = 0;
  for (const v of uatVariants) {
    try {
      const targetProductId = productMap[v.productId];
      if (!targetProductId) { varsFail++; continue; }
      const provider = v.provider || 'Flash';
      // Unique constraint is (productId, supplierId) — match on that only
      const existing = (await q(targetPool,
        `SELECT id FROM product_variants
         WHERE "productId"=$1 AND "supplierId"=$2 LIMIT 1`,
        [targetProductId, targetSupplierId]
      )).rows[0];

      // Serialize JSONB fields — exact same pattern as sync-flash-products-uat-to-staging.js
      const predefinedAmountsJson = v.predefinedAmounts ? JSON.stringify(v.predefinedAmounts) : null;
      const denominationsJson     = v.denominations     ? JSON.stringify(v.denominations)     : null;
      const pricingJson           = v.pricing           ? JSON.stringify(v.pricing)           : null;
      const constraintsJson       = v.constraints       ? JSON.stringify(v.constraints)       : null;
      const metadataJson          = v.metadata          ? JSON.stringify(v.metadata)          : null;
      const providerValue         = v.provider || 'Flash';

      if (existing) {
        await q(targetPool, `
          UPDATE product_variants SET
            "supplierProductId" = $1,
            "vasType" = $2,
            "transactionType" = $3,
            "networkType" = $4,
            "predefinedAmounts" = $5::jsonb,
            denominations = $6::jsonb,
            pricing = $7::jsonb,
            "minAmount" = $8,
            "maxAmount" = $9,
            commission = $10,
            "fixedFee" = $11,
            "isPromotional" = $12,
            "promotionalDiscount" = $13,
            constraints = $14::jsonb,
            status = $15,
            "isPreferred" = $16,
            priority = $17,
            "sortOrder" = $18,
            metadata = $19::jsonb,
            "updatedAt" = NOW()
          WHERE id = $20
        `, [
          v.supplierProductId, v.vasType, v.transactionType, v.networkType,
          predefinedAmountsJson, denominationsJson, pricingJson,
          v.minAmount, v.maxAmount, v.commission, v.fixedFee,
          v.isPromotional, v.promotionalDiscount, constraintsJson,
          v.status, v.isPreferred, v.priority, v.sortOrder,
          metadataJson, existing.id
        ]);
        varsUpdated++;
      } else {
        await q(targetPool, `
          INSERT INTO product_variants (
            "productId", "supplierId", "supplierProductId",
            "vasType", "transactionType", provider, "networkType",
            "predefinedAmounts", denominations, pricing,
            "minAmount", "maxAmount", commission, "fixedFee",
            "isPromotional", "promotionalDiscount", constraints,
            status, "isPreferred", priority, "sortOrder", metadata,
            "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb,
                    $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20, $21, $22::jsonb,
                    NOW(), NOW())
        `, [
          targetProductId, targetSupplierId, v.supplierProductId,
          v.vasType, v.transactionType, providerValue, v.networkType,
          predefinedAmountsJson, denominationsJson, pricingJson,
          v.minAmount, v.maxAmount, v.commission, v.fixedFee,
          v.isPromotional, v.promotionalDiscount, constraintsJson,
          v.status, v.isPreferred, v.priority, v.sortOrder, metadataJson
        ]);
        varsOk++;
      }
    } catch (err) {
      log.err(`Variant for "${v.product_name}": ${err.message}`);
      varsFail++;
    }
  }
  log.ok(`ProductVariants: ${varsOk} created, ${varsUpdated} updated, ${varsFail} failed`);

  // Summary
  const finalP = (await q(targetPool,
    `SELECT COUNT(*) FROM products WHERE "supplierId"=$1`, [targetSupplierId]
  )).rows[0].count;
  const finalV = (await q(targetPool,
    `SELECT COUNT(*) FROM product_variants WHERE "supplierId"=$1`, [targetSupplierId]
  )).rows[0].count;

  log.hdr(`${targetLabel} COMPLETE`);
  log.data(`Supplier ID : ${targetSupplierId}`);
  log.data(`Products    : ${finalP}`);
  log.data(`Variants    : ${finalV}`);

  return { products: parseInt(finalP), variants: parseInt(finalV) };
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const doProduction = args.includes('--all') || args.includes('--production');
  const doStaging    = args.includes('--all') || args.includes('--staging') || !args.includes('--production');

  log.hdr('FLASH SUPPLIER BOOTSTRAP');
  log.info(`Targets: ${[doStaging && 'Staging', doProduction && 'Production'].filter(Boolean).join(', ')}`);

  const uatPool = getUATPool();
  const results = {};

  if (doStaging) {
    const stagingPool = getStagingPool();
    results.staging = await bootstrapTarget(uatPool, stagingPool, 'STAGING');
  }
  if (doProduction) {
    const productionPool = getProductionPool();
    results.production = await bootstrapTarget(uatPool, productionPool, 'PRODUCTION');
  }

  await closeAll();

  // Final summary
  const uatPool2 = getUATPool();
  const uatP = (await q(uatPool2,
    `SELECT COUNT(*) FROM products p JOIN suppliers s ON p."supplierId"=s.id WHERE s.code='FLASH'`
  )).rows[0].count;
  const uatV = (await q(uatPool2,
    `SELECT COUNT(*) FROM product_variants pv JOIN suppliers s ON pv."supplierId"=s.id WHERE s.code='FLASH'`
  )).rows[0].count;
  await closeAll();

  log.hdr('FINAL SUMMARY');
  console.log(`\n  ${'Environment'.padEnd(15)} ${'Products'.padEnd(10)} Variants`);
  console.log(`  ${'─'.repeat(38)}`);
  console.log(`  ${'UAT'.padEnd(15)} ${String(uatP).padEnd(10)} ${uatV}   (source of truth)`);
  if (results.staging)    console.log(`  ${'Staging'.padEnd(15)} ${String(results.staging.products).padEnd(10)} ${results.staging.variants}`);
  if (results.production) console.log(`  ${'Production'.padEnd(15)} ${String(results.production.products).padEnd(10)} ${results.production.variants}`);
  console.log();
}

main().catch(err => {
  log.err(`Fatal: ${err.message}`);
  console.error(err);
  closeAll().finally(() => process.exit(1));
});
