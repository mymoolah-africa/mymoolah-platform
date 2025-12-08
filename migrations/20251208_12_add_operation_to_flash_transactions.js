'use strict';

/**
 * Adds missing operation column to flash_transactions and creates index safely.
 * Some schemas may lack `operation`; we backfill to 'purchase' to align with counts.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add operation if missing
    await queryInterface.sequelize.query(`
      ALTER TABLE flash_transactions
      ADD COLUMN IF NOT EXISTS operation VARCHAR(50);
    `);

    // Backfill null operations to 'purchase'
    await queryInterface.sequelize.query(`
      UPDATE flash_transactions
      SET operation = 'purchase'
      WHERE operation IS NULL;
    `);

    // Ensure index on serviceType, operation, status (create if not exists)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_flash_tx_service_operation_status
      ON flash_transactions ("serviceType", operation, status);
    `);
  },

  down: async (queryInterface) => {
    // Drop index if exists
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_flash_tx_service_operation_status;
    `);
    // Drop operation column if exists
    await queryInterface.sequelize.query(`
      ALTER TABLE flash_transactions
      DROP COLUMN IF EXISTS operation;
    `);
  }
};
