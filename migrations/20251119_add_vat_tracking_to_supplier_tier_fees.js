'use strict';

/**
 * Migration: Add VAT Tracking to Supplier Tier Fees
 * 
 * Adds VAT configuration columns to support:
 * - Supplier VAT rates and VAT inclusive/exclusive flags
 * - MM VAT rates and VAT inclusive/exclusive flags
 * - Proper VAT calculation for both supplier costs and MM fees
 * 
 * All fees stored as VAT exclusive (net) - VAT calculated when needed
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add VAT tracking columns to supplier_tier_fees table
    await queryInterface.addColumn('supplier_tier_fees', 'supplier_vat_rate', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 0.15,
      comment: 'VAT rate for supplier fees (e.g., 0.15 = 15%). Default 15% for Zapper'
    });

    await queryInterface.addColumn('supplier_tier_fees', 'supplier_vat_inclusive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether supplier fee is VAT inclusive. Zapper fees are VAT exclusive (false)'
    });

    await queryInterface.addColumn('supplier_tier_fees', 'mm_vat_rate', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 0.15,
      comment: 'VAT rate for MM fees (e.g., 0.15 = 15%). Default 15%'
    });

    await queryInterface.addColumn('supplier_tier_fees', 'mm_vat_inclusive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether MM fee charged to user is VAT inclusive. User-facing fees are VAT inclusive (true)'
    });

    // Update existing Zapper records with correct VAT configuration
    await queryInterface.sequelize.query(`
      UPDATE supplier_tier_fees
      SET 
        supplier_vat_rate = 0.15,
        supplier_vat_inclusive = false,
        mm_vat_rate = 0.15,
        mm_vat_inclusive = true
      WHERE supplier_code = 'ZAPPER'
        AND service_type = 'qr_payment'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove VAT tracking columns
    await queryInterface.removeColumn('supplier_tier_fees', 'mm_vat_inclusive');
    await queryInterface.removeColumn('supplier_tier_fees', 'mm_vat_rate');
    await queryInterface.removeColumn('supplier_tier_fees', 'supplier_vat_inclusive');
    await queryInterface.removeColumn('supplier_tier_fees', 'supplier_vat_rate');
  }
};

