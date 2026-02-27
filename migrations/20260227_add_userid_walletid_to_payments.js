'use strict';

/**
 * Migration: Add userId and walletId to payments table
 *
 * User.hasMany(Payment) and Wallet.hasMany(Payment) expect these foreign keys.
 * EasyPay payments leave them null (user credited at paymentNotification).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('payments');

    if (!tableDesc.userId) {
      await queryInterface.addColumn('payments', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who owns the payment (null for EasyPay until credited)'
      });
    }

    if (!tableDesc.walletId) {
      await queryInterface.addColumn('payments', 'walletId', {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: { model: 'wallets', key: 'walletId' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Wallet credited (null for EasyPay until paymentNotification)'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payments', 'userId');
    await queryInterface.removeColumn('payments', 'walletId');
  }
};
