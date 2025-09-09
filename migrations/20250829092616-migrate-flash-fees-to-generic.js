'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [supRows] = await queryInterface.sequelize.query(`SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1`);
    const supplierId = supRows?.[0]?.id;
    if (!supplierId) { console.log('FLASH supplier not found; skipping migration.'); return; }

    const [feeRows] = await queryInterface.sequelize.query(`
      SELECT "feeType" AS "feeType", "amountCents" AS "amountCents", "isVatExclusive" AS "isVatExclusive"
      FROM flash_fee_schedule
      WHERE "isActive"=true
    `);
    for (const r of feeRows) {
      await queryInterface.sequelize.query(
        `INSERT INTO supplier_fee_schedule ("supplierId","serviceType","feeType","amountCents","isVatExclusive","isActive","createdAt","updatedAt")
         VALUES (:supplierId,'eezi_voucher',:feeType,:amountCents,:isVatExclusive,true,now(),now())
         ON CONFLICT ("supplierId","serviceType","feeType") DO NOTHING`,
        { replacements: { supplierId, feeType: r.feeType, amountCents: r.amountCents, isVatExclusive: r.isVatExclusive } }
      );
    }

    const [tierRows] = await queryInterface.sequelize.query(`
      SELECT "minVolume" AS "minVolume", "maxVolume" AS "maxVolume", "ratePct" AS "ratePct"
      FROM flash_commission_tiers
      WHERE "isActive"=true
    `);
    for (const t of tierRows) {
      await queryInterface.sequelize.query(
        `INSERT INTO supplier_commission_tiers ("supplierId","serviceType","minVolume","maxVolume","ratePct","isActive","createdAt","updatedAt")
         VALUES (:supplierId,'eezi_voucher',:minVolume,:maxVolume,:ratePct,true,now(),now())`,
        { replacements: { supplierId, minVolume: t.minVolume, maxVolume: t.maxVolume, ratePct: t.ratePct } }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const [supRows] = await queryInterface.sequelize.query(`SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1`);
    const supplierId = supRows?.[0]?.id; if (!supplierId) return;
    await queryInterface.sequelize.query(`DELETE FROM supplier_fee_schedule WHERE "supplierId"=:supplierId AND "serviceType"='eezi_voucher'`, { replacements: { supplierId } });
    await queryInterface.sequelize.query(`DELETE FROM supplier_commission_tiers WHERE "supplierId"=:supplierId AND "serviceType"='eezi_voucher'`, { replacements: { supplierId } });
  }
};
