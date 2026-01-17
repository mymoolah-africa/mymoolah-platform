#!/usr/bin/env node

/**
 * Run the voucherType ENUM conversion migration
 * Uses db-connection-helper instead of Sequelize CLI
 */

require('dotenv').config();
const { getUATClient, closeAll } = require('./db-connection-helper');

async function runMigration() {
  let client;
  
  try {
    console.log('📋 Connecting to UAT database...');
    client = await getUATClient();
    console.log('✅ Connected to database\n');

    console.log('🔄 Starting voucherType ENUM conversion...\n');

    // Step 1: Check current column type
    console.log('📋 Step 1: Checking current column type...');
    const columnInfoResult = await client.query(`
      SELECT data_type, udt_name, column_name
      FROM information_schema.columns
      WHERE table_name = 'vouchers'
      AND (column_name = 'voucherType' OR column_name = 'type')
      ORDER BY column_name;
    `);

    console.log('   Column info:', columnInfoResult.rows);
    const columnInfo = columnInfoResult.rows;

    // Determine which column exists
    const hasVoucherType = columnInfo.some(c => c.column_name === 'voucherType');
    const hasType = columnInfo.some(c => c.column_name === 'type');
    const currentColumn = hasVoucherType ? 'voucherType' : 'type';
    const isVarchar = columnInfo.some(c => c.data_type === 'character varying' || c.udt_name === 'varchar');

    console.log(`   Found column: ${currentColumn}, Type: ${isVarchar ? 'VARCHAR' : 'ENUM'}\n`);

    // Step 2: Create ENUM type if it doesn't exist
    console.log('📋 Step 2: Creating ENUM type...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_vouchers_voucherType" AS ENUM (
          'standard',
          'premium',
          'business',
          'corporate',
          'student',
          'senior',
          'easypay_pending',
          'easypay_active',
          'easypay_topup',
          'easypay_topup_active',
          'easypay_cashout',
          'easypay_cashout_active',
          'easypay_voucher'
        );
      EXCEPTION
        WHEN duplicate_object THEN 
          RAISE NOTICE 'ENUM type enum_vouchers_voucherType already exists';
      END $$;
    `);
    console.log('   ✅ ENUM type created or already exists\n');

    // Step 3: If column is VARCHAR, convert it to ENUM
    if (isVarchar) {
      console.log('📋 Step 3: Converting VARCHAR column to ENUM...');

      // First, ensure all existing values are valid ENUM values
      console.log('   Validating existing data...');
      const updateResult = await client.query(`
        UPDATE vouchers
        SET "${currentColumn}" = 'standard'
        WHERE "${currentColumn}" IS NULL
        OR "${currentColumn}" NOT IN (
          'standard', 'premium', 'business', 'corporate', 'student', 'senior',
          'easypay_pending', 'easypay_active', 'easypay_topup', 'easypay_topup_active',
          'easypay_cashout', 'easypay_cashout_active', 'easypay_voucher'
        );
      `);
      console.log(`   Updated ${updateResult.rowCount} invalid rows\n`);

      // Rename column if it's 'type' to 'voucherType'
      if (currentColumn === 'type') {
        console.log('   Renaming "type" column to "voucherType"...');
        await client.query(`
          ALTER TABLE vouchers
          RENAME COLUMN "type" TO "voucherType";
        `);
        console.log('   ✅ Column renamed\n');
      }

      // Convert to ENUM using ALTER COLUMN
      console.log('   Converting column type to ENUM...');
      await client.query(`
        ALTER TABLE vouchers
        ALTER COLUMN "voucherType" TYPE "enum_vouchers_voucherType"
        USING "voucherType"::text::"enum_vouchers_voucherType";
      `);
      console.log('   ✅ Column type converted\n');

      // Set default value
      console.log('   Setting default value...');
      await client.query(`
        ALTER TABLE vouchers
        ALTER COLUMN "voucherType" SET DEFAULT 'standard';
      `);
      console.log('   ✅ Default value set\n');

      // Set NOT NULL
      console.log('   Setting NOT NULL constraint...');
      await client.query(`
        ALTER TABLE vouchers
        ALTER COLUMN "voucherType" SET NOT NULL;
      `);
      console.log('   ✅ NOT NULL constraint set\n');

      console.log('   ✅ Successfully converted voucherType to ENUM\n');
    } else {
      // Column is already ENUM, just ensure the new value exists
      console.log('📋 Step 3: Column is already ENUM, checking for easypay_voucher value...');
      
      const valueCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_voucher' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vouchers_voucherType')
        ) as exists;
      `);

      if (!valueCheckResult.rows[0].exists) {
        await client.query(`
          ALTER TYPE "enum_vouchers_voucherType" ADD VALUE 'easypay_voucher';
        `);
        console.log('   ✅ Added easypay_voucher to existing ENUM\n');
      } else {
        console.log('   ℹ️  easypay_voucher already exists in ENUM\n');
      }
    }

    // Step 4: Verify the conversion
    console.log('📋 Step 4: Verifying the conversion...');
    const verifyInfoResult = await client.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'vouchers'
      AND column_name = 'voucherType';
    `);

    console.log('   Verification:', verifyInfoResult.rows);

    // Show all ENUM values
    const enumValuesResult = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vouchers_voucherType')
      ORDER BY enumsortorder;
    `);

    console.log('   All ENUM values:', enumValuesResult.rows.map(v => v.enumlabel).join(', '));
    console.log('\n✅ voucherType ENUM conversion completed successfully!');

    client.release();
    
  } catch (error) {
    console.error('❌ Error during conversion:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    if (client) {
      client.release();
    }
    await closeAll();
    process.exit(1);
  } finally {
    await closeAll();
  }
}

runMigration();
