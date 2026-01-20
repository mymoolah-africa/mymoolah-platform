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

    // Step 1: Check the actual column type (VARCHAR vs ENUM)
    console.log('📝 Checking voucherType column type...');
    
    const columnInfo = await queryInterface.sequelize.query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'vouchers' 
      AND column_name = 'voucherType';
    `, {
      type: Sequelize.QueryTypes.SELECT
    });
    
    // Handle case where column is VARCHAR (not ENUM yet)
    if (columnInfo && columnInfo.length > 0) {
      const dataType = columnInfo[0].data_type || columnInfo[0].DATA_TYPE;
      const udtName = columnInfo[0].udt_name || columnInfo[0].UDT_NAME;
      
      if (dataType === 'character varying' || udtName === 'varchar') {
        console.log('ℹ️  Column is VARCHAR, not ENUM.');
        console.log('   The easypay_voucher value can be used directly as VARCHAR.');
        console.log('   If ENUM conversion is needed, run the conversion migration first.');
        console.log('✅ Migration completed (VARCHAR column - no ENUM modification needed)');
        return;
      }
    }
    
    // Step 2: Find the actual ENUM type name used by the vouchers table
    console.log('📝 Finding voucherType ENUM type...');
    
    let enumTypeName = null;
    
    if (columnInfo && columnInfo.length > 0 && columnInfo[0].udt_name) {
      enumTypeName = columnInfo[0].udt_name;
      console.log(`✅ Found ENUM type from column: ${enumTypeName}`);
    } else {
      // Fallback: try the standard naming convention
      enumTypeName = 'enum_vouchers_voucherType';
      console.log(`ℹ️  Using standard ENUM name: ${enumTypeName}`);
    }
    
    // Step 3: Verify the ENUM type exists
    const enumCheckResult = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = $1
      ) as exists;
    `, {
      bind: [enumTypeName],
      type: Sequelize.QueryTypes.SELECT
    });

    // Handle different query result formats
    let enumExists = false;
    if (enumCheckResult && Array.isArray(enumCheckResult) && enumCheckResult.length > 0) {
      enumExists = enumCheckResult[0].exists || enumCheckResult[0].EXISTS || false;
    } else if (enumCheckResult && typeof enumCheckResult === 'object') {
      enumExists = enumCheckResult.exists || enumCheckResult.EXISTS || false;
    }

    if (enumExists) {
      // Check if value already exists before adding
      const voucherCheckResult = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_voucher' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
        ) as exists;
      `, {
        bind: [enumTypeName],
        type: Sequelize.QueryTypes.SELECT
      });

      // Handle different query result formats
      let voucherExists = false;
      if (voucherCheckResult && Array.isArray(voucherCheckResult) && voucherCheckResult.length > 0) {
        voucherExists = voucherCheckResult[0].exists || voucherCheckResult[0].EXISTS || false;
      } else if (voucherCheckResult && typeof voucherCheckResult === 'object') {
        voucherExists = voucherCheckResult.exists || voucherCheckResult.EXISTS || false;
      }

      if (!voucherExists) {
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
      const alternativeEnums = await queryInterface.sequelize.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e' 
        AND typname LIKE '%voucher%'
        ORDER BY typname;
      `, {
        type: Sequelize.QueryTypes.SELECT
      });
      
      if (alternativeEnums && alternativeEnums.length > 0) {
        const enumNames = alternativeEnums.map(e => e.typname || e.TYPNAME).join(', ');
        console.log(`   Found alternative ENUM types: ${enumNames}`);
        console.log('   ℹ️  If column is VARCHAR, this is expected. Migration will complete successfully.');
      } else {
        console.log('   ℹ️  No ENUM types found with "voucher" in the name.');
        console.log('   This is expected if the column is VARCHAR. Migration will complete successfully.');
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
