'use strict';

/**
 * DisbursementNotificationPreference model
 * Per-event notification routing for a disbursement client (email, webhook, or sftp).
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

module.exports = (sequelize, DataTypes) => {
  const DisbursementNotificationPreference = sequelize.define('DisbursementNotificationPreference', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    channel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['email', 'webhook', 'sftp']] },
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    tableName: 'disbursement_notification_preferences',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  DisbursementNotificationPreference.associate = (models) => {
    DisbursementNotificationPreference.belongsTo(models.DisbursementClient, {
      foreignKey: 'client_id',
      as: 'client',
    });
  };

  return DisbursementNotificationPreference;
};
