'use strict';

/**
 * Migration: Ensure tax_transactions table exists
 * 
 * Creates the tax_transactions table if it doesn't exist.
 * This is a safety migration to handle cases where the original migration
 * (20250814_create_reseller_compliance_tax.js) may have failed partway through.
 * 
 * This migration is idempotent - it will skip if the table already exists.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if tax_transactions table exists
    const [tableCheck] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_transactions'
      ) as exists;
    `);

    const tableExists = tableCheck[0]?.exists === true;

    if (tableExists) {
      console.log('✅ tax_transactions table already exists. Skipping creation.');
      return;
    }

    console.log('⚠️ tax_transactions table does not exist. Creating it now...');

    // Create ENUM types first (if they don't exist)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_tax_transactions_tax_type AS ENUM('vat', 'income_tax', 'withholding_tax', 'customs_duty', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_tax_transactions_calculation_method AS ENUM('inclusive', 'exclusive', 'compound');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_tax_transactions_business_context AS ENUM('wallet_user', 'client_integration', 'merchant_voucher', 'supplier_settlement', 'reseller');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_tax_transactions_entity_type AS ENUM('supplier', 'client', 'merchant', 'reseller', 'customer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_tax_transactions_status AS ENUM('pending', 'calculated', 'paid', 'reported', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tax_transactions table
    await queryInterface.createTable('tax_transactions', {
      id: { 
        type: Sequelize.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
      },
      
      // Transaction identification
      taxTransactionId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique tax transaction identifier' 
      },
      originalTransactionId: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Reference to the original transaction' 
      },
      
      // Tax details
      taxCode: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Tax code applied' 
      },
      taxName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Tax name' 
      },
      taxType: { 
        type: Sequelize.ENUM('vat', 'income_tax', 'withholding_tax', 'customs_duty', 'other'), 
        allowNull: false,
        comment: 'Type of tax' 
      },
      
      // Financial details
      baseAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Amount before tax' 
      },
      taxAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Tax amount calculated' 
      },
      totalAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Total amount including tax' 
      },
      taxRate: { 
        type: Sequelize.DECIMAL(5, 4), 
        allowNull: false,
        comment: 'Tax rate applied' 
      },
      
      // Calculation method
      calculationMethod: { 
        type: Sequelize.ENUM('inclusive', 'exclusive', 'compound'), 
        allowNull: false,
        comment: 'How tax was calculated' 
      },
      
      // Business context
      businessContext: { 
        type: Sequelize.ENUM('wallet_user', 'client_integration', 'merchant_voucher', 'supplier_settlement', 'reseller'), 
        allowNull: false,
        comment: 'Business context of the transaction' 
      },
      transactionType: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Type of original transaction' 
      },
      
      // Entity identification
      entityId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Entity ID (supplier, client, merchant, reseller)' 
      },
      entityType: { 
        type: Sequelize.ENUM('supplier', 'client', 'merchant', 'reseller', 'customer'), 
        allowNull: true,
        comment: 'Type of entity' 
      },
      
      // Tax period
      taxPeriod: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Tax period (YYYY-MM format)' 
      },
      taxYear: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        comment: 'Tax year' 
      },
      
      // Status
      status: { 
        type: Sequelize.ENUM('pending', 'calculated', 'paid', 'reported', 'refunded'), 
        allowNull: false, 
        defaultValue: 'pending',
        comment: 'Tax transaction status' 
      },
      
      // Payment details
      paymentReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Payment reference for tax payment' 
      },
      paymentDate: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Date tax was paid' 
      },
      
      // Reporting
      reportedAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'When tax was reported to authorities' 
      },
      reportReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Reference from tax authority' 
      },
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional tax transaction metadata' 
      },
      
      // Timestamps
      createdAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
    });

    // Add indexes for tax_transactions
    await queryInterface.addIndex('tax_transactions', ['taxTransactionId']);
    await queryInterface.addIndex('tax_transactions', ['originalTransactionId']);
    await queryInterface.addIndex('tax_transactions', ['taxCode']);
    await queryInterface.addIndex('tax_transactions', ['taxType']);
    await queryInterface.addIndex('tax_transactions', ['businessContext']);
    await queryInterface.addIndex('tax_transactions', ['entityId']);
    await queryInterface.addIndex('tax_transactions', ['entityType']);
    await queryInterface.addIndex('tax_transactions', ['taxPeriod']);
    await queryInterface.addIndex('tax_transactions', ['taxYear']);
    await queryInterface.addIndex('tax_transactions', ['status']);
    await queryInterface.addIndex('tax_transactions', ['createdAt']);

    console.log('✅ tax_transactions table created successfully.');
  },

  async down(queryInterface, Sequelize) {
    // Only drop table if it exists and we created it
    const [tableCheck] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_transactions'
      ) as exists;
    `);

    if (tableCheck[0]?.exists === true) {
      // Remove indexes first
      try {
        await queryInterface.removeIndex('tax_transactions', ['taxTransactionId']);
        await queryInterface.removeIndex('tax_transactions', ['originalTransactionId']);
        await queryInterface.removeIndex('tax_transactions', ['taxCode']);
        await queryInterface.removeIndex('tax_transactions', ['taxType']);
        await queryInterface.removeIndex('tax_transactions', ['businessContext']);
        await queryInterface.removeIndex('tax_transactions', ['entityId']);
        await queryInterface.removeIndex('tax_transactions', ['entityType']);
        await queryInterface.removeIndex('tax_transactions', ['taxPeriod']);
        await queryInterface.removeIndex('tax_transactions', ['taxYear']);
        await queryInterface.removeIndex('tax_transactions', ['status']);
        await queryInterface.removeIndex('tax_transactions', ['createdAt']);
      } catch (error) {
        console.log('⚠️ Some indexes may not exist:', error.message);
      }

      // Drop table
      await queryInterface.dropTable('tax_transactions');
    }
  }
};

