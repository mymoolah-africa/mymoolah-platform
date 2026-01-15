'use strict';

/**
 * Migration: Check and Fund EasyPay Top-up Float Account
 * 
 * This migration:
 * 1. Checks if EasyPay Top-up float account exists
 * 2. If it doesn't exist, creates it with R50,000
 * 3. If it exists but balance is 0, funds it with R50,000
 * 
 * Date: 2026-01-16
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔍 Checking EasyPay Top-up Float Account...\n');

    const { SupplierFloat } = require('../models');

    try {
      // Find the EasyPay Top-up float account
      let topupFloat = await SupplierFloat.findOne({
        where: { supplierId: 'easypay_topup' }
      });

      if (!topupFloat) {
        console.log('⚠️  EasyPay Top-up Float Account not found. Creating it...\n');
        
        // Create the float account with R50,000
        const LEDGER_ACCOUNT_EASYPAY_TOPUP_FLOAT = process.env.LEDGER_ACCOUNT_EASYPAY_TOPUP_FLOAT || '1200-10-02';
        topupFloat = await SupplierFloat.create({
          supplierId: 'easypay_topup',
          supplierName: 'EasyPay Top-up',
          floatAccountNumber: 'EASYPAY_TOPUP_FLOAT_001',
          floatAccountName: 'EasyPay Top-up Float Account',
          ledgerAccountCode: LEDGER_ACCOUNT_EASYPAY_TOPUP_FLOAT,
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
            createdBy: 'migration_20260116',
            notes: 'Float account for EasyPay top-up operations (user pays at EasyPay store, wallet credited)'
          }
        });
        
        console.log('✅ Created EasyPay Top-up Float Account');
        console.log(`   Account Number: ${topupFloat.floatAccountNumber}`);
        console.log(`   Initial Balance: R${topupFloat.currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        console.log('✅ EasyPay Top-up Float Account found');
        console.log(`   Account Number: ${topupFloat.floatAccountNumber}`);
        const currentBalance = parseFloat(topupFloat.currentBalance);
        console.log(`   Current Balance: R${currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        
        if (currentBalance === 0) {
          console.log('\n💰 Current balance is R0.00. Funding with R50,000...\n');
          
          // Update balance to R50,000
          topupFloat.currentBalance = 50000.00;
          if (parseFloat(topupFloat.initialBalance) === 0) {
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

      console.log('\n✅ EasyPay Top-up Float Account check and funding completed successfully!');
    } catch (error) {
      console.error('❌ Error checking/funding EasyPay Top-up Float:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This migration is idempotent and safe - no rollback needed
    // We don't want to delete the float account or reduce its balance
    console.log('ℹ️  Rollback: EasyPay Top-up Float Account check/funding migration has no rollback (idempotent operation)');
  }
};
