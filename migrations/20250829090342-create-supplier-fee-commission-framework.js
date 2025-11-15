'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create suppliers table (required for product catalog)
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('suppliers', ['code'], {
      name: 'idx_suppliers_code'
    });
    await queryInterface.addIndex('suppliers', ['isActive'], {
      name: 'idx_suppliers_active'
    });

    // Create supplier_fee_schedule table (generic fee framework for all suppliers)
    await queryInterface.createTable('supplier_fee_schedule', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      supplierId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      serviceType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Service type (eezi_voucher, airtime, data, etc.)'
      },
      feeType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Fee type (transaction, processing, etc.)'
      },
      amountCents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Fee amount in cents'
      },
      isVatExclusive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether fee is VAT exclusive'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create supplier_commission_tiers table (generic commission framework for all suppliers)
    await queryInterface.createTable('supplier_commission_tiers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      supplierId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      serviceType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Service type (eezi_voucher, airtime, data, etc.)'
      },
      minVolume: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Minimum volume for this tier'
      },
      maxVolume: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum volume for this tier (null = unlimited)'
      },
      ratePct: {
        type: Sequelize.DECIMAL(6, 3),
        allowNull: false,
        comment: 'Commission rate percentage (e.g., 1.500 = 1.5%)'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for supplier_fee_schedule
    await queryInterface.addIndex('supplier_fee_schedule', ['supplierId', 'serviceType', 'feeType'], {
      name: 'idx_supplier_fee_schedule_unique',
      unique: true
    });
    await queryInterface.addIndex('supplier_fee_schedule', ['supplierId']);
    await queryInterface.addIndex('supplier_fee_schedule', ['serviceType']);
    await queryInterface.addIndex('supplier_fee_schedule', ['isActive']);

    // Add indexes for supplier_commission_tiers
    await queryInterface.addIndex('supplier_commission_tiers', ['supplierId', 'serviceType']);
    await queryInterface.addIndex('supplier_commission_tiers', ['supplierId']);
    await queryInterface.addIndex('supplier_commission_tiers', ['serviceType']);
    await queryInterface.addIndex('supplier_commission_tiers', ['isActive']);
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes for supplier_commission_tiers
    await queryInterface.removeIndex('supplier_commission_tiers', 'idx_supplier_commission_tiers_isActive');
    await queryInterface.removeIndex('supplier_commission_tiers', 'idx_supplier_commission_tiers_serviceType');
    await queryInterface.removeIndex('supplier_commission_tiers', 'idx_supplier_commission_tiers_supplierId');
    await queryInterface.removeIndex('supplier_commission_tiers', 'idx_supplier_commission_tiers_unique');

    // Remove indexes for supplier_fee_schedule
    await queryInterface.removeIndex('supplier_fee_schedule', 'idx_supplier_fee_schedule_isActive');
    await queryInterface.removeIndex('supplier_fee_schedule', 'idx_supplier_fee_schedule_serviceType');
    await queryInterface.removeIndex('supplier_fee_schedule', 'idx_supplier_fee_schedule_supplierId');
    await queryInterface.removeIndex('supplier_fee_schedule', 'idx_supplier_fee_schedule_unique');

    // Remove indexes for suppliers
    await queryInterface.removeIndex('suppliers', 'idx_suppliers_code');
    await queryInterface.removeIndex('suppliers', 'idx_suppliers_active');
    
    // Drop tables
    await queryInterface.dropTable('supplier_commission_tiers');
    await queryInterface.dropTable('supplier_fee_schedule');
    await queryInterface.dropTable('suppliers');
  }
};
