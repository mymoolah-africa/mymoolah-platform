'use strict';

/**
 * Migration: Transform EasyPay Vouchers to Top-up @ EasyPay
 *
 * This migration completely transforms the existing EasyPay voucher system
 * from "buy voucher, then pay at store" to "create top-up request, pay at store".
 *
 * Changes:
 * - Updates existing 'easypay_pending' vouchers to 'easypay_topup'
 * - Updates existing 'easypay_active' vouchers to 'easypay_topup_active'
 * - Adds new ENUM values to voucherType
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting EasyPay to Top-up @ EasyPay transformation...');

    // First, check if ENUM exists and add the new ENUM values
    console.log('📝 Adding new voucher types to ENUM...');
    
    // Check if ENUM type exists
    const [enumCheck] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_vouchers_voucherType'
      ) as exists;
    `);

    if (enumCheck[0].exists) {
      // Check if values already exist before adding
      const [topupCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_topup' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vouchers_voucherType')
        ) as exists;
      `);

      if (!topupCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_vouchers_voucherType" ADD VALUE 'easypay_topup';
        `);
        console.log('✅ Added easypay_topup to ENUM');
      } else {
        console.log('ℹ️  easypay_topup already exists in ENUM');
      }

      const [topupActiveCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_topup_active' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vouchers_voucherType')
        ) as exists;
      `);

      if (!topupActiveCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_vouchers_voucherType" ADD VALUE 'easypay_topup_active';
        `);
        console.log('✅ Added easypay_topup_active to ENUM');
      } else {
        console.log('ℹ️  easypay_topup_active already exists in ENUM');
      }
    } else {
      console.log('⚠️  ENUM type enum_vouchers_voucherType does not exist. Skipping ENUM value addition.');
      console.log('   This migration may have already been run or the schema is different.');
    }

    // Detect column name (vouchers table uses 'type' not 'voucherType')
    const [colCheck] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'vouchers' AND column_name IN ('voucherType', 'type')
    `);
    const typeCol = colCheck.find(c => c.column_name === 'voucherType') ? 'voucherType' : 'type';
    console.log(`📋 Using column: ${typeCol}`);

    // Update existing voucher types
    console.log('🔄 Transforming existing EasyPay vouchers...');

    // Update pending EasyPay vouchers to topup type
    const [pendingResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "${typeCol}" = 'easypay_topup'
      WHERE "${typeCol}" = 'easypay_pending'
      AND status = 'pending_payment';
    `);

    console.log(`✅ Updated ${pendingResults.rowCount || 0} pending EasyPay vouchers to 'easypay_topup'`);

    // Update active EasyPay vouchers to topup_active type
    const [activeResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "${typeCol}" = 'easypay_topup_active'
      WHERE "${typeCol}" = 'easypay_active'
      AND status = 'active';
    `);

    console.log(`✅ Updated ${activeResults.rowCount || 0} active EasyPay vouchers to 'easypay_topup_active'`);

    // Verify the transformation
    const [verificationResults] = await queryInterface.sequelize.query(`
      SELECT "${typeCol}" as voucher_type, status, COUNT(*) as count
      FROM vouchers
      WHERE "${typeCol}" LIKE 'easypay%'
      GROUP BY "${typeCol}", status
      ORDER BY "${typeCol}", status;
    `);

    console.log('📊 Voucher type distribution after transformation:');
    verificationResults.forEach(row => {
      console.log(`  ${row.voucher_type} (${row.status}): ${row.count} vouchers`);
    });

    console.log('✅ EasyPay to Top-up @ EasyPay transformation completed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting EasyPay to Top-up @ EasyPay transformation...');

    // Detect column name
    const [colCheck] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'vouchers' AND column_name IN ('voucherType', 'type')
    `);
    const typeCol = colCheck.find(c => c.column_name === 'voucherType') ? 'voucherType' : 'type';

    // Revert voucher types back to original
    const [activeResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "${typeCol}" = 'easypay_active'
      WHERE "${typeCol}" = 'easypay_topup_active';
    `);

    const [pendingResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "${typeCol}" = 'easypay_pending'
      WHERE "${typeCol}" = 'easypay_topup';
    `);

    console.log(`✅ Reverted ${activeResults.rowCount || 0} active and ${pendingResults.rowCount || 0} pending vouchers`);

    // Note: ENUM values cannot be removed in PostgreSQL, so we leave them

    console.log('✅ Reversion completed successfully!');
  }
};