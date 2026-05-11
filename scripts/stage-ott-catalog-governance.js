#!/usr/bin/env node
'use strict';

/**
 * Staging-only OTT catalog governance helper.
 *
 * Dry-run by default. Use --staging --apply after the OTT catalog import has run
 * to create/update and publish only the approved OTT voucher/gift-card mappings.
 */

require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const { getStagingClient, closeAll } = require('./db-connection-helper');
const { recogniseVoucherBrand } = require('../services/voucherCatalogBrandService');
const { isApprovedCatalogProvider } = require('../services/ott/ottAuthorizedProviderPolicy');

const DEFAULT_WORKBOOK_PATH = path.join(os.homedir(), 'Downloads', 'Payout Provider List.xlsx');

function parseArgs(argv) {
  const flags = new Set(argv);
  if (!flags.has('--staging')) {
    throw new Error('Use --staging to confirm this helper targets staging only.');
  }
  const workbookIndex = argv.indexOf('--workbook');
  const workbookPath = workbookIndex >= 0 ? argv[workbookIndex + 1] : DEFAULT_WORKBOOK_PATH;
  if (workbookIndex >= 0 && !workbookPath) {
    throw new Error('--workbook requires a file path.');
  }
  if (workbookPath && fs.existsSync(workbookPath)) {
    process.env.OTT_AUTHORIZED_PROVIDERS_WORKBOOK = workbookPath;
  }
  return {
    apply: flags.has('--apply'),
  };
}

function canonicalFields(rawName) {
  const recognised = recogniseVoucherBrand(rawName);
  return {
    canonicalName: recognised.brand,
    canonicalBrand: recognised.brand,
    category: recognised.category || 'shopping',
    description: recognised.desc || `${recognised.brand} retail voucher`,
    iconKey: recognised.catalogKey,
    recognition: recognised.recognition,
    catalogKey: recognised.catalogKey,
  };
}

function isApprovedOttCatalogCandidate(row) {
  const supplierProductId = row.product_supplier_id || row.variant_supplier_id;
  const providerCode = String(supplierProductId || '').replace(/^OTT-/i, '');

  const rawName = row.product_name || row.provider || supplierProductId;
  const recognised = recogniseVoucherBrand(rawName);
  if (recognised.recognition !== 'mapped') return false;
  return isApprovedCatalogProvider({
    providerCode,
    providerName: rawName,
    providerType: recognised.isGiftCard ? 'gift_card' : 'voucher',
    environment: 'staging',
  });
}

async function loadCandidates(client) {
  const result = await client.query(`
    SELECT
      pv.id AS variant_id,
      p.id AS product_id,
      s.id AS supplier_id,
      s.code AS supplier_code,
      p."supplierProductId" AS product_supplier_id,
      p.name AS product_name,
      p.type::text AS product_type,
      pv.provider,
      pv."supplierProductId" AS variant_supplier_id,
      pv.status::text AS variant_status,
      p.status::text AS product_status,
      pcm.id AS mapping_id,
      pcm.review_status,
      pcm.publish_status
    FROM products p
    JOIN suppliers s ON s.id = p."supplierId"
    JOIN product_variants pv ON pv."productId" = p.id
    LEFT JOIN product_catalog_mappings pcm
      ON pcm.supplier_code = s.code
     AND pcm.supplier_product_id = p."supplierProductId"
     AND pcm.product_type = p.type::text
    WHERE s.code = $1
      AND p.status = 'active'
      AND pv.status = 'active'
      AND p.type::text = 'voucher'
    ORDER BY p.name, pv.id;
  `, ['OTT']);
  return result.rows.filter(isApprovedOttCatalogCandidate);
}

async function applyCandidate(client, row) {
  const rawName = row.product_name || row.provider || row.product_supplier_id;
  const canonical = canonicalFields(rawName);
  const rawSnapshot = {
    variantId: row.variant_id,
    productId: row.product_id,
    supplierId: row.supplier_id,
    supplierCode: row.supplier_code,
    supplierProductId: row.product_supplier_id,
    productName: row.product_name,
    provider: row.provider,
    productType: row.product_type,
    variantStatus: row.variant_status,
    productStatus: row.product_status,
  };

  const mapping = await client.query(`
    INSERT INTO product_catalog_mappings (
      source_variant_id, source_product_id, supplier_id, supplier_code, supplier_product_id,
      product_type, raw_name, raw_snapshot, canonical_name, canonical_brand, category,
      description, icon_key, risk_tier, review_status, publish_status,
      maker_user_id, maker_user_email, checker_user_id, checker_user_email,
      submitted_at, approved_at, reason, metadata, "createdAt", "updatedAt"
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8::jsonb, $9, $10, $11,
      $12, $13, 'medium', 'approved', 'published',
      'system', 'system@mymoolah.africa', 'system', 'system@mymoolah.africa',
      NOW(), NOW(), 'OTT staging approved allowlist', $14::jsonb, NOW(), NOW()
    )
    ON CONFLICT (supplier_code, supplier_product_id, product_type)
    DO UPDATE SET
      source_variant_id = EXCLUDED.source_variant_id,
      source_product_id = EXCLUDED.source_product_id,
      supplier_id = EXCLUDED.supplier_id,
      raw_name = EXCLUDED.raw_name,
      raw_snapshot = EXCLUDED.raw_snapshot,
      canonical_name = EXCLUDED.canonical_name,
      canonical_brand = EXCLUDED.canonical_brand,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      icon_key = EXCLUDED.icon_key,
      risk_tier = EXCLUDED.risk_tier,
      review_status = 'approved',
      publish_status = 'published',
      checker_user_id = 'system',
      checker_user_email = 'system@mymoolah.africa',
      approved_at = NOW(),
      reason = 'OTT staging approved allowlist',
      metadata = COALESCE(product_catalog_mappings.metadata, '{}'::jsonb) || EXCLUDED.metadata,
      "updatedAt" = NOW()
    RETURNING id, review_status, publish_status;
  `, [
    row.variant_id,
    row.product_id,
    row.supplier_id,
    row.supplier_code,
    row.product_supplier_id,
    row.product_type,
    rawName,
    JSON.stringify(rawSnapshot),
    canonical.canonicalName,
    canonical.canonicalBrand,
    canonical.category,
    canonical.description,
    canonical.iconKey,
    JSON.stringify({
      source: 'stage-ott-catalog-governance',
      catalogKey: canonical.catalogKey,
      recognition: canonical.recognition,
      approvedAt: new Date().toISOString(),
    }),
  ]);

  await client.query(`
    INSERT INTO product_catalog_audit_events (
      mapping_id, action, actor_user_id, actor_email, actor_role,
      from_status, to_status, from_publish_status, to_publish_status,
      reason, metadata, "createdAt", "updatedAt"
    )
    VALUES (
      $1, 'approved', 'system', 'system@mymoolah.africa', 'system',
      $2, 'approved', $3, 'published',
      'OTT staging approved allowlist', $4::jsonb, NOW(), NOW()
    );
  `, [
    mapping.rows[0].id,
    row.review_status || 'draft',
    row.publish_status || 'unpublished',
    JSON.stringify({
      supplierProductId: row.product_supplier_id,
      rawName,
      catalogKey: canonical.catalogKey,
    }),
  ]);

  return { ...row, ...canonical, mappingId: mapping.rows[0].id, applied: true };
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const client = await getStagingClient();
  try {
    const candidates = await loadCandidates(client);
    const output = {
      generatedAt: new Date().toISOString(),
      environment: 'staging',
      mode: apply ? 'apply' : 'dry-run',
      candidates: candidates.map((row) => ({
        supplierProductId: row.product_supplier_id,
        productName: row.product_name,
        provider: row.provider,
        mappingId: row.mapping_id,
        reviewStatus: row.review_status,
        publishStatus: row.publish_status,
        canonical: canonicalFields(row.product_name || row.provider || row.product_supplier_id),
      })),
      applied: [],
    };

    if (apply) {
      await client.query('BEGIN');
      try {
        for (const candidate of candidates) {
          output.applied.push(await applyCandidate(client, candidate));
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
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
    error: 'OTT_STAGING_GOVERNANCE_FAILED',
    message: error.message,
  }, null, 2));
  process.exitCode = 1;
});
