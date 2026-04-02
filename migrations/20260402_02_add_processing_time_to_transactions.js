'use strict';

/**
 * Add processingTime column to transactions table.
 *
 * The Transaction model defines processingTime (INTEGER, nullable)
 * but no migration ever added it to the table. This causes
 * Sequelize INSERT/UPDATE to fail with:
 *   "column processingTime does not exist"
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const exists = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'processingTime'
      ) AS exists
    `, { type: Sequelize.QueryTypes.SELECT });

    if (exists[0].exists) {
      console.log('✅ processingTime column already exists, skipping');
      return;
    }

    await queryInterface.addColumn('transactions', 'processingTime', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Processing time in milliseconds'
    });

    console.log('✅ Added processingTime column to transactions table');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('transactions', 'processingTime');
    console.log('✅ Removed processingTime column from transactions table');
  }
};
