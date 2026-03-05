#!/usr/bin/env node
/**
 * Check All Supplier Float Account Balances
 * 
 * This script displays the current balance of all supplier float accounts
 * in the system, providing a comprehensive overview of float account status.
 * 
 * Usage:
 *   node scripts/check-all-supplier-float-balances.js         # UAT
 *   node scripts/check-all-supplier-float-balances.js --staging   # Staging
 */

require('dotenv').config();

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, getStagingDatabaseURL, closeAll } = require('./db-connection-helper');

const isStaging = process.argv.includes('--staging');
process.env.DATABASE_URL = isStaging ? getStagingDatabaseURL() : getUATDatabaseURL();

const { SupplierFloat } = require('../models');

async function checkAllFloatBalances() {
  try {
    const target = isStaging ? 'Staging' : 'UAT';
    console.log(`🔍 Checking All Supplier Float Account Balances (${target})...\n`);
    console.log('='.repeat(80));

    // Get all supplier float accounts
    const floatAccounts = await SupplierFloat.findAll({
      order: [['supplierName', 'ASC']],
      attributes: [
        'id',
        'supplierId',
        'supplierName',
        'floatAccountNumber',
        'floatAccountName',
        'currentBalance',
        'initialBalance',
        'minimumBalance',
        'maximumBalance',
        'settlementMethod',
        'settlementPeriod',
        'status',
        'isActive'
      ]
    });

    if (floatAccounts.length === 0) {
      console.log('⚠️  No supplier float accounts found in the database.\n');
      await closeAll();
      process.exit(0);
    }

    console.log(`\n📊 Found ${floatAccounts.length} supplier float account(s):\n`);

    // Calculate totals
    let totalBalance = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    // Display each float account
    floatAccounts.forEach((float, index) => {
      const balance = parseFloat(float.currentBalance || 0);
      const initialBalance = parseFloat(float.initialBalance || 0);
      const minBalance = parseFloat(float.minimumBalance || 0);
      const maxBalance = float.maximumBalance ? parseFloat(float.maximumBalance) : null;
      
      totalBalance += balance;
      if (float.isActive && float.status === 'active') {
        activeCount++;
      } else {
        inactiveCount++;
      }

      const statusIcon = float.isActive && float.status === 'active' ? '✅' : '⚠️';
      const statusText = float.isActive && float.status === 'active' ? 'Active' : 'Inactive';
      
      console.log(`${index + 1}. ${statusIcon} ${float.supplierName} (${float.supplierId})`);
      console.log(`   Account Number: ${float.floatAccountNumber}`);
      console.log(`   Account Name: ${float.floatAccountName}`);
      console.log(`   Current Balance: R${balance.toLocaleString('en-ZA', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2,
        useGrouping: true
      })}`);
      console.log(`   Initial Balance: R${initialBalance.toLocaleString('en-ZA', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2,
        useGrouping: true
      })}`);
      console.log(`   Minimum Balance: R${minBalance.toLocaleString('en-ZA', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2,
        useGrouping: true
      })}`);
      if (maxBalance !== null) {
        console.log(`   Maximum Balance: R${maxBalance.toLocaleString('en-ZA', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2,
          useGrouping: true
        })}`);
      }
      console.log(`   Settlement Method: ${float.settlementMethod || 'N/A'}`);
      console.log(`   Settlement Period: ${float.settlementPeriod || 'N/A'}`);
      console.log(`   Status: ${statusText}`);
      
      // Check if balance is below minimum threshold
      if (balance < minBalance && float.isActive) {
        console.log(`   ⚠️  WARNING: Balance is below minimum threshold!`);
      }
      
      console.log(''); // Empty line for readability
    });

    // Display summary
    console.log('='.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`   Total Float Accounts: ${floatAccounts.length}`);
    console.log(`   Active Accounts: ${activeCount}`);
    console.log(`   Inactive Accounts: ${inactiveCount}`);
    console.log(`   Total Balance Across All Accounts: R${totalBalance.toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: true
    })}`);
    console.log('');

    // Close database connections
    await closeAll();
    console.log('✅ Operation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    
    // Close database connections on error
    await closeAll().catch(() => {});
    process.exit(1);
  }
}

// Run the script
checkAllFloatBalances();
