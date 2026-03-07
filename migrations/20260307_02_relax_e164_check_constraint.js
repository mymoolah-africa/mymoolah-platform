'use strict';

/**
 * Migration: Relax chk_beneficiaries_msisdn_e164_or_nonmsi to accept
 * international E.164 numbers.
 *
 * There are TWO check constraints on the beneficiaries table that enforce
 * SA-only msisdn format:
 *   1. beneficiaries_msisdn_conditional_check  (fixed in prior migration)
 *   2. chk_beneficiaries_msisdn_e164_or_nonmsi (fixed here)
 *
 * The second constraint enforces: msisdn ~ '^\+27[6-8][0-9]{8}$' OR LIKE 'NON_MSI_%'
 * This blocks international numbers like +263711234567.
 *
 * Updated to accept any valid E.164: ^\+[1-9][0-9]{6,14}$
 */

module.exports = {
  async up(queryInterface) {
    console.log('Relaxing chk_beneficiaries_msisdn_e164_or_nonmsi for international numbers...');

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      DROP CONSTRAINT IF EXISTS chk_beneficiaries_msisdn_e164_or_nonmsi;
    `);
    console.log('✅ Dropped old chk_beneficiaries_msisdn_e164_or_nonmsi constraint');

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      ADD CONSTRAINT chk_beneficiaries_msisdn_e164_or_nonmsi
      CHECK (
        msisdn IS NULL
        OR msisdn ~ '^\\+[1-9][0-9]{6,14}$'
        OR msisdn LIKE 'NON_MSI_%'
      );
    `);
    console.log('✅ Added updated constraint (accepts any valid E.164 number)');
  },

  async down(queryInterface) {
    console.log('Reverting chk_beneficiaries_msisdn_e164_or_nonmsi to SA-only...');

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      DROP CONSTRAINT IF EXISTS chk_beneficiaries_msisdn_e164_or_nonmsi;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      ADD CONSTRAINT chk_beneficiaries_msisdn_e164_or_nonmsi
      CHECK (
        msisdn IS NULL
        OR msisdn ~ '^\\+27[6-8][0-9]{8}$'
        OR msisdn LIKE 'NON_MSI_%'
      );
    `);
    console.log('✅ Reverted constraint to SA-only');
  }
};
