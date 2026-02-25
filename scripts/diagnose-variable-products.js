#!/usr/bin/env node
/**
 * diagnose-variable-products.js
 *
 * Diagnostic tool — shows exactly what the variable-first filter will act on.
 * Prints a detailed breakdown per brand showing:
 *   - What variants exist (name, minAmount, maxAmount, denominations)
 *   - Why a variant is classified as variable vs fixed
 *   - Whether the classification looks correct
 *
 * Run in Codespaces (proxies must be running):
 *   node scripts/diagnose-variable-products.js           # UAT only
 *   node scripts/diagnose-variable-products.js --staging
 *   node scripts/diagnose-variable-products.js --production
 *   node scripts/diagnose-variable-products.js --all
 *
 *   # Focus on a specific brand:
 *   node scripts/diagnose-variable-products.js --brand ott
 *   node scripts/diagnose-variable-products.js --brand mtn --staging
 */

require('dotenv').config();
const {
  getUATPool,
  getStagingPool,
  getProductionPool,
  closeAll,
} = require('./db-connection-helper');

const args      = process.argv.slice(2);
const RUN_UAT   = args.includes('--uat')  || args.includes('--all') || (!args.includes('--staging') && !args.includes('--production') && !args.includes('--all'));
const RUN_STG   = args.includes('--staging') || args.includes('--all');
const RUN_PROD  = args.includes('--production') || args.includes('--all');
const BRAND_FILTER = (() => { const i = args.indexOf('--brand'); return i >= 0 ? args[i+1]?.toLowerCase() : null; })();

const ALWAYS_KEEP_FIXED_TYPES = new Set(['electricity', 'bill_payment']);
const SUBSCRIPTION_BRAND_KEYWORDS = ['netflix','dstv','showmax','apple tv','disney','xbox game pass','playstation now','ps now','crunchyroll','intercape'];
function isSubscriptionBrand(n) { const l=(n||'').toLowerCase(); return SUBSCRIPTION_BRAND_KEYWORDS.some(k=>l.includes(k)); }

function classifyVariant(row) {
  const name   = (row.productName || row.name || '').toLowerCase();
  const dens   = Array.isArray(row.denominations) ? row.denominations : [];
  const constr = row.constraints || {};
  const pType  = (row.priceType || '').toLowerCase();

  if (pType === 'variable') return { cls: 'variable', reason: 'priceType already set' };
  if (dens.length >= 2)     return { cls: 'fixed',    reason: `${dens.length} denominations (picker)` };
  if (row.minAmount && row.maxAmount && row.minAmount === row.maxAmount)
    return { cls: 'fixed', reason: `min==max==${row.minAmount} (single price)` };
  if (dens.length === 1 && row.minAmount && dens[0] === row.minAmount && row.maxAmount && dens[0] === row.maxAmount)
    return { cls: 'fixed', reason: `single denom matches min==max` };
  if (constr.type === 'range' || constr.variable === true || constr.isVariable === true)
    return { cls: 'variable', reason: 'constraints.type=range or variable=true' };
  const variableKeywords = ['variable','open value','open amount','custom','any amount','any value','flexi','flexible','voucher +'];
  const kw = variableKeywords.find(k => name.includes(k));
  if (kw) return { cls: 'variable', reason: `name contains "${kw}"` };
  if (row.minAmount && row.maxAmount && row.minAmount < row.maxAmount)
    return { cls: 'variable', reason: `minAmount(${row.minAmount}) < maxAmount(${row.maxAmount})` };
  return { cls: 'fixed', reason: 'default (no variable signal found)' };
}

async function diagnose(pool, envLabel) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  DIAGNOSIS: ${envLabel}${BRAND_FILTER ? ` [brand filter: ${BRAND_FILTER}]` : ''}`);
  console.log(`${'═'.repeat(80)}`);

  const variantsResult = await pool.query(`
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
    JOIN products     p  ON p.id   = pv."productId"
    JOIN product_brands pb ON pb.id = p."brandId"
    JOIN suppliers    s  ON s.id   = pv."supplierId"
    ${BRAND_FILTER ? `WHERE LOWER(pb.name) LIKE '%${BRAND_FILTER}%'` : ''}
    ORDER BY pb.name, p.type, pv."minAmount", pv.id
  `);

  const all = variantsResult.rows;
  console.log(`\nTotal variants loaded: ${all.length}\n`);

  // Group by (brandId, productType)
  const groups = new Map();
  for (const v of all) {
    const key = `${v.brandId}::${v.productType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }

  let groupsWithVariable = 0;
  let totalDeactivated   = 0;
  let suspiciousGroups   = 0;

  for (const [key, variants] of groups) {
    const brandName    = variants[0].brandName;
    const productType  = variants[0].productType;
    const supplierCode = variants[0].supplierCode;

    const skipped = ALWAYS_KEEP_FIXED_TYPES.has(productType) || isSubscriptionBrand(brandName);

    const classified = variants.map(v => ({ ...v, ...classifyVariant(v) }));
    const varOnes    = classified.filter(v => v.cls === 'variable');
    const fixOnes    = classified.filter(v => v.cls === 'fixed');

    // Only print groups that have action (variable exists) or are suspicious
    const hasAction = varOnes.length > 0 && !skipped;
    // Suspicious: variable classification but min==max (false positive)
    const suspicious = varOnes.some(v => v.minAmount && v.maxAmount && v.minAmount === v.maxAmount);

    if (!hasAction && !suspicious && !BRAND_FILTER) continue;

    console.log(`\n┌─ Brand: ${brandName} | Type: ${productType} | Supplier: ${supplierCode}${skipped ? ' [SKIPPED - exception]' : ''}`);

    for (const v of classified) {
      const dens = Array.isArray(v.denominations) ? v.denominations : [];
      const flag = v.cls === 'variable' ? '🔵 VARIABLE' : '⚪ fixed   ';
      const action = hasAction && v.cls === 'fixed' ? ' → WILL DEACTIVATE' : '';
      console.log(`│  ${flag}  id=${String(v.id).padStart(5)}  min=${String(v.minAmount||'null').padStart(8)}  max=${String(v.maxAmount||'null').padStart(8)}  dens=${JSON.stringify(dens).substring(0,40)}`);
      console.log(`│           name: "${v.productName}"`);
      console.log(`│           reason: ${v.reason}${action}`);
    }

    if (hasAction) {
      groupsWithVariable++;
      totalDeactivated += fixOnes.length;
      if (suspicious) suspiciousGroups++;
      console.log(`└─ ACTION: keep ${varOnes.length} variable, deactivate ${fixOnes.length} fixed`);
    } else if (BRAND_FILTER) {
      console.log(`└─ NO ACTION (${skipped ? 'exception type' : 'no variable found'})`);
    }
  }

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`SUMMARY for ${envLabel}:`);
  console.log(`  Groups with variable: ${groupsWithVariable}`);
  console.log(`  Variants to deactivate: ${totalDeactivated}`);
  if (suspiciousGroups > 0) {
    console.log(`  ⚠️  SUSPICIOUS groups (variable but min==max): ${suspiciousGroups} — review before applying!`);
  }
  console.log(`${'─'.repeat(80)}`);
}

async function main() {
  try {
    if (RUN_UAT)  { const p = await getUATPool();        await diagnose(p, 'UAT'); }
    if (RUN_STG)  { const p = await getStagingPool();    await diagnose(p, 'STAGING'); }
    if (RUN_PROD) { const p = await getProductionPool(); await diagnose(p, 'PRODUCTION'); }
  } catch (err) {
    console.error('Fatal:', err.message);
    process.exitCode = 1;
  } finally {
    await closeAll();
  }
}

main();
