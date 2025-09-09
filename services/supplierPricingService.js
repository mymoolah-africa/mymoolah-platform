'use strict';

// Generic supplier pricing service (banking-grade, Mojaloop aligned)
// - Resolves fee schedule and commission tiers from generic tables
// - Computes commission and net revenue (does not expose to frontend)

const { sequelize } = require('../models');

async function getSupplierIdByCode(supplierCode) {
  const [rows] = await sequelize.query(
    `SELECT id FROM suppliers WHERE code = :code AND "isActive"=true LIMIT 1`,
    { replacements: { code: supplierCode } }
  );
  return rows?.[0]?.id || null;
}

async function getFees(supplierCode, serviceType) {
  const supplierId = await getSupplierIdByCode(supplierCode);
  if (!supplierId) return { fees: {}, vatExclusive: true };
  const [rows] = await sequelize.query(
    `SELECT "feeType", "amountCents", "isVatExclusive"
     FROM supplier_fee_schedule
     WHERE "supplierId"=:supplierId AND "serviceType"=:serviceType AND "isActive"=true`,
    { replacements: { supplierId, serviceType } }
  );
  const fees = {};
  let vatExclusive = true;
  for (const r of rows) {
    fees[r.feeType] = Number(r.amountCents);
    vatExclusive = r.isVatExclusive;
  }
  return { fees, vatExclusive };
}

async function getCommissionRatePct(supplierCode, serviceType, period = 'month') {
  const supplierId = await getSupplierIdByCode(supplierCode);
  if (!supplierId) return 0;
  const [countRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt
     FROM flash_transactions
     WHERE "serviceType"=:serviceType AND operation='purchase' AND status='completed'
       AND date_trunc(:period, "createdAt") = date_trunc(:period, now())`,
    { replacements: { serviceType, period } }
  );
  const volume = countRows?.[0]?.cnt || 0;
  const [tiers] = await sequelize.query(
    `SELECT * FROM supplier_commission_tiers
     WHERE "supplierId"=:supplierId AND "serviceType"=:serviceType AND "isActive"=true
     ORDER BY "minVolume" ASC`,
    { replacements: { supplierId, serviceType } }
  );
  let rate = 0;
  for (const t of tiers) {
    if (t.maxVolume === null) {
      if (volume >= t.minVolume) rate = Number(t.ratePct);
    } else if (volume >= t.minVolume && volume <= t.maxVolume) {
      rate = Number(t.ratePct);
    }
  }
  return rate;
}

function computeCommission(faceValueCents, commissionRatePct) {
  return Math.round(Number(faceValueCents) * (Number(commissionRatePct) / 100));
}

module.exports = {
  getFees,
  getCommissionRatePct,
  computeCommission,
};







