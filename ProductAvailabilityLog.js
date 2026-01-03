'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductAvailabilityLog extends Model {
    static associate(models) {
      // Define associations here
      ProductAvailabilityLog.belongsTo(models.ProductVariant, {
        foreignKey: 'variantId',
        as: 'variant'
      });
      ProductAvailabilityLog.belongsTo(models.Supplier, {
        foreignKey: 'supplierId',
        as: 'supplier'
      });
      ProductAvailabilityLog.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  ProductAvailabilityLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      },
      comment: 'Product variant that was unavailable'
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      comment: 'Supplier that failed to fulfill the product'
    },
    supplierCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Supplier code (MOBILEMART, FLASH, etc.)'
    },
    productName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Product name for reference'
    },
    productType: {
      type: DataTypes.ENUM('airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'gaming', 'streaming', 'cash_out'),
      allowNull: false,
      comment: 'Type of product that was unavailable'
    },
    errorCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Error code from supplier (e.g., 1002, 1013)'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message from supplier'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who attempted the purchase'
    },
    beneficiaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'beneficiaries',
        key: 'id'
      },
      comment: 'Beneficiary for the purchase attempt'
    },
    amountInCents: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Purchase amount in cents'
    },
    alternativeUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether an alternative supplier was used'
    },
    alternativeSupplierCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Alternative supplier code if fallback was used'
    },
    alternativeVariantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      },
      comment: 'Alternative product variant ID if fallback was used'
    },
    logDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date of the availability issue (for daily aggregation)'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional context (network, provider, etc.)'
    }
  }, {
    sequelize,
    modelName: 'ProductAvailabilityLog',
    tableName: 'product_availability_logs',
    timestamps: true,
    indexes: [
      { fields: ['logDate'] },
      { fields: ['supplierId'] },
      { fields: ['supplierCode'] },
      { fields: ['productType'] },
      { fields: ['variantId'] },
      { fields: ['errorCode'] },
      { fields: ['alternativeUsed'] },
      { fields: ['userId'] },
      { fields: ['logDate', 'supplierCode'] } // For daily reports
    ]
  });

  return ProductAvailabilityLog;
};

