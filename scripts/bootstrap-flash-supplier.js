#!/usr/bin/env node
/**
 * Bootstrap Flash Supplier into Staging and/or Production
 *
 * Copies from UAT:
 *   1. suppliers row (FLASH)
 *   2. supplier_fee_schedule rows
 *   3. supplier_commission_tiers rows
 *   4. supplier_floats row (if table exists)
 *   5. ledger_accounts row (1200-10-04)
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
const { execSync, spawnSync } = require('child_process');

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
const DB_USER = 'mymoolah_app';

const ENVS = {
  UAT:        { host: '127.0.0.1', port: 6543, database: 'mymoolah' },
  STAGING:    { host: '127.0.0.1', port: 6544, database: 'mymoolah_staging',    secret: 'db-mmtp-pg-staging-password' },
  PRODUCTION: { host: '127.0.0.1', port: 6545, database: 'mymoolah_production', secret: 'db-mmtp-pg-production-password' },
};

// ── password helpers ──────────────────────────────────────────────────────────
function getUATPassword() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) return decodeURIComponent(url.password);
    } catch (_) {}
    // Manual parse
    const s = process.env.DATABASE_URL;
    const hi = s.indexOf('@127.0.0.1:');
    if (hi > 0) {
      const ps = s.indexOf(':', s.indexOf('://') + 3) + 1;
      if (ps > 0 && ps < hi) {
        try { return decodeURIComponent(s.substring(ps, hi)); } catch { return s.substring(ps, hi); }
      }
    }
  }
  if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
  throw new Error('UAT password not found — set DB_PASSWORD or DATABASE_URL in .env');
}

function getSecretPassword(secretName) {
  const result = spawnSync(
    'gcloud', ['secrets', 'versions', 'access', 'latest', `--secret=${secretName}`, `--project=${PROJECT}`],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) throw new Error(`Failed to get secret ${secretName}: ${result.stderr}`);
  return result.stdout.replace(/[\r\n\s]+$/g, '').trim();
}

// ── psql helper ───────────────────────────────────────────────────────────────
// All DB operations use psql directly — avoids Node.js pg ECONNRESET issues
// Returns { rows: [{col: val, ...}], rowCount }
function psql(env, password, sql) {
  const env_vars = { ...process.env, PGPASSWORD: password };
  const result = spawnSync(
    'psql',
    [
      '-h', env.host,
      '-p', String(env.port),
      '-U', DB_USER,
      '-d', env.database,
      '--no-password',
      '-t',           // tuples only
      '-A',           // unaligned
      '-F', '\t',     // tab separator
      '-c', sql,
    ],
    { encoding: 'utf8', env: env_vars, maxBuffer: 50 * 1024 * 1024 }
  );

  if (result.status !== 0) {
    const errMsg = (result.stderr || result.stdout || '').trim();
    throw new Error(`psql error (${env.database}:${env.port}): ${errMsg}`);
  }

  // Parse tab-separated output into rows
  const lines = (result.stdout || '').split('\n').filter(l => l.trim() !== '');
  return lines.map(line => line.split('\t'));
}

// Convenience: run SQL returning first cell of first row, or null
function psqlOne(env, password, sql) {
  try {
    const rows = psql(env, password, sql);
    return (rows.length > 0 && rows[0].length > 0) ? rows[0][0] : null;
  } catch { return null; }
}

// Convenience: test connection
function testConnection(env, password) {
  try {
    psqlOne(env, password, 'SELECT 1');
    return true;
  } catch (err) {
    return err.message;
  }
}

// Run multi-statement SQL (no result needed)
function psqlExec(env, password, sql) {
  const env_vars = { ...process.env, PGPASSWORD: password };
  const result = spawnSync(
    'psql',
    ['-h', env.host, '-p', String(env.port), '-U', DB_USER, '-d', env.database,
     '--no-password', '-c', sql],
    { encoding: 'utf8', env: env_vars }
  );
  if (result.status !== 0) {
    throw new Error(`psql exec error: ${(result.stderr || result.stdout || '').trim()}`);
  }
}

// ── table existence ───────────────────────────────────────────────────────────
function tableExists(env, password, tableName) {
  const r = psqlOne(env, password,
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${tableName}')`
  );
  return r === 't' || r === 'true';
}

// ── bootstrap one target ──────────────────────────────────────────────────────
function bootstrapTarget(uatEnv, uatPass, targetEnv, targetPass, targetLabel) {
  log.hdr(`BOOTSTRAPPING FLASH → ${targetLabel}`);

  // 1. Supplier row
  log.step('1. FLASH supplier row...');
  const uatSupRow = psql(uatEnv, uatPass,
    `SELECT id, name, code, "isActive" FROM suppliers WHERE code='FLASH' LIMIT 1`);
  if (!uatSupRow.length) throw new Error('FLASH supplier not found in UAT');
  const [uatSupId, uatSupName, , uatSupActive] = uatSupRow[0];

  let targetSupplierId = psqlOne(targetEnv, targetPass,
    `SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1`);

  if (targetSupplierId) {
    log.info(`FLASH supplier already exists (id=${targetSupplierId})`);
  } else {
    // Try inserting with same id first
    const idTaken = psqlOne(targetEnv, targetPass,
      `SELECT id FROM suppliers WHERE id=${uatSupId} LIMIT 1`);

    if (idTaken) {
      targetSupplierId = psqlOne(targetEnv, targetPass,
        `INSERT INTO suppliers (name, code, "isActive", "createdAt", "updatedAt")
         VALUES ('${uatSupName}', 'FLASH', ${uatSupActive}, NOW(), NOW()) RETURNING id`);
    } else {
      targetSupplierId = psqlOne(targetEnv, targetPass,
        `INSERT INTO suppliers (id, name, code, "isActive", "createdAt", "updatedAt")
         VALUES (${uatSupId}, '${uatSupName}', 'FLASH', ${uatSupActive}, NOW(), NOW()) RETURNING id`);
    }
    log.ok(`FLASH supplier inserted (id=${targetSupplierId})`);
  }

  // 2. Ledger account
  log.step('2. Flash float ledger account (1200-10-04)...');
  if (tableExists(targetEnv, targetPass, 'ledger_accounts')) {
    const uatLedger = psql(uatEnv, uatPass,
      `SELECT code, name, type, "normalSide" FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`);
    if (uatLedger.length) {
      const [code, name, type, normalSide] = uatLedger[0];
      const exists = psqlOne(targetEnv, targetPass,
        `SELECT id FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`);
      if (!exists) {
        psqlExec(targetEnv, targetPass,
          `INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
           VALUES ('${code}', '${name.replace(/'/g, "''")}', '${type}', '${normalSide}', NOW(), NOW())`);
        log.ok('Ledger account 1200-10-04 created');
      } else {
        log.info('Ledger account 1200-10-04 already exists');
      }
    }
  } else {
    log.warn('ledger_accounts table not found — skipping');
  }

  // 3. Supplier floats
  log.step('3. supplier_floats row...');
  if (tableExists(targetEnv, targetPass, 'supplier_floats')) {
    const sfExists = psqlOne(targetEnv, targetPass,
      `SELECT id FROM supplier_floats WHERE "supplierId"=${targetSupplierId} LIMIT 1`);
    if (!sfExists) {
      const uatSf = psql(uatEnv, uatPass,
        `SELECT sf.balance, sf."ledgerAccountCode", la.code as lac
         FROM supplier_floats sf
         LEFT JOIN ledger_accounts la ON sf."ledgerAccountId"=la.id
         WHERE sf."supplierId"=${uatSupId} LIMIT 1`);
      if (uatSf.length) {
        const targetLedgerId = psqlOne(targetEnv, targetPass,
          `SELECT id FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`);
        const balVal = uatSf[0][0] || '0';
        psqlExec(targetEnv, targetPass,
          `INSERT INTO supplier_floats ("supplierId", "ledgerAccountId", balance, "createdAt", "updatedAt")
           VALUES (${targetSupplierId}, ${targetLedgerId || 'NULL'}, ${balVal}, NOW(), NOW())`);
        log.ok('supplier_floats row created');
      } else {
        // Create with zero balance
        const targetLedgerId = psqlOne(targetEnv, targetPass,
          `SELECT id FROM ledger_accounts WHERE code='1200-10-04' LIMIT 1`);
        psqlExec(targetEnv, targetPass,
          `INSERT INTO supplier_floats ("supplierId", "ledgerAccountId", balance, "createdAt", "updatedAt")
           VALUES (${targetSupplierId}, ${targetLedgerId || 'NULL'}, 0, NOW(), NOW())`);
        log.ok('supplier_floats row created (zero balance)');
      }
    } else {
      log.info('supplier_floats row already exists');
    }
  } else {
    log.warn('supplier_floats table not found — skipping');
  }

  // 4. Fee schedule
  log.step('4. supplier_fee_schedule...');
  const uatFees = psql(uatEnv, uatPass,
    `SELECT "serviceType", "feeType", "amountCents", "isVatExclusive", "isActive"
     FROM supplier_fee_schedule WHERE "supplierId"=${uatSupId}`);
  let feesOk = 0, feesSkip = 0;
  for (const [serviceType, feeType, amountCents, isVatExclusive, isActive] of uatFees) {
    const exists = psqlOne(targetEnv, targetPass,
      `SELECT id FROM supplier_fee_schedule
       WHERE "supplierId"=${targetSupplierId} AND "serviceType"='${serviceType}' AND "feeType"='${feeType}' LIMIT 1`);
    if (!exists) {
      psqlExec(targetEnv, targetPass,
        `INSERT INTO supplier_fee_schedule
         ("supplierId","serviceType","feeType","amountCents","isVatExclusive","isActive","createdAt","updatedAt")
         VALUES (${targetSupplierId},'${serviceType}','${feeType}',${amountCents},${isVatExclusive},${isActive},NOW(),NOW())`);
      feesOk++;
    } else {
      feesSkip++;
    }
  }
  log.ok(`Fee schedule: ${feesOk} created, ${feesSkip} already existed`);

  // 5. Commission tiers
  log.step('5. supplier_commission_tiers...');
  const uatTiers = psql(uatEnv, uatPass,
    `SELECT "serviceType", "minVolume", "maxVolume", "ratePct", "isActive"
     FROM supplier_commission_tiers WHERE "supplierId"=${uatSupId}`);
  let tiersOk = 0, tiersSkip = 0;
  for (const [serviceType, minVolume, maxVolume, ratePct, isActive] of uatTiers) {
    const exists = psqlOne(targetEnv, targetPass,
      `SELECT id FROM supplier_commission_tiers
       WHERE "supplierId"=${targetSupplierId} AND "serviceType"='${serviceType}' AND "minVolume"=${minVolume} LIMIT 1`);
    if (!exists) {
      const maxVol = maxVolume === '' || maxVolume === null ? 'NULL' : maxVolume;
      psqlExec(targetEnv, targetPass,
        `INSERT INTO supplier_commission_tiers
         ("supplierId","serviceType","minVolume","maxVolume","ratePct","isActive","createdAt","updatedAt")
         VALUES (${targetSupplierId},'${serviceType}',${minVolume},${maxVol},${ratePct},${isActive},NOW(),NOW())`);
      tiersOk++;
    } else {
      tiersSkip++;
    }
  }
  log.ok(`Commission tiers: ${tiersOk} created, ${tiersSkip} already existed`);

  // 6. Product brands
  log.step('6. product_brands...');
  const uatBrands = psql(uatEnv, uatPass,
    `SELECT DISTINCT pb.id, pb.name, pb.category, pb."logoUrl"
     FROM product_brands pb
     JOIN products p ON p."brandId"=pb.id
     WHERE p."supplierId"=${uatSupId}`);
  const brandMap = {};
  let brandsOk = 0, brandsSkip = 0;
  for (const [bid, bname, bcategory, blogoUrl] of uatBrands) {
    const safeName = bname.replace(/'/g, "''");
    const existing = psqlOne(targetEnv, targetPass,
      `SELECT id FROM product_brands WHERE name='${safeName}' LIMIT 1`);
    if (existing) {
      brandMap[bid] = existing;
      brandsSkip++;
    } else {
      const catVal  = bcategory ? `'${bcategory}'` : 'NULL';
      const logoVal = blogoUrl  ? `'${blogoUrl.replace(/'/g, "''")}'` : 'NULL';
      const newId = psqlOne(targetEnv, targetPass,
        `INSERT INTO product_brands (name, category, "logoUrl", "createdAt", "updatedAt")
         VALUES ('${safeName}', ${catVal}, ${logoVal}, NOW(), NOW()) RETURNING id`);
      brandMap[bid] = newId;
      brandsOk++;
    }
  }
  log.ok(`Product brands: ${brandsOk} created, ${brandsSkip} already existed`);

  // 7. Products
  log.step('7. products...');
  const uatProducts = psql(uatEnv, uatPass,
    `SELECT id, name, type, status, "brandId", "supplierProductId",
            denominations::text, constraints::text, metadata::text
     FROM products WHERE "supplierId"=${uatSupId} ORDER BY id`);
  const productMap = {};
  let prodsOk = 0, prodsUpdated = 0, prodsFail = 0;
  for (const [pid, pname, ptype, pstatus, pbrandId, pSupProdId, pDenoms, pConstraints, pMeta] of uatProducts) {
    try {
      const targetBrandId = brandMap[pbrandId];
      if (!targetBrandId) { prodsFail++; continue; }
      const safeName   = pname.replace(/'/g, "''");
      const supProdVal = pSupProdId ? `'${pSupProdId}'` : 'NULL';
      const denomsVal  = pDenoms      ? `'${pDenoms.replace(/'/g, "''")}'::jsonb` : `'[]'::jsonb`;
      const consVal    = pConstraints ? `'${pConstraints.replace(/'/g, "''")}'::jsonb` : 'NULL';
      const metaVal    = pMeta        ? `'${pMeta.replace(/'/g, "''")}'::jsonb` : 'NULL';

      const existing = psqlOne(targetEnv, targetPass,
        `SELECT id FROM products WHERE name='${safeName}' AND "supplierId"=${targetSupplierId} LIMIT 1`);
      if (existing) {
        psqlExec(targetEnv, targetPass,
          `UPDATE products SET type='${ptype}', status='${pstatus}', "brandId"=${targetBrandId},
           "supplierProductId"=${supProdVal}, denominations=${denomsVal},
           constraints=${consVal}, metadata=${metaVal}, "updatedAt"=NOW()
           WHERE id=${existing}`);
        productMap[pid] = existing;
        prodsUpdated++;
      } else {
        const newId = psqlOne(targetEnv, targetPass,
          `INSERT INTO products
           (name, type, status, "supplierId", "brandId", "supplierProductId",
            denominations, constraints, metadata, "createdAt", "updatedAt")
           VALUES ('${safeName}','${ptype}','${pstatus}',${targetSupplierId},${targetBrandId},
                   ${supProdVal},${denomsVal},${consVal},${metaVal},NOW(),NOW())
           RETURNING id`);
        productMap[pid] = newId;
        prodsOk++;
      }
    } catch (err) {
      log.err(`Product "${pname}": ${err.message}`);
      prodsFail++;
    }
  }
  log.ok(`Products: ${prodsOk} created, ${prodsUpdated} updated, ${prodsFail} failed`);

  // 8. Product variants
  log.step('8. product_variants...');
  const uatVariants = psql(uatEnv, uatPass,
    `SELECT pv.id, pv."productId", pv."supplierProductId", pv."vasType", pv."transactionType",
            pv.provider, pv."networkType",
            pv."predefinedAmounts"::text, pv.denominations::text, pv.pricing::text,
            pv."minAmount", pv."maxAmount", pv.commission, pv."fixedFee",
            pv."isPromotional", pv."promotionalDiscount",
            pv.constraints::text, pv.status, pv."isPreferred",
            pv.priority, pv."sortOrder", pv.metadata::text,
            p.name as product_name
     FROM product_variants pv
     JOIN products p ON pv."productId"=p.id
     WHERE pv."supplierId"=${uatSupId} ORDER BY pv.id`);

  let varsOk = 0, varsUpdated = 0, varsFail = 0;
  for (const row of uatVariants) {
    const [vid, vProductId, vSupProdId, vVasType, vTransType, vProvider, vNetType,
           vPreAmounts, vDenoms, vPricing, vMin, vMax, vComm, vFixedFee,
           vIsProm, vPromDisc, vConstraints, vStatus, vIsPreferred,
           vPriority, vSortOrder, vMeta, vProdName] = row;
    try {
      const targetProductId = productMap[vProductId];
      if (!targetProductId) { varsFail++; continue; }

      const provider     = vProvider || 'Flash';
      const supProdVal   = vSupProdId    ? `'${vSupProdId}'`                          : 'NULL';
      const vasTypeVal   = vVasType      ? `'${vVasType}'`                             : 'NULL';
      const transTypeVal = vTransType    ? `'${vTransType}'`                           : 'NULL';
      const netTypeVal   = vNetType      ? `'${vNetType}'`                             : 'NULL';
      const preAmtVal    = vPreAmounts   ? `'${vPreAmounts.replace(/'/g,"''")}'::jsonb` : 'NULL';
      const denomsVal    = vDenoms       ? `'${vDenoms.replace(/'/g,"''")}'::jsonb`    : 'NULL';
      const pricingVal   = vPricing      ? `'${vPricing.replace(/'/g,"''")}'::jsonb`   : 'NULL';
      const consVal      = vConstraints  ? `'${vConstraints.replace(/'/g,"''")}'::jsonb`: 'NULL';
      const metaVal      = vMeta         ? `'${vMeta.replace(/'/g,"''")}'::jsonb`      : 'NULL';
      const minVal       = vMin          ? vMin          : 'NULL';
      const maxVal       = vMax          ? vMax          : 'NULL';
      const commVal      = vComm         ? vComm         : 'NULL';
      const fixedFeeVal  = vFixedFee     ? vFixedFee     : 'NULL';
      const promDiscVal  = vPromDisc     ? vPromDisc     : 'NULL';
      const priorityVal  = vPriority     ? vPriority     : 'NULL';
      const sortVal      = vSortOrder    ? vSortOrder    : 'NULL';

      const existing = psqlOne(targetEnv, targetPass,
        `SELECT id FROM product_variants
         WHERE "productId"=${targetProductId} AND "supplierId"=${targetSupplierId}
         AND provider='${provider}' LIMIT 1`);

      if (existing) {
        psqlExec(targetEnv, targetPass,
          `UPDATE product_variants SET
           "supplierProductId"=${supProdVal}, "vasType"=${vasTypeVal},
           "transactionType"=${transTypeVal}, "networkType"=${netTypeVal},
           "predefinedAmounts"=${preAmtVal}, denominations=${denomsVal},
           pricing=${pricingVal}, "minAmount"=${minVal}, "maxAmount"=${maxVal},
           commission=${commVal}, "fixedFee"=${fixedFeeVal},
           "isPromotional"=${vIsProm}, "promotionalDiscount"=${promDiscVal},
           constraints=${consVal}, status='${vStatus}',
           "isPreferred"=${vIsPreferred}, priority=${priorityVal},
           "sortOrder"=${sortVal}, metadata=${metaVal}, "updatedAt"=NOW()
           WHERE id=${existing}`);
        varsUpdated++;
      } else {
        psqlExec(targetEnv, targetPass,
          `INSERT INTO product_variants
           ("productId","supplierId","supplierProductId","vasType","transactionType",
            provider,"networkType","predefinedAmounts",denominations,pricing,
            "minAmount","maxAmount",commission,"fixedFee","isPromotional",
            "promotionalDiscount",constraints,status,"isPreferred",priority,
            "sortOrder",metadata,"createdAt","updatedAt")
           VALUES (${targetProductId},${targetSupplierId},${supProdVal},${vasTypeVal},${transTypeVal},
                   '${provider}',${netTypeVal},${preAmtVal},${denomsVal},${pricingVal},
                   ${minVal},${maxVal},${commVal},${fixedFeeVal},${vIsProm},
                   ${promDiscVal},${consVal},'${vStatus}',${vIsPreferred},${priorityVal},
                   ${sortVal},${metaVal},NOW(),NOW())`);
        varsOk++;
      }
    } catch (err) {
      log.err(`Variant for "${vProdName}": ${err.message}`);
      varsFail++;
    }
  }
  log.ok(`ProductVariants: ${varsOk} created, ${varsUpdated} updated, ${varsFail} failed`);

  // Summary
  const finalP = psqlOne(targetEnv, targetPass,
    `SELECT COUNT(*) FROM products WHERE "supplierId"=${targetSupplierId}`);
  const finalV = psqlOne(targetEnv, targetPass,
    `SELECT COUNT(*) FROM product_variants WHERE "supplierId"=${targetSupplierId}`);

  log.hdr(`${targetLabel} COMPLETE`);
  log.data(`Supplier ID : ${targetSupplierId}`);
  log.data(`Products    : ${finalP}`);
  log.data(`Variants    : ${finalV}`);

  return { products: parseInt(finalP || '0'), variants: parseInt(finalV || '0') };
}

// ── main ──────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const doProduction = args.includes('--all') || args.includes('--production');
  // Default: staging (unless --production only)
  const doStaging    = args.includes('--all') || args.includes('--staging') ||
                       (!args.includes('--production'));

  log.hdr('FLASH SUPPLIER BOOTSTRAP');
  log.info(`Targets: ${[doStaging && 'Staging', doProduction && 'Production'].filter(Boolean).join(', ')}`);

  // Passwords
  log.step('Retrieving passwords...');
  const uatPass = getUATPassword();
  log.ok(`UAT password: ${uatPass.substring(0, 3)}***`);

  let stgPass = null, prdPass = null;
  if (doStaging) {
    stgPass = getSecretPassword(ENVS.STAGING.secret);
    log.ok(`Staging password: ${stgPass.substring(0, 3)}***`);
  }
  if (doProduction) {
    prdPass = getSecretPassword(ENVS.PRODUCTION.secret);
    log.ok(`Production password: ${prdPass.substring(0, 3)}***`);
  }

  // Test connections via psql
  log.step('Testing connections...');
  const uatTest = testConnection(ENVS.UAT, uatPass);
  if (uatTest !== true) { log.err(`UAT connection failed: ${uatTest}`); process.exit(1); }
  log.ok('UAT connection OK');

  if (doStaging) {
    const stgTest = testConnection(ENVS.STAGING, stgPass);
    if (stgTest !== true) { log.err(`Staging connection failed: ${stgTest}`); process.exit(1); }
    log.ok('Staging connection OK');
  }
  if (doProduction) {
    const prdTest = testConnection(ENVS.PRODUCTION, prdPass);
    if (prdTest !== true) { log.err(`Production connection failed: ${prdTest}`); process.exit(1); }
    log.ok('Production connection OK');
  }

  const results = {};

  if (doStaging)    results.staging    = bootstrapTarget(ENVS.UAT, uatPass, ENVS.STAGING,    stgPass, 'STAGING');
  if (doProduction) results.production = bootstrapTarget(ENVS.UAT, uatPass, ENVS.PRODUCTION, prdPass, 'PRODUCTION');

  // Final table
  const uatP = psqlOne(ENVS.UAT, uatPass,
    `SELECT COUNT(*) FROM products p JOIN suppliers s ON p."supplierId"=s.id WHERE s.code='FLASH'`);
  const uatV = psqlOne(ENVS.UAT, uatPass,
    `SELECT COUNT(*) FROM product_variants pv JOIN suppliers s ON pv."supplierId"=s.id WHERE s.code='FLASH'`);

  log.hdr('FINAL SUMMARY');
  console.log(`\n  ${'Environment'.padEnd(15)} ${'Products'.padEnd(10)} Variants`);
  console.log(`  ${'─'.repeat(38)}`);
  console.log(`  ${'UAT'.padEnd(15)} ${String(uatP || 0).padEnd(10)} ${uatV || 0}   (source of truth)`);
  if (results.staging)    console.log(`  ${'Staging'.padEnd(15)} ${String(results.staging.products).padEnd(10)} ${results.staging.variants}`);
  if (results.production) console.log(`  ${'Production'.padEnd(15)} ${String(results.production.products).padEnd(10)} ${results.production.variants}`);
  console.log();
}

main();
