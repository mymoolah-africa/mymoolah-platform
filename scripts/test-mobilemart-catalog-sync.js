#!/usr/bin/env node
/**
 * Test MobileMart Catalog Sync Implementation
 * 
 * Tests the sweepMobileMartCatalog() method implementation
 * in the CatalogSynchronizationService
 * 
 * Usage: node scripts/test-mobilemart-catalog-sync.js
 */

require('dotenv').config();
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL from db-connection-helper before loading models
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');
const { Supplier } = db;
const CatalogSynchronizationService = require('../services/catalogSynchronizationService');

async function testMobileMartCatalogSync() {
  console.log('🧪 Testing MobileMart Catalog Sync Implementation\n');
  console.log('='.repeat(80));
  
  let syncService;
  
  try {
    // Test database connection (using db-connection-helper config)
    console.log('🔌 Testing database connection via db-connection-helper...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Get MobileMart supplier
    console.log('🔍 Looking up MobileMart supplier...');
    const supplier = await Supplier.findOne({ 
      where: { code: 'MOBILEMART' }
    });
    
    if (!supplier) {
      throw new Error('MobileMart supplier not found in database');
    }
    
    console.log(`✅ MobileMart Supplier found: ID ${supplier.id}, Name: ${supplier.name}\n`);
    
    // Create sync service instance
    console.log('📦 Creating CatalogSynchronizationService instance...');
    syncService = new CatalogSynchronizationService();
    console.log('✅ Service instance created\n');
    
    // Test the sweepMobileMartCatalog method
    console.log('🔄 Testing sweepMobileMartCatalog() method...');
    console.log('='.repeat(80));
    
    await syncService.sweepMobileMartCatalog(supplier);
    
    console.log('='.repeat(80));
    console.log('\n✅ Test completed successfully!\n');
    
    // Show sync stats
    console.log('📊 Sync Statistics:');
    console.log(`   Total Products: ${syncService.syncStats.totalProducts}`);
    console.log(`   New Products: ${syncService.syncStats.newProducts}`);
    console.log(`   Updated Products: ${syncService.syncStats.updatedProducts}`);
    console.log(`   Decommissioned Products: ${syncService.syncStats.decommissionedProducts}`);
    console.log(`   Errors: ${syncService.syncStats.errors}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    await closeAll();
    process.exit(0);
  }
}

// Run test
testMobileMartCatalogSync();

