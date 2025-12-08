'use strict';

/**
 * Align products table with Product model expectations for voucher purchase flow.
 * Adds missing JSONB columns with safe IF NOT EXISTS guards to avoid repeated runs.
 */
module.exports = {
  up: async (queryInterface) => {
    // Add denominations (array of ints) with default empty array to satisfy NOT NULL
    await queryInterface.sequelize.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS denominations JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    // Add constraints (limits metadata) as JSONB, nullable
    await queryInterface.sequelize.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS constraints JSONB;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS denominations;');
    await queryInterface.sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS constraints;');
  }
};
