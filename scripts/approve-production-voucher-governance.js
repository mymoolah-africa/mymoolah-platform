#!/usr/bin/env node
'use strict';

/**
 * Production voucher governance approval helper.
 *
 * Dry-run by default. Requires --production --confirm-production.
 * Use --apply only after reviewing the candidate list.
 */

require('dotenv').config();

const { getProductionClient, closeAll } = require('./db-connection-helper');
const {
  buildCatalogKey,
  recogniseVoucherBrand,
} = require('../services/voucherCatalogBrandService');

const APPROVED_ADDED_KEYS = new Set([
  'ott-voucher',
  'netflorist',
  'easybet',
  'gbets',
  'gold-rush',
]);

const OTT_VARIABLE_SUPPLIER_PRODUCT_ID = '5BOioLwx80GvyiwTch2U';
const SYSTEM_ACTOR_ID = 'system';
const SYSTEM_ACTOR_EMAIL = 'system@mymoolah.africa';
const REASON = 'Production voucher governance approval - preserve live wallet catalog and add approved brands';

function parseArgs(argv) {
  const flags = new Set(argv);
  if (!flags.has('--production') || !flags.has('--confirm-production')) {
    throw new Error('This script requires --production --confirm-production.');
  }
  return {
    apply: flags.has('--apply'),
  };
}

function riskTierForCategory(category) {
  return category === 'betting' ? 'high' : 'medium';
}

function canonicalFields(rawName) {
  const recognised = recogniseVoucherBrand(rawName);
  return {
    canonicalName: recognised.brand,
    canonicalBrand: recognised.brand,
    category: recognised.category || 'shopping',
    description: recognised.desc || `${recognised.brand} retail voucher`,
    iconKey: recognised.catalogKey || buildCatalogKey(recognised.brand),
    catalogKey: recognised.catalogKey || buildCatalogKey(recognised.brand),
    recognition: recognised.recognition,
    isGiftCard: Boolean(recognised.isGiftCard),
  };
}

async function loadActiveVoucherVariants(client) {
  const result = await client.query(`
    SELECT
      pv.id AS variant_id,
      p.id AS product_id,
      s.id AS supplier_id,
      s.code AS supplier_code,
      p."supplierProductId" AS product_supplier_id,
      pv."supplierProductId" AS variant_supplier_id,
      p.name AS product_name,
      p.type::text AS product_type,
      pv.provider,
      pv."minAmount" AS min_amount,
      pv."maxAmount" AS max_amount,
      pv.denominations,
      pv."predefinedAmounts" AS predefined_amounts,
      pv."priceType" AS price_type,
      pv.commission,
      pv.status::text AS variant_status,
      p.status::text AS product_status,
      pcm.id AS mapping_id,
      pcm.review_status,
      pcm.publish_status
    FROM product_variants pv
    JOIN products p ON p.id = pv."productId"
    JOIN suppliers s ON s.id = pv."supplierId"
    LEFT JOIN product_catalog_mappings pcm
      ON pcm.product_type = 'voucher'
     AND pcm.supplier_code = s.code
     AND pcm.supplier_product_id = pv."supplierProductId"
    WHERE p.type = 'voucher'
      AND p.status = 'active'
      AND pv.status = 'active'
      AND s."isActive" = true
    ORDER BY s.code, p.name, pv.id;
  `);
  return result.rows;
}

async function loadBestOfferWinners(client) {
  const result = await client.query(`
    SELECT variant_id, provider, commission, supplier_code, product_id
    FROM v_best_offers
    WHERE "vasType" = 'voucher';
  `);
  const winners = new Map();
  result.rows.forEach((row) => {
    const providerKey = String(row.provider || '').toLowerCase().trim();
    if (!providerKey) return;
    const current = winners.get(providerKey);
    const commission = Number(row.commission) || 0;
    if (!current || commission > current.commission) {
      winners.set(providerKey, {
        variantId: Number(row.variant_id),
        productId: Number(row.product_id),
        supplierCode: String(row.supplier_code || '').toUpperCase(),
        commission,
      });
    }
  });
  return winners;
}

function buildWalletCards(variants, winners) {
  const brandGroups = new Map();
  const fallbackRows = [];

  variants.forEach((variant) => {
    const rawName = variant.product_name || variant.provider || variant.variant_supplier_id || '';
    const recognised = recogniseVoucherBrand(rawName);
    if (recognised.recognition === 'fallback') {
      fallbackRows.push({ ...variant, rawName, recognised });
      return;
    }

    const brandKey = recognised.brand.toLowerCase();
    if (!brandGroups.has(brandKey)) {
      brandGroups.set(brandKey, {
        brand: recognised.brand,
        catalogKey: recognised.catalogKey || buildCatalogKey(recognised.brand),
        category: recognised.category,
        description: recognised.desc,
        isGiftCard: Boolean(recognised.isGiftCard),
        variants: [],
      });
    }
    brandGroups.get(brandKey).variants.push({ ...variant, rawName, recognised });
  });

  const cards = [];
  for (const [, group] of brandGroups) {
    let bestSupplier = '';
    let bestComm = -1;
    let bestVariantId = null;

    group.variants.forEach((variant) => {
      const winner = winners.get(String(variant.provider || '').toLowerCase().trim());
      if (winner && (winner.commission > bestComm || (winner.commission === bestComm && winner.supplierCode === 'FLASH'))) {
        bestSupplier = winner.supplierCode;
        bestComm = winner.commission;
        bestVariantId = winner.variantId;
      }
    });

    if (!bestSupplier) {
      group.variants.forEach((variant) => {
        const commission = Number(variant.commission) || 0;
        const supplierCode = String(variant.supplier_code || '').toUpperCase();
        if (commission > bestComm || (commission === bestComm && supplierCode === 'FLASH' && bestSupplier !== 'FLASH')) {
          bestSupplier = supplierCode;
          bestComm = commission;
        }
      });
    }

    const winnerVariants = group.variants.filter(
      (variant) => String(variant.supplier_code || '').toUpperCase() === bestSupplier
    );
    if (winnerVariants.length === 0) continue;

    let variableVariant = null;
    const fixedVariants = [];
    winnerVariants.forEach((variant) => {
      const minAmount = Number(variant.min_amount) || 0;
      const maxAmount = Number(variant.max_amount) || minAmount;
      const isVariable = minAmount > 0 && maxAmount > minAmount && (!Array.isArray(variant.denominations) || variant.denominations.length === 0);
      if (isVariable) {
        if (!variableVariant || minAmount < (Number(variableVariant.min_amount) || 0)) variableVariant = variant;
      } else {
        fixedVariants.push(variant);
      }
    });

    const bestVariant = bestVariantId
      ? winnerVariants.find((variant) => Number(variant.variant_id) === Number(bestVariantId))
      : null;
    const representative = variableVariant || bestVariant || winnerVariants[0];

    cards.push({
      ...group,
      supplierCode: bestSupplier,
      representative,
      approvalVariants: variableVariant ? [variableVariant] : fixedVariants.length > 0 ? fixedVariants : [representative],
      addedByApproval: APPROVED_ADDED_KEYS.has(group.catalogKey),
    });
  }

  return { cards, fallbackRows };
}

function buildRawSnapshot(row, canonical) {
  return {
    source: 'approve-production-voucher-governance',
    variantId: row.variant_id,
    productId: row.product_id,
    supplierId: row.supplier_id,
    supplierCode: row.supplier_code,
    supplierProductId: row.variant_supplier_id,
    productSupplierProductId: row.product_supplier_id,
    productName: row.product_name,
    provider: row.provider,
    productType: row.product_type,
    minAmount: row.min_amount,
    maxAmount: row.max_amount,
    priceType: row.price_type,
    commission: row.commission,
    catalogKey: canonical.catalogKey,
  };
}

async function upsertApproval(client, row, canonical, apply) {
  if (!apply) return { dryRun: true };

  const previous = {
    reviewStatus: row.review_status || 'draft',
    publishStatus: row.publish_status || 'unpublished',
  };
  const metadata = {
    source: 'approve-production-voucher-governance',
    catalogKey: canonical.catalogKey,
    recognition: canonical.recognition,
    approvedAt: new Date().toISOString(),
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
      'voucher', $6, $7::jsonb, $8, $9, $10,
      $11, $12, $13, 'approved', 'published',
      $14, $15, $14, $15,
      NOW(), NOW(), $16, $17::jsonb, NOW(), NOW()
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
      checker_user_id = EXCLUDED.checker_user_id,
      checker_user_email = EXCLUDED.checker_user_email,
      approved_at = NOW(),
      reason = EXCLUDED.reason,
      metadata = COALESCE(product_catalog_mappings.metadata, '{}'::jsonb) || EXCLUDED.metadata,
      "updatedAt" = NOW()
    RETURNING id;
  `, [
    row.variant_id,
    row.product_id,
    row.supplier_id,
    row.supplier_code,
    row.variant_supplier_id,
    row.product_name,
    JSON.stringify(buildRawSnapshot(row, canonical)),
    canonical.canonicalName,
    canonical.canonicalBrand,
    canonical.category,
    canonical.description,
    canonical.iconKey,
    riskTierForCategory(canonical.category),
    SYSTEM_ACTOR_ID,
    SYSTEM_ACTOR_EMAIL,
    REASON,
    JSON.stringify(metadata),
  ]);

  await client.query(`
    INSERT INTO product_catalog_audit_events (
      mapping_id, action, actor_user_id, actor_email, actor_role,
      from_status, to_status, from_publish_status, to_publish_status,
      reason, metadata, "createdAt", "updatedAt"
    )
    VALUES (
      $1, 'approved', $2, $3, 'system',
      $4, 'approved', $5, 'published',
      $6, $7::jsonb, NOW(), NOW()
    );
  `, [
    mapping.rows[0].id,
    SYSTEM_ACTOR_ID,
    SYSTEM_ACTOR_EMAIL,
    previous.reviewStatus,
    previous.publishStatus,
    REASON,
    JSON.stringify({
      supplierCode: row.supplier_code,
      supplierProductId: row.variant_supplier_id,
      rawName: row.product_name,
      catalogKey: canonical.catalogKey,
    }),
  ]);

  return { mappingId: mapping.rows[0].id };
}

async function applyOttVariableMinimum(client, apply) {
  const result = await client.query(`
    SELECT pv.id, pv."minAmount", pv."maxAmount", pv.constraints
    FROM product_variants pv
    JOIN suppliers s ON s.id = pv."supplierId"
    WHERE s.code = 'MOBILEMART'
      AND pv."supplierProductId" = $1
      AND pv.status = 'active';
  `, [OTT_VARIABLE_SUPPLIER_PRODUCT_ID]);

  const row = result.rows[0];
  if (!row) throw new Error('OTT Variable Voucher variant was not found.');
  const needsUpdate = Number(row.minAmount) !== 500 || Number(row.constraints?.minAmount) !== 500;
  if (!apply || !needsUpdate) {
    return { needsUpdate, currentMinAmount: row.minAmount, currentConstraints: row.constraints };
  }

  const constraints = {
    ...(row.constraints || {}),
    minAmount: 500,
    maxAmount: Number(row.maxAmount) || 500000,
  };

  await client.query(`
    UPDATE product_variants
    SET "minAmount" = 500,
        constraints = $2::jsonb,
        "updatedAt" = NOW()
    WHERE id = $1;
  `, [row.id, JSON.stringify(constraints)]);

  return { needsUpdate: true, updated: true, previousMinAmount: row.minAmount, newMinAmount: 500 };
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const client = await getProductionClient();

  try {
    const variants = await loadActiveVoucherVariants(client);
    const winners = await loadBestOfferWinners(client);
    const { cards, fallbackRows } = buildWalletCards(variants, winners);

    const retailCards = cards.filter((card) => card.isGiftCard !== true);
    const approvals = [];
    const approvalKeys = new Set();

    retailCards.forEach((card) => {
      card.approvalVariants.forEach((variant) => {
        if (card.catalogKey === 'ott-voucher' && variant.variant_supplier_id !== OTT_VARIABLE_SUPPLIER_PRODUCT_ID) return;
        const key = `${variant.supplier_code}:${variant.variant_supplier_id}`;
        if (approvalKeys.has(key)) return;
        approvalKeys.add(key);
        approvals.push({
          card,
          variant,
          canonical: canonicalFields(card.brand),
        });
      });
    });

    const output = {
      mode: apply ? 'apply' : 'dry-run',
      retailCardsPreserved: retailCards.length,
      approvalRows: approvals.length,
      addedCards: retailCards
        .filter((card) => card.addedByApproval)
        .map((card) => ({
          brand: card.brand,
          supplierCode: card.supplierCode,
          variantsToApprove: card.approvalVariants
            .filter((variant) => card.catalogKey !== 'ott-voucher' || variant.variant_supplier_id === OTT_VARIABLE_SUPPLIER_PRODUCT_ID)
            .map((variant) => ({
              productName: variant.product_name,
              supplierProductId: variant.variant_supplier_id,
              minAmount: variant.min_amount,
              maxAmount: variant.max_amount,
              commission: variant.commission,
            })),
        })),
      fallbackRowsStillBlocked: fallbackRows.length,
    };

    console.log(JSON.stringify(output, null, 2));

    if (apply) {
      await client.query('BEGIN');
      try {
        const ottMinimum = await applyOttVariableMinimum(client, true);
        const applied = [];
        for (const approval of approvals) {
          const result = await upsertApproval(client, approval.variant, approval.canonical, true);
          applied.push({
            brand: approval.card.brand,
            supplierCode: approval.variant.supplier_code,
            supplierProductId: approval.variant.variant_supplier_id,
            mappingId: result.mappingId,
          });
        }
        await client.query('COMMIT');
        console.log(JSON.stringify({ appliedRows: applied.length, ottMinimum, applied }, null, 2));
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } else {
      const ottMinimum = await applyOttVariableMinimum(client, false);
      console.log(JSON.stringify({ ottMinimum }, null, 2));
    }
  } finally {
    client.release();
    await closeAll();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
