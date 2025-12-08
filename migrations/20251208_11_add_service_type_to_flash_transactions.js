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

    // Index for monthly counts (idempotent)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_flash_tx_service_operation_status
      ON flash_transactions ("serviceType", operation, status);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_flash_tx_service_operation_status;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE flash_transactions
      DROP COLUMN IF EXISTS "serviceType";
    `);
  }
};
