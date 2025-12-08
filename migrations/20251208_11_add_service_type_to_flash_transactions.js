'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Add column if missing (idempotent)
    await queryInterface.sequelize.query(`
      ALTER TABLE flash_transactions
      ADD COLUMN IF NOT EXISTS "serviceType" VARCHAR(50);
    `);

    // Backfill existing rows to digital_voucher to keep counts working
    await queryInterface.sequelize.query(`
      UPDATE flash_transactions
      SET "serviceType" = 'digital_voucher'
      WHERE "serviceType" IS NULL;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE flash_transactions
      DROP COLUMN IF EXISTS "serviceType";
    `);
  }
};
