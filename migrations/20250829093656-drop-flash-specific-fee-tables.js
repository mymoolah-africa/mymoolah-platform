'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [[feeCount]] = await queryInterface.sequelize.query(`SELECT COUNT(*)::int AS c FROM supplier_fee_schedule`);
    const [[tierCount]] = await queryInterface.sequelize.query(`SELECT COUNT(*)::int AS c FROM supplier_commission_tiers`);
    const genericHasData = (feeCount?.c || 0) > 0 || (tierCount?.c || 0) > 0;
    if (!genericHasData) {
      let flashTierCount = 0;
      try {
        const [[r]] = await queryInterface.sequelize.query(`SELECT COUNT(*)::int AS c FROM flash_commission_tiers`);
        flashTierCount = r?.c || 0;
      } catch { /* table may not exist */ }
      if (flashTierCount > 0) {
        // Migrate inline: create FLASH supplier if missing, copy flash data to generic
        let [supRows] = await queryInterface.sequelize.query(`SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1`);
        let supplierId = supRows?.[0]?.id;
        if (!supplierId) {
          await queryInterface.sequelize.query(
            `INSERT INTO suppliers (name, code, "isActive", "createdAt", "updatedAt") VALUES ('Flash', 'FLASH', true, NOW(), NOW()) ON CONFLICT (code) DO NOTHING`
          );
          [supRows] = await queryInterface.sequelize.query(`SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1`);
          supplierId = supRows?.[0]?.id;
        }
        if (supplierId) {
          try {
            const [feeRows] = await queryInterface.sequelize.query(
              `SELECT "feeType", "amountCents", "isVatExclusive" FROM flash_fee_schedule WHERE "isActive"=true`
            );
            for (const r of feeRows || []) {
              await queryInterface.sequelize.query(
                `INSERT INTO supplier_fee_schedule ("supplierId","serviceType","feeType","amountCents","isVatExclusive","isActive","createdAt","updatedAt")
                 VALUES (:supplierId,'eezi_voucher',:feeType,:amountCents,:isVatExclusive,true,now(),now())
                 ON CONFLICT ("supplierId","serviceType","feeType") DO NOTHING`,
                { replacements: { supplierId, feeType: r.feeType, amountCents: r.amountCents, isVatExclusive: r.isVatExclusive } }
              );
            }
          } catch { /* flash_fee_schedule may not exist */ }
          const [tierRows] = await queryInterface.sequelize.query(
            `SELECT "minVolume", "maxVolume", "ratePct" FROM flash_commission_tiers WHERE "isActive"=true`
          );
          for (const t of tierRows || []) {
            await queryInterface.sequelize.query(
              `INSERT INTO supplier_commission_tiers ("supplierId","serviceType","minVolume","maxVolume","ratePct","isActive","createdAt","updatedAt")
               VALUES (:supplierId,'eezi_voucher',:minVolume,:maxVolume,:ratePct,true,now(),now())`,
              { replacements: { supplierId, minVolume: t.minVolume, maxVolume: t.maxVolume, ratePct: t.ratePct } }
            );
          }
        }
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
