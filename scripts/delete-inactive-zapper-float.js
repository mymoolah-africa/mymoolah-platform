#!/usr/bin/env node
/**
 * Delete Inactive Zapper Float Account
 * 
 * This script deletes the inactive duplicate Zapper float account
 * (ZAPPER_FLOAT_1758642801835) from UAT database.
 * 
 * WARNING: This is a destructive operation. Only use in UAT/development.
 * 
 * Usage:
 *   node scripts/delete-inactive-zapper-float.js
 */

require('dotenv').config();

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL for Sequelize models
process.env.DATABASE_URL = getUATDatabaseURL();

const { SupplierFloat } = require('../models');

async function deleteInactiveZapperFloat() {
  try {
    console.log('🔍 Finding inactive duplicate Zapper float account...\n');
    console.log('='.repeat(80));

    // Find the inactive duplicate account
    const duplicateFloat = await SupplierFloat.findOne({
      where: {
        supplierId: 'zapper',
        floatAccountNumber: 'ZAPPER_FLOAT_1758642801835',
        isActive: false
      }
    });

    if (!duplicateFloat) {
      console.log('✅ No inactive duplicate Zapper float account found.');
      console.log('   Either it was already deleted or doesn\'t exist.\n');
      await closeAll();
      process.exit(0);
    }

    // Display account details
    console.log('📋 Found inactive duplicate account:');
    console.log(`   Account Number: ${duplicateFloat.floatAccountNumber}`);
    console.log(`   Account Name: ${duplicateFloat.floatAccountName}`);
    console.log(`   Current Balance: R${parseFloat(duplicateFloat.currentBalance || 0).toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: true
    })}`);
    console.log(`   Status: ${duplicateFloat.status}`);
    console.log(`   Is Active: ${duplicateFloat.isActive}`);
    console.log(`   Created: ${duplicateFloat.createdAt}\n`);

    // Verify balance is zero (should be after consolidation)
    const balance = parseFloat(duplicateFloat.currentBalance || 0);
    if (balance > 0) {
      console.log('⚠️  WARNING: Account still has a balance!');
      console.log(`   Balance: R${balance.toLocaleString('en-ZA', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2,
        useGrouping: true
      })}`);
      console.log('   This should have been transferred during consolidation.');
      console.log('   Proceeding with deletion anyway (UAT only)...\n');
    }

    // Confirm deletion
    console.log('⚠️  This will permanently delete the inactive duplicate account.');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete the account
    await duplicateFloat.destroy();
    
    console.log('✅ Successfully deleted inactive duplicate Zapper float account');
    console.log(`   Deleted: ${duplicateFloat.floatAccountNumber}\n`);

    // Verify deletion
    const verify = await SupplierFloat.findOne({
      where: { floatAccountNumber: 'ZAPPER_FLOAT_1758642801835' }
    });

    if (verify) {
      console.log('⚠️  WARNING: Account still exists after deletion attempt!');
    } else {
      console.log('✅ Verified: Account successfully removed from database\n');
    }

    await closeAll();
    console.log('✅ Operation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    
    await closeAll().catch(() => {});
    process.exit(1);
  }
}

// Run the script
deleteInactiveZapperFloat();
