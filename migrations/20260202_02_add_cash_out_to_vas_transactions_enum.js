'use strict';

/**
 * Migration: Add 'cash_out' to VasTransaction vasType ENUM
 * 
 * This is Part 2 of the cash_out enum migration.
 * Part 1 (20260202_add_cash_out_to_vas_type_enum.js) added to vas_products
 * Part 2 (this file) adds to vas_transactions
 * 
 * @date 2026-02-02
 * @author MyMoolah Development Team
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding cash_out to VasTransaction vasType ENUM...');
    
    try {
      // Add cash_out to enum_vas_transactions_vasType
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          -- Check if 'cash_out' already exists in enum_vas_transactions_vasType
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'cash_out' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_vas_transactions_vasType'
            )
          ) THEN
            -- Add 'cash_out' to the enum
            ALTER TYPE "enum_vas_transactions_vasType" ADD VALUE 'cash_out';
            RAISE NOTICE 'Added cash_out to enum_vas_transactions_vasType';
          ELSE
            RAISE NOTICE 'cash_out already exists in enum_vas_transactions_vasType - skipping';
          END IF;
        END
        $$;
      `);
      
      console.log('✅ Successfully added cash_out to VasTransaction vasType ENUM');
      
      // Verify the enum now includes cash_out
      const transactionEnumValues = await queryInterface.sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_vas_transactions_vasType'
        )
        ORDER BY enumlabel;
      `, { type: Sequelize.QueryTypes.SELECT });
      
      console.log('📊 VasTransaction vasType ENUM values:', transactionEnumValues.map(v => v.enumlabel).join(', '));
      
      const hasCashOut = transactionEnumValues.some(v => v.enumlabel === 'cash_out');
      if (!hasCashOut) {
        throw new Error('Failed to add cash_out to VasTransaction vasType ENUM');
      }
      
      console.log('✅ Verification passed: cash_out is now a valid VasTransaction vasType value');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  WARNING: Cannot safely remove enum value in PostgreSQL');
    console.log('ℹ️  Rollback not supported for enum value additions');
    
    return Promise.resolve();
  }
};
