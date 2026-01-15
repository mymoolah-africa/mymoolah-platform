'use strict';

/**
 * Migration: Add EasyPay Cash-out @ EasyPay Feature
 *
 * This migration adds support for EasyPay Cash-out vouchers:
 * - Adds new ENUM values: 'easypay_cashout', 'easypay_cashout_active'
 * - Creates EasyPay Cash-out Float account (separate from Top-up Float)
 * - Sets up banking-grade float account structure for cash-out operations
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting EasyPay Cash-out @ EasyPay setup...');

    // Step 1: Add new voucher types to ENUM
    console.log('📝 Adding new voucher types to ENUM...');
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_vouchers_voucherType" ADD VALUE IF NOT EXISTS 'easypay_cashout';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_vouchers_voucherType" ADD VALUE IF NOT EXISTS 'easypay_cashout_active';
    `);

    console.log('✅ Added easypay_cashout and easypay_cashout_active to voucherType ENUM');

    // Step 2: Create EasyPay Cash-out Float Account
    console.log('💰 Creating EasyPay Cash-out Float Account...');
    
    const { SupplierFloat } = require('../models');
    
    // Check if EasyPay Cash-out Float already exists
    const existingFloat = await SupplierFloat.findOne({
      where: { supplierId: 'easypay_cashout' }
    });

    if (!existingFloat) {
      await SupplierFloat.create({
        supplierId: 'easypay_cashout',
        supplierName: 'EasyPay Cash-out',
        floatAccountNumber: 'EASYPAY_CASHOUT_FLOAT_001',
        floatAccountName: 'EasyPay Cash-out Float Account',
        currentBalance: 50000.00, // R50,000 initial balance (dummy amount for testing)
        initialBalance: 50000.00, // R50,000 initial balance
        minimumBalance: 10000.00, // R10,000 minimum threshold
        maximumBalance: null, // No maximum limit
        settlementPeriod: 'real_time',
        settlementMethod: 'automatic',
        status: 'active',
        isActive: true,
        bankAccountNumber: null, // To be configured
        bankCode: null, // To be configured
        bankName: null, // To be configured
        accountHolderName: 'MyMoolah Treasury Platform',
        swiftCode: null,
        iban: null,
        currency: 'ZAR',
        metadata: {
          purpose: 'EasyPay Cash-out operations',
          operationType: 'cashout',
          createdBy: 'migration_20260116',
          notes: 'Separate float account for EasyPay cash-out operations (user receives cash at EasyPay store)'
        }
      });

      console.log('✅ Created EasyPay Cash-out Float Account (EASYPAY_CASHOUT_FLOAT_001)');
    } else {
      console.log('ℹ️  EasyPay Cash-out Float Account already exists, skipping creation');
    }

    // Step 3: Verify EasyPay Top-up Float exists (for reference)
    const topupFloat = await SupplierFloat.findOne({
      where: { supplierId: 'easypay_topup' }
    });

    if (!topupFloat) {
      console.log('⚠️  Warning: EasyPay Top-up Float Account not found. Consider creating it separately.');
    } else {
      console.log('✅ Verified EasyPay Top-up Float Account exists');
    }

    console.log('✅ EasyPay Cash-out @ EasyPay setup completed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting EasyPay Cash-out @ EasyPay setup...');

    // Remove EasyPay Cash-out Float Account
    const { SupplierFloat } = require('../models');
    const cashoutFloat = await SupplierFloat.findOne({
      where: { supplierId: 'easypay_cashout' }
    });

    if (cashoutFloat) {
      // Only delete if balance is zero (safety check)
      if (parseFloat(cashoutFloat.currentBalance) === 0) {
        await cashoutFloat.destroy();
        console.log('✅ Removed EasyPay Cash-out Float Account');
      } else {
        console.log('⚠️  Warning: Cannot remove EasyPay Cash-out Float Account - balance is not zero');
        console.log(`   Current balance: R${cashoutFloat.currentBalance}`);
      }
    }

    // Note: ENUM values cannot be removed in PostgreSQL, so we leave them
    console.log('ℹ️  Note: ENUM values (easypay_cashout, easypay_cashout_active) remain in database');

    console.log('✅ Reversion completed successfully!');
  }
};
