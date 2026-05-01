'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { OttClient } = require('./ottClient');
const { commissionPolicyFromTerm } = require('./ottCommercialTermsService');

const KNOWN_PROVIDER_CLASSIFICATION = {
  '2': { providerType: 'payout', serviceFamily: 'cash_send', customerFacing: true },
  '3': { providerType: 'voucher', serviceFamily: 'voucher', customerFacing: true },
  '60': { providerType: 'voucher', serviceFamily: 'voucher', customerFacing: true },
  '68': { providerType: 'voucher', serviceFamily: 'voucher', customerFacing: true },
  '69': { providerType: 'voucher', serviceFamily: 'voucher', customerFacing: true },
  '71': { providerType: 'mock', serviceFamily: 'mock', customerFacing: false, isMock: true },
  '73': { providerType: 'mock', serviceFamily: 'mock', customerFacing: false, isMock: true },
  '76': { providerType: 'mock', serviceFamily: 'mock', customerFacing: false, isMock: true },
  '78': { providerType: 'mock', serviceFamily: 'mock', customerFacing: false, isMock: true },
  '112': { providerType: 'payout', serviceFamily: 'cash_send', customerFacing: true },
  '127': { providerType: 'payout', serviceFamily: 'payshap', customerFacing: true },
  '140': { providerType: 'electricity', serviceFamily: 'electricity', customerFacing: true },
  '141': { providerType: 'gift_card', serviceFamily: 'voucher', customerFacing: true },
  '146': { providerType: 'gift_card', serviceFamily: 'voucher', customerFacing: true },
  '156': { providerType: 'gift_card', serviceFamily: 'voucher', customerFacing: true },
  '157': { providerType: 'gift_card', serviceFamily: 'voucher', customerFacing: true },
};

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.providers)) return value.providers;
  if (Array.isArray(value?.Providers)) return value.Providers;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.Data)) return value.Data;
  if (value && typeof value === 'object') return Object.values(value).filter((entry) => entry && typeof entry === 'object');
  return [];
}

function providerCodeOf(provider = {}) {
  return String(
    provider.providerCode ||
    provider.ProviderCode ||
    provider.code ||
    provider.id ||
    provider.providerId ||
    ''
  ).trim();
}

function providerNameOf(provider = {}) {
  return String(
    provider.providerName ||
    provider.ProviderName ||
    provider.name ||
    provider.description ||
    `OTT Provider ${providerCodeOf(provider)}`
  ).trim();
}

function classifyProvider(provider = {}) {
  const code = providerCodeOf(provider);
  const known = KNOWN_PROVIDER_CLASSIFICATION[code];
  if (known) return known;

  const name = providerNameOf(provider).toLowerCase();
  if (name.includes('mock') || name.includes('test')) {
    return { providerType: 'mock', serviceFamily: 'mock', customerFacing: false, isMock: true };
  }
  if (name.includes('electricity')) {
    return { providerType: 'electricity', serviceFamily: 'electricity', customerFacing: true };
  }
  if (name.includes('gift') || name.includes('voucher') || name.includes('takealot') || name.includes('nandos') || name.includes('dis-chem')) {
    return { providerType: 'voucher', serviceFamily: 'voucher', customerFacing: true };
  }
  if (name.includes('cash') || name.includes('payshap') || name.includes('instant money')) {
    return { providerType: 'payout', serviceFamily: 'cash_send', customerFacing: true };
  }
  return { providerType: 'unknown', serviceFamily: 'unknown', customerFacing: false };
}

function cents(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.round(numeric * 100);
}

function normalizeLimit(limit = {}) {
  return {
    minAmount: cents(limit.minAmount || limit.MinAmount || limit.minimum || limit.min, 100),
    maxAmount: cents(limit.maxAmount || limit.MaxAmount || limit.maximum || limit.max, 500000),
    raw: limit,
  };
}

function findLimitForProvider(limits, providerCode) {
  return asArray(limits).find((limit) => providerCodeOf(limit) === String(providerCode)) || {};
}

async function ensureOttSupplier(transaction) {
  const [supplier] = await db.Supplier.findOrCreate({
    where: { code: 'OTT' },
    defaults: { name: 'OTT Mobile', code: 'OTT', isActive: true },
    transaction,
  });
  return supplier;
}

async function upsertProviderMetadata({ provider, limits = [], transaction } = {}) {
  const providerCode = providerCodeOf(provider);
  if (!providerCode) return null;
  const providerName = providerNameOf(provider);
  const classification = classifyProvider(provider);
  const supplier = await ensureOttSupplier(transaction);
  const limit = normalizeLimit(findLimitForProvider(limits, providerCode));

  const existing = await db.SupplierCommercialTerm.findOne({
    where: {
      supplierCode: 'OTT',
      providerCode,
      isActive: true,
      effectiveFrom: { [Op.lte]: new Date().toISOString().slice(0, 10) },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: new Date().toISOString().slice(0, 10) } }],
    },
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
    transaction,
  });

  if (existing) {
    const metadata = {
      ...(existing.metadata || {}),
      lastProviderSyncAt: new Date().toISOString(),
      activeProvider: provider,
      limits: limit.raw,
    };
    await existing.update({
      providerName,
      providerType: existing.providerType === 'unknown' ? classification.providerType : existing.providerType,
      serviceFamily: existing.serviceFamily === 'unknown' ? classification.serviceFamily : existing.serviceFamily,
      isCustomerFacing: Boolean(existing.isCustomerFacing || classification.customerFacing),
      isMock: Boolean(existing.isMock || classification.isMock),
      metadata,
    }, { transaction });
    return existing;
  }

  return db.SupplierCommercialTerm.create({
    supplierId: supplier.id,
    supplierCode: 'OTT',
    providerCode,
    providerName,
    providerType: classification.providerType,
    serviceFamily: classification.serviceFamily,
    commercialType: classification.providerType === 'payout' ? 'fixed_fee' : 'none',
    fixedFeeVatRate: Number(process.env.VAT_RATE || 0.15),
    fixedFeeIsVatExclusive: true,
    isCustomerFacing: classification.customerFacing,
    isMock: Boolean(classification.isMock),
    isActive: true,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    metadata: {
      lastProviderSyncAt: new Date().toISOString(),
      activeProvider: provider,
      limits: limit.raw,
      economicTermsMissing: true,
    },
  }, { transaction });
}

function categoryForProviderType(providerType) {
  if (providerType === 'electricity') return 'utilities';
  if (providerType === 'voucher' || providerType === 'gift_card') return 'shopping';
  return 'other';
}

function productTypeForProviderType(providerType) {
  if (providerType === 'electricity') return 'electricity';
  return 'voucher';
}

function productName(providerName) {
  return providerName
    .replace(/^OTT Mobile Gift Cards \| /i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function importCatalogTerm(term, limits = [], transaction) {
  const policy = commissionPolicyFromTerm(term);
  if (!policy || !policy.isCustomerFacing || policy.isMock) return { skipped: true, reason: 'not_customer_facing' };
  if (!['voucher', 'electricity', 'gift_card'].includes(policy.providerType)) return { skipped: true, reason: 'not_catalog_provider' };

  const supplier = await ensureOttSupplier(transaction);
  const limit = normalizeLimit(findLimitForProvider(limits, policy.providerCode));
  const name = productName(policy.providerName);
  const type = productTypeForProviderType(policy.providerType);
  const supplierProductId = `OTT-${policy.providerCode}`;

  const [brand] = await db.ProductBrand.findOrCreate({
    where: { name },
    defaults: {
      name,
      category: categoryForProviderType(policy.providerType),
      tags: ['ott', policy.providerType, policy.serviceFamily].filter(Boolean),
      isActive: true,
      metadata: { supplierCode: 'OTT', providerCode: policy.providerCode },
    },
    transaction,
  });

  const [product] = await db.Product.findOrCreate({
    where: { supplierId: supplier.id, supplierProductId },
    defaults: {
      supplierId: supplier.id,
      brandId: brand.id,
      name,
      type,
      supplierProductId,
      denominations: [],
      constraints: {
        minAmount: limit.minAmount,
        maxAmount: limit.maxAmount,
        requiresRecipient: policy.providerType === 'electricity',
      },
      status: 'active',
      isFeatured: false,
      sortOrder: 0,
      metadata: {
        supplierCode: 'OTT',
        providerCode: policy.providerCode,
        providerName: policy.providerName,
        providerType: policy.providerType,
        source: 'ott_provider_catalog_sync',
      },
    },
    transaction,
  });

  await product.update({
    brandId: brand.id,
    name,
    type,
    denominations: [],
    constraints: {
      ...(product.constraints || {}),
      minAmount: limit.minAmount,
      maxAmount: limit.maxAmount,
      requiresRecipient: policy.providerType === 'electricity',
    },
    status: 'active',
    metadata: {
      ...(product.metadata || {}),
      supplierCode: 'OTT',
      providerCode: policy.providerCode,
      providerName: policy.providerName,
      providerType: policy.providerType,
      lastCatalogImportAt: new Date().toISOString(),
    },
  }, { transaction });

  const pricing = {
    defaultCommissionRate: policy.netCommissionPct,
    commissionTiers: [{ minAmount: limit.minAmount, maxAmount: limit.maxAmount, rate: policy.netCommissionPct }],
    auditSplit: {
      grossCommissionPct: policy.grossCommissionPct,
      ottServiceFeePct: policy.serviceFeePct,
      netCommissionPct: policy.netCommissionPct,
      monthlySwitchingFeePct: policy.monthlySwitchingFeePct,
    },
    fees: {},
  };

  const [variant] = await db.ProductVariant.findOrCreate({
    where: { productId: product.id, supplierId: supplier.id },
    defaults: {
      productId: product.id,
      supplierId: supplier.id,
      supplierProductId,
      vasType: type,
      transactionType: type === 'electricity' ? 'direct' : 'voucher',
      networkType: 'local',
      provider: policy.providerName,
      priceType: 'variable',
      minAmount: limit.minAmount,
      maxAmount: limit.maxAmount,
      predefinedAmounts: [],
      commission: policy.netCommissionPct,
      commissionType: 'percentage',
      denominations: [],
      pricing,
      constraints: {
        providerCode: policy.providerCode,
        providerType: policy.providerType,
        requiresRecipient: policy.providerType === 'electricity',
      },
      status: 'active',
      priority: 1,
      featured: false,
      isPreferred: false,
      lastSyncedAt: new Date(),
      metadata: {
        supplierCode: 'OTT',
        providerCode: policy.providerCode,
        commercialPolicy: policy,
      },
    },
    transaction,
  });

  await variant.update({
    supplierProductId,
    vasType: type,
    provider: policy.providerName,
    transactionType: type === 'electricity' ? 'direct' : 'voucher',
    priceType: 'variable',
    minAmount: limit.minAmount,
    maxAmount: limit.maxAmount,
    predefinedAmounts: [],
    commission: policy.netCommissionPct,
    commissionType: 'percentage',
    denominations: [],
    pricing,
    constraints: {
      ...(variant.constraints || {}),
      providerCode: policy.providerCode,
      providerType: policy.providerType,
      requiresRecipient: policy.providerType === 'electricity',
    },
    status: 'active',
    lastSyncedAt: new Date(),
    metadata: {
      ...(variant.metadata || {}),
      supplierCode: 'OTT',
      providerCode: policy.providerCode,
      commercialPolicy: policy,
      lastCatalogImportAt: new Date().toISOString(),
    },
  }, { transaction });

  return { imported: true, productId: product.id, variantId: variant.id, providerCode: policy.providerCode };
}

async function importOttCatalogProducts({ limits = [], transaction } = {}) {
  const terms = await db.SupplierCommercialTerm.findAll({
    where: {
      supplierCode: 'OTT',
      isActive: true,
      isCustomerFacing: true,
      isMock: false,
      providerType: { [Op.in]: ['voucher', 'electricity', 'gift_card'] },
    },
    order: [['providerCode', 'ASC']],
    transaction,
  });

  const results = [];
  for (const term of terms) {
    results.push(await importCatalogTerm(term, limits, transaction));
  }
  return results;
}

async function syncOttProviders({ client = new OttClient(), importCatalog = false } = {}) {
  const request = {
    requestdate: new Date().toISOString(),
    yourUniqueReference: `MM-OTT-SYNC-${Date.now()}`,
  };
  const [providersResponse, limitsResponse] = await Promise.all([
    client.getActiveProviders(request),
    client.getActiveProviderLimits(request),
  ]);
  const providers = asArray(providersResponse.data);
  const limits = asArray(limitsResponse.data);

  const transaction = await db.sequelize.transaction();
  try {
    const providerResults = [];
    for (const provider of providers) {
      providerResults.push(await upsertProviderMetadata({ provider, limits, transaction }));
    }
    const catalogResults = importCatalog ? await importOttCatalogProducts({ limits, transaction }) : [];
    await transaction.commit();
    return {
      providersRead: providers.length,
      limitsRead: limits.length,
      providersUpserted: providerResults.filter(Boolean).length,
      catalogImported: catalogResults.filter((result) => result.imported).length,
      catalogResults,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  KNOWN_PROVIDER_CLASSIFICATION,
  classifyProvider,
  importOttCatalogProducts,
  syncOttProviders,
  upsertProviderMetadata,
};
