'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductCatalogMapping extends Model {
    static associate(models) {
      ProductCatalogMapping.belongsTo(models.ProductVariant, {
        foreignKey: 'sourceVariantId',
        as: 'variant',
      });
      ProductCatalogMapping.belongsTo(models.Product, {
        foreignKey: 'sourceProductId',
        as: 'product',
      });
      ProductCatalogMapping.belongsTo(models.Supplier, {
        foreignKey: 'supplierId',
        as: 'supplier',
      });
      ProductCatalogMapping.hasMany(models.ProductCatalogAuditEvent, {
        foreignKey: 'mappingId',
        as: 'auditEvents',
      });
    }
  }

  ProductCatalogMapping.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sourceVariantId: { type: DataTypes.INTEGER, allowNull: true, field: 'source_variant_id' },
    sourceProductId: { type: DataTypes.INTEGER, allowNull: true, field: 'source_product_id' },
    supplierId: { type: DataTypes.INTEGER, allowNull: true, field: 'supplier_id' },
    supplierCode: { type: DataTypes.STRING(50), allowNull: false, field: 'supplier_code' },
    supplierProductId: { type: DataTypes.STRING(255), allowNull: false, field: 'supplier_product_id' },
    productType: { type: DataTypes.STRING(50), allowNull: false, field: 'product_type' },
    rawName: { type: DataTypes.STRING(255), allowNull: false, field: 'raw_name' },
    rawSnapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'raw_snapshot' },
    canonicalName: { type: DataTypes.STRING(255), allowNull: true, field: 'canonical_name' },
    canonicalBrand: { type: DataTypes.STRING(255), allowNull: true, field: 'canonical_brand' },
    category: { type: DataTypes.STRING(80), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    iconKey: { type: DataTypes.STRING(80), allowNull: true, field: 'icon_key' },
    logoKey: { type: DataTypes.STRING(120), allowNull: true, field: 'logo_key' },
    riskTier: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'medium', field: 'risk_tier' },
    reviewStatus: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'draft', field: 'review_status' },
    publishStatus: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'unpublished', field: 'publish_status' },
    makerUserId: { type: DataTypes.STRING(80), allowNull: true, field: 'maker_user_id' },
    makerUserEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'maker_user_email' },
    checkerUserId: { type: DataTypes.STRING(80), allowNull: true, field: 'checker_user_id' },
    checkerUserEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'checker_user_email' },
    submittedAt: { type: DataTypes.DATE, allowNull: true, field: 'submitted_at' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    rejectedAt: { type: DataTypes.DATE, allowNull: true, field: 'rejected_at' },
    suspendedAt: { type: DataTypes.DATE, allowNull: true, field: 'suspended_at' },
    retiredAt: { type: DataTypes.DATE, allowNull: true, field: 'retired_at' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, {
    sequelize,
    modelName: 'ProductCatalogMapping',
    tableName: 'product_catalog_mappings',
    timestamps: true,
  });

  return ProductCatalogMapping;
};
