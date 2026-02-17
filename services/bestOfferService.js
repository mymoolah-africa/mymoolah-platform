/**
 * Best Offer Service - Banking-grade pre-computed VAS catalog
 *
 * Returns ONE product per (vasType, provider, denomination) - the variant with
 * highest commission. Reads from vas_best_offers when populated.
 *
 * @author MyMoolah Development Team
 * @date 2026-02-18
 */

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

class BestOfferService {
  /**
   * Get best offers for a VAS type, optionally filtered by provider (network)
   * @param {string} vasType - airtime, data, voucher
   * @param {string|null} provider - Vodacom, MTN, etc. (null = all)
   * @returns {Promise<{products: Array, catalogVersion: number|null}>}
   */
  async getBestOffers(vasType, provider = null) {
    const normalizedType = (vasType || '').toString().toLowerCase();

    // Check if vas_best_offers has data
    const countResult = await sequelize.query(
      'SELECT COUNT(*) as cnt FROM vas_best_offers WHERE vas_type = :vasType',
      {
        replacements: { vasType: normalizedType },
        type: QueryTypes.SELECT
      }
    );
    const hasData = countResult[0]?.cnt > 0;

    if (!hasData) {
      return { products: [], catalogVersion: null, source: 'empty' };
    }

    let query = `
      SELECT id, vas_type as "vasType", provider, denomination_cents as "denominationCents",
             product_variant_id as "productVariantId", product_id as "productId",
             supplier_id as "supplierId", supplier_code as "supplierCode",
             product_name as "productName", supplier_product_id as "supplierProductId",
             commission, fixed_fee as "fixedFee", denominations,
             min_amount as "minAmount", max_amount as "maxAmount",
             catalog_version as "catalogVersion"
      FROM vas_best_offers
      WHERE vas_type = :vasType
    `;
    const replacements = { vasType: normalizedType };

    if (provider) {
      const provNorm = this._normalizeProvider(provider);
      query += ' AND LOWER(TRIM(provider)) = LOWER(:provider)';
      replacements.provider = provNorm;
    }

    query += ' ORDER BY provider, denomination_cents ASC';

    const rows = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    const catalogVersion = rows[0]?.catalogVersion ?? null;

    const products = rows.map((r) => ({
      id: r.productVariantId,
      productId: r.productId,
      productName: r.productName,
      supplierProductId: r.supplierProductId,
      supplier: r.supplierCode,
      supplierCode: r.supplierCode,
      vasType: r.vasType,
      provider: r.provider,
      minAmount: r.minAmount ?? r.denominationCents,
      maxAmount: r.maxAmount ?? r.denominationCents,
      denominations: r.denominations || [r.denominationCents],
      predefinedAmounts: r.denominations || [r.denominationCents],
      commission: parseFloat(r.commission) || 0,
      fixedFee: r.fixedFee || 0,
      isBestDeal: true
    }));

    return { products, catalogVersion, source: 'vas_best_offers' };
  }

  _normalizeProvider(p) {
    if (!p || typeof p !== 'string') return '';
    const k = p.trim().toLowerCase();
    const map = {
      'cell c': 'CellC',
      cellc: 'CellC',
      vodacom: 'Vodacom',
      mtn: 'MTN',
      telkom: 'Telkom',
      eeziairtime: 'eeziAirtime',
      'eezi airtime': 'eeziAirtime',
      global: 'Global',
      'global-airtime': 'Global',
      'global-data': 'Global'
    };
    return map[k] || p.trim();
  }

  /**
   * Get current catalog version for cache invalidation
   */
  async getCatalogVersion() {
    const [row] = await sequelize.query(
      'SELECT MAX(catalog_version) as v FROM vas_best_offers',
      { type: QueryTypes.SELECT }
    );
    return row?.v ?? null;
  }
}

module.exports = new BestOfferService();
