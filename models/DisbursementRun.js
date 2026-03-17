'use strict';

/**
 * DisbursementRun model
 * Represents a batch wage/salary disbursement run submitted via the admin portal
 * to SBSA H2H SFTP using ISO 20022 Pain.001.
 *
 * Lifecycle: draft → pending_approval → approved → submitted → processing
 *            → completed | partial | failed | cancelled
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

module.exports = (sequelize, DataTypes) => {
  const DisbursementRun = sequelize.define('DisbursementRun', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    run_reference: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
    },
    rail: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'eft',
      validate: { isIn: [['eft', 'rtc', 'payshap']] },
    },
    pay_period: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    total_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    success_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failed_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    pending_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'draft',
    },
    pain001_filename: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pain001_gcs_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    pain002_filename: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pain002_gcs_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    maker_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    checker_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notification_channels: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'disbursement_runs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  DisbursementRun.associate = (models) => {
    DisbursementRun.hasMany(models.DisbursementPayment, {
      foreignKey: 'run_id',
      as: 'payments',
    });
  };

  return DisbursementRun;
};
