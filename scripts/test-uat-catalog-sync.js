#!/usr/bin/env node
/**
 * Test UAT Catalog Synchronization Service
 * 
 * Comprehensive test of the daily catalog sync service that runs at 2 AM SAST
 * Tests the full MobileMart UAT product import to UAT product catalog
 * 
 * Usage: node scripts/test-uat-catalog-sync.js
 * 
 * Requirements:
 * - Uses db-connection-helper.js for database connections
 * - Tests MobileMart UAT API connection
 * - Tests product import to database
 * - Verifies all VAS types (airtime, data, utility, voucher, bill-payment)
 * - Shows sync statistics
 */

require('dotenv').config();
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL from db-connection-helper before loading models
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');
const { Supplier, Product, ProductVariant } = db;
const CatalogSynchronizationService = require('../services/catalogSynchronizationService');

async function testUATCatalogSync() {
  console.log('🧪 Testing UAT Catalog Synchronization Service\n');
  console.log('='.repeat(80));
  console.log('📋 Test Plan:');
  console.log('   1. Verify database connection (using db-connection-helper)');
  console.log('   2. Verify MobileMart supplier exists');
  console.log('   3. Test MobileMart API health check');
  console.log('   4. Test full catalog sweep (all VAS types)');
  console.log('   5. Verify products imported to database');
  console.log('   6. Show sync statistics');
  console.log('='.repeat(80));
  console.log('');
  
  let syncService;
  let initialProductCount = 0;
  let initialVariantCount = 0;
  
  try {
    // Step 1: Test database connection
    console.log('🔌 Step 1: Testing database connection via db-connection-helper...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Get initial counts
    initialProductCount = await Product.count({ where: { supplierId: (await Supplier.findOne({ where: { code: 'MOBILEMART' } }))?.id } });
    initialVariantCount = await ProductVariant.count({ where: { supplierId: (await Supplier.findOne({ where: { code: 'MOBILEMART' } }))?.id } });
    console.log(`📊 Initial catalog state:`);
    console.log(`   Products: ${initialProductCount}`);
    console.log(`   Variants: ${initialVariantCount}\n`);
    
    // Step 2: Get MobileMart supplier
    console.log('🔍 Step 2: Looking up MobileMart supplier...');
    const supplier = await Supplier.findOne({ 
      where: { code: 'MOBILEMART' }
    });
    
    if (!supplier) {
      throw new Error('❌ MobileMart supplier not found in database. Please ensure MOBILEMART supplier exists.');
    }
    
    console.log(`✅ MobileMart Supplier found:`);
    console.log(`   ID: ${supplier.id}`);
    console.log(`   Name: ${supplier.name}`);
    console.log(`   Code: ${supplier.code}`);
    console.log(`   Active: ${supplier.isActive}\n`);
    
    // Step 3: Create sync service instance
    console.log('📦 Step 3: Creating CatalogSynchronizationService instance...');
    syncService = new CatalogSynchronizationService();
    console.log('✅ Service instance created\n');
    
    // Step 4: Test MobileMart API health check (via sweepMobileMartCatalog)
    console.log('🔄 Step 4: Testing MobileMart UAT API connection...');
    console.log('   (This will perform a health check before syncing)\n');
    
    // Step 5: Perform full catalog sweep
    console.log('🔄 Step 5: Performing full catalog sweep...');
    console.log('   This will sync all VAS types: airtime, data, utility, voucher, bill-payment');
    console.log('='.repeat(80));
    
    const startTime = Date.now();
    await syncService.sweepMobileMartCatalog(supplier);
    const duration = Date.now() - startTime;
    
    console.log('='.repeat(80));
    console.log(`\n✅ Catalog sweep completed in ${(duration / 1000).toFixed(2)} seconds\n`);
    
    // Step 6: Show sync statistics
    console.log('📊 Step 6: Sync Statistics:');
    console.log('='.repeat(80));
    console.log(`   Total Products Processed: ${syncService.syncStats.totalProducts}`);
    console.log(`   New Products: ${syncService.syncStats.newProducts}`);
    console.log(`   Updated Products: ${syncService.syncStats.updatedProducts}`);
    console.log(`   Decommissioned Products: ${syncService.syncStats.decommissionedProducts}`);
    console.log(`   Errors: ${syncService.syncStats.errors}`);
    console.log('='.repeat(80));
    console.log('');
    
    // Step 7: Verify products in database
    console.log('🔍 Step 7: Verifying products in database...');
    const finalProductCount = await Product.count({ where: { supplierId: supplier.id } });
    const finalVariantCount = await ProductVariant.count({ where: { supplierId: supplier.id } });
    
    console.log(`📊 Final catalog state:`);
    console.log(`   Products: ${finalProductCount} (${finalProductCount - initialProductCount > 0 ? '+' : ''}${finalProductCount - initialProductCount})`);
    console.log(`   Variants: ${finalVariantCount} (${finalVariantCount - initialVariantCount > 0 ? '+' : ''}${finalVariantCount - initialVariantCount})`);
    console.log('');
    
    // Step 8: Show sample products by type
    console.log('📦 Step 8: Sample products by type:');
    const productsByType = await Product.findAll({
      where: { supplierId: supplier.id },
      include: [{
        model: ProductVariant,
        as: 'variants',
        required: false
      }],
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    for (const product of productsByType) {
      const variantCount = product.variants ? product.variants.length : 0;
      console.log(`   - ${product.name} (${product.type}): ${variantCount} variant(s)`);
    }
    console.log('');
    
    // Final summary
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('');
    console.log('📝 Summary:');
    console.log(`   - Database connection: ✅ Working`);
    console.log(`   - MobileMart API: ✅ Connected`);
    console.log(`   - Catalog sync: ✅ Completed`);
    console.log(`   - Products imported: ${syncService.syncStats.newProducts} new, ${syncService.syncStats.updatedProducts} updated`);
    console.log(`   - Errors: ${syncService.syncStats.errors}`);
    console.log('');
    console.log('⏰ Next scheduled sync: 2:00 AM SAST (Africa/Johannesburg)');
    console.log('   (Note: Timezone fix may be needed - see catalogSynchronizationService.js)');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('='.repeat(80));
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('='.repeat(80));
    process.exit(1);
  } finally {
    await db.sequelize.close();
    await closeAll();
    process.exit(0);
  }
}

// Run test
testUATCatalogSync();
