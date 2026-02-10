'use strict';

/**
 * Migration: Create NFC Deposit tables (Phase 1)
 *
 * Creates nfc_deposit_intents and nfc_callback_logs for tap-to-deposit flow.
 * paymentReference = MSISDN (user mobile) for Standard Bank T-PPP allocation.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('nfc_deposit_intents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      currencyCode: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'ZAR',
      },
      paymentReference: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'MSISDN (user mobile) for Standard Bank T-PPP allocation',
      },
      consumerTransactionId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'From Halo Intent API response',
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
      },
      haloEnv: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'dev, qa, prod',
      },
      completedAt: {
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

    await queryInterface.addIndex('nfc_deposit_intents', ['paymentReference'], {
      unique: true,
      name: 'idx_nfc_deposit_intents_payment_reference',
    });
    await queryInterface.addIndex('nfc_deposit_intents', ['userId'], {
      name: 'idx_nfc_deposit_intents_user_id',
    });
    await queryInterface.addIndex('nfc_deposit_intents', ['status'], {
      name: 'idx_nfc_deposit_intents_status',
    });

    await queryInterface.createTable('nfc_callback_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      paymentReference: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      rawPayload: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'For debugging - redact PAN',
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      walletCredited: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('nfc_callback_logs', ['paymentReference'], {
      name: 'idx_nfc_callback_logs_payment_reference',
    });

    console.log('✅ nfc_deposit_intents and nfc_callback_logs tables created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('nfc_callback_logs');
    await queryInterface.dropTable('nfc_deposit_intents');
    console.log('✅ NFC deposit tables dropped');
  },
};
