'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FlashTransaction extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  FlashTransaction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Unique transaction reference'
    },
    accountNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Flash account number'
    },
    serviceType: {
      type: DataTypes.ENUM('1voucher', 'gift_voucher', 'cash_out_pin', 'cellular', 'eezi_voucher', 'prepaid_utility'),
      allowNull: false,
      comment: 'Type of Flash service'
    },
    operation: {
      type: DataTypes.ENUM('purchase', 'disburse', 'redeem', 'refund', 'cancel', 'lookup'),
      allowNull: false,
      comment: 'Operation type'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount in cents'
    },
    productCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Flash product code'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    flashResponseCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Flash API response code'
    },
    flashResponseMessage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Flash API response message'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional transaction metadata'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if failed'
    }
  }, {
    sequelize,
    modelName: 'FlashTransaction',
    tableName: 'flash_transactions',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['reference'] },
      { fields: ['accountNumber'] },
      { fields: ['serviceType'] },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ]
  });

  return FlashTransaction;
};
