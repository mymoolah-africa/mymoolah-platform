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

async function _resolveTier(supplierId, svcType, productIdOverride, period) {
  const [countRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt
     FROM flash_transactions
     WHERE service_type=:serviceType AND operation='purchase' AND status='completed'
       AND date_trunc(:period, created_at) = date_trunc(:period, now())`,
    { replacements: { serviceType: svcType, period } }
  );
  const volume = countRows?.[0]?.cnt || 0;
  const replacements = { supplierId, serviceType: svcType, productId: productIdOverride };
  const [tiers] = await sequelize.query(
    `SELECT * FROM supplier_commission_tiers
     WHERE "supplierId"=:supplierId
       AND "serviceType"=:serviceType
       AND "isActive"=true
       AND (
         (:productId IS NULL AND "productId" IS NULL)
         OR (:productId IS NOT NULL AND "productId" = :productId)
       )
     ORDER BY "minVolume" ASC`,
    { replacements }
  );

  let matched = null;
  for (const t of tiers) {
    if (t.maxVolume === null) {
      if (volume >= t.minVolume) matched = t;
    } else if (volume >= t.minVolume && volume <= t.maxVolume) {
      matched = t;
    }
  }
  return matched;
}

/**
 * Returns full commission info: { type, ratePct, fixedAmountCents }.
 * type='percentage' → use ratePct to compute commission.
 * type='fixed_amount' → fixedAmountCents is the commission regardless of face value.
 */
async function getCommissionInfo(supplierCode, serviceType, productId = null, period = 'month') {
  const supplierId = await getSupplierIdByCode(supplierCode);
  const none = { type: 'percentage', ratePct: 0, fixedAmountCents: 0 };
  if (!supplierId) return none;

  const resolve = async (svcType, pid) => {
    const t = await _resolveTier(supplierId, svcType, pid, period);
    if (!t) return null;
    const type = t.commissionType || 'percentage';
    return {
      type,
      ratePct: Number(t.ratePct || 0),
      fixedAmountCents: Number(t.fixedAmountCents || 0),
    };
  };

  let info = await resolve(serviceType, productId);
  if (!info && productId) info = await resolve(serviceType, null);
  if (!info && serviceType === 'voucher') {
    info = await resolve('digital_voucher', productId) || await resolve('digital_voucher', null);
  } else if (!info && serviceType === 'digital_voucher') {
    info = await resolve('voucher', productId) || await resolve('voucher', null);
  }

  return info || none;
}

async function getCommissionRatePct(supplierCode, serviceType, productId = null, period = 'month') {
  const info = await getCommissionInfo(supplierCode, serviceType, productId, period);
  return info.ratePct;
}

function computeCommission(faceValueCents, commissionRatePct) {
  return Math.round(Number(faceValueCents) * (Number(commissionRatePct) / 100));
}

/**
 * Compute commission using the full info object from getCommissionInfo().
 * For percentage: Math.round(faceValue * rate / 100).
 * For fixed_amount: returns fixedAmountCents directly.
 */
function computeCommissionFromInfo(faceValueCents, commissionInfo) {
  if (!commissionInfo) return 0;
  if (commissionInfo.type === 'fixed_amount' && commissionInfo.fixedAmountCents > 0) {
    return commissionInfo.fixedAmountCents;
  }
  return Math.round(Number(faceValueCents) * (Number(commissionInfo.ratePct) / 100));
}

module.exports = {
  getFees,
  getCommissionRatePct,
  getCommissionInfo,
  computeCommission,
  computeCommissionFromInfo,
};







