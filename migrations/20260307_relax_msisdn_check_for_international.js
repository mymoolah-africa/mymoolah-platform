'use strict';

/**
 * Migration: Relax beneficiaries_msisdn_conditional_check to accept
 * international E.164 numbers (not just +27XXXXXXXXX).
 *
 * The Global Airtime feature allows beneficiaries with international
 * numbers like +263711234567 (Zimbabwe). The previous constraint only
 * allowed SA numbers (+27 followed by 9 digits). This update accepts
 * any valid E.164 number: + followed by 7-15 digits starting with 1-9.
 */

module.exports = {
  async up(queryInterface) {
    console.log('Relaxing beneficiaries_msisdn_conditional_check for international numbers...');

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
        OR (msisdn ~ '^\\+[1-9][0-9]{6,14}$')
      );
    `);
    console.log('✅ Added updated constraint (accepts any valid E.164 number)');
  },

  async down(queryInterface) {
    console.log('Reverting beneficiaries_msisdn_conditional_check to SA-only...');

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      DROP CONSTRAINT IF EXISTS beneficiaries_msisdn_conditional_check;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiaries
      ADD CONSTRAINT beneficiaries_msisdn_conditional_check
      CHECK (
        "accountType" IN ('electricity', 'biller', 'usdc', 'crypto', 'bank')
        OR (msisdn ~ '^\\+27[0-9]{9}$')
      );
    `);
    console.log('✅ Reverted constraint to SA-only');
  }
};
