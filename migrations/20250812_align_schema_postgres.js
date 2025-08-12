'use strict';

/**
 * Align Postgres schema with current Sequelize models.
 * - Adds any missing columns on users, wallets, vouchers.
 * - Safe to run repeatedly (checks existing columns first).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // USERS
    const usersCols = await queryInterface.describeTable('users');

    const ensureUser = async (name, def) => {
      if (!usersCols[name]) {
        await queryInterface.addColumn('users', name, def);
      }
    };

    await ensureUser('kycStatus', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'not_started',
    });
    await ensureUser('kycVerifiedAt', { type: Sequelize.DATE, allowNull: true });
    await ensureUser('kycVerifiedBy', { type: Sequelize.INTEGER, allowNull: true });
    await ensureUser('lastLoginAt', { type: Sequelize.DATE, allowNull: true });
    await ensureUser('loginAttempts', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await ensureUser('lockedUntil', { type: Sequelize.DATE, allowNull: true });

    // WALLETS
    const walletsCols = await queryInterface.describeTable('wallets');
    const ensureWallet = async (name, def) => {
      if (!walletsCols[name]) {
        await queryInterface.addColumn('wallets', name, def);
      }
    };

    await ensureWallet('currency', { type: Sequelize.STRING, allowNull: false, defaultValue: 'ZAR' });
    await ensureWallet('dailyLimit', { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 100000.00 });
    await ensureWallet('monthlyLimit', { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 1000000.00 });
    await ensureWallet('dailySpent', { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 });
    await ensureWallet('monthlySpent', { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 });
    await ensureWallet('lastTransactionAt', { type: Sequelize.DATE, allowNull: true });

    // VOUCHERS
    const vouchersCols = await queryInterface.describeTable('vouchers');
    const ensureVoucher = async (name, def) => {
      if (!vouchersCols[name]) {
        await queryInterface.addColumn('vouchers', name, def);
      }
    };

    await ensureVoucher('easyPayCode', { type: Sequelize.TEXT, allowNull: true });
    await ensureVoucher('balance', { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 });
    await ensureVoucher('metadata', { type: Sequelize.JSONB || Sequelize.JSON, allowNull: true });
    await ensureVoucher('redemptionCount', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await ensureVoucher('maxRedemptions', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 });
  },

  down: async (queryInterface /*, Sequelize */) => {
    // Reversible: remove only columns we might have added.
    const usersCols = await queryInterface.describeTable('users');
    const dropUser = async (name) => { if (usersCols[name]) { await queryInterface.removeColumn('users', name); } };
    await dropUser('kycStatus');
    await dropUser('kycVerifiedAt');
    await dropUser('kycVerifiedBy');
    await dropUser('lastLoginAt');
    await dropUser('loginAttempts');
    await dropUser('lockedUntil');

    const walletsCols = await queryInterface.describeTable('wallets');
    const dropWallet = async (name) => { if (walletsCols[name]) { await queryInterface.removeColumn('wallets', name); } };
    await dropWallet('currency');
    await dropWallet('dailyLimit');
    await dropWallet('monthlyLimit');
    await dropWallet('dailySpent');
    await dropWallet('monthlySpent');
    await dropWallet('lastTransactionAt');

    const vouchersCols = await queryInterface.describeTable('vouchers');
    const dropVoucher = async (name) => { if (vouchersCols[name]) { await queryInterface.removeColumn('vouchers', name); } };
    await dropVoucher('easyPayCode');
    await dropVoucher('balance');
    await dropVoucher('metadata');
    await dropVoucher('redemptionCount');
    await dropVoucher('maxRedemptions');
  }
};


