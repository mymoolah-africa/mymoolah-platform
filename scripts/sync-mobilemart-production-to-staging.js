#!/usr/bin/env node

/**
 * Sync MobileMart Production Products to Staging Database
 * Uses db-connection-helper.js for Staging database access
 * Uses Secret Manager for MobileMart production credentials
 * 
 * Usage: node scripts/sync-mobilemart-production-to-staging.js
 * 
 * This script:
 * 1. Fetches all products from MobileMart Production API
 * 2. Syncs them to Staging database (mymoolah_staging)
 * 3. Maintains supplier comparison ranking (commission → price → Flash preference)
 */

const { execSync } = require('child_process');
const { getStagingClient, closeAll } = require('./db-connection-helper');
const MobileMartAuthService = require('../services/mobilemartAuthService');

// VAS types to sync
const VAS_TYPES = ['airtime', 'data', 'utility', 'voucher', 'bill-payment'];

// Normalize product type to match PostgreSQL enum
function normalizeProductType(vasType) {
  const t = (vasType || '').toLowerCase();
  if (t === 'bill-payment' || t === 'billpayment') return 'bill_payment';
  if (t === 'prepaidutility' || t === 'utility' || t === 'prepaid-utility') return 'electricity';
  return t; // airtime, data, voucher, etc.
}

// Get brand category based on VAS type
function getBrandCategory(vasType) {
  const t = (vasType || '').toLowerCase();
  if (t === 'voucher') return 'entertainment';
  if (['airtime', 'data', 'electricity', 'bill_payment', 'utility'].includes(t)) return 'utilities';
  return 'other';
}

// Determine transaction type
function getTransactionType(vasType, product) {
  const mapping = {
    'airtime': product.pinned ? 'voucher' : 'topup',
    'data': product.pinned ? 'voucher' : 'topup',
    'utility': 'voucher',  // Electricity returns PIN
    'electricity': 'voucher',  // Electricity returns PIN
    'voucher': 'voucher',
    'bill-payment': 'voucher',  // Bill-payment returns PIN (regardless of API's pinned field)
    'bill_payment': 'voucher'   // Bill-payment returns PIN
  };
  return mapping[vasType] || 'topup';
}

class MobileMartStagingSync {
  constructor(client, authService) {
    this.client = client;
    this.authService = authService;
    this.stats = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      byVasType: {}
    };
  }

  /**
   * Sync products for a specific VAS type
   */
  async syncVasType(vasType, supplier) {
    console.log(`\n📱 Syncing ${vasType} products...`);
    
    try {
      // Fetch products from MobileMart Production API
      const normalizedVasType = vasType === 'utility' ? 'prepaidutility' : vasType;
      const response = await this.authService.makeAuthenticatedRequest(
        'GET',
        `/${normalizedVasType}/products`
      );
      
      const allProducts = Array.isArray(response.products) ? response.products : (Array.isArray(response) ? response : []);
      console.log(`  Found ${allProducts.length} ${vasType} products from Production API`);
      
      // LAUNCH STRATEGY: Filter products based on pinned/pinless requirement
      // - Airtime/Data: Only sync PINLESS products (pinned === false) - MyMoolah business requirement
      // - Bill-Payment: Sync ALL products (API returns them as pinned=false, but we need them all)
      // - Electricity/Utility: Only sync PINNED products (pinned === true)
      // - Voucher: Sync ALL products
      let products = allProducts;
      if (vasType === 'airtime' || vasType === 'data') {
        products = allProducts.filter(p => p.pinned === false);
        console.log(`  🎯 Filtered to ${products.length} PINLESS products (${allProducts.length - products.length} pinned skipped)`);
      } else if (vasType === 'utility' || vasType === 'electricity') {
        products = allProducts.filter(p => p.pinned === true);
        console.log(`  🎯 Filtered to ${products.length} PINNED products (${allProducts.length - products.length} pinless skipped)`);
      } else if (vasType === 'bill-payment') {
        // Keep ALL bill-payment products (don't filter by pinned field)
        console.log(`  🎯 Syncing ALL ${products.length} bill-payment products (no pinned filter applied)`);
      }
      
      this.stats.byVasType[vasType] = {
        fetched: allProducts.length,
        filtered: products.length,
        created: 0,
        updated: 0,
        failed: 0
      };
      
      // Sync each product
      for (const mmProduct of products) {
        try {
          const result = await this.syncProduct(mmProduct, vasType, supplier);
          if (result === 'created') {
            this.stats.byVasType[vasType].created++;
            this.stats.created++;
          } else if (result === 'updated') {
            this.stats.byVasType[vasType].updated++;
            this.stats.updated++;
          }
        } catch (error) {
          console.error(`  ❌ Failed to sync product ${mmProduct.merchantProductId}: ${error.message}`);
          if (error.message.includes('invalid input syntax for type json')) {
            console.error(`     Debug: Product data: ${JSON.stringify({
              merchantProductId: mmProduct.merchantProductId,
              productName: mmProduct.productName,
              amount: mmProduct.amount,
              minimumAmount: mmProduct.minimumAmount,
              maximumAmount: mmProduct.maximumAmount
            }, null, 2)}`);
          }
          this.stats.byVasType[vasType].failed++;
          this.stats.failed++;
        }
      }
      
      this.stats.total += products.length;
      console.log(`  ✅ Synced ${this.stats.byVasType[vasType].created} ${vasType} products`);
      
    } catch (error) {
      console.error(`  ❌ Error syncing ${vasType}: ${error.message}`);
      this.stats.byVasType[vasType] = { fetched: 0, filtered: 0, created: 0, updated: 0, failed: 0, error: error.message };
    }
  }

  /**
   * Sanitize JSON to prevent parsing errors
   */
  safeStringify(obj) {
    if (obj === null || obj === undefined) {
      return JSON.stringify({});
    }
    
    try {
      // First try: normal stringify
      const result = JSON.stringify(obj);
      // Validate it can be parsed back
      JSON.parse(result);
      return result;
    } catch (error) {
      try {
        // Second try: stringify with replacer that handles problematic values
        return JSON.stringify(obj, (key, value) => {
          // Handle undefined
          if (value === undefined) return null;
          // Handle NaN and Infinity
          if (typeof value === 'number' && !isFinite(value)) return null;
          // Handle functions
          if (typeof value === 'function') return null;
          // Handle symbols
          if (typeof value === 'symbol') return null;
          return value;
        });
      } catch (secondError) {
        // Last resort: return empty object
        console.warn(`⚠️  JSON stringify failed for object, returning {}: ${secondError.message}`);
        return JSON.stringify({});
      }
    }
  }

  /**
   * Sync a single product
   * Returns 'created' or 'updated'
   */
  async syncProduct(mmProduct, vasType, supplier) {
    const normalizedType = normalizeProductType(vasType);
    
    // Create or find brand
    const brandName = mmProduct.contentCreator || mmProduct.productName || 'MobileMart';
    const brandCategory = getBrandCategory(normalizedType);
    
    // Try to find existing brand first
    let brandResult = await this.client.query(`
      SELECT id FROM product_brands WHERE name = $1 LIMIT 1
    `, [brandName]);
    
    let brandId;
    if (brandResult.rows.length > 0) {
      brandId = brandResult.rows[0].id;
    } else {
      // Create new brand
      try {
        const insertResult = await this.client.query(`
          INSERT INTO product_brands (name, category, "isActive", metadata, "createdAt", "updatedAt")
          VALUES ($1, $2, true, $3::jsonb, NOW(), NOW())
          RETURNING id
        `, [brandName, brandCategory, this.safeStringify({ source: 'mobilemart' })]);
        brandId = insertResult.rows[0].id;
      } catch (brandError) {
        console.error(`     Brand INSERT failed: ${brandError.message}`);
        console.error(`     Brand data: name="${brandName}", category="${brandCategory}"`);
        throw brandError;
      }
    }
    
    // Create or get base product
    let productResult = await this.client.query(`
      SELECT id FROM products 
      WHERE "supplierId" = $1 AND name = $2 AND type = $3 
      LIMIT 1
    `, [supplier.id, mmProduct.productName, normalizedType]);
    
    let productId;
    if (productResult.rows.length > 0) {
      // Update existing
      productId = productResult.rows[0].id;
      await this.client.query(`
        UPDATE products 
        SET "supplierProductId" = $1, "updatedAt" = NOW()
        WHERE id = $2
      `, [mmProduct.merchantProductId.toString(), productId]);
    } else {
      // Insert new
      try {
        const insertResult = await this.client.query(`
          INSERT INTO products (
            "supplierId", "brandId", name, type, "supplierProductId",
            status, denominations, "isFeatured", "sortOrder", metadata,
            "createdAt", "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, 'active', $6, false, 0, $7::jsonb, NOW(), NOW())
          RETURNING id
        `, [
          supplier.id,
          brandId,
          mmProduct.productName,
          normalizedType,
          mmProduct.merchantProductId.toString(),
          mmProduct.fixedAmount ? [Math.round(mmProduct.amount * 100)] : [],
          this.safeStringify({ source: 'mobilemart', synced: true, synced_from: 'production_api' })
        ]);
        productId = insertResult.rows[0].id;
      } catch (productError) {
        console.error(`     Product INSERT failed: ${productError.message}`);
        console.error(`     Product metadata being inserted: ${this.safeStringify({ source: 'mobilemart', synced: true, synced_from: 'production_api' })}`);
        throw productError;
      }
    }
    
    // Map to ProductVariant
    const variantData = this.mapToProductVariant(mmProduct, vasType, supplier.id, productId);
    
    // Check if ProductVariant exists (using the unique constraint: productId + supplierId)
    const existingVariant = await this.client.query(`
      SELECT id FROM product_variants 
      WHERE "productId" = $1 AND "supplierId" = $2
      LIMIT 1
    `, [productId, supplier.id]);
    
    if (existingVariant.rows.length > 0) {
      // Update existing variant
      await this.client.query(`
        UPDATE product_variants 
        SET 
          "minAmount" = $1, 
          "maxAmount" = $2,
          provider = $3, 
          status = $4,
          "lastSyncedAt" = NOW(), 
          "updatedAt" = NOW()
        WHERE id = $5
      `, [
        variantData.minAmount,
        variantData.maxAmount,
        variantData.provider,
        variantData.status,
        existingVariant.rows[0].id
      ]);
      return 'updated';
    } else {
      // Create new ProductVariant
      try {
        await this.client.query(`
          INSERT INTO product_variants (
            "productId", "supplierId", "supplierProductId",
            "vasType", "transactionType", "networkType", provider,
            "minAmount", "maxAmount", "predefinedAmounts",
            commission, "fixedFee",
            "isPromotional", "promotionalDiscount",
            priority, status, denominations, pricing, constraints, metadata,
            "lastSyncedAt", "sortOrder", "isPreferred",
            "createdAt", "updatedAt"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb,
            $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb, $19::jsonb, $20::jsonb,
            NOW(), $21, $22, NOW(), NOW()
          )
        `, [
          variantData.productId,
          variantData.supplierId,
          variantData.supplierProductId,
          variantData.vasType,
          variantData.transactionType,
          variantData.networkType,
          variantData.provider,
          variantData.minAmount,
          variantData.maxAmount,
          variantData.predefinedAmounts ? this.safeStringify(variantData.predefinedAmounts) : null,
          variantData.commission,
          variantData.fixedFee,
          variantData.isPromotional,
          variantData.promotionalDiscount,
          variantData.priority,
          variantData.status,
          this.safeStringify(variantData.denominations),
          this.safeStringify(variantData.pricing),
          this.safeStringify(variantData.constraints),
          this.safeStringify(variantData.metadata),
          variantData.sortOrder,
          variantData.isPreferred
        ]);
        return 'created';
      } catch (insertError) {
        // Enhanced error logging for JSON issues
        if (insertError.message.includes('invalid input syntax for type json')) {
          console.error(`     JSON Error Details:`);
          console.error(`       - predefinedAmounts: ${variantData.predefinedAmounts ? this.safeStringify(variantData.predefinedAmounts) : 'null'}`);
          console.error(`       - denominations: ${this.safeStringify(variantData.denominations)}`);
          console.error(`       - pricing: ${this.safeStringify(variantData.pricing)}`);
          console.error(`       - constraints: ${this.safeStringify(variantData.constraints)}`);
          console.error(`       - metadata: ${this.safeStringify(variantData.metadata)}`);
        }
        throw insertError;
      }
    }
  }

  /**
   * Map MobileMart product to ProductVariant schema
   */
  mapToProductVariant(mmProduct, vasType, supplierId, productId) {
    const normalizedType = normalizeProductType(vasType);  // Normalize for enums
    const transactionType = getTransactionType(vasType, mmProduct);
    const isBillPayment = vasType === 'bill_payment' || vasType === 'bill-payment';
    const isElectricity = vasType === 'electricity' || vasType === 'utility';
    const hasFixedAmount = !!mmProduct.fixedAmount && !isBillPayment;
    const baseAmountCents = typeof mmProduct.amount === 'number' ? Math.round(mmProduct.amount * 100) : null;

    const computedMinCents = mmProduct.minimumAmount ? Math.round(mmProduct.minimumAmount * 100) : null;
    const computedMaxCents = mmProduct.maximumAmount ? Math.round(mmProduct.maximumAmount * 100) : null;

    const minAmount = hasFixedAmount && typeof baseAmountCents === 'number'
      ? baseAmountCents
      : (computedMinCents != null ? computedMinCents : 0);

    const maxAmount = hasFixedAmount && typeof baseAmountCents === 'number'
      ? baseAmountCents
      : (computedMaxCents != null ? computedMaxCents : 0);

    const denominations = hasFixedAmount && typeof baseAmountCents === 'number'
      ? [baseAmountCents]
      : [];

    // BUSINESS LOGIC: Override pinned field for bill-payment and electricity
    // MobileMart API may return pinned=false, but MyMoolah REQUIRES pinned=true for these types
    const isPinnedProduct = (isBillPayment || isElectricity) ? true : mmProduct.pinned;

    return {
      productId: productId,
      supplierId: supplierId,
      supplierProductId: mmProduct.merchantProductId,
      vasType: normalizedType,  // Use normalized type for enum compatibility
      transactionType: transactionType,
      networkType: 'local',
      provider: mmProduct.contentCreator || mmProduct.provider || 'Unknown',
      minAmount: minAmount,
      maxAmount: maxAmount,
      predefinedAmounts: hasFixedAmount && typeof baseAmountCents === 'number' ? [baseAmountCents] : null,
      commission: 2.5, // Default MobileMart commission
      fixedFee: 0,
      isPromotional: false,
      promotionalDiscount: null,
      priority: 2, // MobileMart is secondary to Flash
      status: 'active',
      denominations: denominations,
      pricing: {
        defaultCommissionRate: 2.5,
        fixedAmount: mmProduct.fixedAmount,
        amount: mmProduct.amount
      },
      constraints: {
        minAmount: mmProduct.minimumAmount ? mmProduct.minimumAmount * 100 : null,
        maxAmount: mmProduct.maximumAmount ? mmProduct.maximumAmount * 100 : null,
        pinned: isPinnedProduct  // Override with business logic
      },
      metadata: {
        mobilemart_merchant_product_id: mmProduct.merchantProductId,
        mobilemart_product_name: mmProduct.productName,
        mobilemart_content_creator: mmProduct.contentCreator,
        mobilemart_pinned_api_value: mmProduct.pinned,  // Store original API value
        mobilemart_pinned_overridden: isPinnedProduct,   // Store our override
        mobilemart_fixed_amount: mmProduct.fixedAmount,
        mobilemart_original_vastype: vasType,  // Store original API vasType
        synced_at: new Date().toISOString(),
        synced_from: 'production_api'
      },
      sortOrder: isPinnedProduct ? 1 : 2,
      isPreferred: isPinnedProduct
    };
  }

  /**
   * Print final statistics
   */
  printStats() {
    console.log('\n' + '='.repeat(80));
    console.log('SYNC COMPLETE - STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Products Processed: ${this.stats.total}`);
    console.log(`Created: ${this.stats.created}`);
    console.log(`Updated: ${this.stats.updated}`);
    console.log(`Failed: ${this.stats.failed}`);
    console.log('='.repeat(80));
    console.log('\nBreakdown by VAS Type:\n');
    
    for (const [vasType, stats] of Object.entries(this.stats.byVasType)) {
      console.log(`  ${vasType}:`);
      console.log(`    Fetched: ${stats.fetched}`);
      console.log(`    Filtered: ${stats.filtered}`);
      console.log(`    Created: ${stats.created}`);
      console.log(`    Failed: ${stats.failed}`);
      if (stats.error) {
        console.log(`    Error: ${stats.error}`);
      }
    }
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

async function main() {
  console.log('\n🚀 MobileMart Production → Staging Sync Starting...\n');
  
  let client;
  
  try {
    // Get MobileMart production credentials from Secret Manager
    console.log('🔐 Loading MobileMart production credentials from Secret Manager...');
    
    const clientId = execSync(
      'gcloud secrets versions access latest --secret="mobilemart-prod-client-id" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();
    
    const clientSecret = execSync(
      'gcloud secrets versions access latest --secret="mobilemart-prod-client-secret" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();
    
    const apiUrl = execSync(
      'gcloud secrets versions access latest --secret="mobilemart-prod-api-url" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();
    
    console.log(`✅ Credentials loaded (Client ID: ${clientId})\n`);
    
    // Set production environment
    process.env.MOBILEMART_CLIENT_ID = clientId;
    process.env.MOBILEMART_CLIENT_SECRET = clientSecret;
    process.env.MOBILEMART_API_URL = apiUrl;
    process.env.MOBILEMART_TOKEN_URL = `${apiUrl}/connect/token`;
    process.env.MOBILEMART_SCOPE = 'api';
    
    // Initialize auth service
    const authService = new MobileMartAuthService();
    
    // Connect to Staging database
    console.log('📡 Connecting to Staging database...');
    client = await getStagingClient();
    console.log('✅ Connected to Staging\n');
    
    // Get or create MobileMart supplier
    console.log('🏢 Finding MobileMart supplier...');
    const supplierResult = await client.query(`
      SELECT id, name, code FROM suppliers WHERE code = 'MOBILEMART' LIMIT 1
    `);
    
    if (!supplierResult.rows.length) {
      console.log('⚠️  MobileMart supplier not found, creating...');
      const createResult = await client.query(`
        INSERT INTO suppliers (code, name, "isActive", "createdAt", "updatedAt")
        VALUES ('MOBILEMART', 'MobileMart', true, NOW(), NOW())
        RETURNING id, name, code
      `);
      var supplier = createResult.rows[0];
      console.log(`✅ Created MobileMart supplier (ID: ${supplier.id})\n`);
    } else {
      var supplier = supplierResult.rows[0];
      console.log(`✅ Found MobileMart supplier (ID: ${supplier.id})\n`);
    }
    
    // Initialize sync service
    const syncService = new MobileMartStagingSync(client, authService);
    
    // Sync all VAS types
    for (const vasType of VAS_TYPES) {
      await syncService.syncVasType(vasType, supplier);
    }
    
    // Print statistics
    syncService.printStats();
    
    console.log('✅ Sync completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure you are in Codespaces');
    console.error('   2. Check Cloud SQL Auth Proxy is running (port 6544)');
    console.error('   3. Verify gcloud authentication: gcloud auth list');
    console.error('   4. Check Secret Manager access\n');
    process.exit(1);
  } finally {
    if (client) client.release();
    await closeAll();
  }
}

// Run
main().catch(console.error);
