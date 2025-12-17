'use strict';

const { Product, ProductVariant, ProductComparison, Supplier, sequelize } = require('../models');
const { Op } = require('sequelize');

class ProductComparisonService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get the best variant for a product and denomination
   * @param {number} productId - Product ID
   * @param {number} denomination - Denomination amount
   * @returns {Promise<Object|null>} Best variant or null
   */
  async getBestVariant(productId, denomination) {
    const cacheKey = `best_${productId}_${denomination}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const variants = await this._fetchAndProcessVariants(productId, denomination);
      const bestVariant = variants.length > 0 ? variants[0] : null;

      // Cache the result
      this.cache.set(cacheKey, {
        data: bestVariant,
        timestamp: Date.now()
      });

      return bestVariant;
    } catch (error) {
      console.error('Error getting best variant:', error);
      throw error;
    }
  }

  /**
   * Compare all variants for a product and denomination
   * @param {number} productId - Product ID
   * @param {number} denomination - Denomination amount
   * @returns {Promise<Object>} Comparison data with all variants
   */
  async compareVariants(productId, denomination) {
    try {
      const variants = await this._fetchAndProcessVariants(productId, denomination);

      return {
        productId,
        denomination,
        variants,
        bestVariant: variants.length > 0 ? variants[0] : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error comparing variants:', error);
      throw error;
    }
  }

  /**
   * Update comparison data for a product
   * @param {number} productId - Product ID
   */
  async updateComparisonData(productId) {
    const transaction = await sequelize.transaction();
    
    try {
      const variants = await ProductVariant.findAll({
        where: { productId },
        include: [{
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'code']
        }]
      });

      const allDenominations = new Set();
      variants.forEach(variant => {
        if (Array.isArray(variant.denominations)) {
          variant.denominations.forEach(denom => allDenominations.add(denom));
        }
      });

      for (const denomination of allDenominations) {
        const comparison = await this.compareVariants(productId, denomination);
        
        await ProductComparison.upsert({
          productId,
          denomination,
          comparisonData: comparison,
          bestVariantId: comparison.bestVariant ? comparison.bestVariant.variantId : null,
          lastUpdated: new Date()
        }, { transaction });
      }

      await transaction.commit();
      console.log(`✅ Updated comparison data for product ${productId}`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating comparison data:', error);
      throw error;
    }
  }

  /**
   * Get comparison data for a product and denomination
   * @param {number} productId - Product ID
   * @param {number} denomination - Denomination amount
   * @returns {Promise<Object>} Comparison data
   */
  async getComparisonData(productId, denomination) {
    try {
      const comparison = await ProductComparison.findOne({
        where: { productId, denomination },
        include: [{
          model: ProductVariant,
          as: 'bestVariant',
          include: [{
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'code']
          }]
        }]
      });

      if (!comparison) {
        // Generate comparison data if it doesn't exist
        await this.updateComparisonData(productId);
        return await this.getComparisonData(productId, denomination);
      }

      return comparison;
    } catch (error) {
      console.error('Error getting comparison data:', error);
      throw error;
    }
  }

  /**
   * Get all comparisons for a product
   * @param {number} productId - Product ID
   * @returns {Promise<Array>} All comparisons for the product
   */
  async getProductComparisons(productId) {
    try {
      return await ProductComparison.findAll({
        where: { productId },
        include: [{
          model: ProductVariant,
          as: 'bestVariant',
          include: [{
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'code']
          }]
        }],
        order: [['denomination', 'ASC']]
      });
    } catch (error) {
      console.error('Error getting product comparisons:', error);
      throw error;
    }
  }

  /**
   * Find the best deals across all products
   * @param {string|null} type - Product type filter
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Array>} Best deals sorted by commission rate
   */
  async findBestDeals(type = null, maxResults = 10) {
    try {
      const whereClause = type ? { type } : {};

      const products = await Product.findAll({
        where: whereClause,
        include: [{
          model: ProductVariant,
          as: 'variants',
          where: { status: 'active' },
          include: [{
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'code']
          }]
        }]
      });

      const deals = [];

      // Process products sequentially to avoid overwhelming DB connections
      for (const product of products) {
        if (!product.variants?.length) continue;

        const allDenominations = new Set();
        product.variants.forEach(variant => {
          if (Array.isArray(variant.denominations)) {
            variant.denominations.forEach(denom => allDenominations.add(denom));
          }
        });

        for (const denomination of allDenominations) {
          // Leverages the internal cache of getBestVariant
          const bestVariant = await this.getBestVariant(product.id, denomination);
          
          if (bestVariant) {
            deals.push({
              productId: product.id,
              productName: product.name,
              productType: product.type,
              denomination,
              bestVariant,
              effectiveRate: bestVariant.effectiveRate
            });
          }
        }
      }

      // Sort using the same logic as variants, but applied to the deal object
      return deals.sort((a, b) => this._sortComparator(a, b, 'effectiveRate', 'bestVariant.supplier.code'))
                  .slice(0, maxResults);
    } catch (error) {
      console.error('Error finding best deals:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout
    };
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Fetches, calculates metrics, and sorts variants
   * @private
   */
  async _fetchAndProcessVariants(productId, denomination) {
    const variants = await ProductVariant.findAll({
      where: {
        productId,
        status: 'active',
        denominations: { [Op.contains]: [denomination] }
      },
      include: [{
        model: Supplier,
        as: 'supplier',
        attributes: ['id', 'name', 'code']
      }],
      order: [['isPreferred', 'DESC'], ['sortOrder', 'ASC']]
    });

    return variants
      .map(variant => this._calculateMetrics(variant, denomination))
      .sort((a, b) => this._sortComparator(a, b));
  }

  /**
   * Enriches a variant with calculated commissions and costs
   * @private
   */
  _calculateMetrics(variant, denomination) {
    const commissionRate = variant.getCommissionRate(denomination);
    
    // Normalize return object to match previous structure
    // If variant.toJSON() includes 'id', we map it to variantId for consistency
    const json = variant.toJSON();
    
    return {
      ...json,
      variantId: json.id, // Ensure ID is accessible as variantId
      supplier: variant.supplier, // Ensure supplier object is preserved
      denomination,
      commissionRate,
      myMoolahCommission: variant.getMyMoolahCommission(denomination),
      supplierKeeps: variant.getSupplierCost(denomination),
      myMoolahNetCost: variant.getMyMoolahNetCost(denomination),
      fees: variant.getFees(denomination),
      effectiveRate: commissionRate,
      isPreferred: variant.isPreferred,
      status: variant.status
    };
  }

  /**
   * Comparator function for sorting variants or deals
   * Prioritizes Commission Rate, then User Price (if applicable), then Flash supplier
   * @private
   */
  _sortComparator(a, b, rateKey = 'commissionRate', supplierKey = 'supplier.code') {
    // 1. Commission rate desc
    const rateA = this._getValue(a, rateKey);
    const rateB = this._getValue(b, rateKey);
    if (rateB !== rateA) return rateB - rateA;

    // 2. Lowest user price (denomination) asc
    // Only applies if objects have 'denomination' and it differs
    if (a.denomination && b.denomination && a.denomination !== b.denomination) {
      return a.denomination - b.denomination;
    }

    // 3. Preferred supplier (Flash)
    const codeA = this._getValue(a, supplierKey);
    const codeB = this._getValue(b, supplierKey);
    
    if (codeA === 'FLASH' && codeB !== 'FLASH') return -1;
    if (codeB === 'FLASH' && codeA !== 'FLASH') return 1;

    return 0;
  }

  /**
   * Helper to safely get nested values (e.g. "bestVariant.supplier.code")
   * @private
   */
  _getValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }
}

module.exports = ProductComparisonService;
