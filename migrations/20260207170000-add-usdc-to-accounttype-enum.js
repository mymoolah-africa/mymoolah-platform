'use strict';

/**
 * Migration: Add 'usdc' and 'crypto' values to accountType ENUM
 * 
 * The beneficiaries.accountType column uses a PostgreSQL ENUM.
 * This migration adds 'usdc' and 'crypto' as valid values.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding usdc and crypto to enum_beneficiaries_accountType...');
    
    try {
      // Add 'usdc' to ENUM if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'usdc' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_beneficiaries_accountType'
            )
          ) THEN
            ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE 'usdc';
          END IF;
        END $$;
      `);
      console.log('✅ Added usdc to accountType ENUM');
      
      // Add 'crypto' to ENUM if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'crypto' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_beneficiaries_accountType'
            )
          ) THEN
            ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE 'crypto';
          END IF;
        END $$;
      `);
      console.log('✅ Added crypto to accountType ENUM');
      
    } catch (error) {
      console.error('❌ Failed to add ENUM values:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  Cannot remove ENUM values in PostgreSQL');
    console.log('ENUM values usdc and crypto will remain in the database');
    console.log('This is a PostgreSQL limitation - ENUM values cannot be removed');
    // PostgreSQL doesn't support removing ENUM values
    // The values will remain but won't be used if rolled back
  }
};
