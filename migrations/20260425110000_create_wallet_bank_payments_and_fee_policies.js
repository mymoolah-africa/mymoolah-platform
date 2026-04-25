'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transaction_fee_policies', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      transaction_type: { type: Sequelize.STRING(64), allowNull: false },
      rail: { type: Sequelize.STRING(32), allowNull: false },
      channel: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'wallet' },
      customer_tier: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'all' },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      fee_type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'flat' },
      fixed_fee: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      percentage_fee_bps: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      min_fee: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      max_fee: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      effective_from: { type: Sequelize.DATE, allowNull: false },
      effective_to: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'active' },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('transaction_fee_policies', ['transaction_type', 'rail', 'channel', 'customer_tier', 'currency'], {
      name: 'idx_fee_policies_lookup',
    });
    await queryInterface.addIndex('transaction_fee_policies', ['effective_from', 'effective_to'], {
      name: 'idx_fee_policies_effective_dates',
    });
    await queryInterface.addIndex('transaction_fee_policies', ['status'], {
      name: 'idx_fee_policies_status',
    });

    await queryInterface.createTable('wallet_bank_payments', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      payment_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      wallet_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'wallets', key: 'walletId' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      beneficiary_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'beneficiary_payment_methods', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rail: { type: Sequelize.STRING(16), allowNull: false },
      status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'pending' },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      fee_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      total_debit: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      bank_name: { type: Sequelize.STRING(80), allowNull: true },
      account_number_last4: { type: Sequelize.STRING(4), allowNull: true },
      branch_code: { type: Sequelize.STRING(16), allowNull: true },
      reference: { type: Sequelize.STRING(80), allowNull: true },
      pain001_msg_id: { type: Sequelize.STRING(80), allowNull: true },
      end_to_end_id: { type: Sequelize.STRING(80), allowNull: true },
      pain001_filename: { type: Sequelize.STRING(160), allowNull: true },
      standard_bank_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'standard_bank_transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rejection_code: { type: Sequelize.STRING(32), allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      reversed_at: { type: Sequelize.DATE, allowNull: true },
      fee_snapshot: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      settlement_estimate: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('wallet_bank_payments', ['user_id', 'createdAt'], {
      name: 'idx_wallet_bank_payments_user_created',
    });
    await queryInterface.addIndex('wallet_bank_payments', ['pain001_msg_id'], {
      name: 'idx_wallet_bank_payments_msg_id',
    });
    await queryInterface.addIndex('wallet_bank_payments', ['end_to_end_id'], {
      name: 'idx_wallet_bank_payments_end_to_end_id',
    });
    await queryInterface.addIndex('wallet_bank_payments', ['status'], {
      name: 'idx_wallet_bank_payments_status',
    });

    await queryInterface.bulkInsert('transaction_fee_policies', [
      {
        code: 'WALLET_BANK_EFT_UAT_FLAT_R2',
        transaction_type: 'wallet_bank_payment',
        rail: 'eft',
        channel: 'wallet',
        customer_tier: 'all',
        currency: 'ZAR',
        fee_type: 'flat',
        fixed_fee: 2.00,
        percentage_fee_bps: 0,
        effective_from: new Date('2026-04-25T00:00:00.000Z'),
        status: 'active',
        metadata: { launchPolicy: 'UAT', editableFromMMAP: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wallet_bank_payments');
    await queryInterface.dropTable('transaction_fee_policies');
  },
};
