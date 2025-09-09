'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create bills table
    await queryInterface.createTable('bills', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      easyPayNumber: {
        type: Sequelize.STRING(14),
        allowNull: false,
        unique: true
      },
      accountNumber: {
        type: Sequelize.STRING(13),
        allowNull: false
      },
      customerName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Amount in cents (e.g., 10000 = R100.00)'
      },
      minAmount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Minimum acceptable amount in cents'
      },
      maxAmount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum acceptable amount in cents'
      },
      dueDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Bill due date (YYYY-MM-DD format)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'paid', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      billType: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of bill (e.g., electricity, water, etc.)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Bill description'
      },
      receiverId: {
        type: Sequelize.STRING(4),
        allowNull: false,
        comment: 'EasyPay receiver ID (4 digits)'
      },
      paidAmount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Amount actually paid in cents'
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the bill was paid'
      },
      transactionId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'External transaction ID'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional bill metadata'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create payments table
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'POS assigned payment reference'
      },
      easyPayNumber: {
        type: Sequelize.STRING(14),
        allowNull: false
      },
      accountNumber: {
        type: Sequelize.STRING(13),
        allowNull: false,
        comment: 'Account number portion of EasyPay number'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Amount paid in cents (e.g., 15000 = R150.00)'
      },
      paymentType: {
        type: Sequelize.ENUM('bill_payment', 'voucher_payment', 'other'),
        allowNull: false,
        defaultValue: 'bill_payment'
      },
      paymentMethod: {
        type: Sequelize.ENUM('easypay', 'card', 'cash', 'transfer'),
        allowNull: false,
        defaultValue: 'easypay'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      echoData: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Echo data from EasyPay request'
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the payment was processed'
      },
      merchantId: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Merchant identifier where payment occurred'
      },
      terminalId: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Terminal ID where payment occurred'
      },
      transactionId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'External transaction ID'
      },
      billId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reference to associated bill'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional payment metadata'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if payment failed'
      },
      responseCode: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'EasyPay response code'
      },
      responseMessage: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'EasyPay response message'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('bills', ['easyPayNumber'], { unique: true });
    await queryInterface.addIndex('bills', ['accountNumber']);
    await queryInterface.addIndex('bills', ['status']);
    await queryInterface.addIndex('bills', ['dueDate']);
    await queryInterface.addIndex('bills', ['receiverId']);

    await queryInterface.addIndex('payments', ['reference'], { unique: true });
    await queryInterface.addIndex('payments', ['easyPayNumber']);
    await queryInterface.addIndex('payments', ['accountNumber']);
    await queryInterface.addIndex('payments', ['status']);
    await queryInterface.addIndex('payments', ['paymentDate']);
    await queryInterface.addIndex('payments', ['paymentType']);
    await queryInterface.addIndex('payments', ['billId']);

    // Add foreign key constraint
    await queryInterface.addConstraint('payments', {
      fields: ['billId'],
      type: 'foreign key',
      name: 'payments_billId_fkey',
      references: {
        table: 'bills',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove foreign key constraint first
    await queryInterface.removeConstraint('payments', 'payments_billId_fkey');
    
    // Drop tables
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('bills');
  }
};
