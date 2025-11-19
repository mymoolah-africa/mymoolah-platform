'use strict';

/**
 * Migration: Add VAT Direction Tracking to Tax Transactions
 * 
 * Adds columns to distinguish between:
 * - Input VAT: VAT paid to suppliers (claimable from SARS)
 * - Output VAT: VAT charged to customers (payable to SARS)
 * 
 * Enables proper VAT reconciliation and SARS compliance
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for VAT direction (PostgreSQL requires explicit type creation)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_tax_transactions_vat_direction" AS ENUM('input', 'output');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add VAT direction column
    await queryInterface.addColumn('tax_transactions', 'vat_direction', {
      type: Sequelize.ENUM('input', 'output'),
      allowNull: true,
      defaultValue: 'output',
      comment: 'VAT direction: input (paid to supplier, claimable) or output (charged to customer, payable)'
    });

    // Add supplier code for input VAT tracking
    await queryInterface.addColumn('tax_transactions', 'supplier_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Supplier code for input VAT tracking (e.g., ZAPPER). NULL for output VAT'
    });

    // Add claimable flag for input VAT
    await queryInterface.addColumn('tax_transactions', 'is_claimable', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this VAT is claimable (input VAT from registered suppliers). Default false'
    });

    // Update existing records to be output VAT (current behavior)
    await queryInterface.sequelize.query(`
      UPDATE tax_transactions
      SET 
        vat_direction = 'output',
        is_claimable = false
      WHERE vat_direction IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove VAT direction tracking columns
    await queryInterface.removeColumn('tax_transactions', 'is_claimable');
    await queryInterface.removeColumn('tax_transactions', 'supplier_code');
    await queryInterface.removeColumn('tax_transactions', 'vat_direction');
    
    // Drop ENUM type if it exists (only if no other columns use it)
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_tax_transactions_vat_direction";
    `);
  }
};

