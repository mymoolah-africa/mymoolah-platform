'use strict';

/**
 * Migration: Create Supplier Tier Fees System
 * 
 * Generic, supplier-agnostic tier-based fee configuration
 * Supports: Zapper, Flash, EasyPay, MobileMart, and all future suppliers
 * Fee Types: Fixed, Percentage, or Hybrid models
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create supplier_tier_fees table
    await queryInterface.createTable('supplier_tier_fees', {
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
        comment: 'Supplier identifier: ZAPPER, FLASH, EASYPAY, MOBILEMART, etc.'
      },
      service_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Service type: qr_payment, eezi_voucher, voucher_generation, airtime, etc.'
      },
      
      // User tier
      tier_level: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'User tier: bronze, silver, gold, platinum'
      },
      
      // Supplier's cost to MM (what MM pays the supplier)
      supplier_fee_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Fee type: fixed, percentage, hybrid'
      },
      supplier_fixed_fee_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Fixed fee in cents (e.g., 500 = R5.00)'
      },
      supplier_percentage_fee: {
        type: Sequelize.DECIMAL(6, 4),
        allowNull: false,
        defaultValue: 0,
        comment: 'Percentage fee as decimal (e.g., 0.0040 = 0.4%)'
      },
      
      // MM's fee to user (what user pays MM)
      mm_fee_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Fee type: fixed, percentage, hybrid'
      },
      mm_fixed_fee_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Fixed fee in cents (e.g., 900 = R9.00)'
      },
      mm_percentage_fee: {
        type: Sequelize.DECIMAL(6, 4),
        allowNull: false,
        defaultValue: 0,
        comment: 'Percentage fee as decimal (e.g., 0.0100 = 1%)'
      },
      
      // Configuration
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this fee configuration is active'
      },
      effective_from: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'When this configuration becomes effective'
      },
      effective_until: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this configuration expires (NULL = no expiry)'
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
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin user ID who created this configuration'
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('supplier_tier_fees', 
      ['supplier_code', 'service_type', 'tier_level', 'is_active'], 
      { name: 'idx_supplier_tier_fees_lookup' }
    );
    
    await queryInterface.addIndex('supplier_tier_fees', 
      ['is_active', 'effective_from', 'effective_until'], 
      { name: 'idx_supplier_tier_fees_active' }
    );
    
    await queryInterface.addIndex('supplier_tier_fees', 
      ['supplier_code'], 
      { name: 'idx_supplier_tier_fees_supplier' }
    );

    // Add constraints
    await queryInterface.addConstraint('supplier_tier_fees', {
      fields: ['tier_level'],
      type: 'check',
      name: 'check_tier_level',
      where: {
        tier_level: ['bronze', 'silver', 'gold', 'platinum']
      }
    });

    await queryInterface.addConstraint('supplier_tier_fees', {
      fields: ['supplier_fee_type'],
      type: 'check',
      name: 'check_supplier_fee_type',
      where: {
        supplier_fee_type: ['fixed', 'percentage', 'hybrid']
      }
    });

    await queryInterface.addConstraint('supplier_tier_fees', {
      fields: ['mm_fee_type'],
      type: 'check',
      name: 'check_mm_fee_type',
      where: {
        mm_fee_type: ['fixed', 'percentage', 'hybrid']
      }
    });

    // Seed initial data for existing suppliers
    console.log('Seeding supplier tier fees...');

    // ZAPPER: QR Payment (percentage supplier cost + fixed MM fee)
    await queryInterface.bulkInsert('supplier_tier_fees', [
      {
        supplier_code: 'ZAPPER',
        service_type: 'qr_payment',
        tier_level: 'bronze',
        supplier_fee_type: 'percentage',
        supplier_fixed_fee_cents: 0,
        supplier_percentage_fee: 0.0040, // 0.4%
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 300, // R3.00
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'ZAPPER',
        service_type: 'qr_payment',
        tier_level: 'silver',
        supplier_fee_type: 'percentage',
        supplier_fixed_fee_cents: 0,
        supplier_percentage_fee: 0.0040,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 275, // R2.75
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'ZAPPER',
        service_type: 'qr_payment',
        tier_level: 'gold',
        supplier_fee_type: 'percentage',
        supplier_fixed_fee_cents: 0,
        supplier_percentage_fee: 0.0040,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 250, // R2.50
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'ZAPPER',
        service_type: 'qr_payment',
        tier_level: 'platinum',
        supplier_fee_type: 'percentage',
        supplier_fixed_fee_cents: 0,
        supplier_percentage_fee: 0.0040,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 225, // R2.25
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      
      // FLASH: Eezi Voucher (fixed supplier cost + fixed MM fee)
      {
        supplier_code: 'FLASH',
        service_type: 'eezi_voucher',
        tier_level: 'bronze',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 500, // R5.00
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 900, // R9.00
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'FLASH',
        service_type: 'eezi_voucher',
        tier_level: 'silver',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 500,
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 800, // R8.00
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'FLASH',
        service_type: 'eezi_voucher',
        tier_level: 'gold',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 500,
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 700, // R7.00
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'FLASH',
        service_type: 'eezi_voucher',
        tier_level: 'platinum',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 500,
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 600, // R6.00
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      
      // EASYPAY: Voucher Generation (fixed supplier cost + fixed MM fee)
      {
        supplier_code: 'EASYPAY',
        service_type: 'voucher_generation',
        tier_level: 'bronze',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 350, // R3.50
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 700, // R7.00
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'EASYPAY',
        service_type: 'voucher_generation',
        tier_level: 'silver',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 350,
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 650, // R6.50
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'EASYPAY',
        service_type: 'voucher_generation',
        tier_level: 'gold',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 350,
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 600, // R6.00
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        supplier_code: 'EASYPAY',
        service_type: 'voucher_generation',
        tier_level: 'platinum',
        supplier_fee_type: 'fixed',
        supplier_fixed_fee_cents: 350,
        supplier_percentage_fee: 0,
        mm_fee_type: 'fixed',
        mm_fixed_fee_cents: 550, // R5.50
        mm_percentage_fee: 0,
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ Supplier tier fees table created and seeded');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('supplier_tier_fees');
  }
};

