'use strict';

/**
 * StandardBankRtpRequest model
 * SBSA PayShap RTP (Request to Pay) - inbound payment request records.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

module.exports = (sequelize, DataTypes) => {
  const StandardBankRtpRequest = sequelize.define('StandardBankRtpRequest', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    requestId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      comment: 'UETR from Pain.013',
    },
    merchantTransactionId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    originalMessageId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'wallets', key: 'walletId' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
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
      comment: 'MSISDN for wallet allocation',
    },
    payerName: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    payerMobileNumber: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    payerAccountNumber: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    payerBankCode: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    payerBankName: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'pending, initiated, presented, paid, rejected, cancelled, declined, expired',
    },
    standardBankTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'standard_bank_transactions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'standard_bank_rtp_requests',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      { fields: ['requestId'], name: 'idx_sb_rtp_requests_request_id' },
      { fields: ['userId'], name: 'idx_sb_rtp_requests_user_id' },
      { fields: ['status'], name: 'idx_sb_rtp_requests_status' },
    ],
  });

  StandardBankRtpRequest.associate = (models) => {
    StandardBankRtpRequest.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    StandardBankRtpRequest.belongsTo(models.Wallet, {
      foreignKey: 'walletId',
      targetKey: 'walletId',
      as: 'wallet',
    });
    StandardBankRtpRequest.belongsTo(models.StandardBankTransaction, {
      foreignKey: 'standardBankTransactionId',
      as: 'standardBankTransaction',
    });
  };

  return StandardBankRtpRequest;
};
