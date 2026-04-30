'use strict';

module.exports = (sequelize, DataTypes) => {
  const SBSAInboundCreditEvent = sequelize.define('SBSAInboundCreditEvent', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    canonicalFingerprint: {
      type: DataTypes.STRING(96),
      allowNull: false,
      unique: true,
      field: 'canonical_fingerprint',
    },
    reconciliationKey: {
      type: DataTypes.STRING(96),
      allowNull: false,
      unique: true,
      field: 'reconciliation_key',
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'processing',
    },
    referenceNumber: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: 'reference_number',
    },
    normalizedReference: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: 'normalized_reference',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    amountCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'amount_cents',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ZAR',
    },
    accountType: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'account_type',
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'account_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'wallet_id',
    },
    creditedStandardBankTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'credited_standard_bank_transaction_id',
    },
    creditedWalletTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'credited_wallet_transaction_id',
    },
    journalReference: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'journal_reference',
    },
    firstSource: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'first_source',
    },
    duplicatePolicy: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'reconciliation_key_single_credit',
      field: 'duplicate_policy',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  }, {
    tableName: 'sbsa_inbound_credit_events',
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['canonical_fingerprint'] },
      { unique: true, fields: ['reconciliation_key'] },
      { fields: ['status', 'reconciliation_key'] },
      { fields: ['wallet_id', 'created_at'] },
      { fields: ['status', 'created_at'] },
    ],
  });

  SBSAInboundCreditEvent.associate = (models) => {
    SBSAInboundCreditEvent.hasMany(models.SBSAInboundCreditEventSource, {
      foreignKey: 'eventId',
      as: 'sources',
    });
  };

  return SBSAInboundCreditEvent;
};
