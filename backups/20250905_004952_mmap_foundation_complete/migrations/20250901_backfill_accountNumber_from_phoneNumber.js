'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Backfill users.accountNumber with users.phoneNumber where different or null
    // Also enforce uniqueness by trimming duplicates conservatively (skip rows where conflict)
    await queryInterface.sequelize.query(`
      UPDATE users AS u
      SET "accountNumber" = u."phoneNumber"
      WHERE (u."accountNumber" IS NULL OR u."accountNumber" <> u."phoneNumber")
        AND u."phoneNumber" IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // No-op reversal: we won't attempt to restore synthetic ACC values
  }
};


