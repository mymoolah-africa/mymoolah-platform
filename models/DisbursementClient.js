'use strict';

/**
 * DisbursementClient model
 * Represents an external company/entity that uses the MyMoolah disbursement service
 * to pay their employees, suppliers, or beneficiaries.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

module.exports = (sequelize, DataTypes) => {
  const DisbursementClient = sequelize.define('DisbursementClient', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'company',
      validate: { isIn: [['company', 'sole_proprietor', 'trust', 'partnership', 'npo']] },
    },
    registration_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    contact_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true },
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'active', 'suspended', 'closed']] },
    },
    kyb_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'none',
      validate: { isIn: [['none', 'submitted', 'verified', 'rejected']] },
    },
    ledger_account_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    float_limit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    api_key: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    api_secret_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    white_label_slug: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    white_label_config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    notification_channels: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'disbursement_clients',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  DisbursementClient.associate = (models) => {
    DisbursementClient.hasMany(models.DisbursementClientFee, {
      foreignKey: 'client_id',
      as: 'fees',
    });
    DisbursementClient.hasMany(models.KybDocument, {
      foreignKey: 'client_id',
      as: 'kybDocuments',
    });
    DisbursementClient.hasMany(models.DisbursementNotificationPreference, {
      foreignKey: 'client_id',
      as: 'notificationPreferences',
    });
    DisbursementClient.hasMany(models.DisbursementClientUser, {
      foreignKey: 'client_id',
      as: 'users',
    });
    DisbursementClient.hasMany(models.DisbursementRun, {
      foreignKey: 'client_id',
      as: 'runs',
    });
  };

  return DisbursementClient;
};
