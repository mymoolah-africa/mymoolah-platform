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

    // First, add the new ENUM values
    console.log('📝 Adding new voucher types to ENUM...');
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_vouchers_voucherType" ADD VALUE IF NOT EXISTS 'easypay_topup';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_vouchers_voucherType" ADD VALUE IF NOT EXISTS 'easypay_topup_active';
    `);

    // Update existing voucher types
    console.log('🔄 Transforming existing EasyPay vouchers...');

    // Update pending EasyPay vouchers to topup type
    const [pendingResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "voucherType" = 'easypay_topup'
      WHERE "voucherType" = 'easypay_pending'
      AND status = 'pending_payment';
    `);

    console.log(`✅ Updated ${pendingResults.rowCount || 0} pending EasyPay vouchers to 'easypay_topup'`);

    // Update active EasyPay vouchers to topup_active type
    const [activeResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "voucherType" = 'easypay_topup_active'
      WHERE "voucherType" = 'easypay_active'
      AND status = 'active';
    `);

    console.log(`✅ Updated ${activeResults.rowCount || 0} active EasyPay vouchers to 'easypay_topup_active'`);

    // Verify the transformation
    const [verificationResults] = await queryInterface.sequelize.query(`
      SELECT "voucherType", status, COUNT(*) as count
      FROM vouchers
      WHERE "voucherType" LIKE 'easypay%'
      GROUP BY "voucherType", status
      ORDER BY "voucherType", status;
    `);

    console.log('📊 Voucher type distribution after transformation:');
    verificationResults.forEach(row => {
      console.log(`  ${row.voucherType} (${row.status}): ${row.count} vouchers`);
    });

    console.log('✅ EasyPay to Top-up @ EasyPay transformation completed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting EasyPay to Top-up @ EasyPay transformation...');

    // Revert voucher types back to original
    const [activeResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "voucherType" = 'easypay_active'
      WHERE "voucherType" = 'easypay_topup_active';
    `);

    const [pendingResults] = await queryInterface.sequelize.query(`
      UPDATE vouchers
      SET "voucherType" = 'easypay_pending'
      WHERE "voucherType" = 'easypay_topup';
    `);

    console.log(`✅ Reverted ${activeResults.rowCount || 0} active and ${pendingResults.rowCount || 0} pending vouchers`);

    // Note: ENUM values cannot be removed in PostgreSQL, so we leave them

    console.log('✅ Reversion completed successfully!');
  }
};