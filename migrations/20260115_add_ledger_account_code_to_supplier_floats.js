'use strict';

/**
 * Migration: Add ledgerAccountCode to supplier_floats table
 * 
 * This migration adds the ledgerAccountCode field to the supplier_floats table
 * to properly link float accounts with ledger accounts for banking-grade
 * double-entry accounting compliance.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding ledgerAccountCode column to supplier_floats table...');

    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('supplier_floats');
    
    if (!tableDescription.ledgerAccountCode) {
      await queryInterface.addColumn('supplier_floats', 'ledgerAccountCode', {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Ledger account code for this float (e.g., 1200-10-01). Must exist in ledger_accounts table.'
      });

      // Add index for faster lookups
      await queryInterface.addIndex('supplier_floats', ['ledgerAccountCode'], {
        name: 'supplier_floats_ledgerAccountCode_idx',
        unique: false
      });

      console.log('✅ Added ledgerAccountCode column to supplier_floats table');
    } else {
      console.log('ℹ️  ledgerAccountCode column already exists, skipping');
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Removing ledgerAccountCode column from supplier_floats table...');

    // Remove index first
    try {
      await queryInterface.removeIndex('supplier_floats', 'supplier_floats_ledgerAccountCode_idx');
    } catch (error) {
      console.log('ℹ️  Index may not exist, continuing...');
    }

    // Remove column
    const tableDescription = await queryInterface.describeTable('supplier_floats');
    if (tableDescription.ledgerAccountCode) {
      await queryInterface.removeColumn('supplier_floats', 'ledgerAccountCode');
      console.log('✅ Removed ledgerAccountCode column from supplier_floats table');
    } else {
      console.log('ℹ️  ledgerAccountCode column does not exist, skipping');
    }
  }
};
