'use strict';

module.exports = (sequelize, DataTypes) => {
  const TransactionFeePolicy = sequelize.define('TransactionFeePolicy', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    transactionType: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'transaction_type',
    },
    rail: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    channel: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'wallet',
    },
    customerTier: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'all',
      field: 'customer_tier',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ZAR',
    },
    feeType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'flat',
      field: 'fee_type',
    },
    fixedFee: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'fixed_fee',
    },
    percentageFeeBps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'percentage_fee_bps',
    },
    minFee: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'min_fee',
    },
    maxFee: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'max_fee',
    },
    effectiveFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'effective_from',
    },
    effectiveTo: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'effective_to',
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'active',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    tableName: 'transaction_fee_policies',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      { fields: ['transaction_type', 'rail', 'channel', 'customer_tier', 'currency'], name: 'idx_fee_policies_lookup' },
      { fields: ['effective_from', 'effective_to'], name: 'idx_fee_policies_effective_dates' },
      { fields: ['status'], name: 'idx_fee_policies_status' },
    ],
  });

  return TransactionFeePolicy;
};
