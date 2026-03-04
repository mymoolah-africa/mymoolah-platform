'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FlashTransaction extends Model {
    static associate(models) {}
  }

  FlashTransaction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'transactionid'
    },
    productId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'productid'
    },
    accountNumber: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'accountnumber'
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending'
    },
    flashReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'flashreference'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'errormessage'
    },
    serviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'service_type'
    },
    operation: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    faceValueCents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    commissionRatePct: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    commissionCents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    netRevenueCents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    generationFeeCents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    redemptionFeeCents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    vatExclusive: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FlashTransaction',
    tableName: 'flash_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return FlashTransaction;
};
