'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // Define associations here if needed
      // Payment.belongsTo(models.Bill, { foreignKey: 'billId' });
    }
  }

  Payment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'POS assigned payment reference'
    },
    easyPayNumber: {
      type: DataTypes.STRING(14),
      allowNull: false,
      validate: {
        len: [14, 14],
        is: /^9\d{13}$/ // Must start with 9 and be 14 digits
      }
    },
    accountNumber: {
      type: DataTypes.STRING(13),
      allowNull: false,
      comment: 'Account number portion of EasyPay number'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount paid in cents (e.g., 15000 = R150.00)',
      validate: {
        min: 1
      }
    },
    paymentType: {
      type: DataTypes.ENUM('bill_payment', 'voucher_payment', 'other'),
      allowNull: false,
      defaultValue: 'bill_payment'
    },
    paymentMethod: {
      type: DataTypes.ENUM('easypay', 'card', 'cash', 'transfer'),
      allowNull: false,
      defaultValue: 'easypay'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    echoData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Echo data from EasyPay request'
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the payment was processed'
    },
    merchantId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Merchant identifier where payment occurred'
    },
    terminalId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Terminal ID where payment occurred'
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External transaction ID'
    },
    billId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Reference to associated bill'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional payment metadata'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if payment failed'
    },
    responseCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'EasyPay response code'
    },
    responseMessage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'EasyPay response message'
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['reference']
      },
      {
        fields: ['easyPayNumber']
      },
      {
        fields: ['accountNumber']
      },
      {
        fields: ['status']
      },
      {
        fields: ['paymentDate']
      },
      {
        fields: ['paymentType']
      },
      {
        fields: ['billId']
      }
    ]
  });

  return Payment;
};