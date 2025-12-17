'use strict';

const { Product, ProductBrand, ProductVariant, Supplier, sequelize } = require('../models');
const { Op } = require('sequelize');
const Redis = require('ioredis');
const crypto = require('crypto');

class ProductCatalogService {
  constructor() {
    this.redis = null;
    this.cacheTTL = 300; // 5 minutes
    this.searchCacheTTL = 60; // 1 minute

    const hasRedisUrl = process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '';
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (hasRedisUrl && redisEnabled) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryStrategy: (times) => {
            if (times > 3) {
              console.warn('⚠️ Redis connection failed after 3 attempts, disabling Redis cache');
              this.redis = null;
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 5000,
          commandTimeout: 5000
        });

        // Handle Redis errors gracefully with logging
        this.redis.on('error', (err) => {
          console.warn('⚠️ Redis error:', err.message);
          this.redis = null;
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis connected for ProductCatalogService');
        });

        console.log('✅ Redis client initialized for ProductCatalogService (lazy connect enabled)');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Redis, continuing without cache:', error.message);
        this.redis = null;
      }
    } else {
      console.log('ℹ️ Redis disabled for ProductCatalogService (REDIS_URL not set or REDIS_ENABLED=false)');
    }
  }

  /**
   * Get featured products with caching
   * @param {number} limit - Number of products to return
   * @param {string} type - Product type filter
   * @returns {Promise<Array>} Featured products
   */
  async getFeaturedProducts(limit = 12, type = null) {
    const cacheKey = `featured_products:${limit}:${type || 'all'}`;

    return this._getOrSetCache(cacheKey, this.cacheTTL, async () => {
      const where = { isFeatured: true, status: 'active' };
      if (type) where.type = type;

      const products = await Product.findAll({
        where,
        include: this._getCommonIncludes(),
        order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        limit,
        attributes: this._getProductAttributes()
      });

      return products.map(p => this._transformProduct(p));
    });
  }

  /**
   * Search products with full-text search and filters
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchProducts(params = {}) {
    const { query = '', type = null, category = null, page = 1, limit = 20 } = params;
    const cacheKey = this._generateSearchCacheKey(params);
    const ttl = query.trim() ? this.searchCacheTTL : this.cacheTTL;

    // Only cache if query is provided (consistent with original logic)
    const shouldUseCache = !!query.trim();

    const fetchLogic = async () => {
      const where = { status: 'active' };
      if (type) where.type = type;

      const include = this._getCommonIncludes();
      if (category) include[0].where.category = category;

      let searchWhere = {};
      if (query.trim()) {
        searchWhere = {
          [Op.or]: [
            { name: { [Op.iLike]: `%${query}%` } },
            { '$brand.name$': { [Op.iLike]: `%${query}%` } },
            { '$brand.tags$': { [Op.overlap]: [query] } }
          ]
        };
      }

      const offset = (page - 1) * limit;
      const { count, rows } = await Product.findAndCountAll({
        where: { ...where, ...searchWhere },
        include,
        order: [['isFeatured', 'DESC'], ['sortOrder', 'ASC'], ['name', 'ASC']],
        limit,
        offset,
        attributes: this._getProductAttributes()
      });

      return {
        products: rows.map(p => this._transformProduct(p)),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      };
    };

    return shouldUseCache 
      ? this._getOrSetCache(cacheKey, ttl, fetchLogic) 
      : fetchLogic();
  }

  /**
   * Get product by ID with full details
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Product details
   */
  async getProductById(productId) {
    const cacheKey = `product:${productId}`;

    return this._getOrSetCache(cacheKey, this.cacheTTL, async () => {
      const product = await Product.findOne({
        where: { id: productId, status: 'active' },
        include: this._getCommonIncludes(),
        attributes: this._getProductAttributes()
      });

      if (!product) throw new Error('Product not found');

      return this._transformProduct(product, true);
    });
  }

  /**
   * Get available categories
   * @returns {Promise<Array>} Available categories
   */
  async getCategories() {
    return this._getOrSetCache('product_categories', this.cacheTTL * 2, async () => {
      const categories = await ProductBrand.findAll({
        where: { isActive: true },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
        raw: true
      });
      return categories.map(cat => cat.category).sort();
    });
  }

  /**
   * Get available product types
   * @returns {Promise<Array>} Available product types
   */
  async getProductTypes() {
    return this._getOrSetCache('product_types', this.cacheTTL * 2, async () => {
      const types = await Product.findAll({
        where: { status: 'active' },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('type')), 'type']],
        raw: true
      });
      return types.map(t => t.type).sort();
    });
  }

  /**
   * Invalidate cache for a product
   * @param {number} productId - Product ID
   */
  async invalidateProductCache(productId) {
    if (!this.redis) return;
    try {
      await Promise.all([
        this.redis.del(`product:${productId}`),
        this.redis.del('product_categories'),
        this.redis.del('product_types')
      ]);
    } catch (error) {
      console.warn('⚠️ Error invalidating product cache:', error.message);
    }
  }

  /**
   * Health check for the service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      await Product.count();
      let cacheStatus = 'not configured';
      
      if (this.redis) {
        try {
          await this.redis.ping();
          cacheStatus = 'connected';
        } catch (e) {
          cacheStatus = 'error';
        }
      }

      return {
        status: 'healthy',
        database: 'connected',
        cache: cacheStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Generic cache wrapper to reduce duplication
   * @private
   */
  async _getOrSetCache(key, ttl, fetchFunction) {
    if (this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // Cache read failure - not critical, continue without cache
        console.warn('⚠️ Redis cache read error:', e.message);
      }
    }

    try {
      const result = await fetchFunction();
      
      if (this.redis && result) {
        try {
          await this.redis.setex(key, ttl, JSON.stringify(result));
        } catch (e) {
          // Cache write failure - not critical, continue
          console.warn('⚠️ Redis cache write error:', e.message);
        }
      }
      
      return result;
    } catch (error) {
      // Only log critical application errors
      console.error(`Error in ProductCatalogService [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Generate cache key for search results
   * @private
   */
  _generateSearchCacheKey(params) {
    const hash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `search:${hash}`;
  }

  /**
   * Get common includes for product queries
   * @private
   */
  _getCommonIncludes() {
    return [
      {
        model: ProductBrand,
        as: 'brand',
        where: { isActive: true },
        required: true
      },
      {
        model: ProductVariant,
        as: 'variants',
        where: { status: 'active' },
        required: true,
        include: [{
          model: Supplier,
          as: 'supplier',
          where: { isActive: true },
          required: true,
          attributes: ['id', 'name', 'code']
        }],
        order: [['isPreferred', 'DESC'], ['sortOrder', 'ASC']],
        limit: 1
      }
    ];
  }

  /**
   * Get product attributes for queries
   * @private
   */
  _getProductAttributes() {
    return [
      'id', 'name', 'type', 'isFeatured', 'sortOrder', 'metadata',
      'description', 'category', 'tags', 'createdAt', 'updatedAt'
    ];
  }

  /**
   * Transform product for frontend consumption
   * @private
   */
  _transformProduct(product, includeTimestamps = false) {
    const bestVariant = product.variants?.[0];
    const denominations = bestVariant?.denominations || [];

    const result = {
      id: product.id,
      name: product.name,
      type: product.type,
      brand: {
        id: product.brand.id,
        name: product.brand.name,
        logoUrl: product.brand.logoUrl,
        category: product.brand.category,
        tags: product.brand.tags
      },
      supplier: bestVariant ? {
        id: bestVariant.supplier.id,
        name: bestVariant.supplier.name,
        code: bestVariant.supplier.code
      } : null,
      denominations: denominations,
      constraints: bestVariant?.constraints || {},
      metadata: product.metadata,
      description: product.description,
      category: product.category,
      tags: product.tags,
      priceRange: denominations.length > 0 ? {
        min: Math.min(...denominations),
        max: Math.max(...denominations)
      } : { min: 0, max: 0 }
    };

    if (includeTimestamps) {
      result.createdAt = product.createdAt;
      result.updatedAt = product.updatedAt;
    }

    return result;
  }
}

module.exports = ProductCatalogService;
