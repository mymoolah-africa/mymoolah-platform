'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '../../config/ott-authorized-providers.json');
const CASH_SEND_FAMILIES = new Set(['cash_send']);
const CATALOG_TYPES = new Set(['voucher', 'gift_card', 'electricity']);

function normalizeCode(value) {
  return String(value || '').trim();
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectEnvironment(value = process.env.NODE_ENV) {
  const normalized = normalizeText(value);
  if (normalized.includes('production')) return 'production';
  if (normalized.includes('staging')) return 'staging';
  return 'uat';
}

function nameMatches(authorizedName, providerName) {
  const expected = normalizeText(authorizedName);
  const actual = normalizeText(providerName);
  if (!expected || !actual) return true;
  return expected === actual || expected.includes(actual) || actual.includes(expected);
}

function providerTypeMatches(authorizedType, requestedType) {
  const expected = normalizeText(authorizedType).replace(/\s+/g, '_');
  const requested = normalizeText(requestedType).replace(/\s+/g, '_');
  if (!requested || expected === 'unknown') return true;
  if (expected === requested) return true;
  return CATALOG_TYPES.has(expected) && CATALOG_TYPES.has(requested);
}

function normalizeProviderRecord(record = {}, defaults = {}) {
  const code = normalizeCode(
    record.code ||
    record.providerCode ||
    record.ProviderCode ||
    record.providerId ||
    record.ProviderID ||
    record.id
  );
  if (!code) return null;

  const providerType = normalizeText(
    record.providerType ||
    record.type ||
    record.productType ||
    defaults.providerType ||
    'unknown'
  ).replace(/\s+/g, '_');
  const serviceFamily = normalizeText(
    record.serviceFamily ||
    record.family ||
    defaults.serviceFamily ||
    providerType
  ).replace(/\s+/g, '_');
  const rawEnvironments = record.environments || record.environment || record.sheetName || defaults.environment;
  const environments = Array.isArray(rawEnvironments)
    ? rawEnvironments.map(detectEnvironment)
    : [detectEnvironment(rawEnvironments)];

  return {
    code,
    name: String(record.name || record.providerName || record.ProviderName || record.description || `OTT Provider ${code}`).trim(),
    providerType,
    serviceFamily,
    customerFacing: record.customerFacing !== undefined
      ? Boolean(record.customerFacing)
      : Boolean(defaults.customerFacing),
    environments: [...new Set(environments)],
    source: record.source || defaults.source || 'config',
    raw: record.raw || record,
  };
}

function loadConfig(configPath = process.env.OTT_AUTHORIZED_PROVIDERS_CONFIG || DEFAULT_CONFIG_PATH) {
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return {
    ...parsed,
    providers: (parsed.providers || [])
      .map((record) => normalizeProviderRecord(record, { source: parsed.version || 'config' }))
      .filter(Boolean),
  };
}

function inferTypeFromName(name) {
  const normalized = normalizeText(name);
  if (normalized.includes('cash') || normalized.includes('ewallet') || normalized.includes('instant money')) {
    return { providerType: 'payout', serviceFamily: 'cash_send', customerFacing: true };
  }
  if (normalized.includes('payshap')) return { providerType: 'payout', serviceFamily: 'payshap', customerFacing: false };
  if (normalized.includes('eft') || normalized.includes('rtc')) return { providerType: 'payout', serviceFamily: 'eft', customerFacing: false };
  if (normalized.includes('voucher') || normalized.includes('gift')) return { providerType: 'voucher', serviceFamily: 'voucher', customerFacing: true };
  return { providerType: 'unknown', serviceFamily: 'unknown', customerFacing: false };
}

function pick(row, candidates) {
  for (const candidate of candidates) {
    const value = row[candidate];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function parseWorkbookRows(workbookPath) {
  // Loaded lazily so application startup does not depend on spreadsheet parsing.
  // eslint-disable-next-line global-require
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(workbookPath);
  const records = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    for (const row of rows) {
      const code = pick(row, ['ProviderID', 'ProviderId', 'Provider ID', 'Provider Code', 'ProviderCode', 'Code', 'ID', 'Id']);
      const name = pick(row, ['ProviderName', 'Provider Name', 'Name', 'Provider', 'Description', 'Product']);
      if (!code || !name) continue;
      const inferred = inferTypeFromName(name);
      records.push(normalizeProviderRecord({
        code,
        name,
        sheetName,
        source: `workbook:${path.basename(workbookPath)}:${sheetName}`,
        raw: row,
      }, {
        ...inferred,
        environment: sheetName,
      }));
    }
  }

  return records.filter(Boolean);
}

function loadAuthorizedProviders({ workbookPath = process.env.OTT_AUTHORIZED_PROVIDERS_WORKBOOK, environment } = {}) {
  const config = loadConfig();
  const workbookRecords = workbookPath && fs.existsSync(workbookPath) ? parseWorkbookRows(workbookPath) : [];
  const providers = [...config.providers, ...workbookRecords]
    .map((record) => normalizeProviderRecord(record))
    .filter(Boolean)
    .filter((record) => !environment || record.environments.includes(detectEnvironment(environment)));
  return providers;
}

function findAuthorizedProvider({ providerCode, providerName, providerType, environment } = {}) {
  const code = normalizeCode(providerCode);
  if (!code) return null;
  const env = detectEnvironment(environment);
  const candidates = loadAuthorizedProviders({ environment: env }).filter((record) => record.code === code);
  const typeNormalized = providerType ? normalizeText(providerType).replace(/\s+/g, '_') : null;
  return candidates.find((record) => {
    if (typeNormalized && !providerTypeMatches(record.providerType, typeNormalized)) return false;
    return nameMatches(record.name, providerName);
  }) || null;
}

function isAuthorizedProvider(input = {}) {
  return Boolean(findAuthorizedProvider(input));
}

function isCustomerFacingAuthorizedProvider(input = {}) {
  const authorized = findAuthorizedProvider(input);
  return Boolean(authorized && authorized.customerFacing);
}

function isApprovedCashPayoutProvider({ providerCode, providerName, environment } = {}) {
  const authorized = findAuthorizedProvider({ providerCode, providerName, providerType: 'payout', environment });
  return Boolean(authorized && authorized.customerFacing && CASH_SEND_FAMILIES.has(authorized.serviceFamily));
}

function isApprovedCatalogProvider({ providerCode, providerName, providerType, environment } = {}) {
  const authorized = findAuthorizedProvider({ providerCode, providerName, providerType, environment });
  return Boolean(authorized && authorized.customerFacing && CATALOG_TYPES.has(authorized.providerType));
}

function authorizedProviderCodes(filter = {}) {
  return loadAuthorizedProviders(filter).map((record) => record.code);
}

module.exports = {
  CATALOG_TYPES,
  CASH_SEND_FAMILIES,
  detectEnvironment,
  findAuthorizedProvider,
  isApprovedCashPayoutProvider,
  isApprovedCatalogProvider,
  isAuthorizedProvider,
  isCustomerFacingAuthorizedProvider,
  loadAuthorizedProviders,
  nameMatches,
  normalizeCode,
  normalizeText,
  parseWorkbookRows,
  providerTypeMatches,
  authorizedProviderCodes,
};
