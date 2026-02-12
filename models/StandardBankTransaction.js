'use strict';

/**
 * StandardBankTransaction model
 * SBSA PayShap RPP (outbound payments) and RTP (Request to Pay) - transaction records.
 * ISO 20022 Pain.001/Pain.002 (RPP) and Pain.013/Pain.014 (RTP).
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

module.exports = (sequelize, DataTypes) => {
  const StandardBankTransaction = sequelize.define('StandardBankTransaction', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    transactionId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Standard Bank transaction ID / UETR',
    },
    merchantTransactionId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      comment: 'Our internal transaction ID',
    },
    originalMessageId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'msgId from Pain.001/Pain.013',
    },
    type: {
      type: DataTypes.STRING(16),
      allowNull: false,
      comment: 'rpp or rtp',
    },
    direction: {
      type: DataTypes.STRING(16),
      allowNull: false,
      comment: 'credit or debit',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ZAR',
    },
    referenceNumber: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'MSISDN or float account reference',
    },
    accountType: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: 'wallet, supplier_float, client_float, etc.',
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: { model: 'wallets', key: 'walletId' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'initiated',
      comment: 'initiated, processing, pending, completed, failed, rejected, expired, cancelled',
    },
    standardBankReference: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    bankAccountNumber: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    bankCode: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rawRequest: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    rawResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    webhookReceivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'standard_bank_transactions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      { fields: ['transactionId'], name: 'idx_sb_transactions_transaction_id' },
      { fields: ['originalMessageId'], name: 'idx_sb_transactions_original_message_id' },
      { fields: ['userId'], name: 'idx_sb_transactions_user_id' },
      { fields: ['status'], name: 'idx_sb_transactions_status' },
      { fields: ['createdAt'], name: 'idx_sb_transactions_created_at' },
    ],
  });

  StandardBankTransaction.associate = (models) => {
    StandardBankTransaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    StandardBankTransaction.belongsTo(models.Wallet, {
      foreignKey: 'walletId',
      targetKey: 'walletId',
      as: 'wallet',
    });
    StandardBankTransaction.hasOne(models.StandardBankRtpRequest, {
      foreignKey: 'standardBankTransactionId',
      as: 'rtpRequest',
    });
  };

  return StandardBankTransaction;
};
