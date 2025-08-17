'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FlashProduct extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  FlashProduct.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'Flash product code'
    },
    productName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Product name'
    },
    category: {
      type: DataTypes.ENUM('airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'gaming', 'streaming'),
      allowNull: false,
      comment: 'Product category'
    },
    provider: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Service provider (MTN, Vodacom, etc.)'
    },
    minAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Minimum amount in cents'
    },
    maxAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum amount in cents'
    },
    commission: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true,
      comment: 'Commission percentage'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether product is active'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional product metadata'
    }
  }, {
    sequelize,
    modelName: 'FlashProduct',
    tableName: 'flash_products',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['productCode'] },
      { fields: ['category'] },
      { fields: ['provider'] },
      { fields: ['isActive'] }
    ]
  });

  return FlashProduct;
};
