'use strict';

/**
 * Migration: Create MobileMart Float Account
 * 
 * This migration creates the MobileMart supplier float account if it doesn't exist.
 * MobileMart is a VAS provider and should have a float account for banking-grade
 * settlement compliance.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Creating MobileMart Float Account...');

    const { SupplierFloat } = require('../models');

    // Check if MobileMart float account already exists
    const existingFloat = await SupplierFloat.findOne({
      where: { supplierId: 'mobilemart' }
    });

    if (!existingFloat) {
      const LEDGER_ACCOUNT_MOBILEMART_FLOAT = process.env.LEDGER_ACCOUNT_MOBILEMART_FLOAT || '1200-10-05';
      
      await SupplierFloat.create({
        supplierId: 'mobilemart',
        supplierName: 'MobileMart',
        floatAccountNumber: 'MM_FLOAT_001',
        floatAccountName: 'MobileMart VAS Float',
        ledgerAccountCode: LEDGER_ACCOUNT_MOBILEMART_FLOAT,
        currentBalance: 60000.00, // R60,000 initial balance
        initialBalance: 60000.00,
        minimumBalance: 12000.00, // R12,000 minimum threshold
        maximumBalance: 120000.00, // R120,000 maximum limit
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: null, // To be configured
        bankCode: null,
        bankName: null,
        accountHolderName: 'MyMoolah Treasury Platform',
        swiftCode: null,
        iban: null,
        metadata: {
          supplierType: 'vas_provider',
          commissionRate: 0.35,
          settlementCurrency: 'ZAR',
          secondarySupplier: true,
          createdBy: 'migration_20260115',
          notes: 'Float account for MobileMart VAS operations (airtime, data, vouchers, bill payments)'
        }
      });

      console.log('✅ Created MobileMart Float Account');
      console.log('   Account Number: MM_FLOAT_001');
      console.log('   Ledger Account Code: ' + LEDGER_ACCOUNT_MOBILEMART_FLOAT);
      console.log('   Initial Balance: R60,000.00');
    } else {
      // Update existing account with ledger code if missing
      if (!existingFloat.ledgerAccountCode) {
        const LEDGER_ACCOUNT_MOBILEMART_FLOAT = process.env.LEDGER_ACCOUNT_MOBILEMART_FLOAT || '1200-10-05';
        await existingFloat.update({ ledgerAccountCode: LEDGER_ACCOUNT_MOBILEMART_FLOAT });
        console.log('✅ Updated existing MobileMart Float Account with ledger code: ' + LEDGER_ACCOUNT_MOBILEMART_FLOAT);
      } else {
        console.log('ℹ️  MobileMart Float Account already exists with ledger code: ' + existingFloat.ledgerAccountCode);
      }
    }

    console.log('✅ MobileMart Float Account setup completed');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back MobileMart Float Account creation...');

    const { SupplierFloat } = require('../models');

    const mobilemartFloat = await SupplierFloat.findOne({
      where: { supplierId: 'mobilemart' }
    });

    if (mobilemartFloat) {
      // Only delete if balance is zero (safety check)
      const balance = parseFloat(mobilemartFloat.currentBalance || 0);
      if (balance === 0) {
        await mobilemartFloat.destroy();
        console.log('✅ Deleted MobileMart Float Account (balance was zero)');
      } else {
        console.log('⚠️  Cannot delete MobileMart Float Account - balance is not zero: R' + balance.toFixed(2));
        console.log('   Account preserved for safety');
      }
    } else {
      console.log('ℹ️  MobileMart Float Account does not exist, nothing to delete');
    }
  }
};
