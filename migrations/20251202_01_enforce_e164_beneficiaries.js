/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/**
 * Enforce E.164 format for Beneficiary.msisdn and add performance index.
 * Also allows NON_MSI_* placeholders for non-mobile services.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
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

    // Add check constraint for E.164 or NON_MSI_* (if not exists)
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

