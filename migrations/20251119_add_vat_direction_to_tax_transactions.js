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
    // Check if tax_transactions table exists first
    const [tableExists] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_transactions'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('⚠️ tax_transactions table does not exist. Skipping VAT direction migration.');
      console.log('⚠️ Please ensure migration 20250814_create_reseller_compliance_tax.js has run first.');
      return;
    }

    // Create ENUM type for VAT direction (PostgreSQL requires explicit type creation)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_tax_transactions_vat_direction AS ENUM('input', 'output');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Check if column already exists
    const [columnExists] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_transactions'
        AND column_name = 'vat_direction'
      );
    `);

    if (!columnExists[0].exists) {
      // Add VAT direction column using raw SQL to ensure ENUM type is used correctly
      await queryInterface.sequelize.query(`
        ALTER TABLE tax_transactions 
        ADD COLUMN vat_direction enum_tax_transactions_vat_direction 
        DEFAULT 'output'::enum_tax_transactions_vat_direction;
        
        COMMENT ON COLUMN tax_transactions.vat_direction IS 'VAT direction: input (paid to supplier, claimable) or output (charged to customer, payable)';
      `);
    }

    // Add supplier code for input VAT tracking (check if exists first)
    const [supplierCodeExists] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_transactions'
        AND column_name = 'supplier_code'
      );
    `);

    if (!supplierCodeExists[0].exists) {
      await queryInterface.addColumn('tax_transactions', 'supplier_code', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Supplier code for input VAT tracking (e.g., ZAPPER). NULL for output VAT'
      });
    }

    // Add claimable flag for input VAT (check if exists first)
    const [isClaimableExists] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_transactions'
        AND column_name = 'is_claimable'
      );
    `);

    if (!isClaimableExists[0].exists) {
      await queryInterface.addColumn('tax_transactions', 'is_claimable', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this VAT is claimable (input VAT from registered suppliers). Default false'
      });
    }

    // Update existing records to be output VAT (current behavior)
    await queryInterface.sequelize.query(`
      UPDATE tax_transactions
      SET 
        vat_direction = 'output'::enum_tax_transactions_vat_direction,
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
      DROP TYPE IF EXISTS enum_tax_transactions_vat_direction;
    `);
  }
};

