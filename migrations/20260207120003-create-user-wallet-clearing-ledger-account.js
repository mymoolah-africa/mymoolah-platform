'use strict';

/**
 * Migration: Create User Wallet Clearing ledger account
 *
 * Creates the ledger account used for user wallet debits/credits in double-entry
 * (e.g. USDC send, ad rewards). Referenced by usdcTransactionService and adService.
 *
 * Account Code: 1100-01-01 (User Wallet Clearing - asset)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Creating User Wallet Clearing ledger account...');

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM ledger_accounts WHERE code = '1100-01-01'`
    );

    if (existing.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO ledger_accounts (
          code,
          name,
          type,
          "normalSide",
          "isActive"
        ) VALUES (
          '1100-01-01',
          'User Wallet Clearing',
          'asset',
          'debit',
          true
        )
      `);
      console.log('✅ User Wallet Clearing ledger account created: 1100-01-01');
    } else {
      console.log('ℹ️  User Wallet Clearing ledger account already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE code = '1100-01-01'`
    );
    console.log('✅ User Wallet Clearing ledger account removed');
  }
};
