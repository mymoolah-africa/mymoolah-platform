'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MobileMartTransaction extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  MobileMartTransaction.init({
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
    vasType: {
      type: DataTypes.ENUM('airtime', 'data', 'electricity', 'bill_payment', 'gaming', 'streaming', 'voucher'),
      allowNull: false,
      comment: 'Type of VAS service'
    },
    merchantProductId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'MobileMart product ID'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount in cents'
    },
    mobileNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Mobile number for airtime/data'
    },
    accountNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Account number for bill payments'
    },
    meterNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Meter number for electricity'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    mobilemartResponseCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'MobileMart API response code'
    },
    mobilemartResponseMessage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'MobileMart API response message'
    },
    transactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'MobileMart transaction ID'
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
    modelName: 'MobileMartTransaction',
    tableName: 'mobilemart_transactions',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['reference'] },
      { fields: ['vasType'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
      { fields: ['mobileNumber'] },
      { fields: ['accountNumber'] },
      { fields: ['meterNumber'] }
    ]
  });

  return MobileMartTransaction;
};
