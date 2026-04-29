'use strict';

module.exports = (sequelize, DataTypes) => {
  const OttPayout = sequelize.define('OttPayout', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    payoutId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: 'payout_id',
    },
    uniqueReferenceId: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      field: 'unique_reference_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'wallet_id',
      references: { model: 'wallets', key: 'walletId' },
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'pending',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    providerFeeAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'provider_fee_amount',
    },
    mmtpFeeAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'mmtp_fee_amount',
    },
    totalDebit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'total_debit',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ZAR',
    },
    providerCode: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'provider_code',
    },
    recipientMobileLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      field: 'recipient_mobile_last4',
    },
    recipientNameMasked: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'recipient_name_masked',
    },
    accountNumberLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      field: 'account_number_last4',
    },
    branchCode: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'branch_code',
    },
    reference: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'idempotency_key',
    },
    ottPaymentReference: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'ott_payment_reference',
    },
    providerTransactionReference: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'provider_transaction_reference',
    },
    webhookEventId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'webhook_event_id',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
    },
    reversedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reversed_at',
    },
    feeSnapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'fee_snapshot',
    },
    providerResponse: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'provider_response',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    tableName: 'ott_payouts',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      { fields: ['user_id', 'createdAt'], name: 'idx_ott_payouts_user_created' },
      { fields: ['wallet_id', 'createdAt'], name: 'idx_ott_payouts_wallet_created' },
      { fields: ['status'], name: 'idx_ott_payouts_status' },
      { fields: ['provider_code'], name: 'idx_ott_payouts_provider_code' },
      { fields: ['unique_reference_id'], name: 'idx_ott_payouts_unique_reference_id' },
      { fields: ['webhook_event_id'], name: 'idx_ott_payouts_webhook_event_id' },
    ],
  });

  OttPayout.associate = (models) => {
    OttPayout.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    OttPayout.belongsTo(models.Wallet, { foreignKey: 'walletId', targetKey: 'walletId', as: 'wallet' });
  };

  return OttPayout;
};
