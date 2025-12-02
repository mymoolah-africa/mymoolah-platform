/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/**
 * Enforce E.164 format for Beneficiary.msisdn and add performance index.
 * Also allows NON_MSI_* placeholders for non-mobile services.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 0: Drop ALL old MSISDN-related constraints before updating data
    // PostgreSQL validates constraints during UPDATE, so we must drop them first
    console.log('📋 Dropping old MSISDN constraints...');
    
    // Drop any constraint that matches the pattern (catch-all approach)
    // This uses dynamic SQL to drop any constraint with 'msisdn' in the name
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        constraint_record RECORD;
      BEGIN
        FOR constraint_record IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'beneficiaries'::regclass
            AND contype = 'c'
            AND (conname LIKE '%msisdn%' OR conname LIKE '%MSISDN%')
        LOOP
          EXECUTE 'ALTER TABLE beneficiaries DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.conname);
          RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
        END LOOP;
      END$$;
    `);
    
    console.log('   ✅ Old MSISDN constraints dropped');

    // Step 1: Backfill any existing data to E.164 format BEFORE adding constraint
    // This ensures the constraint won't fail when added
    console.log('📋 Backfilling existing beneficiary MSISDNs to E.164 format...');
    
    // Update 0XXXXXXXXX -> +27XXXXXXXXX
    const localFormatResult = await queryInterface.sequelize.query(`
      UPDATE beneficiaries
      SET msisdn = '+27' || SUBSTRING(msisdn FROM 2)
      WHERE msisdn ~ '^0[6-8][0-9]{8}$'
      RETURNING id;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (localFormatResult && localFormatResult.length > 0) {
      console.log(`   ✅ Converted ${localFormatResult.length} beneficiaries from local format (0XXXXXXXXX)`);
    }

    // Update 27XXXXXXXXX -> +27XXXXXXXXX (add plus)
    const prefix27Result = await queryInterface.sequelize.query(`
      UPDATE beneficiaries
      SET msisdn = '+' || msisdn
      WHERE msisdn ~ '^27[6-8][0-9]{8}$'
      RETURNING id;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (prefix27Result && prefix27Result.length > 0) {
      console.log(`   ✅ Converted ${prefix27Result.length} beneficiaries from 27XXXXXXXXX format`);
    }

    // Add index on beneficiaries.msisdn (if not exists)
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'i'
            AND c.relname = 'idx_beneficiaries_msisdn'
        ) THEN
          CREATE INDEX idx_beneficiaries_msisdn ON beneficiaries (msisdn);
        END IF;
      END$$;
    `);

    // Step 2: Check if any data still violates the constraint before adding it
    const invalidData = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as count
      FROM beneficiaries
      WHERE msisdn IS NOT NULL
        AND msisdn !~ '^\\+27[6-8][0-9]{8}$'
        AND msisdn NOT LIKE 'NON_MSI_%';
    `, { type: Sequelize.QueryTypes.SELECT });

    if (invalidData[0].count > 0) {
      console.log(`   ⚠️  Warning: ${invalidData[0].count} beneficiaries still have invalid MSISDN format`);
      console.log('   ⚠️  Constraint will not be added - data must be fixed first');
      console.log('   ℹ️  Migration 20251202_02 will handle remaining conversions');
      return; // Don't add constraint if data is invalid
    }

    // Step 3: Add check constraint for E.164 or NON_MSI_* (if not exists)
    // Only add if all data is valid
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_beneficiaries_msisdn_e164_or_nonmsi'
        ) THEN
          ALTER TABLE beneficiaries
          ADD CONSTRAINT chk_beneficiaries_msisdn_e164_or_nonmsi
          CHECK (
            msisdn IS NULL
            OR msisdn ~ '^\\+27[6-8][0-9]{8}$'
            OR msisdn LIKE 'NON_MSI_%'
          );
        END IF;
      END$$;
    `);
    
    console.log('   ✅ E.164 constraint added successfully');
  },

  async down(queryInterface, Sequelize) {
    // Drop check constraint if exists
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_beneficiaries_msisdn_e164_or_nonmsi'
        ) THEN
          ALTER TABLE beneficiaries
          DROP CONSTRAINT chk_beneficiaries_msisdn_e164_or_nonmsi;
        END IF;
      END$$;
    `);

    // Drop index if exists
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'i'
            AND c.relname = 'idx_beneficiaries_msisdn'
        ) THEN
          DROP INDEX idx_beneficiaries_msisdn;
        END IF;
      END$$;
    `);
  }
};

