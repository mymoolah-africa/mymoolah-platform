'use strict';

/**
 * Migration: Create standard_bank_transactions table
 * For SBSA PayShap RPP (outbound payments) and RTP (Request to Pay) integration.
 * ISO 20022 Pain.001/Pain.002 (RPP) and Pain.013/Pain.014 (RTP).
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('standard_bank_transactions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      transactionId: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Standard Bank transaction ID / UETR',
      },
      merchantTransactionId: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
        comment: 'Our internal transaction ID',
      },
      originalMessageId: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'msgId from Pain.001/Pain.013',
      },
      type: {
        type: Sequelize.STRING(16),
        allowNull: false,
        comment: 'rpp or rtp',
      },
      direction: {
        type: Sequelize.STRING(16),
        allowNull: false,
        comment: 'credit or debit',
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
        comment: 'MSISDN or float account reference',
      },
      accountType: {
        type: Sequelize.STRING(32),
        allowNull: true,
        comment: 'wallet, supplier_float, client_float, etc.',
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      walletId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'wallets', key: 'walletId' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'initiated',
        comment: 'initiated, processing, pending, completed, failed, rejected, expired, cancelled',
      },
      standardBankReference: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      bankAccountNumber: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      bankCode: {
        type: Sequelize.STRING(16),
        allowNull: true,
      },
      bankName: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('standard_bank_transactions', ['transactionId'], {
      name: 'idx_sb_transactions_transaction_id',
    });
    await queryInterface.addIndex('standard_bank_transactions', ['originalMessageId'], {
      name: 'idx_sb_transactions_original_message_id',
    });
    await queryInterface.addIndex('standard_bank_transactions', ['userId'], {
      name: 'idx_sb_transactions_user_id',
    });
    await queryInterface.addIndex('standard_bank_transactions', ['status'], {
      name: 'idx_sb_transactions_status',
    });
    await queryInterface.addIndex('standard_bank_transactions', ['createdAt'], {
      name: 'idx_sb_transactions_created_at',
    });

    console.log('✅ standard_bank_transactions table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('standard_bank_transactions');
    console.log('✅ standard_bank_transactions table dropped');
  },
};
