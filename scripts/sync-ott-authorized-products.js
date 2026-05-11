#!/usr/bin/env node
'use strict';

/**
 * Reconcile and optionally apply the OTT authorised-provider allowlist in Staging.
 *
 * Dry-run by default. Uses Jaco's workbook when available, plus the ABSA 67
 * correction in config/ott-authorized-providers.json. Apply mode is
 * non-destructive: it hides/unpublishes unsupported OTT rows; it does not delete
 * history or run wallet-debit transactions.
 */

require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const { getStagingClient, closeAll } = require('./db-connection-helper');
const { OttClient } = require('../services/ott/ottClient');
const {
  loadAuthorizedProviders,
  normalizeCode,
  nameMatches,
} = require('../services/ott/ottAuthorizedProviderPolicy');

const DEFAULT_WORKBOOK_PATH = path.join(os.homedir(), 'Downloads', 'Payout Provider List.xlsx');

function parseArgs(argv) {
  const flags = new Set(argv);
  if (!flags.has('--staging')) {
    throw new Error('Use --staging to confirm this helper targets Staging only.');
  }
  const workbookArgIndex = argv.indexOf('--workbook');
  const workbookPath = workbookArgIndex >= 0 ? argv[workbookArgIndex + 1] : DEFAULT_WORKBOOK_PATH;
  if (workbookArgIndex >= 0 && !workbookPath) {
    throw new Error('--workbook requires a file path.');
  }
  if (workbookArgIndex >= 0 && !fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }
  return {
    apply: flags.has('--apply'),
    skipApi: flags.has('--skip-api'),
    workbookPath: fs.existsSync(workbookPath) ? workbookPath : null,
  };
}

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
  return normalizeCode(provider.providerCode || provider.ProviderCode || provider.code || provider.id || provider.providerId);
}

function providerNameOf(provider = {}) {
  return String(provider.providerName || provider.ProviderName || provider.name || provider.description || '').trim();
}

function findAuthorizedInList(records, { providerCode, providerName, providerType } = {}) {
  const code = normalizeCode(providerCode);
  const type = String(providerType || '').trim().toLowerCase();
  return records.find((record) => {
    if (record.code !== code) return false;
    if (type && record.providerType !== 'unknown' && record.providerType !== type) return false;
    return nameMatches(record.name, providerName);
  }) || null;
}

function isApprovedCatalogInList(records, { providerCode, providerName, providerType } = {}) {
  const authorised = findAuthorizedInList(records, { providerCode, providerName, providerType });
  return Boolean(authorised && authorised.customerFacing && ['voucher', 'gift_card', 'electricity'].includes(authorised.providerType));
}

async function fetchOttApiProviders(skipApi) {
  if (skipApi) return { providers: [], limits: [], skipped: true };
  try {
    const client = new OttClient();
    const request = {
      requestdate: new Date().toISOString(),
      yourUniqueReference: `MM-OTT-AUTH-${Date.now()}`,
    };
    const [providersResponse, limitsResponse] = await Promise.all([
      client.getActiveProviders(request),
      client.getActiveProviderLimits(request),
    ]);
    return {
      providers: asArray(providersResponse.data),
      limits: asArray(limitsResponse.data),
      skipped: false,
    };
  } catch (error) {
    return {
      providers: [],
      limits: [],
      skipped: false,
      error: error.code || error.message,
    };
  }
}

async function loadDbState(client) {
  const [terms, products, mappings] = await Promise.all([
    client.query(`
      SELECT id, provider_code, provider_name, provider_type, service_family, commercial_type,
             is_customer_facing, is_active, is_mock, metadata
      FROM supplier_commercial_terms
      WHERE supplier_code = $1
      ORDER BY provider_code;
    `, ['OTT']),
    client.query(`
      SELECT p.id AS product_id, p.name AS product_name, p.type::text AS product_type,
             p.status::text AS product_status, p."supplierProductId" AS product_supplier_id,
             pv.id AS variant_id, pv.provider, pv.status::text AS variant_status,
             pv."supplierProductId" AS variant_supplier_id,
             pv.constraints
      FROM products p
      JOIN suppliers s ON s.id = p."supplierId"
      JOIN product_variants pv ON pv."productId" = p.id
      WHERE s.code = $1
      ORDER BY p.name, pv.id;
    `, ['OTT']),
    client.query(`
      SELECT id, supplier_product_id, product_type, raw_name, canonical_name,
             review_status, publish_status
      FROM product_catalog_mappings
      WHERE supplier_code = $1
      ORDER BY supplier_product_id, id;
    `, ['OTT']),
  ]);

  return {
    terms: terms.rows,
    products: products.rows,
    mappings: mappings.rows,
  };
}

function categorize({ authorisedProviders, apiProviders, dbState }) {
  const authorisedByCode = new Map(authorisedProviders.map((provider) => [provider.code, provider]));
  const dbTermsByCode = new Map(dbState.terms.map((term) => [term.provider_code, term]));
  const apiByCode = new Map(apiProviders.map((provider) => [providerCodeOf(provider), provider]));

  const authorisedRows = authorisedProviders.map((provider) => {
    const apiProvider = apiByCode.get(provider.code);
    const dbTerm = dbTermsByCode.get(provider.code);
    const apiName = providerNameOf(apiProvider);
    const dbName = dbTerm?.provider_name;
    return {
      providerCode: provider.code,
      authorisedName: provider.name,
      authorisedType: provider.providerType,
      customerFacing: provider.customerFacing,
      source: provider.source,
      apiName: apiName || null,
      dbName: dbName || null,
      status: dbTerm
        ? 'authorised_present_in_db'
        : 'authorised_missing_in_db',
      apiStatus: apiProvider
        ? 'present_in_api'
        : 'missing_from_api_or_api_unavailable',
    };
  });

  const apiOnly = apiProviders
    .map((provider) => ({
      providerCode: providerCodeOf(provider),
      providerName: providerNameOf(provider),
      authorised: findAuthorizedInList(authorisedProviders, {
        providerCode: providerCodeOf(provider),
        providerName: providerNameOf(provider),
      }),
    }))
    .filter((provider) => provider.providerCode && !provider.authorised)
    .map(({ authorised, ...provider }) => ({
      ...provider,
      status: 'api_only_hide',
    }));

  const dbStale = dbState.terms
    .filter((term) => {
      const authorised = findAuthorizedInList(authorisedProviders, {
        providerCode: term.provider_code,
        providerName: term.provider_name,
        providerType: term.provider_type,
      });
      return !authorised || !authorised.customerFacing;
    })
    .map((term) => ({
      providerCode: term.provider_code,
      providerName: term.provider_name,
      providerType: term.provider_type,
      customerFacing: term.is_customer_facing,
      status: 'db_only_or_not_customer_facing_hide',
    }));

  const unsupportedCatalogProducts = dbState.products
    .filter((row) => {
      const providerCode = String(row.product_supplier_id || row.variant_supplier_id || '').replace(/^OTT-/i, '');
      return !isApprovedCatalogInList(authorisedProviders, {
        providerCode,
        providerName: row.product_name || row.provider,
        providerType: row.product_type,
      });
    })
    .map((row) => ({
      supplierProductId: row.product_supplier_id,
      productName: row.product_name,
      productStatus: row.product_status,
      variantStatus: row.variant_status,
      action: 'deactivate_product_variant_and_unpublish_mapping',
    }));

  return {
    authorisedRows,
    apiOnly,
    dbStale,
    unsupportedCatalogProducts,
    authorisedCodes: [...authorisedByCode.keys()],
  };
}

async function applyNonDestructiveSync(client, report) {
  const unsupportedCodes = report.dbStale.map((row) => row.providerCode);
  const unsupportedSupplierProductIds = report.unsupportedCatalogProducts
    .map((row) => row.supplierProductId)
    .filter(Boolean);
  const metadataPatch = JSON.stringify({
    authorisedProviderSync: {
      source: 'sync-ott-authorized-products',
      status: 'hidden_by_jaco_allowlist',
      syncedAt: new Date().toISOString(),
    },
  });

  const result = {
    termsHidden: 0,
    variantsDeactivated: 0,
    productsDeactivated: 0,
    mappingsUnpublished: 0,
  };

  await client.query('BEGIN');
  try {
    if (unsupportedCodes.length > 0) {
      const terms = await client.query(`
        UPDATE supplier_commercial_terms
        SET is_customer_facing = false,
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            "updatedAt" = NOW()
        WHERE supplier_code = $1
          AND provider_code = ANY($3::text[])
          AND is_customer_facing = true;
      `, ['OTT', metadataPatch, unsupportedCodes]);
      result.termsHidden = terms.rowCount;
    }

    if (unsupportedSupplierProductIds.length > 0) {
      const variants = await client.query(`
        UPDATE product_variants
        SET status = 'inactive', "updatedAt" = NOW()
        WHERE "supplierProductId" = ANY($1::text[])
          AND status = 'active';
      `, [unsupportedSupplierProductIds]);
      result.variantsDeactivated = variants.rowCount;

      const products = await client.query(`
        UPDATE products
        SET status = 'inactive', "updatedAt" = NOW()
        WHERE "supplierProductId" = ANY($1::text[])
          AND status = 'active';
      `, [unsupportedSupplierProductIds]);
      result.productsDeactivated = products.rowCount;

      const mappings = await client.query(`
        UPDATE product_catalog_mappings
        SET publish_status = 'unpublished',
            reason = 'Unpublished by OTT authorised-provider allowlist sync',
            "updatedAt" = NOW()
        WHERE supplier_code = $1
          AND supplier_product_id = ANY($2::text[])
          AND publish_status = 'published';
      `, ['OTT', unsupportedSupplierProductIds]);
      result.mappingsUnpublished = mappings.rowCount;
    }

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const authorisedProviders = loadAuthorizedProviders({
    workbookPath: args.workbookPath,
    environment: 'staging',
  });
  const apiState = await fetchOttApiProviders(args.skipApi);
  const client = await getStagingClient();

  try {
    const dbState = await loadDbState(client);
    const report = categorize({
      authorisedProviders,
      apiProviders: apiState.providers,
      dbState,
    });
    const output = {
      generatedAt: new Date().toISOString(),
      environment: 'staging',
      mode: args.apply ? 'apply' : 'dry-run',
      source: {
        workbookPath: args.workbookPath,
        workbookFound: Boolean(args.workbookPath),
        apiProviderCount: apiState.providers.length,
        apiLimitCount: apiState.limits.length,
        apiSkipped: apiState.skipped,
        apiError: apiState.error || null,
      },
      authorisedProviderCount: authorisedProviders.length,
      report,
      applied: null,
    };

    if (args.apply) {
      output.applied = await applyNonDestructiveSync(client, report);
    }

    console.log(JSON.stringify(output, null, 2));
  } finally {
    client.release();
    await closeAll();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: 'OTT_AUTHORISED_PROVIDER_SYNC_FAILED',
    message: error.message,
  }, null, 2));
  process.exitCode = 1;
});
