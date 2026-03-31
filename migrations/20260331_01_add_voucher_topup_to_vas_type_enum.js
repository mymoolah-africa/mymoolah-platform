'use strict';

/**
 * Migration: Add 'voucher_topup' to vasType ENUM
 *
 * Adds voucher_topup as a valid value to both enum_vas_products_vasType and
 * enum_vas_transactions_vasType for the Flash 1Voucher/FNB/FlashPay wallet
 * deposit feature.
 *
 * @date 2026-03-31
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding voucher_topup to vasType ENUMs...');

    try {
      const [productEnumExists] = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_type WHERE typname = 'enum_vas_products_vasType'`
      );

      if (productEnumExists && productEnumExists.length > 0) {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum
              WHERE enumlabel = 'voucher_topup'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vas_products_vasType')
            ) THEN
              ALTER TYPE "enum_vas_products_vasType" ADD VALUE 'voucher_topup';
              RAISE NOTICE 'Added voucher_topup to enum_vas_products_vasType';
            ELSE
              RAISE NOTICE 'voucher_topup already exists in enum_vas_products_vasType — skipping';
            END IF;
          END
          $$;
        `);
        console.log('✅ Added voucher_topup to enum_vas_products_vasType');
      } else {
        console.log('⚠️  enum_vas_products_vasType does not exist — skipping');
      }

      const [txnEnumExists] = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_type WHERE typname = 'enum_vas_transactions_vasType'`
      );

      if (txnEnumExists && txnEnumExists.length > 0) {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum
              WHERE enumlabel = 'voucher_topup'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vas_transactions_vasType')
            ) THEN
              ALTER TYPE "enum_vas_transactions_vasType" ADD VALUE 'voucher_topup';
              RAISE NOTICE 'Added voucher_topup to enum_vas_transactions_vasType';
            ELSE
              RAISE NOTICE 'voucher_topup already exists in enum_vas_transactions_vasType — skipping';
            END IF;
          END
          $$;
        `);
        console.log('✅ Added voucher_topup to enum_vas_transactions_vasType');
      } else {
        console.log('⚠️  enum_vas_transactions_vasType does not exist — skipping');
      }

      console.log('✅ voucher_topup ENUM value addition completed');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  Cannot safely remove enum value in PostgreSQL');
    console.log('ℹ️  Rollback not supported for enum value additions');
    return Promise.resolve();
  }
};
