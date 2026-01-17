'use strict';

/**
 * Migration: Add EasyPay Voucher Type
 *
 * This migration adds support for standalone EasyPay vouchers:
 * - Adds new ENUM value: 'easypay_voucher'
 * - This is a distinct type from top-up and cash-out EasyPay vouchers
 * - Vouchers of this type are active immediately (like MMVoucher)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting EasyPay Voucher type addition...');

    // Step 1: Add new voucher type to ENUM
    console.log('📝 Adding easypay_voucher type to ENUM...');
    
    // Check if ENUM type exists
    const [enumCheck] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_vouchers_voucherType'
      ) as exists;
    `);

    if (enumCheck[0].exists) {
      // Check if value already exists before adding
      const [voucherCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_voucher' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vouchers_voucherType')
        ) as exists;
      `);

      if (!voucherCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_vouchers_voucherType" ADD VALUE 'easypay_voucher';
        `);
        console.log('✅ Added easypay_voucher to ENUM');
      } else {
        console.log('ℹ️  easypay_voucher already exists in ENUM');
      }
    } else {
      console.log('⚠️  ENUM type enum_vouchers_voucherType does not exist. Skipping ENUM value addition.');
      console.log('   This migration may have already been run or the schema is different.');
    }

    console.log('✅ EasyPay Voucher type addition completed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting EasyPay Voucher type addition...');

    // Note: ENUM values cannot be removed in PostgreSQL, so we leave them
    console.log('ℹ️  Note: ENUM value (easypay_voucher) remains in database');
    console.log('   PostgreSQL does not support removing ENUM values');

    console.log('✅ Reversion completed successfully!');
  }
};
