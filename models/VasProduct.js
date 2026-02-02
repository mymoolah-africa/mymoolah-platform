'use strict';

module.exports = (sequelize, DataTypes) => {
  const VasProduct = sequelize.define('VasProduct', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    supplierId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Supplier identifier (flash, mobilemart, etc.)'
    },
    supplierProductId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Product ID from supplier'
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Display name for the product'
    },
    vasType: {
      type: DataTypes.ENUM('airtime', 'data', 'electricity', 'bill_payment', 'cash_out'),
      allowNull: false,
      comment: 'Type of VAS product'
    },
    transactionType: {
      type: DataTypes.ENUM('voucher', 'topup', 'direct'),
      allowNull: false,
      comment: 'Type of transaction'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Service provider (MTN, Vodacom, etc.)'
    },
    networkType: {
      type: DataTypes.ENUM('local', 'international'),
      allowNull: false,
      defaultValue: 'local',
      comment: 'Network type'
    },
    predefinedAmounts: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Array of predefined amounts in cents'
    },
    minAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Minimum amount in cents'
    },
    maxAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Maximum amount in cents'
    },
    commission: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Commission percentage'
    },
    fixedFee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Fixed fee in cents'
    },
    isPromotional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is a promotional product'
    },
    promotionalDiscount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Promotional discount percentage'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this product is active'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Display priority (lower numbers = higher priority)'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional product metadata'
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Last time product was updated from supplier'
    }
  }, {
    tableName: 'vas_products',
    timestamps: true,
    indexes: [
      { fields: ['supplierId'] },
      { fields: ['vasType'] },
      { fields: ['provider'] },
      { fields: ['isActive'] },
      { fields: ['priority'] },
      { unique: true, fields: ['supplierId', 'supplierProductId'] }
    ]
  });

  VasProduct.associate = function(models) {
    // Define associations here if needed
  };

  return VasProduct;
};
