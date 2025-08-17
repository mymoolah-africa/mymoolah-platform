'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create mobilemart_transactions table
    await queryInterface.createTable('mobilemart_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      vasType: {
        type: Sequelize.ENUM('airtime', 'data', 'electricity', 'bill_payment', 'gaming', 'streaming', 'voucher'),
        allowNull: false
      },
      merchantProductId: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mobileNumber: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      accountNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      meterNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      mobilemartResponseCode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      mobilemartResponseMessage: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      transactionId: {
        type: Sequelize.STRING(100),
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

    // Create mobilemart_products table
    await queryInterface.createTable('mobilemart_products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      merchantProductId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      productName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      vasType: {
        type: Sequelize.ENUM('airtime', 'data', 'electricity', 'bill_payment', 'gaming', 'streaming', 'voucher'),
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
      isPromotional: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      promotionalDiscount: {
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
    await queryInterface.addIndex('mobilemart_transactions', ['reference'], { unique: true });
    await queryInterface.addIndex('mobilemart_transactions', ['vasType']);
    await queryInterface.addIndex('mobilemart_transactions', ['status']);
    await queryInterface.addIndex('mobilemart_transactions', ['createdAt']);
    await queryInterface.addIndex('mobilemart_transactions', ['mobileNumber']);
    await queryInterface.addIndex('mobilemart_transactions', ['accountNumber']);
    await queryInterface.addIndex('mobilemart_transactions', ['meterNumber']);

    await queryInterface.addIndex('mobilemart_products', ['merchantProductId'], { unique: true });
    await queryInterface.addIndex('mobilemart_products', ['vasType']);
    await queryInterface.addIndex('mobilemart_products', ['provider']);
    await queryInterface.addIndex('mobilemart_products', ['isActive']);
    await queryInterface.addIndex('mobilemart_products', ['isPromotional']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('mobilemart_transactions');
    await queryInterface.dropTable('mobilemart_products');
  }
};
