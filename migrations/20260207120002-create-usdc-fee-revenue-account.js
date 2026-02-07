'use strict';

/**
 * Migration: Create USDC fee revenue account in general ledger
 * 
 * Creates revenue account for USDC transaction fees (7.5% incl VAT).
 * Follows same pattern as other fee revenue accounts.
 * 
 * Account Code: 4100-01-06 (USDC Transaction Fee Revenue)
 * Parent: 4100-01 (Transaction Fee Revenue)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Creating USDC fee revenue account in ledger...');
    
    // Check if account already exists
    const [existingAccount] = await queryInterface.sequelize.query(
      `SELECT id FROM ledger_accounts WHERE code = '4100-01-06'`
    );
    
    if (existingAccount.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO ledger_accounts (
          code,
          name,
          type,
          "normalSide",
          "isActive"
        ) VALUES (
          '4100-01-06',
          'USDC Transaction Fee Revenue',
          'revenue',
          'credit',
          true
        )
      `);
      console.log('✅ USDC fee revenue account created: 4100-01-06');
    } else {
      console.log('ℹ️  USDC fee revenue account already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing USDC fee revenue account...');
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE code = '4100-01-06'`
    );
    console.log('✅ USDC fee revenue account removed');
  }
};
