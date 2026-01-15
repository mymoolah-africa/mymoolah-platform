#!/usr/bin/env node
/**
 * Check and Fund EasyPay Top-up Float Account
 * 
 * This script:
 * 1. Checks the current balance of the EasyPay Top-up float account
 * 2. If balance is 0 or account doesn't exist, creates/updates it with R50,000
 */

require('dotenv').config();

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL for Sequelize models
process.env.DATABASE_URL = getUATDatabaseURL();

const { SupplierFloat } = require('../models');

async function checkAndFundTopupFloat() {
  try {
    console.log('🔍 Checking EasyPay Top-up Float Account...\n');

    // Find the EasyPay Top-up float account
    let topupFloat = await SupplierFloat.findOne({
      where: { supplierId: 'easypay_topup' }
    });

    if (!topupFloat) {
      console.log('⚠️  EasyPay Top-up Float Account not found. Creating it...\n');
      
      // Create the float account with R50,000
      topupFloat = await SupplierFloat.create({
        supplierId: 'easypay_topup',
        supplierName: 'EasyPay Top-up',
        floatAccountNumber: 'EASYPAY_TOPUP_FLOAT_001',
        floatAccountName: 'EasyPay Top-up Float Account',
        currentBalance: 50000.00,
        initialBalance: 50000.00,
        minimumBalance: 10000.00,
        maximumBalance: null,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: null,
        bankCode: null,
        bankName: null,
        accountHolderName: 'MyMoolah Treasury Platform',
        swiftCode: null,
        iban: null,
        currency: 'ZAR',
        metadata: {
          purpose: 'EasyPay Top-up operations',
          operationType: 'topup',
          createdBy: 'script_check_and_fund',
          notes: 'Float account for EasyPay top-up operations (user pays at EasyPay store, wallet credited)'
        }
      });
      
      console.log('✅ Created EasyPay Top-up Float Account');
      console.log(`   Account Number: ${topupFloat.floatAccountNumber}`);
      console.log(`   Initial Balance: R${topupFloat.currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } else {
      console.log('✅ EasyPay Top-up Float Account found');
      console.log(`   Account Number: ${topupFloat.floatAccountNumber}`);
      console.log(`   Current Balance: R${parseFloat(topupFloat.currentBalance).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      
      const currentBalance = parseFloat(topupFloat.currentBalance);
      
      if (currentBalance === 0) {
        console.log('\n💰 Current balance is R0.00. Funding with R50,000...\n');
        
        // Update balance to R50,000
        topupFloat.currentBalance = 50000.00;
        if (topupFloat.initialBalance === 0) {
          topupFloat.initialBalance = 50000.00;
        }
        await topupFloat.save();
        
        console.log('✅ EasyPay Top-up Float Account funded successfully');
        console.log(`   New Balance: R${topupFloat.currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        console.log(`\n✅ Float account already has balance: R${currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log('   No funding needed.');
      }
    }

    console.log('\n✅ Operation completed successfully!');
    
    // Close database connections
    await closeAll();
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
checkAndFundTopupFloat();
