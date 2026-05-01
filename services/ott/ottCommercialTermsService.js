'use strict';

const { Op } = require('sequelize');
const db = require('../../models');

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
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
  const providerFeeExVat = roundMoney(policy.fixedFeeExVat);
  const providerFeeAmount = policy.fixedFeeIsVatExclusive === false
    ? providerFeeExVat
    : roundMoney(providerFeeExVat * (1 + vatRate));
  const mmtpFeeExVat = roundMoney(policy.mmtpFeeExVat);
  const mmtpFeeAmount = roundMoney(mmtpFeeExVat * (1 + vatRate));

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
