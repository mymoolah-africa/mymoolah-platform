#!/usr/bin/env node
/**
 * Verify Reconciliation SFTP Configurations
 * 
 * Verifies that both MobileMart and Flash supplier configurations
 * are using the correct static IP (34.35.137.166)
 * 
 * Usage:
 *   node scripts/verify-recon-sftp-configs.js
 */

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL for Sequelize models
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');

const EXPECTED_STATIC_IP = '34.35.137.166';
const OLD_EPHEMERAL_IP = '34.35.168.101';

async function verifySFTPConfigs() {
  console.log('🔍 Verifying Reconciliation SFTP Configurations...\n');
  console.log('='.repeat(60));

  try {
    // Get all supplier configs
    const configs = await db.ReconSupplierConfig.findAll({
      where: {
        supplier_code: ['MMART', 'FLASH']
      },
      order: [['supplier_code', 'ASC']]
    });

    if (configs.length === 0) {
      console.log('❌ No reconciliation supplier configs found');
      process.exit(1);
    }

    let allCorrect = true;

    for (const config of configs) {
      const supplierName = config.supplier_name;
      const supplierCode = config.supplier_code;
      const currentIP = config.sftp_host;
      const isCorrect = currentIP === EXPECTED_STATIC_IP;

      console.log(`\n📋 ${supplierName} (${supplierCode}):`);
      
      if (isCorrect) {
        console.log(`   ✅ SFTP Host: ${currentIP} (Static IP)`);
      } else {
        console.log(`   ❌ SFTP Host: ${currentIP}`);
        if (currentIP === OLD_EPHEMERAL_IP) {
          console.log(`   ⚠️  Still using old ephemeral IP! Run migration to update.`);
        } else {
          console.log(`   ⚠️  Unexpected IP address`);
        }
        allCorrect = false;
      }

      console.log(`   SFTP Port: ${config.sftp_port}`);
      console.log(`   SFTP Username: ${config.sftp_username}`);
      console.log(`   SFTP Path: ${config.sftp_path}`);
      console.log(`   Is Active: ${config.is_active ? 'Yes ✅' : 'No ❌'}`);
    }

    console.log('\n' + '='.repeat(60));
    
    if (allCorrect) {
      console.log('✅ All SFTP configurations are using the static IP!');
      console.log(`   Static IP: ${EXPECTED_STATIC_IP}`);
      console.log('   Both MobileMart and Flash are configured correctly.');
    } else {
      console.log('❌ Some SFTP configurations need updating!');
      console.log(`   Expected IP: ${EXPECTED_STATIC_IP}`);
      console.log('   Run migration: ./scripts/run-migrations-master.sh uat');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error verifying SFTP configs:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closeAll();
  }
}

// Run verification
verifySFTPConfigs().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
