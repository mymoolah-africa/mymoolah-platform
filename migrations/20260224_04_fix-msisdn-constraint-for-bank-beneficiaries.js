'use strict';

/**
 * Migration: Fix beneficiaries_msisdn_conditional_check to exclude 'bank' accountType.
 *
 * Bank beneficiaries use a NON_MSI_ synthetic identifier in the msisdn column
 * (e.g. NON_MSI_91488a2) because they don't have a mobile number — they have
 * a bank account number. The current constraint requires all non-excluded types
 * to match +27XXXXXXXXX (E.164), which rejects NON_MSI_ values for bank rows.
 *
 * Fix: add 'bank' to the exclusion list alongside 'electricity', 'biller',
 * 'usdc', and 'crypto'.
 */

module.exports = {
  async up(queryInterface) {
    console.log('Fixing beneficiaries_msisdn_conditional_check for bank accountType...');

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      DROP CONSTRAINT IF EXISTS beneficiaries_msisdn_conditional_check;
    `);
    console.log('✅ Dropped old constraint');

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      ADD CONSTRAINT beneficiaries_msisdn_conditional_check
      CHECK (
        "accountType" IN ('electricity', 'biller', 'usdc', 'crypto', 'bank')
        OR (msisdn ~ '^\\+27[0-9]{9}$')
      );
    `);
    console.log('✅ Added updated constraint (bank excluded from E.164 msisdn requirement)');
  },

  async down(queryInterface) {
    console.log('Reverting beneficiaries_msisdn_conditional_check...');

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      DROP CONSTRAINT IF EXISTS beneficiaries_msisdn_conditional_check;
    `);

    // Restore previous version (usdc/crypto excluded but NOT bank)
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      ADD CONSTRAINT beneficiaries_msisdn_conditional_check
      CHECK (
        "accountType" IN ('electricity', 'biller', 'usdc', 'crypto')
        OR (msisdn ~ '^\\+27[0-9]{9}$')
      );
    `);
    console.log('✅ Reverted constraint');
  }
};
