'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create flash_transactions table
    await queryInterface.createTable('flash_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      txnReference: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      accountNumber: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      serviceType: {
        type: Sequelize.ENUM('1voucher', 'gift_voucher', 'cash_out_pin', 'cellular', 'eezi_voucher', 'prepaid_utility'),
        allowNull: false
      },
      operation: {
        type: Sequelize.ENUM('purchase', 'disburse', 'redeem', 'refund', 'cancel', 'lookup'),
        allowNull: false
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      productCode: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      flashResponseCode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      flashResponseMessage: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create flash_products table
    await queryInterface.createTable('flash_products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      productCode: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      productName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'gaming', 'streaming'),
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      minAmount: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      maxAmount: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      commission: {
        type: Sequelize.DECIMAL(5,2),
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('flash_transactions', ['txnReference'], { unique: true });
    await queryInterface.addIndex('flash_transactions', ['accountNumber']);
    await queryInterface.addIndex('flash_transactions', ['serviceType']);
    await queryInterface.addIndex('flash_transactions', ['status']);
    await queryInterface.addIndex('flash_transactions', ['createdAt']);

    await queryInterface.addIndex('flash_products', ['productCode'], { unique: true });
    await queryInterface.addIndex('flash_products', ['category']);
    await queryInterface.addIndex('flash_products', ['provider']);
    await queryInterface.addIndex('flash_products', ['isActive']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('flash_transactions');
    await queryInterface.dropTable('flash_products');
  }
};
