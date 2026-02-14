'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Safety: abort only if flash tables have data but generic tables are empty (migration was skipped)
    const [[feeCount]] = await queryInterface.sequelize.query(`SELECT COUNT(*)::int AS c FROM supplier_fee_schedule`);
    const [[tierCount]] = await queryInterface.sequelize.query(`SELECT COUNT(*)::int AS c FROM supplier_commission_tiers`);
    const genericHasData = (feeCount?.c || 0) > 0 || (tierCount?.c || 0) > 0;
    if (!genericHasData) {
      let flashFeeCount = 0, flashTierCount = 0;
      try {
        const [[r]] = await queryInterface.sequelize.query(`SELECT COUNT(*)::int AS c FROM flash_fee_schedule`);
        flashFeeCount = r?.c || 0;
      } catch { /* table may not exist */ }
      try {
        const [[r]] = await queryInterface.sequelize.query(`SELECT COUNT(*)::int AS c FROM flash_commission_tiers`);
        flashTierCount = r?.c || 0;
      } catch { /* table may not exist */ }
      if (flashFeeCount > 0 || flashTierCount > 0) {
        throw new Error('Generic supplier tables are empty but flash tables have data; run migrate-flash-fees-to-generic first');
      }
    }
    try { await queryInterface.dropTable('flash_fee_schedule'); } catch (e) {
      if (!e.message?.includes('does not exist')) throw e;
    }
    try { await queryInterface.dropTable('flash_commission_tiers'); } catch (e) {
      if (!e.message?.includes('does not exist')) throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    // Recreate tables minimal (empty); original enums may differ
    await queryInterface.createTable('flash_fee_schedule', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      serviceType: { type: Sequelize.STRING(50), allowNull: false },
      feeType: { type: Sequelize.STRING(50), allowNull: false },
      amountCents: { type: Sequelize.INTEGER, allowNull: false },
      isVatExclusive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('flash_fee_schedule', ['serviceType', 'feeType'], { name: 'flash_fee_schedule_type_idx', unique: true });

    await queryInterface.createTable('flash_commission_tiers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      minVolume: { type: Sequelize.INTEGER, allowNull: false },
      maxVolume: { type: Sequelize.INTEGER, allowNull: true },
      ratePct: { type: Sequelize.DECIMAL(6,3), allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  }
};
