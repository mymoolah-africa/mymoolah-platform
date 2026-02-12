'use strict';

/**
 * Migration: Create standard_bank_rtp_requests table
 * For SBSA PayShap RTP (Request to Pay) - tracks inbound payment requests.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('standard_bank_rtp_requests', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      requestId: {
        type: Sequelize.STRING(64),
        allowNull: true,
        unique: true,
        comment: 'UETR from Pain.013',
      },
      merchantTransactionId: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      originalMessageId: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      walletId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'wallets', key: 'walletId' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'ZAR',
      },
      referenceNumber: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'MSISDN for wallet allocation',
      },
      payerName: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      payerMobileNumber: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      payerAccountNumber: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      payerBankCode: {
        type: Sequelize.STRING(16),
        allowNull: true,
      },
      payerBankName: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending, accepted, completed, rejected, expired, cancelled',
      },
      standardBankTransactionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'standard_bank_transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rawRequest: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      rawResponse: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      webhookReceivedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('standard_bank_rtp_requests', ['requestId'], {
      name: 'idx_sb_rtp_requests_request_id',
    });
    await queryInterface.addIndex('standard_bank_rtp_requests', ['userId'], {
      name: 'idx_sb_rtp_requests_user_id',
    });
    await queryInterface.addIndex('standard_bank_rtp_requests', ['status'], {
      name: 'idx_sb_rtp_requests_status',
    });

    console.log('✅ standard_bank_rtp_requests table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('standard_bank_rtp_requests');
    console.log('✅ standard_bank_rtp_requests table dropped');
  },
};
