'use strict';

/**
 * DisbursementClientFee model
 * Fee schedule per payment rail for a disbursement client.
 * Supports flat, percentage, or combined fee structures with effective date ranges.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

module.exports = (sequelize, DataTypes) => {
  const DisbursementClientFee = sequelize.define('DisbursementClientFee', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rail: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['eft', 'payshap', 'wallet']] },
    },
    fee_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['flat', 'percentage', 'flat_plus_percentage']] },
    },
    flat_fee_cents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    percentage_fee: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0,
    },
    min_fee_cents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    max_fee_cents: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    effective_to: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
  }, {
    tableName: 'disbursement_client_fees',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  });

  DisbursementClientFee.associate = (models) => {
    DisbursementClientFee.belongsTo(models.DisbursementClient, {
      foreignKey: 'client_id',
      as: 'client',
    });
  };

  return DisbursementClientFee;
};
