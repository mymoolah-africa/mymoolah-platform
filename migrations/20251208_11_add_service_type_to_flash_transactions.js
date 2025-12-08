'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('flash_transactions', 'serviceType', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'VAS service type (e.g., digital_voucher, airtime, data)'
    });

    // Backfill existing rows to digital_voucher to keep counts working
    await queryInterface.sequelize.query(`
      UPDATE flash_transactions
      SET "serviceType" = 'digital_voucher'
      WHERE "serviceType" IS NULL;
    `);

    // Optional index to speed up monthly counts per service
    await queryInterface.addIndex('flash_transactions', ['serviceType', 'operation', 'status'], {
      name: 'idx_flash_tx_service_operation_status'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('flash_transactions', 'idx_flash_tx_service_operation_status');
    await queryInterface.removeColumn('flash_transactions', 'serviceType');
  }
};
