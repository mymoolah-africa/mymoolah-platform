'use strict';

/**
 * Migration: Create VALR float account in general ledger
 * 
 * Creates ledger account and supplier float record for VALR cryptocurrency exchange.
 * Follows same pattern as EasyPay, MobileMart, and Zapper float accounts.
 * 
 * Account Code: 1200-10-06 (VALR USDC Float)
 * Parent: 1200-10 (Supplier Float Accounts)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Creating VALR float account in ledger...');
    
    // Check if ledger account already exists
    const [existingAccount] = await queryInterface.sequelize.query(
      `SELECT id FROM ledger_accounts WHERE account_code = '1200-10-06'`
    );
    
    if (existingAccount.length === 0) {
      // Create VALR float ledger account
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
          '1200-10-06',
          'VALR USDC Float',
          'asset',
          '1200-10',
          true,
          'VALR cryptocurrency exchange float account for USDC purchases and transfers',
          NOW(),
          NOW()
        )
      `);
      console.log('✅ VALR float ledger account created: 1200-10-06');
    } else {
      console.log('ℹ️  VALR float ledger account already exists');
    }

    // Check if supplier float record already exists
    const [existingFloat] = await queryInterface.sequelize.query(
      `SELECT id FROM supplier_floats WHERE supplier_code = 'VALR'`
    );
    
    if (existingFloat.length === 0) {
      // Create supplier float record for monitoring
      await queryInterface.sequelize.query(`
        INSERT INTO supplier_floats (
          supplier_code,
          supplier_name,
          ledger_account_code,
          minimum_balance,
          warning_threshold,
          critical_threshold,
          currency,
          is_active,
          alert_email,
          created_at,
          updated_at
        ) VALUES (
          'VALR',
          'VALR',
          '1200-10-06',
          10000,
          15000,
          10500,
          'ZAR',
          true,
          'finance@mymoolah.africa',
          NOW(),
          NOW()
        )
      `);
      console.log('✅ VALR supplier float record created with R100 minimum (UAT)');
    } else {
      console.log('ℹ️  VALR supplier float record already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing VALR supplier float record...');
    await queryInterface.sequelize.query(
      `DELETE FROM supplier_floats WHERE supplier_code = 'VALR'`
    );
    
    console.log('Removing VALR float ledger account...');
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE account_code = '1200-10-06'`
    );
    
    console.log('✅ VALR float account removed');
  }
};
