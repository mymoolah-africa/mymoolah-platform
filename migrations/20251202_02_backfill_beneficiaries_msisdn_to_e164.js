/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/**
 * Convert beneficiaries.msisdn from local (0XXXXXXXXX) or 27XXXXXXXXX to E.164 (+27XXXXXXXXX).
 * Down migration reverses E.164 back to local 0XXXXXXXXX where applicable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update 0XXXXXXXXX -> +27XXXXXXXXX
    await queryInterface.sequelize.query(`
      UPDATE beneficiaries
      SET msisdn = '+27' || SUBSTRING(msisdn FROM 2)
      WHERE msisdn ~ '^0[6-8][0-9]{8}$';
    `);

    // Update 27XXXXXXXXX -> +27XXXXXXXXX (add plus)
    await queryInterface.sequelize.query(`
      UPDATE beneficiaries
      SET msisdn = '+' || msisdn
      WHERE msisdn ~ '^27[6-8][0-9]{8}$';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert +27XXXXXXXXX -> 0XXXXXXXXX
    await queryInterface.sequelize.query(`
      UPDATE beneficiaries
      SET msisdn = '0' || SUBSTRING(msisdn FROM 4)
      WHERE msisdn ~ '^\\+27[6-8][0-9]{8}$';
    `);
  }
};

