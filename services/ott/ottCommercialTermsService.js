'use strict';

const { Op } = require('sequelize');
const db = require('../../models');

function roundMoney(value) {
  const numeric = Number(value || 0);
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function todayDateOnly(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function requireCommercialModel() {
  if (!db.SupplierCommercialTerm) {
    const err = new Error('Supplier commercial terms model is not available');
    err.statusCode = 500;
    err.code = 'SUPPLIER_COMMERCIAL_TERMS_UNAVAILABLE';
    throw err;
  }
  return db.SupplierCommercialTerm;
}

async function findActiveCommercialTerm({
  supplierCode = 'OTT',
  providerCode,
  providerType,
  commercialType,
  asOfDate = todayDateOnly(),
} = {}) {
  if (!providerCode) {
    const err = new Error('Provider code is required for supplier commercial term lookup');
    err.statusCode = 400;
    err.code = 'PROVIDER_REQUIRED';
    throw err;
  }

  const SupplierCommercialTerm = requireCommercialModel();
  const where = {
    supplierCode,
    providerCode: String(providerCode),
    isActive: true,
    effectiveFrom: { [Op.lte]: asOfDate },
    [Op.or]: [
      { effectiveTo: null },
      { effectiveTo: { [Op.gte]: asOfDate } },
    ],
  };
  if (providerType) where.providerType = providerType;
  if (commercialType) where.commercialType = commercialType;

  return SupplierCommercialTerm.findOne({
    where,
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
  });
}

function termToPlain(term) {
  if (!term) return null;
  return typeof term.toJSON === 'function' ? term.toJSON() : term;
}

function requireConfiguredAmount(policy, field, { allowZero = false } = {}) {
  if (policy[field] === null || policy[field] === undefined || policy[field] === '') {
    const err = new Error(`OTT payout commercial term ${field} is missing for provider ${policy.providerCode}`);
    err.statusCode = 500;
    err.code = 'OTT_FEE_POLICY_INCOMPLETE';
    throw err;
  }
  const amount = roundMoney(policy[field]);
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) {
    const err = new Error(`OTT payout commercial term ${field} is invalid for provider ${policy.providerCode}`);
    err.statusCode = 500;
    err.code = 'OTT_FEE_POLICY_INCOMPLETE';
    throw err;
  }
  return amount;
}

async function getPayoutFeePolicy({ providerCode, asOfDate } = {}) {
  const term = await findActiveCommercialTerm({
    supplierCode: 'OTT',
    providerCode,
    providerType: 'payout',
    commercialType: 'fixed_fee',
    asOfDate,
  });
  if (!term) {
    const err = new Error(`OTT payout commercial terms are missing for provider ${providerCode}`);
    err.statusCode = 500;
    err.code = 'OTT_FEE_POLICY_MISSING';
    throw err;
  }

  const policy = termToPlain(term);
  const vatRate = toNumber(policy.fixedFeeVatRate, toNumber(process.env.VAT_RATE, 0.15));
  const providerFeeExVat = requireConfiguredAmount(policy, 'fixedFeeExVat');
  const mmtpFeeExVat = requireConfiguredAmount(policy, 'mmtpFeeExVat');
  const providerFeeAmount = policy.fixedFeeIsVatExclusive === false
    ? providerFeeExVat
    : roundMoney(providerFeeExVat * (1 + vatRate));
  const totalFeeAmount = policy.fixedFeeIsVatExclusive === false
    ? roundMoney(providerFeeExVat + mmtpFeeExVat)
    : roundMoney((providerFeeExVat + mmtpFeeExVat) * (1 + vatRate));
  const mmtpFeeAmount = roundMoney(totalFeeAmount - providerFeeAmount);

  return {
    source: 'supplier_commercial_terms',
    supplierCode: policy.supplierCode,
    providerCode: policy.providerCode,
    providerName: policy.providerName,
    providerType: policy.providerType,
    serviceFamily: policy.serviceFamily,
    commercialType: policy.commercialType,
    effectiveFrom: policy.effectiveFrom,
    effectiveTo: policy.effectiveTo,
    vatRate,
    providerFeeExVat,
    providerFeeAmount,
    mmtpFeeExVat,
    mmtpFeeAmount,
    totalFeeAmount,
    reversalFeeExVat: roundMoney(policy.reversalFeeExVat),
    fixedFeeIsVatExclusive: policy.fixedFeeIsVatExclusive !== false,
    metadata: policy.metadata || {},
  };
}

function commissionPolicyFromTerm(term) {
  const policy = termToPlain(term);
  if (!policy) return null;
  return {
    source: 'supplier_commercial_terms',
    supplierCode: policy.supplierCode,
    providerCode: policy.providerCode,
    providerName: policy.providerName,
    providerType: policy.providerType,
    serviceFamily: policy.serviceFamily,
    commercialType: policy.commercialType,
    grossCommissionPct: toNumber(policy.grossCommissionPct),
    serviceFeePct: toNumber(policy.serviceFeePct),
    netCommissionPct: toNumber(policy.netCommissionPct),
    monthlySwitchingFeePct: toNumber(policy.monthlySwitchingFeePct),
    effectiveFrom: policy.effectiveFrom,
    effectiveTo: policy.effectiveTo,
    isCustomerFacing: Boolean(policy.isCustomerFacing),
    isMock: Boolean(policy.isMock),
    metadata: policy.metadata || {},
  };
}

module.exports = {
  findActiveCommercialTerm,
  getPayoutFeePolicy,
  commissionPolicyFromTerm,
  roundMoney,
};
