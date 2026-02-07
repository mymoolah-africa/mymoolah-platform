'use strict';

/**
 * Migration: Update beneficiaries_msisdn_conditional_check constraint for USDC
 * 
 * The MSISDN check constraint needs to exclude 'usdc' and 'crypto' types
 * (similar to how it excludes 'electricity' and 'biller').
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Updating beneficiaries_msisdn_conditional_check constraint...');
    
    try {
      // Drop the existing constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE beneficiaries 
        DROP CONSTRAINT IF EXISTS beneficiaries_msisdn_conditional_check;
      `);
      console.log('✅ Dropped old constraint');
      
      // Recreate constraint excluding usdc and crypto
      await queryInterface.sequelize.query(`
        ALTER TABLE beneficiaries 
        ADD CONSTRAINT beneficiaries_msisdn_conditional_check 
        CHECK (
          "accountType" IN ('electricity', 'biller', 'usdc', 'crypto') 
          OR (msisdn ~ '^\\+27[0-9]{9}$')
        );
      `);
      console.log('✅ Added new constraint (excludes usdc and crypto from MSISDN validation)');
      
    } catch (error) {
      console.error('❌ Failed to update constraint:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Reverting beneficiaries_msisdn_conditional_check constraint...');
    
    try {
      // Drop the updated constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE beneficiaries 
        DROP CONSTRAINT IF EXISTS beneficiaries_msisdn_conditional_check;
      `);
      
      // Recreate original constraint (without usdc/crypto)
      await queryInterface.sequelize.query(`
        ALTER TABLE beneficiaries 
        ADD CONSTRAINT beneficiaries_msisdn_conditional_check 
        CHECK (
          "accountType" IN ('electricity', 'biller') 
          OR (msisdn ~ '^\\+27[0-9]{9}$')
        );
      `);
      console.log('✅ Reverted to original constraint');
      
    } catch (error) {
      console.error('❌ Failed to revert constraint:', error.message);
      throw error;
    }
  }
};
