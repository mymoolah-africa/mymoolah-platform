#!/usr/bin/env node

/**
 * Sync Flash Products to a target database
 * Uses db-connection-helper.js for database access
 * Uses Secret Manager for Flash production credentials
 *
 * Usage:
 *   node scripts/sync-flash-products.js --staging                 (default target)
 *   node scripts/sync-flash-products.js --production
 *   node scripts/sync-flash-products.js --uat
 *   node scripts/sync-flash-products.js --staging --vouchers-only  (only voucher products)
 *   node scripts/sync-flash-products.js --staging --airtime-only   (only airtime products)
 *   node scripts/sync-flash-products.js --staging --electricity-only
 *
 * Flags:
 *   --staging | --production | --uat   Target database (default: staging)
 *   --vouchers-only                    Sync only voucher products
 *   --airtime-only                     Sync only airtime products
 *   --electricity-only                 Sync only electricity products
 *   --billers-only                     Sync only bill_payment products
 *
 * This script:
 * 1. Loads Flash credentials from GCP Secret Manager
 * 2. Authenticates with Flash Partner API v4
 * 3. Fetches and categorises all products
 * 4. Upserts into the chosen target database
 * 5. Deactivates stale products no longer returned by the API
 */

const { execSync } = require('child_process');
const { getUATClient, getStagingClient, getProductionClient, closeAll } = require('./db-connection-helper');
const FlashAuthService = require('../services/flashAuthService');

const ENV_PORTS = { uat: 6543, staging: 6544, production: 6545 };

// ─── Category mapping ────────────────────────────────────────────────────────

function mapFlashCategory(productGroup, productName = '') {
  if (!productGroup) return 'airtime';
  const g = productGroup.toLowerCase();
  const n = (productName || '').toLowerCase();

  if (g.includes('prepaid util') || g.includes('electricity') || g.includes('utility')) return 'electricity';
  if (g === 'cellular') return 'airtime';
  if (g.includes('flash pay')) return 'bill_payment';
  if (g.includes('eezi')) return 'airtime';
  if (n.includes('global pin')) return 'international_pin';
  if (g.includes('voucher') || g.includes('gift') || g.includes('flash token') || g.includes('1voucher')) return 'voucher';
  if (g.includes('data')) return 'data';
  return 'airtime';
}

// ─── Commission lookup (DS01 contractual rates) ──────────────────────────────

const GIFT_RATES = {
  'amazon': 2.80, 'apple': 4.50, 'bettabets': 4.10, 'betway': 3.00,
  'blu': 3.00, 'bolt': 3.50, 'easybet': 4.10, 'easyload': 3.50,
  'ea fc mobile': 4.80, 'free fire': 3.50, 'gbets': 3.50, 'google play': 3.10,
  'gold rush': 3.50, 'hollywoodbets': 3.00, 'lottostar': 3.50, 'netflix': 3.25,
  'ott': 3.00, 'playstation': 3.50, 'pubg': 7.00, 'razer gold': 3.50,
  'roblox': 6.00, 'showmax': 3.10, 'steam': 3.50, 'supabets': 3.80,
  'takealot': 2.40, 'uber': 2.80, 'uber eats': 2.80,
  'world sports betting': 3.50, 'yesplay': 3.00,
};

const BILL_RATES = {
  'nyaradzo': 4.10, 'ackermans': 2.50, 'pep': 2.50, 'talk360': 6.00,
  'intercape': 5.00, 'ria sikhona': 0.40,
};

function getFlashCommission(vasType, provider, productName) {
  const p = (provider || '').toLowerCase();
  const n = (productName || '').toLowerCase();

  if (n.includes('flash token'))                      return { commission: 0, fixedFee: 300, commissionType: 'fixed_amount', pricingRate: 0 };
  if (n.includes('dstv') || p.includes('dstv'))       return { commission: 0, fixedFee: 300, commissionType: 'fixed_amount', pricingRate: 0 };
  if (n.includes('municipality') || n.includes('metro') || p.includes('municipality'))
    return { commission: 0, fixedFee: 200, commissionType: 'fixed_amount', pricingRate: 0 };

  if (vasType === 'airtime' || vasType === 'data')    return { commission: 3.00, fixedFee: 0, commissionType: 'percentage', pricingRate: 3.00 };
  if (vasType === 'electricity')                      return { commission: 0.85, fixedFee: 0, commissionType: 'percentage', pricingRate: 0.85 };

  for (const [key, rate] of Object.entries(GIFT_RATES)) {
    if (p.includes(key) || n.includes(key)) return { commission: rate, fixedFee: 0, commissionType: 'percentage', pricingRate: rate };
  }

  if (vasType === 'bill_payment') {
    for (const [key, rate] of Object.entries(BILL_RATES)) {
      if (p.includes(key) || n.includes(key)) return { commission: rate, fixedFee: 0, commissionType: 'percentage', pricingRate: rate };
    }
    return { commission: 2.50, fixedFee: 0, commissionType: 'percentage', pricingRate: 2.50 };
  }

  if (n.includes('1voucher') || n.includes('fnb voucher') || p.includes('1voucher'))
    return { commission: 1.00, fixedFee: 0, commissionType: 'percentage', pricingRate: 1.00 };

  if (vasType === 'voucher') return { commission: 3.50, fixedFee: 0, commissionType: 'percentage', pricingRate: 3.50 };

  return { commission: 2.50, fixedFee: 0, commissionType: 'percentage', pricingRate: 2.50 };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBrandCategory(vasType) {
  if (vasType === 'voucher') return 'entertainment';
  return 'utilities';
}

function getTransactionType(vasType, isFixed) {
  if (vasType === 'bill_payment' || vasType === 'electricity') return 'direct';
  if (vasType === 'voucher' || isFixed) return 'voucher';
  return 'topup';
}

function safeStringify(obj) {
  if (obj === null || obj === undefined) return JSON.stringify({});
  try {
    const result = JSON.stringify(obj);
    JSON.parse(result);
    return result;
  } catch {
    try {
      return JSON.stringify(obj, (_key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'number' && !isFinite(value)) return null;
        if (typeof value === 'function' || typeof value === 'symbol') return null;
        return value;
      });
    } catch {
      return JSON.stringify({});
    }
  }
}

// ─── Sync class ──────────────────────────────────────────────────────────────

class FlashProductSync {
  constructor(client) {
    this.client = client;
    this.stats = { total: 0, created: 0, updated: 0, failed: 0, deactivated: 0, byVasType: {} };
    this.seenSupplierProductIds = new Set();
  }

  async syncProduct(raw, supplier) {
    const productCode = String(raw.productCode || raw.id || '');
    if (!productCode) return null;

    const productName  = raw.productName || raw.name || 'Flash Product';
    const productGroup = raw.productGroup || raw.category || raw.type || 'Gift Vouchers';
    const vasType      = mapFlashCategory(productGroup, productName);
    const provider     = raw.vendor || raw.provider || raw.contentCreator || productName;
    const isActive     = raw.status === 'Active' || raw.isActive === true;
    const minAmount    = raw.minimumAmount || raw.minAmount || 500;
    const maxAmount    = raw.maximumAmount || raw.maxAmount || 100000;
    const isFixed      = minAmount === maxAmount;
    const denominations = isFixed ? [minAmount] : [];
    const priceType    = isFixed ? 'fixed' : 'variable';
    const txType       = getTransactionType(vasType, isFixed);
    const brandCategory = getBrandCategory(vasType);
    const status       = isActive ? 'active' : 'inactive';

    const commInfo = getFlashCommission(vasType, provider, productName);

    // Brand upsert
    let brandResult = await this.client.query(
      'SELECT id FROM product_brands WHERE name = $1 LIMIT 1', [provider]
    );
    let brandId;
    if (brandResult.rows.length > 0) {
      brandId = brandResult.rows[0].id;
    } else {
      const ins = await this.client.query(`
        INSERT INTO product_brands (name, category, "isActive", metadata, "createdAt", "updatedAt")
        VALUES ($1, $2, true, $3::jsonb, NOW(), NOW()) RETURNING id
      `, [provider, brandCategory, safeStringify({ source: 'flash' })]);
      brandId = ins.rows[0].id;
    }

    // Product upsert (keyed on supplierId + supplierProductId)
    let productResult = await this.client.query(`
      SELECT id FROM products
      WHERE "supplierId" = $1 AND "supplierProductId" = $2 LIMIT 1
    `, [supplier.id, productCode]);

    let productId;
    if (productResult.rows.length > 0) {
      productId = productResult.rows[0].id;
      await this.client.query(`
        UPDATE products
        SET name = $1, type = $2, "brandId" = $3, status = $4,
            denominations = $5, "updatedAt" = NOW()
        WHERE id = $6
      `, [productName, vasType, brandId, status,
          JSON.stringify(denominations), productId]);
    } else {
      const ins = await this.client.query(`
        INSERT INTO products (
          "supplierId", "brandId", name, type, "supplierProductId",
          status, denominations, "isFeatured", "sortOrder", metadata,
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, 0, $8::jsonb, NOW(), NOW())
        RETURNING id
      `, [supplier.id, brandId, productName, vasType, productCode, status,
          JSON.stringify(denominations),
          safeStringify({ source: 'flash', synced: true, synced_from: 'sync-flash-products' })]);
      productId = ins.rows[0].id;
    }

    // Variant upsert (keyed on productId + supplierId + supplierProductId)
    const metadata = safeStringify({
      flash_product_code: productCode,
      flash_product_name: productName,
      flash_product_group: productGroup,
      flash_vendor: provider,
      flash_barcode: raw.barcode || undefined,
      flash_biller_code: raw.billerCode || undefined,
      synced_at: new Date().toISOString(),
      synced_from: 'sync-flash-products',
    });

    const existingVariant = await this.client.query(`
      SELECT id FROM product_variants
      WHERE "productId" = $1 AND "supplierId" = $2 AND "supplierProductId" = $3 LIMIT 1
    `, [productId, supplier.id, productCode]);

    if (existingVariant.rows.length > 0) {
      await this.client.query(`
        UPDATE product_variants
        SET "vasType" = $1, "transactionType" = $2, provider = $3,
            "priceType" = $4, "minAmount" = $5, "maxAmount" = $6,
            "predefinedAmounts" = $7::jsonb, commission = $8, "fixedFee" = $9,
            "commissionType" = $10, denominations = $11::jsonb,
            pricing = $12::jsonb, constraints = $13::jsonb, metadata = $14::jsonb,
            status = $15, "lastSyncedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = $16
      `, [
        vasType, txType, provider, priceType, minAmount, maxAmount,
        denominations.length > 0 ? JSON.stringify(denominations) : null,
        commInfo.commission, commInfo.fixedFee, commInfo.commissionType,
        JSON.stringify(denominations),
        safeStringify({ defaultCommissionRate: commInfo.pricingRate, fixedAmount: isFixed }),
        safeStringify({ minAmount, maxAmount }),
        metadata, status, existingVariant.rows[0].id
      ]);
      return 'updated';
    } else {
      await this.client.query(`
        INSERT INTO product_variants (
          "productId", "supplierId", "supplierProductId",
          "vasType", "transactionType", "networkType", provider,
          "priceType", "minAmount", "maxAmount", "predefinedAmounts",
          commission, "fixedFee", "commissionType",
          "isPromotional", "promotionalDiscount",
          priority, status, denominations, pricing, constraints, metadata,
          "lastSyncedAt", "sortOrder", "isPreferred",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 'local', $6, $7, $8, $9, $10::jsonb,
          $11, $12, $13, false, null,
          1, $14, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
          NOW(), 0, true, NOW(), NOW()
        )
      `, [
        productId, supplier.id, productCode,
        vasType, txType, provider, priceType, minAmount, maxAmount,
        denominations.length > 0 ? JSON.stringify(denominations) : null,
        commInfo.commission, commInfo.fixedFee, commInfo.commissionType,
        status, JSON.stringify(denominations),
        safeStringify({ defaultCommissionRate: commInfo.pricingRate, fixedAmount: isFixed }),
        safeStringify({ minAmount, maxAmount }),
        metadata
      ]);
      return 'created';
    }
  }

  async syncAllProducts(rawProducts, supplier, allowedVasTypes) {
    for (const raw of rawProducts) {
      const productGroup = raw.productGroup || raw.category || raw.type || 'Gift Vouchers';
      const productName  = raw.productName || raw.name || '';
      const vasType      = mapFlashCategory(productGroup, productName);

      if (allowedVasTypes && !allowedVasTypes.includes(vasType)) continue;

      if (!this.stats.byVasType[vasType]) {
        this.stats.byVasType[vasType] = { fetched: 0, created: 0, updated: 0, failed: 0 };
      }
      this.stats.byVasType[vasType].fetched++;

      try {
        const result = await this.syncProduct(raw, supplier);
        if (!result) continue;
        const productCode = String(raw.productCode || raw.id || '');
        if (productCode) this.seenSupplierProductIds.add(productCode);

        if (result === 'created') {
          this.stats.created++;
          this.stats.byVasType[vasType].created++;
        } else {
          this.stats.updated++;
          this.stats.byVasType[vasType].updated++;
        }
      } catch (error) {
        const name = raw.productName || raw.productCode || 'Unknown';
        console.error(`  ❌ Failed to sync "${name}": ${error.message}`);
        this.stats.failed++;
        this.stats.byVasType[vasType].failed++;
      }
      this.stats.total++;
    }
  }

  async deactivateStaleProducts(supplier, syncedVasTypes) {
    console.log('\n🧹 Checking for stale products to deactivate...');

    if (this.seenSupplierProductIds.size === 0) {
      console.log('  ⚠️  No products were successfully synced — skipping stale cleanup.');
      return;
    }

    const seenIds = [...this.seenSupplierProductIds];

    const staleVariants = await this.client.query(`
      SELECT pv.id, pv."supplierProductId", pv."vasType", p.name
      FROM product_variants pv
      JOIN products p ON p.id = pv."productId"
      WHERE pv."supplierId" = $1
        AND pv.status = 'active'
        AND pv."vasType" = ANY($2)
        AND pv."supplierProductId" IS NOT NULL
        AND pv."supplierProductId" != ''
        AND pv."supplierProductId" NOT IN (SELECT unnest($3::text[]))
    `, [supplier.id, syncedVasTypes, seenIds]);

    if (staleVariants.rows.length === 0) {
      console.log('  ✅ No stale products found — catalog is up to date.');
      return;
    }

    console.log(`  ⚠️  Found ${staleVariants.rows.length} stale variant(s) to deactivate:\n`);
    for (const row of staleVariants.rows) {
      console.log(`     - [${row.vasType}] ${row.name} (${row.supplierProductId})`);
    }

    const staleIds = staleVariants.rows.map(r => r.id);

    await this.client.query(`
      UPDATE product_variants SET status = 'inactive', "updatedAt" = NOW()
      WHERE id = ANY($1::int[])
    `, [staleIds]);

    const deactivatedProducts = await this.client.query(`
      UPDATE products SET status = 'inactive', "updatedAt" = NOW()
      WHERE "supplierId" = $1
        AND type = ANY($2)
        AND status = 'active'
        AND id NOT IN (
          SELECT DISTINCT "productId" FROM product_variants
          WHERE "supplierId" = $1 AND status = 'active'
        )
      RETURNING id, name
    `, [supplier.id, syncedVasTypes]);

    this.stats.deactivated = staleVariants.rows.length;
    console.log(`\n  ✅ Deactivated ${staleVariants.rows.length} variant(s) and ${deactivatedProducts.rows.length} parent product(s).`);
  }

  printStats() {
    console.log('\n' + '='.repeat(80));
    console.log('SYNC COMPLETE - STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Products Processed: ${this.stats.total}`);
    console.log(`Created: ${this.stats.created}`);
    console.log(`Updated: ${this.stats.updated}`);
    console.log(`Deactivated (stale): ${this.stats.deactivated}`);
    console.log(`Failed: ${this.stats.failed}`);
    console.log('='.repeat(80));
    console.log('\nBreakdown by VAS Type:\n');
    for (const [vasType, stats] of Object.entries(this.stats.byVasType)) {
      console.log(`  ${vasType}:`);
      console.log(`    Fetched: ${stats.fetched}`);
      console.log(`    Created: ${stats.created}`);
      console.log(`    Updated: ${stats.updated || 0}`);
      console.log(`    Failed: ${stats.failed}`);
    }
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const FILTER_FLAGS = ['--vouchers-only', '--airtime-only', '--electricity-only', '--billers-only'];

function parseArgs() {
  const args = process.argv.slice(2);
  const vouchersOnly     = args.includes('--vouchers-only');
  const airtimeOnly      = args.includes('--airtime-only');
  const electricityOnly  = args.includes('--electricity-only');
  const billersOnly      = args.includes('--billers-only');

  const envFlags = args.filter(a => a.startsWith('--') && !FILTER_FLAGS.includes(a));
  let targetEnv = 'staging';
  if (envFlags.length) {
    const env = envFlags[0].replace('--', '').toLowerCase();
    if (!['staging', 'production', 'uat'].includes(env)) {
      console.error(`\n❌ Invalid target: ${envFlags[0]}`);
      console.error('   Valid targets: --staging, --production, --uat');
      console.error('   Optional:     --vouchers-only, --airtime-only, --electricity-only, --billers-only\n');
      process.exit(1);
    }
    targetEnv = env;
  }
  return { targetEnv, vouchersOnly, airtimeOnly, electricityOnly, billersOnly };
}

function getAllowedVasTypes({ vouchersOnly, airtimeOnly, electricityOnly, billersOnly }) {
  if (vouchersOnly)    return ['voucher'];
  if (airtimeOnly)     return ['airtime', 'data'];
  if (electricityOnly) return ['electricity'];
  if (billersOnly)     return ['bill_payment'];
  return null; // all types
}

function getClientForEnv(env) {
  switch (env) {
    case 'uat':        return getUATClient();
    case 'production': return getProductionClient();
    default:           return getStagingClient();
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs();
  const { targetEnv } = flags;
  const envLabel = targetEnv.charAt(0).toUpperCase() + targetEnv.slice(1);
  const allowedVasTypes = getAllowedVasTypes(flags);
  const filterLabel = allowedVasTypes ? ` (${allowedVasTypes.join(', ')})` : ' (all)';

  console.log(`\n🚀 Flash API → ${envLabel} DB Sync Starting...`);
  console.log(`   VAS filter: ${filterLabel}\n`);

  if (targetEnv === 'production') {
    console.log('⚠️  WARNING: You are syncing to the PRODUCTION database.');
    console.log('   Press Ctrl+C within 5 seconds to abort...\n');
    await new Promise(r => setTimeout(r, 5000));
    console.log('   Proceeding with production sync.\n');
  }

  let client;

  try {
    // Load Flash credentials from Secret Manager
    console.log('🔐 Loading Flash credentials from Secret Manager...');

    const consumerKey = execSync(
      'gcloud secrets versions access latest --secret="FLASH_CONSUMER_KEY" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();

    const consumerSecret = execSync(
      'gcloud secrets versions access latest --secret="FLASH_CONSUMER_SECRET" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();

    const accountNumber = execSync(
      'gcloud secrets versions access latest --secret="FLASH_ACCOUNT_NUMBER" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();

    const apiUrl = execSync(
      'gcloud secrets versions access latest --secret="FLASH_API_URL" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();

    const tokenUrl = execSync(
      'gcloud secrets versions access latest --secret="FLASH_TOKEN_URL" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();

    console.log(`✅ Credentials loaded (Account: ${accountNumber})\n`);

    process.env.FLASH_CONSUMER_KEY    = consumerKey;
    process.env.FLASH_CONSUMER_SECRET = consumerSecret;
    process.env.FLASH_ACCOUNT_NUMBER  = accountNumber;
    process.env.FLASH_API_URL         = apiUrl;
    process.env.FLASH_TOKEN_URL       = tokenUrl;
    process.env.FLASH_LIVE_INTEGRATION = 'true';

    // Authenticate
    console.log('🔑 Authenticating with Flash API...');
    const authService = new FlashAuthService();
    const health = await authService.healthCheck();
    if (health.status !== 'healthy') {
      throw new Error(`Flash API unhealthy: ${health.error}`);
    }
    console.log('✅ Authentication successful\n');

    // Fetch all products
    console.log(`📡 Fetching products for account ${accountNumber}...`);
    const response = await authService.makeAuthenticatedRequest(
      'GET',
      `/accounts/${accountNumber}/products?includeInstructions=false`
    );
    const rawProducts = response.products || response || [];
    console.log(`✅ Fetched ${rawProducts.length} products from Flash API\n`);

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      console.log('⚠️  Flash API returned no products. Nothing to sync.');
      return;
    }

    // Connect to target DB
    console.log(`📡 Connecting to ${envLabel} database (port ${ENV_PORTS[targetEnv]})...`);
    client = await getClientForEnv(targetEnv);
    console.log(`✅ Connected to ${envLabel}\n`);

    // Resolve Flash supplier
    console.log('🏢 Finding Flash supplier...');
    const supplierResult = await client.query(
      "SELECT id, name, code FROM suppliers WHERE code = 'FLASH' LIMIT 1"
    );

    let supplier;
    if (!supplierResult.rows.length) {
      console.log('⚠️  Flash supplier not found, creating...');
      const createResult = await client.query(`
        INSERT INTO suppliers (code, name, "isActive", "createdAt", "updatedAt")
        VALUES ('FLASH', 'Flash', true, NOW(), NOW())
        RETURNING id, name, code
      `);
      supplier = createResult.rows[0];
      console.log(`✅ Created Flash supplier (ID: ${supplier.id})\n`);
    } else {
      supplier = supplierResult.rows[0];
      console.log(`✅ Found Flash supplier (ID: ${supplier.id})\n`);
    }

    // Sync
    const syncService = new FlashProductSync(client);
    await syncService.syncAllProducts(rawProducts, supplier, allowedVasTypes);

    // Deactivate stale products (only for the VAS types that were synced)
    const syncedVasTypes = allowedVasTypes || ['airtime', 'data', 'electricity', 'bill_payment', 'voucher', 'international_pin'];
    await syncService.deactivateStaleProducts(supplier, syncedVasTypes);

    syncService.printStats();
    console.log('✅ Sync completed successfully!\n');

  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure you are in Codespaces');
    console.error(`   2. Check Cloud SQL Auth Proxy is running (port ${ENV_PORTS[targetEnv]})`);
    console.error('   3. Verify gcloud authentication: gcloud auth list');
    console.error('   4. Check Secret Manager access for FLASH_* secrets\n');
    process.exit(1);
  } finally {
    if (client) client.release();
    await closeAll();
  }
}

main().catch(console.error);
