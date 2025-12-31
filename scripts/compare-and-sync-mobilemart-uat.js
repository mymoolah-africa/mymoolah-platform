#!/usr/bin/env node
/**
 * Compare and Sync MobileMart Products with UAT API
 * 
 * This script:
 * 1. Fetches all products from MobileMart UAT API
 * 2. Compares with products in database (product_variants table)
 * 3. Identifies missing, extra, and mismatched products
 * 4. Syncs missing/updated products from UAT API
 * 
 * Usage: node scripts/compare-and-sync-mobilemart-uat.js [--dry-run]
 */

require('dotenv').config();
const db = require('../models');
const { ProductVariant, Product, Supplier, ProductBrand } = db;
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

// Normalize VAS type for MobileMart API
function normalizeVasType(vasType) {
  const mapping = {
    'airtime': 'airtime',
    'data': 'data',
    'utility': 'utility',
    'electricity': 'utility',
    'voucher': 'voucher',
    'bill-payment': 'bill-payment',
    'billpayment': 'bill-payment'
  };
  return mapping[vasType] || vasType;
}

// Determine transaction type
function getTransactionType(vasType, product) {
  const mapping = {
    'airtime': product.pinned ? 'voucher' : 'topup',
    'data': product.pinned ? 'voucher' : 'topup',
    'electricity': 'voucher',
    'bill_payment': 'topup',
    'voucher': 'voucher'
  };
  return mapping[vasType] || 'topup';
}

// Map MobileMart product to ProductVariant data
function mapToProductVariant(mmProduct, vasType, supplierId, productId) {
  const isBillPayment = vasType === 'bill_payment';
  const hasFixedAmount = !!mmProduct.fixedAmount && !isBillPayment;
  const baseAmountCents = typeof mmProduct.amount === 'number' ? Math.round(mmProduct.amount * 100) : null;
  
  const computedMinCents = mmProduct.minimumAmount ? Math.round(mmProduct.minimumAmount * 100) : null;
  const computedMaxCents = mmProduct.maximumAmount ? Math.round(mmProduct.maximumAmount * 100) : null;
  
  const minAmount = hasFixedAmount && typeof baseAmountCents === 'number'
    ? baseAmountCents
    : (computedMinCents != null ? computedMinCents : 500);
  
  const maxAmount = hasFixedAmount && typeof baseAmountCents === 'number'
    ? baseAmountCents
    : (computedMaxCents != null ? computedMaxCents : 100000);
  
  const denominations = hasFixedAmount && typeof baseAmountCents === 'number'
    ? [baseAmountCents]
    : [];
  
  return {
    productId: productId,
    supplierId: supplierId,
    supplierProductId: mmProduct.merchantProductId,
    
    // VAS fields
    vasType: vasType,
    transactionType: getTransactionType(vasType, mmProduct),
    networkType: 'local',
    provider: mmProduct.contentCreator || mmProduct.provider || 'Unknown',
    
    // Amount constraints
    minAmount: minAmount,
    maxAmount: maxAmount,
    predefinedAmounts: hasFixedAmount && typeof baseAmountCents === 'number' ? [baseAmountCents] : null,
    
    // Commission and fees (will be validated separately)
    commission: 2.5, // Default, will be validated/updated by validation script
    fixedFee: 0,
    
    // Promotional
    isPromotional: mmProduct.isPromotional || false,
    promotionalDiscount: mmProduct.promotionalDiscount || null,
    
    // Priority and status
    priority: 2, // MobileMart is secondary supplier
    status: mmProduct.isActive !== false ? 'active' : 'inactive',
    
    // Denominations
    denominations: denominations,
    
    // Pricing structure
    pricing: {
      defaultCommissionRate: 2.5,
      fixedAmount: mmProduct.fixedAmount,
      amount: mmProduct.amount
    },
    
    // Constraints
    constraints: {
      minAmount: mmProduct.minimumAmount ? mmProduct.minimumAmount * 100 : null,
      maxAmount: mmProduct.maximumAmount ? mmProduct.maximumAmount * 100 : null,
      pinned: mmProduct.pinned
    },
    
    // Metadata
    metadata: {
      mobilemart_merchant_product_id: mmProduct.merchantProductId,
      mobilemart_product_name: mmProduct.productName,
      mobilemart_content_creator: mmProduct.contentCreator,
      mobilemart_pinned: mmProduct.pinned,
      mobilemart_fixed_amount: mmProduct.fixedAmount,
      synced_at: new Date().toISOString(),
      synced_from: 'uat_api'
    },
    
    // Tracking
    lastSyncedAt: new Date(),
    sortOrder: mmProduct.pinned ? 1 : 2,
    isPreferred: mmProduct.pinned
  };
}

class MobileMartCompareAndSync {
  constructor() {
    this.authService = new MobileMartAuthService();
    this.dryRun = process.argv.includes('--dry-run');
    this.stats = {
      total: 0,
      created: 0,
      updated: 0,
      missing: 0,
      extra: 0,
      mismatched: 0,
      errors: 0,
      byVasType: {}
    };
  }

  async run() {
    console.log('🔍 MobileMart UAT Comparison and Sync\n');
    console.log('='.repeat(80));
    if (this.dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made to database\n');
    }
    console.log('='.repeat(80));
    
    try {
      // Test database connection
      await db.sequelize.authenticate();
      console.log('✅ Database connection established\n');
      
      // Get MobileMart supplier
      const supplier = await Supplier.findOne({ where: { code: 'MOBILEMART' } });
      if (!supplier) {
        throw new Error('MobileMart supplier not found in database');
      }
      console.log(`✅ MobileMart Supplier ID: ${supplier.id}\n`);
      
      // Test MobileMart authentication
      const health = await this.authService.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`MobileMart API unhealthy: ${health.error}`);
      }
      console.log('✅ MobileMart UAT API authentication successful\n');
      
      // Compare and sync each VAS type
      for (const vasType of VAS_TYPES) {
        await this.compareAndSyncVasType(vasType, supplier);
      }
      
      // Summary
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      await db.sequelize.close();
    }
  }

  async compareAndSyncVasType(vasType, supplier) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📱 Comparing ${vasType.toUpperCase()} Products`);
    console.log('='.repeat(80));
    
    try {
      // Fetch products from UAT API
      const normalizedVasType = normalizeVasType(vasType);
      const response = await this.authService.makeAuthenticatedRequest(
        'GET',
        `/${normalizedVasType}/products`
      );
      
      const allProducts = response.products || response || [];
      console.log(`\n📥 Fetched ${allProducts.length} ${vasType} products from UAT API`);
      
      // Filter based on launch strategy
      let apiProducts = allProducts;
      if (vasType === 'airtime' || vasType === 'data') {
        apiProducts = allProducts.filter(p => p.pinned === false);
        console.log(`   🎯 Filtered to ${apiProducts.length} PINLESS products (${allProducts.length - apiProducts.length} pinned skipped)`);
      } else if (vasType === 'utility' || vasType === 'electricity') {
        apiProducts = allProducts.filter(p => p.pinned === true);
        console.log(`   🎯 Filtered to ${apiProducts.length} PINNED products (${allProducts.length - apiProducts.length} pinless skipped)`);
      }
      
      // Get products from database
      const normalizedType = normalizeProductType(vasType);
      const dbProducts = await ProductVariant.findAll({
        where: {
          supplierId: supplier.id,
          status: 'active'
        },
        include: [
          {
            model: Product,
            as: 'product',
            where: { type: normalizedType },
            required: true
          }
        ]
      });
      
      console.log(`\n💾 Found ${dbProducts.length} ${vasType} products in database`);
      
      // Create maps for comparison
      const apiProductMap = new Map();
      apiProducts.forEach(p => {
        apiProductMap.set(p.merchantProductId, p);
      });
      
      const dbProductMap = new Map();
      dbProducts.forEach(p => {
        dbProductMap.set(p.supplierProductId, p);
      });
      
      // Find missing products (in API but not in DB)
      const missingProducts = [];
      for (const [merchantProductId, apiProduct] of apiProductMap.entries()) {
        if (!dbProductMap.has(merchantProductId)) {
          missingProducts.push(apiProduct);
        }
      }
      
      // Find extra products (in DB but not in API)
      const extraProducts = [];
      for (const [supplierProductId, dbProduct] of dbProductMap.entries()) {
        if (!apiProductMap.has(supplierProductId)) {
          extraProducts.push(dbProduct);
        }
      }
      
      // Find mismatched products (exist in both but data differs)
      const mismatchedProducts = [];
      for (const [merchantProductId, apiProduct] of apiProductMap.entries()) {
        const dbProduct = dbProductMap.get(merchantProductId);
        if (dbProduct) {
          // Check for mismatches
          const mismatches = [];
          if (dbProduct.product?.name !== apiProduct.productName) {
            mismatches.push(`name: "${dbProduct.product?.name}" vs "${apiProduct.productName}"`);
          }
          if (dbProduct.provider !== (apiProduct.contentCreator || apiProduct.provider)) {
            mismatches.push(`provider: "${dbProduct.provider}" vs "${apiProduct.contentCreator || apiProduct.provider}"`);
          }
          if (mismatches.length > 0) {
            mismatchedProducts.push({ apiProduct, dbProduct, mismatches });
          }
        }
      }
      
      // Print comparison results
      console.log(`\n📊 Comparison Results:`);
      console.log(`   ✅ In sync: ${apiProducts.length - missingProducts.length - mismatchedProducts.length}`);
      console.log(`   ➕ Missing in DB: ${missingProducts.length}`);
      console.log(`   ➖ Extra in DB: ${extraProducts.length}`);
      console.log(`   ⚠️  Mismatched: ${mismatchedProducts.length}`);
      
      // Show details
      if (missingProducts.length > 0) {
        console.log(`\n   📋 Missing products (will be created):`);
        missingProducts.slice(0, 10).forEach(p => {
          console.log(`      - ${p.merchantProductId}: ${p.productName}`);
        });
        if (missingProducts.length > 10) {
          console.log(`      ... and ${missingProducts.length - 10} more`);
        }
      }
      
      if (extraProducts.length > 0) {
        console.log(`\n   📋 Extra products (in DB but not in UAT API):`);
        extraProducts.slice(0, 10).forEach(p => {
          console.log(`      - ${p.supplierProductId}: ${p.product?.name || 'Unknown'}`);
        });
        if (extraProducts.length > 10) {
          console.log(`      ... and ${extraProducts.length - 10} more`);
        }
      }
      
      if (mismatchedProducts.length > 0) {
        console.log(`\n   📋 Mismatched products (will be updated):`);
        mismatchedProducts.slice(0, 5).forEach(({ apiProduct, mismatches }) => {
          console.log(`      - ${apiProduct.merchantProductId}: ${apiProduct.productName}`);
          mismatches.forEach(m => console.log(`        ${m}`));
        });
        if (mismatchedProducts.length > 5) {
          console.log(`      ... and ${mismatchedProducts.length - 5} more`);
        }
      }
      
      // Sync missing and mismatched products
      if (!this.dryRun && (missingProducts.length > 0 || mismatchedProducts.length > 0)) {
        console.log(`\n🔄 Syncing products...`);
        
        // Sync missing products
        for (const apiProduct of missingProducts) {
          await this.syncProduct(apiProduct, vasType, supplier, 'create');
        }
        
        // Sync mismatched products
        for (const { apiProduct } of mismatchedProducts) {
          await this.syncProduct(apiProduct, vasType, supplier, 'update');
        }
      }
      
      // Update stats
      this.stats.byVasType[vasType] = {
        apiCount: apiProducts.length,
        dbCount: dbProducts.length,
        missing: missingProducts.length,
        extra: extraProducts.length,
        mismatched: mismatchedProducts.length,
        created: missingProducts.length,
        updated: mismatchedProducts.length
      };
      
      this.stats.total += apiProducts.length;
      this.stats.missing += missingProducts.length;
      this.stats.extra += extraProducts.length;
      this.stats.mismatched += mismatchedProducts.length;
      
    } catch (error) {
      console.error(`\n❌ Error comparing ${vasType}:`, error.message);
      this.stats.errors++;
      this.stats.byVasType[vasType] = {
        error: error.message
      };
    }
  }

  async syncProduct(apiProduct, vasType, supplier, operation) {
    try {
      const normalizedType = normalizeProductType(vasType);
      
      // Create or find brand
      const brandName = apiProduct.contentCreator || apiProduct.productName || 'MobileMart';
      const brandCategory = getBrandCategory(normalizedType);
      const [brand] = await ProductBrand.findOrCreate({
        where: { name: brandName },
        defaults: {
          name: brandName,
          category: brandCategory,
          isActive: true,
          metadata: { source: 'mobilemart' }
        }
      });
      
      // Create or get base product
      const [product] = await Product.findOrCreate({
        where: {
          supplierId: supplier.id,
          name: apiProduct.productName,
          type: normalizedType
        },
        defaults: {
          supplierId: supplier.id,
          brandId: brand.id,
          name: apiProduct.productName,
          type: normalizedType,
          supplierProductId: apiProduct.merchantProductId,
          status: 'active',
          denominations: apiProduct.fixedAmount ? [apiProduct.amount * 100] : [],
          isFeatured: false,
          sortOrder: 0,
          metadata: {
            source: 'mobilemart',
            synced: true,
            synced_from: 'uat_api'
          }
        }
      });
      
      // Ensure existing products have required fields
      const updateFields = {};
      if (!product.supplierId) updateFields.supplierId = supplier.id;
      if (!product.brandId) updateFields.brandId = brand.id;
      if (!product.supplierProductId) updateFields.supplierProductId = apiProduct.merchantProductId;
      if (product.type !== normalizedType) updateFields.type = normalizedType;
      if (Object.keys(updateFields).length > 0) {
        await product.update(updateFields);
      }
      
      // Map to ProductVariant
      const variantData = mapToProductVariant(apiProduct, normalizedType, supplier.id, product.id);
      
      // Create or update ProductVariant
      const [productVariant, created] = await ProductVariant.findOrCreate({
        where: {
          productId: product.id,
          supplierId: supplier.id,
          supplierProductId: apiProduct.merchantProductId
        },
        defaults: variantData
      });
      
      if (!created) {
        await productVariant.update(variantData);
        this.stats.updated++;
        console.log(`   ✅ Updated: ${apiProduct.productName} (${apiProduct.merchantProductId})`);
      } else {
        this.stats.created++;
        console.log(`   ✅ Created: ${apiProduct.productName} (${apiProduct.merchantProductId})`);
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to sync ${apiProduct.productName}:`, error.message);
      this.stats.errors++;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total products in UAT API: ${this.stats.total}`);
    console.log(`   ➕ Created: ${this.stats.created}`);
    console.log(`   🔄 Updated: ${this.stats.updated}`);
    console.log(`   ➖ Missing in DB: ${this.stats.missing}`);
    console.log(`   ➕ Extra in DB: ${this.stats.extra}`);
    console.log(`   ⚠️  Mismatched: ${this.stats.mismatched}`);
    if (this.stats.errors > 0) {
      console.log(`   ❌ Errors: ${this.stats.errors}`);
    }
    
    console.log('\nBy VAS Type:');
    for (const [vasType, stats] of Object.entries(this.stats.byVasType)) {
      if (stats.error) {
        console.log(`   ${vasType}: ❌ ${stats.error}`);
      } else {
        console.log(`   ${vasType}: API=${stats.apiCount}, DB=${stats.dbCount}, Missing=${stats.missing}, Extra=${stats.extra}, Mismatched=${stats.mismatched}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    if (this.dryRun) {
      console.log('⚠️  DRY RUN - No changes were made');
    } else if (this.stats.errors === 0) {
      console.log('✅ SYNC COMPLETE! All products synced successfully.');
    } else {
      console.log(`⚠️  Sync completed with ${this.stats.errors} error(s)`);
    }
    console.log('='.repeat(80) + '\n');
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new MobileMartCompareAndSync();
  sync.run().catch(console.error);
}

module.exports = MobileMartCompareAndSync;

