'use strict';

/**
 * Unified product catalog service -- single read path for all VAS types.
 *
 * Replaces: bestOfferService.js, catalogDisplayPolicy.js, productComparisonService.js,
 *           mark-featured-data-products.js, refresh-vas-best-offers.js
 *
 * All product selection is driven by the v_best_offers materialized view which
 * encodes Andre's bracket x product-type matrix. The view is refreshed after
 * each catalog sweep.
 */

const { ProductVariant, Product, Supplier, sequelize } = require('../models');
const { Op } = require('sequelize');

class ProductCatalogService {
  /**
   * Get curated product catalog for a VAS type.
   * @param {string} vasType - airtime|data|electricity|voucher|bill_payment
   * @param {object} options - { provider, amount, bracket, limit }
   * @returns {Promise<{products: Array, source: string}>}
   */
  async getCatalog(vasType, options = {}) {
    const { provider, amount, bracket, limit } = options;

    if (vasType === 'data' || vasType === 'airtime') {
      return this._getFromView(vasType, provider, bracket, limit);
    }

    return this._getFromVariants(vasType, provider, amount, limit);
  }

  /**
   * Read curated products from the materialized view.
   * Used for data (bracket x type matrix) and airtime (one variable per provider).
   */
  async _getFromView(vasType, provider, bracket, limit) {
    const conditions = [`"vasType" = :vasType`];
    const replacements = { vasType };

    if (provider) {
      conditions.push(`provider = :provider`);
      replacements.provider = provider;
    }
    if (bracket) {
      conditions.push(`bracket_code = :bracket`);
      replacements.bracket = bracket;
    }

    const sql = `
      SELECT variant_id, "vasType", provider, "minAmount", "maxAmount",
             commission, "fixedFee", "supplierProductId", "priceType",
             product_name, product_id, supplier_code, supplier_id,
             bracket_code, type_label
      FROM v_best_offers
      WHERE ${conditions.join(' AND ')}
      ORDER BY provider, bracket_code, type_label, commission DESC
      ${limit ? `LIMIT ${parseInt(limit)}` : ''}
    `;

    const [rows] = await sequelize.query(sql, { replacements });

    return {
      products: rows.map(r => this.formatProduct(r)),
      source: 'v_best_offers'
    };
  }

  /**
   * Fallback for VAS types without bracket curation (electricity, voucher, bill_payment).
   * Queries product_variants directly, ordered by commission DESC.
   */
  async _getFromVariants(vasType, provider, amount, limit) {
    const where = { vasType, status: 'active' };
    if (provider) where.provider = provider;
    if (amount) {
      where.minAmount = { [Op.lte]: amount };
      where.maxAmount = { [Op.gte]: amount };
    }

    const variants = await ProductVariant.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'type'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'code', 'name'] }
      ],
      order: [['commission', 'DESC'], ['minAmount', 'ASC'], ['priority', 'ASC']],
      limit: limit ? parseInt(limit) : undefined
    });

    return {
      products: variants.map(v => this.formatProduct({
        variant_id: v.id,
        vasType: v.vasType,
        provider: v.provider,
        minAmount: v.minAmount,
        maxAmount: v.maxAmount,
        commission: v.commission,
        fixedFee: v.fixedFee,
        supplierProductId: v.supplierProductId,
        priceType: v.priceType,
        product_name: v.product?.name,
        product_id: v.product?.id,
        supplier_code: v.supplier?.code,
        supplier_id: v.supplier?.id,
        bracket_code: null,
        type_label: vasType
      })),
      source: 'product_variants'
    };
  }

  /**
   * Single response shape for all callers.
   */
  formatProduct(row) {
    return {
      id: row.variant_id,
      productId: row.product_id,
      productName: row.product_name,
      supplierProductId: row.supplierProductId,
      supplierCode: row.supplier_code,
      supplierId: row.supplier_id,
      vasType: row.vasType,
      provider: row.provider,
      priceType: row.priceType,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      commission: parseFloat(row.commission) || 0,
      fixedFee: row.fixedFee || 0,
      bracketCode: row.bracket_code,
      typeLabel: row.type_label
    };
  }

  /**
   * Refresh the materialized view (call after catalog sweep).
   * Uses CONCURRENTLY to avoid locking reads during refresh.
   */
  async refreshView() {
    try {
      await sequelize.query('REFRESH MATERIALIZED VIEW CONCURRENTLY v_best_offers');
      console.log('v_best_offers view refreshed');
    } catch (err) {
      if (err.message?.includes('has not been populated')) {
        await sequelize.query('REFRESH MATERIALIZED VIEW v_best_offers');
        console.log('v_best_offers view refreshed (initial populate)');
      } else {
        throw err;
      }
    }
  }

  /**
   * Health check: verify view exists and has data.
   */
  async healthCheck() {
    try {
      const [rows] = await sequelize.query(
        `SELECT "vasType", COUNT(*) as cnt FROM v_best_offers GROUP BY "vasType"`
      );
      return { status: 'healthy', counts: rows };
    } catch (err) {
      return { status: 'unhealthy', error: err.message };
    }
  }
}

module.exports = new ProductCatalogService();
