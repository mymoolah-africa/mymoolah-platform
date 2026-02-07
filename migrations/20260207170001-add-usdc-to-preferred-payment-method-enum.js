'use strict';

/**
 * Migration: Add 'usdc' and 'crypto' to preferredPaymentMethod ENUM
 * 
 * Separate migration for the second ENUM that was discovered during testing.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding usdc and crypto to enum_beneficiaries_preferredPaymentMethod...');
    
    try {
      // Add 'usdc' to ENUM if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'usdc' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_beneficiaries_preferredPaymentMethod'
            )
          ) THEN
            ALTER TYPE "enum_beneficiaries_preferredPaymentMethod" ADD VALUE 'usdc';
          END IF;
        END $$;
      `);
      console.log('✅ Added usdc to preferredPaymentMethod ENUM');
      
      // Add 'crypto' to ENUM if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'crypto' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_beneficiaries_preferredPaymentMethod'
            )
          ) THEN
            ALTER TYPE "enum_beneficiaries_preferredPaymentMethod" ADD VALUE 'crypto';
          END IF;
        END $$;
      `);
      console.log('✅ Added crypto to preferredPaymentMethod ENUM');
      
    } catch (error) {
      console.error('❌ Failed to add ENUM values:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  Cannot remove ENUM values in PostgreSQL');
  }
};
