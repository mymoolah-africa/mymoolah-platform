#!/usr/bin/env node
/**
 * Sync MobileMart Products to ProductVariants
 * 
 * Fetches products from MobileMart Fulcrum API and syncs them
 * to the normalized product_variants schema.
 * 
 * Usage:
 *   node scripts/sync-mobilemart-to-product-variants.js
 * 
 * Environment:
 *   - Dev: Uses dev database (port 6543)
 *   - Staging: Uses staging database (port 5434)
 * 
 * @date 2025-12-02
 */

const db = require('../models');
const { Product, ProductVariant, Supplier } = db;
const MobileMartAuthService = require('../services/mobilemartAuthService');

// VAS types to sync
const VAS_TYPES = ['airtime', 'data', 'utility', 'voucher', 'bill-payment'];

class MobileMartProductSync {
  constructor() {
    this.authService = new MobileMartAuthService();
    this.stats = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      byVasType: {}
    };
  }

  /**
   * Map MobileMart product to ProductVariant schema
   */
  mapToProductVariant(mmProduct, vasType, supplierId, productId) {
    // Determine transaction type
    const transactionType = this.getTransactionType(vasType, mmProduct);
    
    return {
      productId: productId,
      supplierId: supplierId,
      supplierProductId: mmProduct.merchantProductId,
      
      // VAS fields
      vasType: vasType,
      transactionType: transactionType,
      networkType: 'local',
      provider: mmProduct.contentCreator || mmProduct.provider || 'Unknown',
      
      // Amount constraints
      minAmount: mmProduct.fixedAmount ? mmProduct.amount * 100 : (mmProduct.minimumAmount || 200) * 100,
      maxAmount: mmProduct.fixedAmount ? mmProduct.amount * 100 : (mmProduct.maximumAmount || 100000) * 100,
      predefinedAmounts: mmProduct.fixedAmount ? [mmProduct.amount * 100] : null,
      
      // Commission and fees (MobileMart typically 2-3%)
      commission: 2.5, // Default commission, update from contract
      fixedFee: 0,
      
      // Promotional
      isPromotional: false,
      promotionalDiscount: null,
      
      // Priority and status
      priority: 2, // MobileMart is secondary supplier
      status: 'active',
      
      // Denominations
      denominations: mmProduct.fixedAmount ? [mmProduct.amount * 100] : null,
      
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
        synced_at: new Date().toISOString()
      },
      
      // Tracking
      lastSyncedAt: new Date(),
      sortOrder: mmProduct.pinned ? 1 : 2,
      isPreferred: mmProduct.pinned
    };
  }

  /**
   * Determine transaction type based on VAS type
   */
  getTransactionType(vasType, product) {
    const mapping = {
      'airtime': product.pinned ? 'voucher' : 'topup',
      'data': product.pinned ? 'voucher' : 'topup',
      'utility': 'direct',
      'voucher': 'voucher',
      'bill-payment': 'direct'
    };
    return mapping[vasType] || 'topup';
  }

  /**
   * Sync products for a specific VAS type
   */
  async syncVasType(vasType, supplier) {
    console.log(`\n📱 Syncing ${vasType} products...`);
    
    try {
      // Fetch products from MobileMart API
      const normalizedVasType = this.normalizeVasType(vasType);
      const response = await this.authService.makeAuthenticatedRequest(
        'GET',
        `/${normalizedVasType}/products`
      );
      
      const products = response.products || response || [];
      console.log(`  Found ${products.length} ${vasType} products from MobileMart API`);
      
      this.stats.byVasType[vasType] = {
        fetched: products.length,
        created: 0,
        updated: 0,
        failed: 0
      };
      
      // Sync each product
      for (const mmProduct of products) {
        try {
          // Create or get base product
          const [product] = await Product.findOrCreate({
            where: {
              name: mmProduct.productName,
              type: vasType
            },
            defaults: {
              name: mmProduct.productName,
              type: vasType,
              supplierProductId: mmProduct.merchantProductId,
              status: 'active',
              denominations: mmProduct.fixedAmount ? [mmProduct.amount * 100] : [],
              isFeatured: false,
              sortOrder: 0,
              metadata: {
                source: 'mobilemart',
                synced: true
              }
            }
          });
          
          // Map to ProductVariant
          const variantData = this.mapToProductVariant(mmProduct, vasType, supplier.id, product.id);
          
          // Create or update ProductVariant
          const [productVariant, created] = await ProductVariant.findOrCreate({
            where: {
              productId: product.id,
              supplierId: supplier.id,
              supplierProductId: mmProduct.merchantProductId
            },
            defaults: variantData
          });
          
          if (!created) {
            await productVariant.update(variantData);
            this.stats.updated++;
            this.stats.byVasType[vasType].updated++;
          } else {
            this.stats.created++;
            this.stats.byVasType[vasType].created++;
          }
          
          this.stats.total++;
          
        } catch (error) {
          console.error(`  ❌ Failed to sync ${mmProduct.productName}:`, error.message);
          this.stats.failed++;
          this.stats.byVasType[vasType].failed++;
        }
      }
      
      console.log(`  ✅ ${vasType}: ${this.stats.byVasType[vasType].created} created, ${this.stats.byVasType[vasType].updated} updated`);
      
    } catch (error) {
      console.error(`  ❌ Failed to fetch ${vasType} products:`, error.message);
      this.stats.byVasType[vasType] = {
        fetched: 0,
        created: 0,
        updated: 0,
        failed: 1,
        error: error.message
      };
    }
  }

  /**
   * Normalize VAS type to match MobileMart API
   */
  normalizeVasType(vasType) {
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

  /**
   * Main sync function
   */
  async sync() {
    console.log('🌱 MobileMart Product Sync to ProductVariants\n');
    console.log('='.repeat(60));
    
    try {
      // Test database connection
      await db.sequelize.authenticate();
      console.log('✅ Database connection established');
      
      // Get or create MobileMart supplier
      const [supplier] = await Supplier.findOrCreate({
        where: { code: 'MOBILEMART' },
        defaults: {
          name: 'MobileMart',
          code: 'MOBILEMART',
          isActive: true,
          apiEndpoint: process.env.MOBILEMART_API_URL || 'https://fulcrumswitch.com',
          config: {
            type: 'mobilemart',
            hasOAuth: true,
            priority: 2
          }
        }
      });
      console.log(`✅ MobileMart Supplier ID: ${supplier.id}`);
      
      // Test MobileMart authentication
      const health = await this.authService.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`MobileMart API unhealthy: ${health.error}`);
      }
      console.log('✅ MobileMart API authentication successful\n');
      
      // Sync each VAS type
      for (const vasType of VAS_TYPES) {
        await this.syncVasType(vasType, supplier);
      }
      
      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 SYNC SUMMARY');
      console.log('='.repeat(60));
      console.log(`Total products processed: ${this.stats.total}`);
      console.log(`  - Created: ${this.stats.created}`);
      console.log(`  - Updated: ${this.stats.updated}`);
      console.log(`  - Failed: ${this.stats.failed}`);
      console.log('');
      console.log('By VAS Type:');
      for (const [vasType, stats] of Object.entries(this.stats.byVasType)) {
        console.log(`  ${vasType}:`);
        console.log(`    Fetched: ${stats.fetched}`);
        console.log(`    Created: ${stats.created}`);
        console.log(`    Updated: ${stats.updated}`);
        if (stats.failed > 0) {
          console.log(`    Failed: ${stats.failed}`);
        }
        if (stats.error) {
          console.log(`    Error: ${stats.error}`);
        }
      }
      console.log('='.repeat(60));
      
      // Verify final counts
      const totalVariants = await ProductVariant.count();
      const mmVariants = await ProductVariant.count({ 
        where: { supplierId: supplier.id } 
      });
      
      console.log('\n📈 DATABASE STATE');
      console.log('='.repeat(60));
      console.log(`Total ProductVariants in DB: ${totalVariants}`);
      console.log(`MobileMart variants: ${mmVariants}`);
      console.log('='.repeat(60));
      
      console.log('\n✅ Sync completed successfully!');
      console.log('\n💡 Test with: curl https://staging.mymoolah.africa/api/v1/suppliers/compare/airtime');
      
    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      await db.sequelize.close();
      process.exit(0);
    }
  }
}

// Run sync
const syncService = new MobileMartProductSync();
syncService.sync();
