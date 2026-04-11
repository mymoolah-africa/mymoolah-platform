#!/usr/bin/env node
/**
 * Seed MobileMart variable pinless airtime/data products into product_variants.
 *
 * MobileMart's catalog sync imports specific bundles (fixed priceType), but
 * their generic pinless products (variable, any amount in range) may not
 * appear or may be missed. This script:
 *   1. Calls MobileMart API to discover pinless products per vasType
 *   2. Identifies variable-amount products (fixedAmount=false, amount range)
 *   3. Creates/updates ProductVariant rows with correct commission
 *   4. Refreshes v_best_offers so MobileMart wins where commission is higher
 *
 * Usage (Codespaces — needs MobileMart API creds in env or .env):
 *   export DATABASE_URL="postgres://mymoolah_app:B0t3s%40Mymoolah@127.0.0.1:6543/mymoolah?sslmode=disable"
 *   node scripts/seed-mobilemart-variable-airtime.js
 *
 * If MobileMart API creds are not available, falls back to known product
 * codes from the existing MobileMart product catalog.
 */

const { sequelize, Product, ProductVariant, Supplier, ProductBrand } = require('../models');
const commissionConfig = require('../config/supplier-commissions.json');

const NETWORKS = ['vodacom', 'mtn', 'cellc', 'telkom'];
const NETWORK_DISPLAY = { vodacom: 'Vodacom', mtn: 'MTN', cellc: 'CellC', telkom: 'Telkom' };

function getCommission(vasType, provider) {
  const mm = commissionConfig.MOBILEMART;
  if (!mm || !mm[vasType]) return { commission: 4.50, fixedFee: 0 };
  const overrides = mm[vasType].provider_overrides || {};
  const key = provider.toLowerCase();
  for (const [k, rate] of Object.entries(overrides)) {
    if (key.includes(k)) return { commission: rate, fixedFee: 0 };
  }
  return { commission: mm[vasType].default || 4.50, fixedFee: 0 };
}

async function discoverMobileMartProducts(vasType) {
  try {
    const MobileMartAuthService = require('../services/mobilemartAuthService');
    const mmAuth = new MobileMartAuthService();
    const endpoint = vasType === 'airtime' ? '/airtime/products' : '/data/products';
    const response = await mmAuth.makeAuthenticatedRequest('GET', endpoint);
    const products = response.products || response || [];
    console.log(`  API returned ${products.length} ${vasType} products`);

    const pinless = products.filter(p => p.pinned === false);
    console.log(`  ${pinless.length} are pinless`);

    const variable = pinless.filter(p => !p.fixedAmount);
    console.log(`  ${variable.length} are variable (fixedAmount=false)`);

    return { all: pinless, variable };
  } catch (err) {
    console.warn(`  Could not call MobileMart API: ${err.message}`);
    return null;
  }
}

function groupByNetwork(products) {
  const groups = {};
  for (const p of products) {
    const cc = (p.contentCreator || p.provider || '').toLowerCase();
    const matched = NETWORKS.find(n => cc.includes(n));
    if (matched) {
      if (!groups[matched]) groups[matched] = [];
      groups[matched].push(p);
    }
  }
  return groups;
}

async function run() {
  const supplier = await Supplier.findOne({ where: { code: 'MOBILEMART' } });
  if (!supplier) {
    console.error('MOBILEMART supplier not found in DB');
    process.exit(1);
  }
  console.log(`MobileMart supplier: id=${supplier.id}\n`);

  let created = 0, updated = 0;

  for (const vasType of ['airtime', 'data']) {
    console.log(`--- ${vasType.toUpperCase()} ---`);

    const apiResult = await discoverMobileMartProducts(vasType);

    let networkProducts = {};

    if (apiResult && apiResult.variable.length > 0) {
      networkProducts = groupByNetwork(apiResult.variable);
      console.log(`  Found variable products for: ${Object.keys(networkProducts).join(', ')}`);
    }

    if (apiResult && apiResult.variable.length === 0 && apiResult.all.length > 0) {
      console.log('  No variable products found — checking if any pinless products have an amount range...');
      const rangeProducts = apiResult.all.filter(p => {
        const min = p.minimumAmount || p.minAmount || 0;
        const max = p.maximumAmount || p.maxAmount || 0;
        return max > min && max > 100;
      });
      if (rangeProducts.length > 0) {
        console.log(`  Found ${rangeProducts.length} products with amount ranges — treating as variable`);
        networkProducts = groupByNetwork(rangeProducts);
      }
    }

    for (const network of NETWORKS) {
      const display = NETWORK_DISPLAY[network];
      const commInfo = getCommission(vasType, network);
      const productName = `${display} ${vasType === 'airtime' ? 'Airtime' : 'Data'} Pinless`;

      let supplierProductId = null;
      let minAmount = vasType === 'airtime' ? 200 : 500;
      let maxAmount = vasType === 'airtime' ? 99900 : 100000;

      const apiProducts = networkProducts[network] || [];
      if (apiProducts.length > 0) {
        const best = apiProducts[0];
        supplierProductId = best.merchantProductId || best.id;
        if (best.minimumAmount) minAmount = Math.round(best.minimumAmount * 100);
        if (best.maximumAmount) maxAmount = Math.round(best.maximumAmount * 100);
        console.log(`  ${display}: API product merchantProductId=${supplierProductId}, range=${minAmount/100}-${maxAmount/100}`);
      } else {
        const existing = await ProductVariant.findOne({
          where: { supplierId: supplier.id, vasType, provider: { [require('sequelize').Op.iLike]: `%${network}%` } },
          order: [['priceType', 'ASC']]
        });
        if (existing) {
          supplierProductId = existing.supplierProductId;
          console.log(`  ${display}: Using existing supplierProductId=${supplierProductId} from variant ${existing.id}`);
        } else {
          supplierProductId = `MM_${vasType.toUpperCase()}_${network.toUpperCase()}`;
          console.log(`  ${display}: No API or DB match — using placeholder ${supplierProductId} (will resolve at runtime)`);
        }
      }

      const [brand] = await ProductBrand.findOrCreate({
        where: { name: display },
        defaults: { name: display, category: vasType === 'airtime' ? 'airtime' : 'data_bundles', isActive: true, metadata: { source: 'mobilemart-seed' } }
      });

      const [product] = await Product.findOrCreate({
        where: { supplierId: supplier.id, name: productName, type: vasType },
        defaults: {
          supplierId: supplier.id, brandId: brand.id, name: productName, type: vasType,
          status: 'active', denominations: [], isFeatured: false, sortOrder: 0,
          metadata: { source: 'mobilemart-seed', seeded: true }
        }
      });

      const variantData = {
        productId: product.id,
        supplierId: supplier.id,
        supplierProductId,
        vasType,
        transactionType: 'topup',
        networkType: 'local',
        provider: network,
        priceType: 'variable',
        minAmount, maxAmount,
        predefinedAmounts: null,
        commission: commInfo.commission,
        fixedFee: commInfo.fixedFee,
        commissionType: 'percentage',
        isPromotional: false,
        promotionalDiscount: null,
        priority: 1,
        status: 'active',
        denominations: [],
        pricing: { defaultCommissionRate: commInfo.commission },
        constraints: { minAmount, maxAmount },
        lastSyncedAt: new Date(),
        metadata: {
          source: 'mobilemart-seed',
          seeded: true,
          api_merchantProductId: supplierProductId
        }
      };

      const [variant, wasCreated] = await ProductVariant.findOrCreate({
        where: { productId: product.id, supplierId: supplier.id },
        defaults: variantData
      });

      if (!wasCreated) {
        await variant.update(variantData);
        updated++;
        console.log(`  UPDATED: ${productName} | commission=${commInfo.commission}% | variant=${variant.id}`);
      } else {
        created++;
        console.log(`  CREATED: ${productName} | commission=${commInfo.commission}% | variant=${variant.id}`);
      }
    }
    console.log();
  }

  console.log(`Seeded: ${created} new, ${updated} updated\n`);

  console.log('Refreshing v_best_offers...');
  try {
    await sequelize.query('REFRESH MATERIALIZED VIEW CONCURRENTLY v_best_offers');
  } catch (err) {
    if (err.message?.includes('has not been populated')) {
      await sequelize.query('REFRESH MATERIALIZED VIEW v_best_offers');
    } else throw err;
  }
  console.log('v_best_offers refreshed\n');

  const [rows] = await sequelize.query(
    `SELECT variant_id, supplier_code, provider, commission
     FROM v_best_offers WHERE "vasType" = 'airtime' ORDER BY provider, commission DESC`
  );
  console.log('v_best_offers AIRTIME winners:');
  rows.forEach(r => console.log(`  ${r.supplier_code} | ${r.provider} | commission=${r.commission}% | variant=${r.variant_id}`));

  const [dataRows] = await sequelize.query(
    `SELECT variant_id, supplier_code, provider, commission
     FROM v_best_offers WHERE "vasType" = 'data' AND bracket_code = 'VARIABLE' ORDER BY provider, commission DESC`
  );
  if (dataRows.length > 0) {
    console.log('\nv_best_offers DATA (variable) winners:');
    dataRows.forEach(r => console.log(`  ${r.supplier_code} | ${r.provider} | commission=${r.commission}% | variant=${r.variant_id}`));
  }
}

run()
  .then(() => { console.log('\nDone.'); process.exit(0); })
  .catch(e => { console.error('Failed:', e.message, e.stack); process.exit(1); });
