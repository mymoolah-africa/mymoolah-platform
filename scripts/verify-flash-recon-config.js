#!/usr/bin/env node
/**
 * Verify Flash Reconciliation Configuration
 * 
 * Verifies that Flash supplier configuration was added to recon_supplier_configs table
 * 
 * Usage:
 *   node scripts/verify-flash-recon-config.js
 */

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL for Sequelize models
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');

async function verifyFlashConfig() {
  console.log('🔍 Verifying Flash Reconciliation Configuration...\n');
  console.log('='.repeat(60));

  try {
    // Check if Flash config exists
    const flash = await db.ReconSupplierConfig.findOne({
      where: { supplier_code: 'FLASH' }
    });

    if (!flash) {
      console.log('❌ Flash reconciliation config NOT FOUND');
      console.log('   Migration may not have run successfully.');
      process.exit(1);
    }

    console.log('✅ Flash reconciliation config found!\n');
    console.log('📋 Configuration Details:');
    console.log(`   Supplier Name: ${flash.supplier_name}`);
    console.log(`   Supplier Code: ${flash.supplier_code}`);
    console.log(`   Adapter Class: ${flash.adapter_class}`);
    console.log(`   File Format: ${flash.file_format}`);
    console.log(`   Delimiter: ${flash.delimiter}`);
    console.log(`   SFTP Host: ${flash.sftp_host}`);
    console.log(`   SFTP Port: ${flash.sftp_port}`);
    console.log(`   SFTP Username: ${flash.sftp_username}`);
    console.log(`   SFTP Path: ${flash.sftp_path}`);
    console.log(`   File Pattern: ${flash.file_name_pattern}`);
    console.log(`   Is Active: ${flash.is_active ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   Timezone: ${flash.timezone || 'Not set'}`);
    
    // Check matching rules
    if (flash.matching_rules) {
      const rules = typeof flash.matching_rules === 'string' 
        ? JSON.parse(flash.matching_rules) 
        : flash.matching_rules;
      console.log(`\n   Matching Rules:`);
      console.log(`     Primary: ${rules.primary?.join(', ') || 'Not set'}`);
      console.log(`     Fuzzy Match: ${rules.fuzzy_match?.enabled ? 'Enabled' : 'Disabled'}`);
    }

    // Check commission settings
    if (flash.commission_calculation) {
      const commission = typeof flash.commission_calculation === 'string'
        ? JSON.parse(flash.commission_calculation)
        : flash.commission_calculation;
      console.log(`\n   Commission Settings:`);
      console.log(`     Method: ${commission.method || 'Not set'}`);
      console.log(`     VAT Inclusive: ${commission.vat_inclusive ? 'Yes' : 'No'}`);
      console.log(`     VAT Rate: ${commission.vat_rate || 'Not set'}`);
    }

    console.log('\n✅ Flash reconciliation configuration verified successfully!');
    console.log('   Ready for Flash reconciliation file processing.');

  } catch (error) {
    console.error('❌ Error verifying Flash config:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closeAll();
  }
}

// Run verification
verifyFlashConfig().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
