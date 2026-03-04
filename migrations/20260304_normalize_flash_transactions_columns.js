'use strict';

/**
 * Migration: Normalize flash_transactions column names to snake_case.
 *
 * The original migration (20250814_create_flash_tables.js) used camelCase keys
 * in queryInterface.createTable. Depending on the Sequelize CLI version and
 * environment, those may have been stored as camelCase OR snake_case in Postgres.
 * This migration safely renames any camelCase columns to snake_case so the model
 * (with underscored: true) works consistently across all environments.
 */

const RENAMES = [
  { from: 'txnReference',        to: 'txn_reference' },
  { from: 'accountNumber',       to: 'account_number' },
  { from: 'serviceType',         to: 'service_type' },
  { from: 'productCode',         to: 'product_code' },
  { from: 'flashResponseCode',   to: 'flash_response_code' },
  { from: 'flashResponseMessage',to: 'flash_response_message' },
  { from: 'errorMessage',        to: 'error_message' },
  { from: 'createdAt',           to: 'created_at' },
  { from: 'updatedAt',           to: 'updated_at' },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('flash_transactions');
    const existingColumns = Object.keys(tableDesc);

    for (const { from, to } of RENAMES) {
      if (existingColumns.includes(from) && !existingColumns.includes(to)) {
        await queryInterface.renameColumn('flash_transactions', from, to);
        console.log(`✅ Renamed flash_transactions.${from} → ${to}`);
      } else if (existingColumns.includes(to)) {
        console.log(`⏭️  flash_transactions.${to} already exists — skipping`);
      } else {
        console.log(`⚠️  flash_transactions.${from} not found — skipping rename to ${to}`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('flash_transactions');
    const existingColumns = Object.keys(tableDesc);

    for (const { from, to } of RENAMES) {
      if (existingColumns.includes(to) && !existingColumns.includes(from)) {
        await queryInterface.renameColumn('flash_transactions', to, from);
        console.log(`↩️  Reverted flash_transactions.${to} → ${from}`);
      }
    }
  }
};
