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
      `SELECT id FROM ledger_accounts WHERE account_code = '4100-01-06'`
    );
    
    if (existingAccount.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO ledger_accounts (
          account_code,
          account_name,
          account_type,
          parent_account_code,
          is_active,
          description,
          created_at,
          updated_at
        ) VALUES (
          '4100-01-06',
          'USDC Transaction Fee Revenue',
          'revenue',
          '4100-01',
          true,
          'Revenue from USDC purchase and transfer fees (7.5% incl VAT)',
          NOW(),
          NOW()
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
      `DELETE FROM ledger_accounts WHERE account_code = '4100-01-06'`
    );
    console.log('✅ USDC fee revenue account removed');
  }
};
