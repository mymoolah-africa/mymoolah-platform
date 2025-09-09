'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Add commission fields to flash_transactions
    await queryInterface.addColumn('flash_transactions', 'faceValueCents', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Original voucher face value in cents (before commission)'
    });

    await queryInterface.addColumn('flash_transactions', 'commissionRatePct', {
      type: Sequelize.DECIMAL(6,3),
      allowNull: true,
      comment: 'Applied commission rate in percent (e.g., 1.500 = 1.5%)'
    });

    await queryInterface.addColumn('flash_transactions', 'commissionCents', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Calculated commission value in cents'
    });

    await queryInterface.addColumn('flash_transactions', 'netRevenueCents', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Face value minus supplier cost (commission amount) in cents'
    });

    // 2) Create commission tiers table
    await queryInterface.createTable('flash_commission_tiers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      serviceType: { type: Sequelize.ENUM('eezi_voucher'), allowNull: false, defaultValue: 'eezi_voucher' },
      minVolume: { type: Sequelize.INTEGER, allowNull: false },
      maxVolume: { type: Sequelize.INTEGER, allowNull: true },
      ratePct: { type: Sequelize.DECIMAL(6,3), allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('flash_commission_tiers', ['serviceType', 'minVolume', 'maxVolume'], { name: 'flash_commission_tiers_range_idx' });

    // 3) Seed default tiers (can be adjusted later)
    await queryInterface.bulkInsert('flash_commission_tiers', [
      { serviceType: 'eezi_voucher', minVolume: 1, maxVolume: 1000, ratePct: 0.500 },
      { serviceType: 'eezi_voucher', minVolume: 1001, maxVolume: 2000, ratePct: 1.000 },
      { serviceType: 'eezi_voucher', minVolume: 2001, maxVolume: 3000, ratePct: 1.500 },
      { serviceType: 'eezi_voucher', minVolume: 3001, maxVolume: null, ratePct: 2.000 }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('flash_transactions', 'netRevenueCents');
    await queryInterface.removeColumn('flash_transactions', 'commissionCents');
    await queryInterface.removeColumn('flash_transactions', 'commissionRatePct');
    await queryInterface.removeColumn('flash_transactions', 'faceValueCents');

    await queryInterface.dropTable('flash_commission_tiers');
  }
};
