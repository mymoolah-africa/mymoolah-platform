#!/usr/bin/env node

/**
 * Refresh vas_best_offers - Banking-grade pre-computed best-offer table
 *
 * Populates vas_best_offers from product_variants. For each (vasType, provider, denomination),
 * selects the variant with HIGHEST commission. One product per logical offering.
 *
 * Run after catalog sync: node scripts/refresh-vas-best-offers.js
 *
 * @author MyMoolah Development Team
 * @date 2026-02-18
 */

require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const NORMALIZE_PROVIDER = {
  'cell c': 'CellC',
  'cellc': 'CellC',
  'vodacom': 'Vodacom',
  'mtn': 'MTN',
  'telkom': 'Telkom',
  'eeziairtime': 'eeziAirtime',
  'eezi airtime': 'eeziAirtime',
  'global': 'Global',
  'global-airtime': 'Global',
  'global-data': 'Global'
};

function normalizeProvider(p) {
  if (!p || typeof p !== 'string') return null;
  const key = p.trim().toLowerCase();
  return NORMALIZE_PROVIDER[key] || p.trim();
}

async function refreshBestOffers() {
  const catalogVersion = Date.now();
  const refreshedBy = process.env.REFRESH_JOB_NAME || 'refresh-vas-best-offers';

  console.log('🔄 Refreshing vas_best_offers...');
  const start = Date.now();

  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch all active variants with product and supplier
    const variants = await sequelize.query(
      `SELECT pv.id as "productVariantId", pv."productId", pv."supplierId", pv."supplierProductId",
              pv."vasType", pv.provider, pv.commission, pv."fixedFee", pv.denominations,
              pv."minAmount", pv."maxAmount", pv."predefinedAmounts",
              p.name as "productName", s.code as "supplierCode"
       FROM product_variants pv
       JOIN products p ON p.id = pv."productId"
       JOIN suppliers s ON s.id = pv."supplierId"
       WHERE pv.status = 'active' AND p.status = 'active' AND s."isActive" = true
       ORDER BY pv.commission DESC NULLS LAST`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log(`   Found ${variants.length} active variants`);

    // 2. Build (vasType, provider, denomination) -> best variant map
    const bestByKey = new Map();

    for (const v of variants) {
      const vasType = (v.vasType || '').toString().toLowerCase();
      if (!['airtime', 'data', 'voucher'].includes(vasType)) continue;

      const provider = normalizeProvider(v.provider) || v.provider || 'Unknown';
      const commission = parseFloat(v.commission) || 0;

      // Get denominations for this variant
      let denoms = [];
      if (Array.isArray(v.denominations) && v.denominations.length > 0) {
        denoms = v.denominations.filter((n) => typeof n === 'number' && !Number.isNaN(n));
      }
      if (Array.isArray(v.predefinedAmounts) && v.predefinedAmounts.length > 0) {
        denoms = [...new Set([...denoms, ...v.predefinedAmounts])];
      }
      if (denoms.length === 0 && v.minAmount != null && v.maxAmount != null && v.minAmount === v.maxAmount) {
        denoms = [v.minAmount];
      }
      if (denoms.length === 0 && v.minAmount != null) {
        denoms = [v.minAmount];
      }
      if (denoms.length === 0) continue;

      for (const denom of denoms) {
        const key = `${vasType}|${provider}|${denom}`;
        if (!bestByKey.has(key)) {
          bestByKey.set(key, {
            vasType,
            provider,
            denominationCents: denom,
            productVariantId: v.productVariantId,
            productId: v.productId,
            supplierId: v.supplierId,
            supplierCode: v.supplierCode,
            productName: v.productName,
            supplierProductId: v.supplierProductId,
            commission,
            fixedFee: v.fixedFee || 0,
            denominations: [denom],
            minAmount: denom,
            maxAmount: denom
          });
        }
      }
    }

    const rows = Array.from(bestByKey.values());
    console.log(`   Computed ${rows.length} best offers`);

    // 3. Atomic replace: truncate and insert
    await sequelize.query('TRUNCATE TABLE vas_best_offers RESTART IDENTITY', { transaction });

    if (rows.length > 0) {
      const { QueryInterface } = require('sequelize');
      const qi = sequelize.getQueryInterface();
      await qi.bulkInsert(
        'vas_best_offers',
        rows.map((r) => ({
          vas_type: r.vasType,
          provider: r.provider || '',
          denomination_cents: r.denominationCents,
          product_variant_id: r.productVariantId,
          product_id: r.productId,
          supplier_id: r.supplierId,
          supplier_code: r.supplierCode || '',
          product_name: r.productName || '',
          supplier_product_id: r.supplierProductId || '',
          commission: r.commission,
          fixed_fee: r.fixedFee || 0,
          denominations: r.denominations || [r.denominationCents],
          min_amount: r.minAmount,
          max_amount: r.maxAmount,
          catalog_version: catalogVersion
        })),
        { transaction }
      );
    }

    // 4. Audit log
    await sequelize.query(
      `INSERT INTO catalog_refresh_audit (refreshed_by, vas_type, rows_affected, catalog_version)
       VALUES (:refreshedBy, NULL, :rowsAffected, :catalogVersion)`,
      {
        replacements: { refreshedBy, rowsAffected: rows.length, catalogVersion },
        transaction
      }
    );

    await transaction.commit();

    const elapsed = Date.now() - start;
    console.log(`✅ vas_best_offers refreshed in ${elapsed}ms (${rows.length} rows, version ${catalogVersion})`);
    return { rowsAffected: rows.length, catalogVersion };
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Refresh failed:', err.message);
    throw err;
  }
}

// Allow running as script or requiring as module
if (require.main === module) {
  refreshBestOffers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  module.exports = { refreshBestOffers };
}
