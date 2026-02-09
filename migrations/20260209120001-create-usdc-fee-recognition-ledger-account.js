'use strict';

/**
 * Migration: Create USDC Fee Recognition ledger account (temporary for fee allocation)
 *
 * Used when allocating the 7.5% USDC transaction fee (VAT inclusive) from clearing to revenue and VAT.
 * Account Code: 9999-00-02 (USDC Fee Recognition - temporary/clearing)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Creating USDC Fee Recognition ledger account...');

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM ledger_accounts WHERE code = '9999-00-02'`
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
          '9999-00-02',
          'USDC Fee Recognition',
          'asset',
          'debit',
          true
        )
      `);
      console.log('✅ USDC Fee Recognition ledger account created: 9999-00-02');
    } else {
      console.log('ℹ️  USDC Fee Recognition ledger account already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE code = '9999-00-02'`
    );
    console.log('✅ USDC Fee Recognition ledger account removed');
  }
};
