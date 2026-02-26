#!/usr/bin/env node
/**
 * Sync Flash Products to Catalog
 *
 * Fetches the live product list from the Flash Partner API v4 and upserts
 * every product into the products + product_variants tables.
 *
 * Mirrors the pattern of sync-mobilemart-uat-catalog.js so both suppliers
 * are managed consistently.
 *
 * Usage:
 *   node scripts/sync-flash-catalog.js              # live API (requires FLASH_LIVE_INTEGRATION=true)
 *   DRY_RUN=true node scripts/sync-flash-catalog.js # print what would be synced, no DB writes
 *
 * Environment variables required (when FLASH_LIVE_INTEGRATION=true):
 *   FLASH_CONSUMER_KEY, FLASH_CONSUMER_SECRET, FLASH_ACCOUNT_NUMBER,
 *   FLASH_API_URL, FLASH_TOKEN_URL
 */

'use strict';

require('dotenv').config();

// Cloud Run / Codespaces SSL fix
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  process.env.NODE_ENV = 'production';
}

const FlashAuthService = require('../services/flashAuthService');
const { Product, ProductBrand, ProductVariant, Supplier, sequelize } = require('../models');

const IS_DRY_RUN = process.env.DRY_RUN === 'true';

// ─── DS01 commission rates (inclusive of VAT at 15%) ──────────────────────────
// Used as fallback when the API does not return a commission field.
const DS01_COMMISSION = {
  // Airtime & Data
  eezieairtime: 3.50,
  mtn: 3.00,
  vodacom: 3.00,
  cellc: 3.00,
  telkom: 3.00,
  // International content & vouchers
  netflix: 3.25,
  uber: 2.80,
  spotify: 6.00,
  roblox: 6.00,
  playstation: 3.50,
  pubg: 7.00,
  razergold: 3.50,
  freefire: 3.50,
  steam: 3.50,
  fifamobile: 4.80,
  apple: 4.50,
  googleplay: 3.10,
  ott: 3.00,
  // Flash Payments (fixed-fee products stored as percentage equivalent)
  dstv: 0,        // R3.00 per transaction — stored in fixedFee
  unipay: 0,      // R2.00 per transaction
  ekurhuleni: 0,  // R2.50 per transaction
  flash: 0,       // R3.00 per transaction
  tenacity: 2.50,
  jdgroup: 2.50,
  starsat: 3.00,
  talk360: 6.00,
  ria: 0.40,
  intercape: 5.00,
  payjoy: 2.10,
  betway: 3.00,
  hollywoodbets: 3.00,
  yesplay: 3.00,
  // Electricity
  electricity: 0.85,
  eskom: 0.85,
  // 1Voucher
  '1voucher': 1.00,
};

// Fixed fees in cents for flat-fee products
const DS01_FIXED_FEE_CENTS = {
  dstv: 300,
  unipay: 200,
  ekurhuleni: 250,
  flash: 300,
};

// ─── Colour helpers ────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};
const log     = (m, c = 'reset') => console.log(`${C[c]}${m}${C.reset}`);
const ok      = m => log(`✅ ${m}`, 'green');
const err     = m => log(`❌ ${m}`, 'red');
const info    = m => log(`ℹ️  ${m}`, 'blue');
const warn    = m => log(`⚠️  ${m}`, 'yellow');
const section = t => { console.log('\n' + '='.repeat(80)); log(t, 'cyan'); console.log('='.repeat(80) + '\n'); };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive commission rate from DS01 table using provider name as key.
 */
function getCommissionRate(providerName) {
  if (!providerName) return 2.50;
  const key = providerName.toLowerCase().replace(/[\s\-_]/g, '');
  return DS01_COMMISSION[key] ?? 2.50;
}

function getFixedFeeCents(providerName) {
  if (!providerName) return 0;
  const key = providerName.toLowerCase().replace(/[\s\-_]/g, '');
  return DS01_FIXED_FEE_CENTS[key] ?? 0;
}

/**
 * Map Flash productGroup string to our ProductVariant vasType enum.
 * Based on actual Flash API v4 productGroup values observed in live responses:
 *   "Cellular"          → airtime
 *   "Prepaid Utilities" → electricity
 *   "Flash Pay"         → bill_payment
 *   "Gift Vouchers"     → voucher
 *   "Eezi Vouchers"     → airtime (eeziAirtime tokens)
 *   "1Voucher"          → voucher
 *   "Flash Token"       → voucher
 */
function mapFlashCategory(productGroup) {
  if (!productGroup) return 'airtime';
  const g = productGroup.toLowerCase();
  if (g.includes('prepaid util') || g.includes('electricity') || g.includes('utility')) return 'electricity';
  if (g === 'cellular')           return 'airtime';
  if (g.includes('flash pay'))    return 'bill_payment';
  if (g.includes('voucher') || g.includes('gift') || g.includes('flash token')) return 'voucher';
  if (g.includes('eezi'))         return 'airtime';
  if (g.includes('data'))         return 'data';
  return 'airtime';
}

/**
 * Derive transaction type from vasType and product flags.
 */
function getTransactionType(vasType, product) {
  if (vasType === 'bill_payment' || vasType === 'electricity') return 'direct';
  if (vasType === 'voucher') return 'voucher';
  // Airtime / data: if the product has a fixed denomination it is a voucher, otherwise topup
  if (product.fixedAmount || (product.denominations && product.denominations.length > 0)) return 'voucher';
  return 'topup';
}

/**
 * Determine priceType: variable if min < max (own-amount), fixed otherwise.
 */
function getPriceType(product) {
  const minCents = product.minAmount || 0;
  const maxCents = product.maxAmount || 0;
  if (minCents > 0 && maxCents > 0 && minCents < maxCents) return 'variable';
  if (product.denominations && product.denominations.length > 0) return 'fixed';
  return 'variable';
}

/**
 * Normalise a Flash API product into a consistent shape before mapping to DB.
 * Field names are based on actual Flash aggregation/4.0 API response:
 *   productCode, productName, minimumAmount, maximumAmount, status ("Active"),
 *   vendor (provider name), productGroup (category), barcode, billerCode
 */
function normaliseFlashProduct(raw) {
  // Flash API returns amounts in cents already (minimumAmount / maximumAmount)
  const minAmount = raw.minimumAmount || raw.minAmount || 500;
  const maxAmount = raw.maximumAmount || raw.maxAmount || 100000;

  // Fixed denomination: when min === max the product has exactly one price point
  const isFixed = minAmount === maxAmount;
  const denominations = isFixed ? [minAmount] : [];

  return {
    productCode:    String(raw.productCode || raw.id || ''),
    productName:    raw.productName || raw.name || 'Flash Product',
    // productGroup is the actual field name in Flash API (not category/type)
    productGroup:   raw.productGroup || raw.category || raw.type || 'Gift Vouchers',
    // vendor is the actual field name in Flash API (not provider/network/brand)
    provider:       raw.vendor || raw.provider || raw.contentCreator || 'Flash',
    // Flash API returns status as the string "Active" (not boolean)
    isActive:       raw.status === 'Active' || raw.isActive === true,
    denominations,
    minAmount,
    maxAmount,
    fixedAmount:    isFixed,
    barcode:        raw.barcode || '',
    billerCode:     raw.billerCode || '',
    metadata:       raw.metadata || {},
    rawData:        raw,
  };
}

/**
 * Map a normalised Flash product to ProductVariant fields.
 */
function mapFlashToProductVariant(product, vasType, supplierId, productId) {
  const commission  = getCommissionRate(product.provider);
  const fixedFee    = getFixedFeeCents(product.provider);
  const priceType   = getPriceType(product);
  const txType      = getTransactionType(vasType, product);

  const minAmount = product.minAmount;
  const maxAmount = product.maxAmount;

  return {
    productId,
    supplierId,
    supplierProductId: product.productCode,

    vasType,
    transactionType: txType,
    networkType: 'local',
    provider: product.provider,

    priceType,
    minAmount,
    maxAmount,
    predefinedAmounts: product.denominations.length > 0 ? product.denominations : null,

    commission,
    fixedFee,

    isPromotional: false,
    promotionalDiscount: null,

    denominations: product.denominations.length > 0 ? product.denominations : [],

    pricing: {
      defaultCommissionRate: commission,
      fixedFee,
      fixedAmount: product.fixedAmount,
    },

    constraints: {
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
    },

    status: product.isActive ? 'active' : 'inactive',
    priority: 1,       // Flash is primary supplier
    isPreferred: true,
    sortOrder: 0,

    lastSyncedAt: new Date(),

    metadata: {
      flash_product_code:  product.productCode,
      flash_product_name:  product.productName,
      flash_product_group: product.productGroup,
      flash_vendor:        product.provider,
      flash_fixed_amount:  product.fixedAmount,
      flash_barcode:       product.barcode || undefined,
      flash_biller_code:   product.billerCode || undefined,
      synced_at:           new Date().toISOString(),
      synced_from:         'sync-flash-catalog',
    },
  };
}

// ─── Core sync logic ───────────────────────────────────────────────────────────

async function syncFlashProducts() {
  section('FLASH PRODUCT CATALOG SYNC');

  if (IS_DRY_RUN) warn('DRY RUN MODE — no database writes will occur');

  const isLive = process.env.FLASH_LIVE_INTEGRATION === 'true';
  const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;

  if (!isLive) {
    warn('FLASH_LIVE_INTEGRATION is not set to "true".');
    warn('Set FLASH_LIVE_INTEGRATION=true to enable live API sync.');
    warn('Exiting without changes.');
    return;
  }

  if (!accountNumber) {
    err('FLASH_ACCOUNT_NUMBER is not set. Cannot call product API.');
    process.exit(1);
  }

  // ── Authenticate ────────────────────────────────────────────────────────────
  info('Authenticating with Flash API...');
  const authService = new FlashAuthService();
  const health = await authService.healthCheck();
  if (health.status !== 'healthy') {
    err(`Flash API authentication failed: ${health.error}`);
    process.exit(1);
  }
  ok('Authentication successful');

  // ── Fetch products from Flash v4 API ────────────────────────────────────────
  info(`Fetching products for account ${accountNumber}...`);
  let rawProducts;
  try {
    const response = await authService.makeAuthenticatedRequest(
      'GET',
      `/accounts/${accountNumber}/products?includeInstructions=false`
    );
    rawProducts = response.products || response || [];
  } catch (apiErr) {
    err(`Failed to fetch products from Flash API: ${apiErr.message}`);
    if (apiErr.response) {
      err(`HTTP ${apiErr.response.status}: ${JSON.stringify(apiErr.response.data)}`);
    }
    process.exit(1);
  }

  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    warn('Flash API returned no products. Nothing to sync.');
    return;
  }

  ok(`Fetched ${rawProducts.length} products from Flash API`);

  // ── Resolve Flash supplier record ────────────────────────────────────────────
  const supplier = await Supplier.findOne({ where: { code: 'FLASH' } });
  if (!supplier) {
    err('FLASH supplier not found in database. Run bootstrap-flash-supplier.js first.');
    process.exit(1);
  }

  // ── Process each product ─────────────────────────────────────────────────────
  const stats = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

  for (const raw of rawProducts) {
    stats.total++;
    const product = normaliseFlashProduct(raw);

    if (!product.productCode) {
      warn(`  Skipping product with no code: ${product.productName}`);
      stats.skipped++;
      continue;
    }

    const vasType = mapFlashCategory(product.productGroup);

    if (IS_DRY_RUN) {
      info(`  [DRY RUN] Would sync: ${product.productName} (${product.productCode}) → vasType=${vasType}, priceType=${getPriceType(product)}`);
      stats.created++;
      continue;
    }

    const tx = await sequelize.transaction();
    try {
      // Brand
      const brandName = product.provider || product.productName;
      const [brand] = await ProductBrand.findOrCreate({
        where: { name: brandName },
        defaults: {
          name: brandName,
          category: vasType === 'voucher' ? 'entertainment' : 'utilities',
          isActive: true,
          metadata: { source: 'flash' },
        },
        transaction: tx,
      });

      // Base product
      const [baseProduct, productCreated] = await Product.findOrCreate({
        where: {
          supplierId: supplier.id,
          supplierProductId: product.productCode,
        },
        defaults: {
          supplierId:        supplier.id,
          brandId:           brand.id,
          name:              product.productName,
          type:              vasType,
          supplierProductId: product.productCode,
          status:            product.isActive ? 'active' : 'inactive',
          denominations:     product.denominations.length > 0 ? product.denominations : [],
          isFeatured:        false,
          sortOrder:         0,
          metadata: {
            source: 'flash',
            synced: true,
            synced_from: 'sync-flash-catalog',
          },
        },
        transaction: tx,
      });

      if (!productCreated) {
        await baseProduct.update({
          name:         product.productName,
          type:         vasType,
          status:       product.isActive ? 'active' : 'inactive',
          denominations: product.denominations.length > 0 ? product.denominations : baseProduct.denominations,
          brandId:      brand.id,
        }, { transaction: tx });
      }

      // Variant
      const variantData = mapFlashToProductVariant(product, vasType, supplier.id, baseProduct.id);

      const [variant, variantCreated] = await ProductVariant.findOrCreate({
        where: {
          productId:         baseProduct.id,
          supplierId:        supplier.id,
          supplierProductId: product.productCode,
        },
        defaults: variantData,
        transaction: tx,
      });

      if (!variantCreated) {
        await variant.update(variantData, { transaction: tx });
        stats.updated++;
        info(`  Updated: ${product.productName} (${product.productCode})`);
      } else {
        stats.created++;
        ok(`  Created: ${product.productName} (${product.productCode})`);
      }

      await tx.commit();
    } catch (syncErr) {
      await tx.rollback();
      stats.errors++;
      err(`  Error syncing ${product.productCode} (${product.productName}): ${syncErr.message}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  section('SYNC SUMMARY');
  info(`Total products processed : ${stats.total}`);
  ok(`Created                  : ${stats.created}`);
  info(`Updated                  : ${stats.updated}`);
  if (stats.skipped) warn(`Skipped                  : ${stats.skipped}`);
  if (stats.errors)  err(`Errors                   : ${stats.errors}`);

  console.log('\n' + '-'.repeat(80));
  if (stats.errors === 0) {
    log('🎉 Flash catalog sync complete — all products synced successfully.', 'green');
  } else {
    warn(`Flash catalog sync completed with ${stats.errors} error(s). Review logs above.`);
  }
  console.log('-'.repeat(80) + '\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────
syncFlashProducts()
  .then(() => process.exit(0))
  .catch(e => {
    err(`Fatal sync error: ${e.message}`);
    console.error(e);
    process.exit(1);
  });
