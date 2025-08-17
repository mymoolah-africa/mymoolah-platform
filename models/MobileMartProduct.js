'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MobileMartProduct extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  MobileMartProduct.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    merchantProductId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'MobileMart product ID'
    },
    productName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Product name'
    },
    vasType: {
      type: DataTypes.ENUM('airtime', 'data', 'electricity', 'bill_payment', 'gaming', 'streaming', 'voucher'),
      allowNull: false,
      comment: 'Type of VAS service'
    },
    provider: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Service provider (MTN, Vodacom, Eskom, etc.)'
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
    isPromotional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is a promotional product'
    },
    promotionalDiscount: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true,
      comment: 'Promotional discount percentage'
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
    modelName: 'MobileMartProduct',
    tableName: 'mobilemart_products',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['merchantProductId'] },
      { fields: ['vasType'] },
      { fields: ['provider'] },
      { fields: ['isActive'] },
      { fields: ['isPromotional'] }
    ]
  });

  return MobileMartProduct;
};
