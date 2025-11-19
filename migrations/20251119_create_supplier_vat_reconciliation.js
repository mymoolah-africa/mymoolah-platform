'use strict';

/**
 * Migration: Create Supplier VAT Reconciliation Table
 * 
 * Enables automated VAT reconciliation per supplier and tax period
 * Tracks input VAT (paid to suppliers) and output VAT (charged to customers)
 * Calculates net VAT payable for SARS returns
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('supplier_vat_reconciliation', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      
      // Supplier identification
      supplier_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Supplier identifier: ZAPPER, FLASH, EASYPAY, etc.'
      },
      
      // Tax period
      tax_period: {
        type: Sequelize.STRING(7),
        allowNull: false,
        comment: 'Tax period in YYYY-MM format (e.g., 2025-11)'
      },
      tax_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Tax year (e.g., 2025)'
      },
      
      // VAT amounts
      total_input_vat: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total input VAT (paid to suppliers, claimable)'
      },
      total_output_vat: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total output VAT (charged to customers, payable)'
      },
      net_vat_payable: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Net VAT payable to SARS (output - input)'
      },
      
      // Status
      status: {
        type: Sequelize.ENUM('pending', 'calculated', 'reviewed', 'reported', 'paid'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Reconciliation status'
      },
      
      // Reporting
      reported_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When VAT was reported to SARS'
      },
      report_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'SARS VAT return reference number'
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When VAT was paid to SARS'
      },
      payment_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Payment reference for VAT payment'
      },
      
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional reconciliation metadata'
      },
      
      // Audit
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    }, {
      indexes: [
        { fields: ['supplier_code'] },
        { fields: ['tax_period'] },
        { fields: ['tax_year'] },
        { fields: ['status'] },
        { 
          unique: true,
          fields: ['supplier_code', 'tax_period'],
          name: 'unique_supplier_tax_period'
        }
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('supplier_vat_reconciliation');
  }
};

