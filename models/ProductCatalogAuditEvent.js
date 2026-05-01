'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductCatalogAuditEvent extends Model {
    static associate(models) {
      ProductCatalogAuditEvent.belongsTo(models.ProductCatalogMapping, {
        foreignKey: 'mappingId',
        as: 'mapping',
      });
    }
  }

  ProductCatalogAuditEvent.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mappingId: { type: DataTypes.INTEGER, allowNull: false, field: 'mapping_id' },
    action: { type: DataTypes.STRING(80), allowNull: false },
    actorUserId: { type: DataTypes.STRING(80), allowNull: true, field: 'actor_user_id' },
    actorEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'actor_email' },
    actorRole: { type: DataTypes.STRING(80), allowNull: true, field: 'actor_role' },
    fromStatus: { type: DataTypes.STRING(40), allowNull: true, field: 'from_status' },
    toStatus: { type: DataTypes.STRING(40), allowNull: true, field: 'to_status' },
    fromPublishStatus: { type: DataTypes.STRING(40), allowNull: true, field: 'from_publish_status' },
    toPublishStatus: { type: DataTypes.STRING(40), allowNull: true, field: 'to_publish_status' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, {
    sequelize,
    modelName: 'ProductCatalogAuditEvent',
    tableName: 'product_catalog_audit_events',
    timestamps: true,
  });

  return ProductCatalogAuditEvent;
};
