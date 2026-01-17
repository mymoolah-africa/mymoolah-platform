'use strict';

/**
 * Migration: Convert voucherType from VARCHAR to ENUM
 *
 * This migration:
 * - Creates the ENUM type with all required values
 * - Converts the existing VARCHAR column to ENUM
 * - Handles existing data migration
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting voucherType ENUM conversion...');

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Step 1: Check current column type
      const [columnInfo] = await queryInterface.sequelize.query(`
        SELECT data_type, udt_name, column_name
        FROM information_schema.columns
        WHERE table_name = 'vouchers'
        AND (column_name = 'voucherType' OR column_name = 'type')
        ORDER BY column_name;
      `, { transaction });

      console.log('📋 Current column info:', columnInfo);

      // Determine which column exists
      const hasVoucherType = columnInfo.some(c => c.column_name === 'voucherType');
      const hasType = columnInfo.some(c => c.column_name === 'type');
      const currentColumn = hasVoucherType ? 'voucherType' : 'type';
      const isVarchar = columnInfo.some(c => c.data_type === 'character varying' || c.udt_name === 'varchar');

      console.log(`📋 Found column: ${currentColumn}, Type: ${isVarchar ? 'VARCHAR' : 'ENUM'}`);

      // Step 2: Create ENUM type if it doesn't exist
      console.log('📝 Creating ENUM type...');
      await queryInterface.sequelize.query(`
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
      `, { transaction });

      // Step 3: If column is VARCHAR, convert it to ENUM
      if (isVarchar) {
        console.log('📝 Converting VARCHAR column to ENUM...');

        // First, ensure all existing values are valid ENUM values
        // Update any invalid values to 'standard'
        await queryInterface.sequelize.query(`
          UPDATE vouchers
          SET "${currentColumn}" = 'standard'
          WHERE "${currentColumn}" IS NULL
          OR "${currentColumn}" NOT IN (
            'standard', 'premium', 'business', 'corporate', 'student', 'senior',
            'easypay_pending', 'easypay_active', 'easypay_topup', 'easypay_topup_active',
            'easypay_cashout', 'easypay_cashout_active', 'easypay_voucher'
          );
        `, { transaction });

        // Rename column if it's 'type' to 'voucherType'
        if (currentColumn === 'type') {
          console.log('📝 Renaming "type" column to "voucherType"...');
          await queryInterface.renameColumn('vouchers', 'type', 'voucherType', { transaction });
        }

        // Convert to ENUM using ALTER COLUMN
        await queryInterface.sequelize.query(`
          ALTER TABLE vouchers
          ALTER COLUMN "voucherType" TYPE "enum_vouchers_voucherType"
          USING "voucherType"::text::"enum_vouchers_voucherType";
        `, { transaction });

        // Set default value
        await queryInterface.sequelize.query(`
          ALTER TABLE vouchers
          ALTER COLUMN "voucherType" SET DEFAULT 'standard';
        `, { transaction });

        // Set NOT NULL
        await queryInterface.sequelize.query(`
          ALTER TABLE vouchers
          ALTER COLUMN "voucherType" SET NOT NULL;
        `, { transaction });

        console.log('✅ Successfully converted voucherType to ENUM');
      } else {
        // Column is already ENUM, just ensure the new value exists
        console.log('📝 Column is already ENUM, checking for easypay_voucher value...');
        
        const [valueCheck] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'easypay_voucher' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vouchers_voucherType')
          ) as exists;
        `, { transaction, type: Sequelize.QueryTypes.SELECT });

        if (!valueCheck[0].exists) {
          await queryInterface.sequelize.query(`
            ALTER TYPE "enum_vouchers_voucherType" ADD VALUE 'easypay_voucher';
          `, { transaction });
          console.log('✅ Added easypay_voucher to existing ENUM');
        } else {
          console.log('ℹ️  easypay_voucher already exists in ENUM');
        }
      }

      // Step 4: Verify the conversion
      const [verifyInfo] = await queryInterface.sequelize.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'vouchers'
        AND column_name = 'voucherType';
      `, { transaction });

      console.log('✅ Verification:', verifyInfo);

      // Show all ENUM values
      const [enumValues] = await queryInterface.sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_vouchers_voucherType')
        ORDER BY enumsortorder;
      `, { transaction });

      console.log('📋 All ENUM values:', enumValues.map(v => v.enumlabel).join(', '));

      await transaction.commit();
      console.log('✅ voucherType ENUM conversion completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error during conversion:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting voucherType ENUM conversion...');

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Convert back to VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE vouchers
        ALTER COLUMN "voucherType" TYPE VARCHAR(255)
        USING "voucherType"::text;
      `, { transaction });

      // Note: We don't drop the ENUM type as it might be used elsewhere
      // and PostgreSQL doesn't allow dropping types that are in use

      await transaction.commit();
      console.log('✅ Reversion completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error during reversion:', error.message);
      throw error;
    }
  }
};
