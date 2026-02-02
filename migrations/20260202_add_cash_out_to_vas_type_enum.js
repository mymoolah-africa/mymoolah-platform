'use strict';

/**
 * Migration: Add 'cash_out' to vasType ENUM
 * 
 * Adds cash_out as a valid value to enum_vas_products_vasType to properly
 * categorize cash-out services (Flash Eezi Cash, EasyPay Cash-out).
 * 
 * Banking-Grade Rationale:
 * - Cash-out services are distinct from vouchers (different regulatory category)
 * - Mojaloop compliance requires proper transaction categorization
 * - Enables accurate financial reporting and reconciliation
 * - Supports future cash-out service expansions
 * 
 * Impact:
 * - VasProduct table: Can now use vasType = 'cash_out'
 * - VasTransaction table: Can now use vasType = 'cash_out'
 * - No breaking changes (existing data unaffected)
 * 
 * @date 2026-02-02
 * @author MyMoolah Development Team
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding cash_out to vasType ENUM...');
    
    try {
      // PostgreSQL: Add new value to existing ENUM type
      // Note: ALTER TYPE ... ADD VALUE cannot be rolled back in a transaction
      // This is safe because it only adds a new value (doesn't modify existing)
      
      // Add cash_out to enum_vas_products_vasType
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          -- Check if 'cash_out' already exists in enum_vas_products_vasType
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'cash_out' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_vas_products_vasType'
            )
          ) THEN
            -- Add 'cash_out' to the enum
            ALTER TYPE "enum_vas_products_vasType" ADD VALUE 'cash_out';
            RAISE NOTICE 'Added cash_out to enum_vas_products_vasType';
          ELSE
            RAISE NOTICE 'cash_out already exists in enum_vas_products_vasType - skipping';
          END IF;
        END
        $$;
      `);
      
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
      
      console.log('✅ Successfully added cash_out to both vasType ENUMs');
      
      // Verify enum_vas_products_vasType
      const productEnumValues = await queryInterface.sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_vas_products_vasType'
        )
        ORDER BY enumlabel;
      `, { type: Sequelize.QueryTypes.SELECT });
      
      console.log('📊 VasProduct vasType ENUM values:', productEnumValues.map(v => v.enumlabel).join(', '));
      
      // Verify enum_vas_transactions_vasType
      const transactionEnumValues = await queryInterface.sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_vas_transactions_vasType'
        )
        ORDER BY enumlabel;
      `, { type: Sequelize.QueryTypes.SELECT });
      
      console.log('📊 VasTransaction vasType ENUM values:', transactionEnumValues.map(v => v.enumlabel).join(', '));
      
      const productHasCashOut = productEnumValues.some(v => v.enumlabel === 'cash_out');
      const transactionHasCashOut = transactionEnumValues.some(v => v.enumlabel === 'cash_out');
      
      if (!productHasCashOut || !transactionHasCashOut) {
        throw new Error('Failed to add cash_out to one or both vasType ENUMs');
      }
      
      console.log('✅ Verification passed: cash_out is now a valid vasType value in both tables');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  WARNING: Cannot safely remove enum value in PostgreSQL');
    console.log('ℹ️  Rollback not supported for enum value additions');
    console.log('ℹ️  If you need to remove cash_out, you must:');
    console.log('   1. Ensure no data uses vasType = cash_out');
    console.log('   2. Manually recreate the enum type without cash_out');
    console.log('   3. This is a destructive operation - use with caution');
    
    // Do not attempt automatic rollback - this could break production data
    // Manual intervention required if rollback is truly needed
    
    return Promise.resolve();
  }
};
