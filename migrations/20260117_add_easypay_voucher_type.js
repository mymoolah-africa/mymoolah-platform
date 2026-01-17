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

    // Step 1: Find the actual ENUM type name used by the vouchers table
    console.log('📝 Finding voucherType ENUM type...');
    
    // First, try to find the ENUM type by checking the column definition
    const [columnInfo] = await queryInterface.sequelize.query(`
      SELECT udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'vouchers' 
      AND column_name = 'voucherType';
    `);
    
    let enumTypeName = null;
    
    if (columnInfo.length > 0 && columnInfo[0].udt_name) {
      enumTypeName = columnInfo[0].udt_name;
      console.log(`✅ Found ENUM type from column: ${enumTypeName}`);
    } else {
      // Fallback: try the standard naming convention
      enumTypeName = 'enum_vouchers_voucherType';
      console.log(`ℹ️  Using standard ENUM name: ${enumTypeName}`);
    }
    
    // Verify the ENUM type exists
    const [enumCheck] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = $1
      ) as exists;
    `, {
      bind: [enumTypeName],
      type: Sequelize.QueryTypes.SELECT
    });

    if (enumCheck[0].exists) {
      // Check if value already exists before adding
      const [voucherCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_voucher' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
        ) as exists;
      `, {
        bind: [enumTypeName],
        type: Sequelize.QueryTypes.SELECT
      });

      if (!voucherCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE "${enumTypeName}" ADD VALUE 'easypay_voucher';
        `);
        console.log(`✅ Added easypay_voucher to ENUM (${enumTypeName})`);
      } else {
        console.log(`ℹ️  easypay_voucher already exists in ENUM (${enumTypeName})`);
      }
    } else {
      console.log(`⚠️  ENUM type ${enumTypeName} does not exist.`);
      console.log('   Attempting to find alternative ENUM names...');
      
      // Try to find any ENUM with "voucher" in the name
      const [alternativeEnums] = await queryInterface.sequelize.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e' 
        AND typname LIKE '%voucher%'
        ORDER BY typname;
      `);
      
      if (alternativeEnums.length > 0) {
        console.log(`   Found alternative ENUM types: ${alternativeEnums.map(e => e.typname).join(', ')}`);
        console.log('   ⚠️  Please verify the correct ENUM type name and update the migration if needed.');
      } else {
        console.log('   ⚠️  No ENUM types found with "voucher" in the name.');
        console.log('   This migration may have already been run or the schema is different.');
      }
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
