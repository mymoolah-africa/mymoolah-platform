'use strict';

/**
 * Migration: Seed Ledger Accounts for Supplier Floats
 * 
 * This migration creates ledger accounts for all supplier float accounts
 * following the chart of accounts structure:
 * - 1200-10-XX: Supplier Float Accounts (Asset accounts)
 * 
 * These accounts are required for banking-grade double-entry accounting.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Seeding ledger accounts for supplier floats...');

    const { LedgerAccount } = require('../models');

    // Define supplier float ledger accounts
    const floatAccounts = [
      {
        code: '1200-10-01',
        name: 'Zapper Float Account',
        type: 'Asset',
        normalSide: 'debit'
      },
      {
        code: '1200-10-02',
        name: 'EasyPay Top-up Float Account',
        type: 'Asset',
        normalSide: 'debit'
      },
      {
        code: '1200-10-03',
        name: 'EasyPay Cash-out Float Account',
        type: 'Asset',
        normalSide: 'debit'
      },
      {
        code: '1200-10-04',
        name: 'Flash Float Account',
        type: 'Asset',
        normalSide: 'debit'
      },
      {
        code: '1200-10-05',
        name: 'MobileMart Float Account',
        type: 'Asset',
        normalSide: 'debit'
      },
      {
        code: '1200-10-06',
        name: 'DT Mercury Float Account',
        type: 'Asset',
        normalSide: 'debit'
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const account of floatAccounts) {
      try {
        const existing = await LedgerAccount.findOne({ where: { code: account.code } });
        
        if (!existing) {
          await LedgerAccount.create(account);
          console.log(`✅ Created ledger account: ${account.code} - ${account.name}`);
          createdCount++;
        } else {
          console.log(`ℹ️  Ledger account already exists: ${account.code} - ${account.name}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error creating ledger account ${account.code}:`, error.message);
        // Continue with other accounts even if one fails
      }
    }

    console.log(`\n📊 Summary: ${createdCount} created, ${skippedCount} already existed`);
    console.log('✅ Supplier float ledger accounts seeded successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Removing supplier float ledger accounts...');

    const { LedgerAccount } = require('../models');

    const floatAccountCodes = [
      '1200-10-01', // Zapper
      '1200-10-02', // EasyPay Top-up
      '1200-10-03', // EasyPay Cash-out
      '1200-10-04', // Flash
      '1200-10-05', // MobileMart
      '1200-10-06'  // DT Mercury
    ];

    let deletedCount = 0;

    for (const code of floatAccountCodes) {
      try {
        const account = await LedgerAccount.findOne({ where: { code } });
        if (account) {
          await account.destroy();
          console.log(`✅ Deleted ledger account: ${code}`);
          deletedCount++;
        } else {
          console.log(`ℹ️  Ledger account not found: ${code}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ledger account ${code}:`, error.message);
      }
    }

    console.log(`\n📊 Summary: ${deletedCount} deleted`);
    console.log('✅ Supplier float ledger accounts removed');
  }
};
