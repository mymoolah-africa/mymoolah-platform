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
      // Get all active variants for this product and denomination
      const variants = await ProductVariant.findAll({
        where: {
          productId,
          status: 'active',
          denominations: {
            [Op.contains]: [denomination]
          }
        },
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['isPreferred', 'DESC'], ['sortOrder', 'ASC']]
      });

      if (variants.length === 0) {
        return null;
      }

      // Calculate commission earnings for each variant
      const variantsWithCommission = variants.map(variant => {
        const denomination = denomination; // Amount MyMoolah pays supplier
        const commissionRate = variant.getCommissionRate(denomination);
        const myMoolahCommission = variant.getMyMoolahCommission(denomination);
        const supplierKeeps = variant.getSupplierCost(denomination);
        const myMoolahNetCost = variant.getMyMoolahNetCost(denomination);
        const fees = variant.getFees(denomination);
        
        return {
          ...variant.toJSON(),
          denomination, // Amount MyMoolah pays supplier
          commissionRate, // Commission rate MyMoolah earns
          myMoolahCommission, // Actual commission amount MyMoolah earns
          supplierKeeps, // What supplier keeps after commission
          myMoolahNetCost, // What MyMoolah actually pays (denomination - commission)
          fees,
          effectiveRate: commissionRate // Commission rate is the effective rate for MyMoolah
        };
      });

      // Sort by: 1) highest commission rate, 2) lowest user price, 3) preferred supplier (Flash)
      variantsWithCommission.sort((a, b) => {
        // 1) Commission rate desc
        if (b.commissionRate !== a.commissionRate) {
          return b.commissionRate - a.commissionRate;
        }

        // 2) Lowest user price (denomination) asc
        if (a.denomination !== b.denomination) {
          return a.denomination - b.denomination;
        }
        
        // 3) Preferred supplier (Flash) on tie
        if (a.supplier.code === 'FLASH' && b.supplier.code !== 'FLASH') {
          return -1; // Flash first
        }
        if (b.supplier.code === 'FLASH' && a.supplier.code !== 'FLASH') {
          return 1; // Flash first
        }
        
        return 0;
      });

      const bestVariant = variantsWithCommission[0];

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
   */
  async compareVariants(productId, denomination) {
    try {
      const variants = await ProductVariant.findAll({
        where: {
          productId,
          status: 'active',
          denominations: {
            [Op.contains]: [denomination]
          }
        },
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['isPreferred', 'DESC'], ['sortOrder', 'ASC']]
      });

      const comparison = variants.map(variant => {
        const denomination = denomination; // Amount MyMoolah pays supplier
        const commissionRate = variant.getCommissionRate(denomination);
        const myMoolahCommission = variant.getMyMoolahCommission(denomination);
        const supplierKeeps = variant.getSupplierCost(denomination);
        const myMoolahNetCost = variant.getMyMoolahNetCost(denomination);
        const fees = variant.getFees(denomination);
        
        return {
          variantId: variant.id,
          supplier: variant.supplier,
          denomination, // Amount MyMoolah pays supplier
          commissionRate, // Commission rate MyMoolah earns
          myMoolahCommission, // Actual commission amount MyMoolah earns
          supplierKeeps, // What supplier keeps after commission
          myMoolahNetCost, // What MyMoolah actually pays (denomination - commission)
          fees,
          effectiveRate: commissionRate, // Commission rate is the effective rate for MyMoolah
          isPreferred: variant.isPreferred,
          status: variant.status
        };
      });

      // Sort by commission rate (highest first), then by Flash preference if same commission
      comparison.sort((a, b) => {
        // First priority: highest commission rate
        if (b.commissionRate !== a.commissionRate) {
          return b.commissionRate - a.commissionRate;
        }
        
        // Second priority: if same commission, prefer Flash
        if (a.supplier.code === 'FLASH' && b.supplier.code !== 'FLASH') {
          return -1; // Flash first
        }
        if (b.supplier.code === 'FLASH' && a.supplier.code !== 'FLASH') {
          return 1; // Flash first
        }
        
        // If both are Flash or both are not Flash, maintain current order
        return 0;
      });

      return {
        productId,
        denomination,
        variants: comparison,
        bestVariant: comparison[0] || null,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error comparing variants:', error);
      throw error;
    }
  }

  /**
   * Update comparison data for a product
   */
  async updateComparisonData(productId) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get all variants for this product
      const variants = await ProductVariant.findAll({
        where: { productId },
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      // Get all unique denominations across all variants
      const allDenominations = new Set();
      variants.forEach(variant => {
        if (Array.isArray(variant.denominations)) {
          variant.denominations.forEach(denom => allDenominations.add(denom));
        }
      });

      // Update comparison data for each denomination
      for (const denomination of allDenominations) {
        const comparison = await this.compareVariants(productId, denomination);
        
        // Find the best variant
        const bestVariant = comparison.bestVariant;
        
        // Update or create comparison record
        await ProductComparison.upsert({
          productId,
          denomination,
          comparisonData: comparison,
          bestVariantId: bestVariant ? bestVariant.variantId : null,
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
   */
  async getComparisonData(productId, denomination) {
    try {
      const comparison = await ProductComparison.findOne({
        where: { productId, denomination },
        include: [
          {
            model: ProductVariant,
            as: 'bestVariant',
            include: [
              {
                model: Supplier,
                as: 'supplier',
                attributes: ['id', 'name', 'code']
              }
            ]
          }
        ]
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
   */
  async getProductComparisons(productId) {
    try {
      const comparisons = await ProductComparison.findAll({
        where: { productId },
        include: [
          {
            model: ProductVariant,
            as: 'bestVariant',
            include: [
              {
                model: Supplier,
                as: 'supplier',
                attributes: ['id', 'name', 'code']
              }
            ]
          }
        ],
        order: [['denomination', 'ASC']]
      });

      return comparisons;

    } catch (error) {
      console.error('Error getting product comparisons:', error);
      throw error;
    }
  }

  /**
   * Find the best deals across all products
   */
  async findBestDeals(type = null, maxResults = 10) {
    try {
      let whereClause = {};
      if (type) {
        whereClause.type = type;
      }

      const products = await Product.findAll({
        where: whereClause,
        include: [
          {
            model: ProductVariant,
            as: 'variants',
            where: { status: 'active' },
            include: [
              {
                model: Supplier,
                as: 'supplier',
                attributes: ['id', 'name', 'code']
              }
            ]
          }
        ]
      });

      const deals = [];

      for (const product of products) {
        if (!product.variants || product.variants.length === 0) continue;

        // Find the best variant for each denomination
        const allDenominations = new Set();
        product.variants.forEach(variant => {
          if (Array.isArray(variant.denominations)) {
            variant.denominations.forEach(denom => allDenominations.add(denom));
          }
        });

        for (const denomination of allDenominations) {
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

      // Sort by commission rate (highest first), then by Flash preference if same commission
      deals.sort((a, b) => {
        // First priority: highest commission rate
        if (b.effectiveRate !== a.effectiveRate) {
          return b.effectiveRate - a.effectiveRate;
        }
        
        // Second priority: if same commission, prefer Flash
        if (a.bestVariant.supplier.code === 'FLASH' && b.bestVariant.supplier.code !== 'FLASH') {
          return -1; // Flash first
        }
        if (b.bestVariant.supplier.code === 'FLASH' && a.bestVariant.supplier.code !== 'FLASH') {
          return 1; // Flash first
        }
        
        // If both are Flash or both are not Flash, maintain current order
        return 0;
      });

      return deals.slice(0, maxResults);

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
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout
    };
  }
}

module.exports = ProductComparisonService;
