'use strict';

module.exports = (sequelize, DataTypes) => {
  const WalletBankPayment = sequelize.define('WalletBankPayment', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: 'payment_id',
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
    beneficiaryAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'beneficiary_account_id',
      references: { model: 'beneficiary_payment_methods', key: 'id' },
    },
    rail: {
      type: DataTypes.STRING(16),
      allowNull: false,
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
    feeAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'fee_amount',
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
    bankName: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'bank_name',
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
    pain001MsgId: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'pain001_msg_id',
    },
    endToEndId: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'end_to_end_id',
    },
    pain001Filename: {
      type: DataTypes.STRING(160),
      allowNull: true,
      field: 'pain001_filename',
    },
    standardBankTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'standard_bank_transaction_id',
      references: { model: 'standard_bank_transactions', key: 'id' },
    },
    rejectionCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'rejection_code',
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
    settlementEstimate: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'settlement_estimate',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    tableName: 'wallet_bank_payments',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      { fields: ['user_id', 'createdAt'], name: 'idx_wallet_bank_payments_user_created' },
      { fields: ['pain001_msg_id'], name: 'idx_wallet_bank_payments_msg_id' },
      { fields: ['end_to_end_id'], name: 'idx_wallet_bank_payments_end_to_end_id' },
      { fields: ['status'], name: 'idx_wallet_bank_payments_status' },
    ],
  });

  WalletBankPayment.associate = (models) => {
    WalletBankPayment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    WalletBankPayment.belongsTo(models.Wallet, { foreignKey: 'walletId', targetKey: 'walletId', as: 'wallet' });
    if (models.StandardBankTransaction) {
      WalletBankPayment.belongsTo(models.StandardBankTransaction, {
        foreignKey: 'standardBankTransactionId',
        as: 'standardBankTransaction',
      });
    }
  };

  return WalletBankPayment;
};
