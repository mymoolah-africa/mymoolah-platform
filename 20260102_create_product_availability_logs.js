'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_availability_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      variantId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'product_variants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Product variant that was unavailable'
      },
      supplierId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Supplier that failed to fulfill the product'
      },
      supplierCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Supplier code (MOBILEMART, FLASH, etc.)'
      },
      productName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Product name for reference'
      },
      productType: {
        type: Sequelize.ENUM('airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'gaming', 'streaming', 'cash_out'),
        allowNull: false,
        comment: 'Type of product that was unavailable'
      },
      errorCode: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Error code from supplier (e.g., 1002, 1013)'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message from supplier'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who attempted the purchase'
      },
      beneficiaryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'beneficiaries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Beneficiary for the purchase attempt'
      },
      amountInCents: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Purchase amount in cents'
      },
      alternativeUsed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether an alternative supplier was used'
      },
      alternativeSupplierCode: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Alternative supplier code if fallback was used'
      },
      alternativeVariantId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'product_variants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Alternative product variant ID if fallback was used'
      },
      logDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Date of the availability issue (for daily aggregation)'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional context (network, provider, etc.)'
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

    // Create indexes for efficient querying
    await queryInterface.addIndex('product_availability_logs', ['logDate'], {
      name: 'idx_product_availability_logs_log_date'
    });
    await queryInterface.addIndex('product_availability_logs', ['supplierId'], {
      name: 'idx_product_availability_logs_supplier_id'
    });
    await queryInterface.addIndex('product_availability_logs', ['supplierCode'], {
      name: 'idx_product_availability_logs_supplier_code'
    });
    await queryInterface.addIndex('product_availability_logs', ['productType'], {
      name: 'idx_product_availability_logs_product_type'
    });
    await queryInterface.addIndex('product_availability_logs', ['variantId'], {
      name: 'idx_product_availability_logs_variant_id'
    });
    await queryInterface.addIndex('product_availability_logs', ['errorCode'], {
      name: 'idx_product_availability_logs_error_code'
    });
    await queryInterface.addIndex('product_availability_logs', ['alternativeUsed'], {
      name: 'idx_product_availability_logs_alternative_used'
    });
    await queryInterface.addIndex('product_availability_logs', ['userId'], {
      name: 'idx_product_availability_logs_user_id'
    });
    await queryInterface.addIndex('product_availability_logs', ['logDate', 'supplierCode'], {
      name: 'idx_product_availability_logs_date_supplier'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_availability_logs');
  }
};

