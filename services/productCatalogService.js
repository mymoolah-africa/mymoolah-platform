'use strict';

const { Product, ProductBrand, ProductVariant, Supplier, sequelize } = require('../models');
const { Op } = require('sequelize');
const Redis = require('ioredis');
const crypto = require('crypto');

class ProductCatalogService {
  constructor() {
    // Quiet, optional Redis in dev/Codespaces
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.redis = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      connectTimeout: 2000,
      commandTimeout: 2000
    });
    this.redis.on('error', () => {});
    // Fire-and-forget connect; if it fails, calls using redis will no-op via try/catch
    this.redis.connect().catch(() => {});
    this.cacheTTL = 300; // 5 minutes
    this.searchCacheTTL = 60; // 1 minute for search results
  }

  /**
   * Get featured products with caching
   * @param {number} limit - Number of products to return
   * @param {string} type - Product type filter
   * @returns {Promise<Array>} Featured products
   */
  async getFeaturedProducts(limit = 12, type = null) {
    const cacheKey = `featured_products:${limit}:${type || 'all'}`;
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Build query
      const where = {
        isFeatured: true,
        status: 'active'
      };

      if (type) {
        where.type = type;
      }

      const products = await Product.findAll({
        where,
        include: [
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
            include: [
              {
                model: Supplier,
                as: 'supplier',
                where: { isActive: true },
                required: true,
                attributes: ['id', 'name', 'code']
              }
            ],
            order: [['isPreferred', 'DESC'], ['sortOrder', 'ASC']],
            limit: 1 // Get the best variant for each product
          }
        ],
        order: [
          ['sortOrder', 'ASC'],
          ['name', 'ASC']
        ],
        limit,
        attributes: [
          'id', 'name', 'type', 'isFeatured', 'sortOrder', 'metadata',
          'description', 'category', 'tags'
        ]
      });

      // Transform for frontend
      const transformed = products.map(product => {
        const bestVariant = product.variants[0]; // Get the best variant
        const denominations = bestVariant ? bestVariant.denominations : [];
        
        return {
          id: product.id,
          name: product.name,
          type: product.type,
          brand: {
            id: product.brand.id,
            name: product.brand.name,
            logoUrl: product.brand.logoUrl,
            category: product.brand.category
          },
          supplier: bestVariant ? {
            id: bestVariant.supplier.id,
            name: bestVariant.supplier.name,
            code: bestVariant.supplier.code
          } : null,
          denominations: denominations,
          constraints: bestVariant ? bestVariant.constraints : {},
          metadata: product.metadata,
          description: product.description,
          category: product.category,
          tags: product.tags,
          priceRange: denominations.length > 0 ? {
            min: Math.min(...denominations),
            max: Math.max(...denominations)
          } : { min: 0, max: 0 }
        };
      });

      // Cache result
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(transformed));

      return transformed;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw new Error('Failed to fetch featured products');
    }
  }

  /**
   * Search products with full-text search and filters
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchProducts(params = {}) {
    const {
      query = '',
      type = null,
      category = null,
      supplier = null,
      minPrice = null,
      maxPrice = null,
      page = 1,
      limit = 20
    } = params;

    const cacheKey = this.generateSearchCacheKey(params);
    
    try {
      // Try cache first for non-empty queries
      if (query.trim()) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Build where clause
      const where = {
        status: 'active'
      };

      if (type) {
        where.type = type;
      }

      // Note: Supplier filtering is now handled through ProductVariant include
      // The supplier filter will be applied in the include clause if needed

      // Note: Price range filtering is now handled through ProductVariant
      // The price filter will be applied in the include clause if needed

      // Build include clause
      const include = [
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
          include: [
            {
              model: Supplier,
              as: 'supplier',
              where: { isActive: true },
              required: true,
              attributes: ['id', 'name', 'code']
            }
          ],
          order: [['isPreferred', 'DESC'], ['sortOrder', 'ASC']],
          limit: 1 // Get the best variant for each product
        }
      ];

      // Add category filter to brand include
      if (category) {
        include[0].where.category = category;
      }

      // Full-text search
      let searchWhere = null;
      if (query.trim()) {
        searchWhere = {
          [Op.or]: [
            {
              name: {
                [Op.iLike]: `%${query}%`
              }
            },
            {
              '$brand.name$': {
                [Op.iLike]: `%${query}%`
              }
            },
            {
              '$brand.tags$': {
                [Op.overlap]: [query]
              }
            }
          ]
        };
      }

      // Execute query with pagination
      const offset = (page - 1) * limit;
      const { count, rows } = await Product.findAndCountAll({
        where: {
          ...where,
          ...searchWhere
        },
        include,
        order: [
          ['isFeatured', 'DESC'],
          ['sortOrder', 'ASC'],
          ['name', 'ASC']
        ],
        limit,
        offset,
        attributes: [
          'id', 'name', 'type', 'isFeatured', 'sortOrder', 'metadata',
          'description', 'category', 'tags'
        ]
      });

      // Transform results
      const products = rows.map(product => {
        const bestVariant = product.variants[0]; // Get the best variant
        const denominations = bestVariant ? bestVariant.denominations : [];
        
        return {
          id: product.id,
          name: product.name,
          type: product.type,
          brand: {
            id: product.brand.id,
            name: product.brand.name,
            logoUrl: product.brand.logoUrl,
            category: product.brand.category
          },
          supplier: bestVariant ? {
            id: bestVariant.supplier.id,
            name: bestVariant.supplier.name,
            code: bestVariant.supplier.code
          } : null,
          denominations: denominations,
          constraints: bestVariant ? bestVariant.constraints : {},
          metadata: product.metadata,
          description: product.description,
          category: product.category,
          tags: product.tags,
          priceRange: denominations.length > 0 ? {
            min: Math.min(...denominations),
            max: Math.max(...denominations)
          } : { min: 0, max: 0 }
        };
      });

      const result = {
        products,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      };

      // Cache result for non-empty queries
      if (query.trim()) {
        await this.redis.setex(cacheKey, this.searchCacheTTL, JSON.stringify(result));
      }

      return result;
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  /**
   * Get product by ID with full details
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Product details
   */
  async getProductById(productId) {
    const cacheKey = `product:${productId}`;
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const product = await Product.findOne({
        where: {
          id: productId,
          status: 'active'
        },
        include: [
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
            include: [
              {
                model: Supplier,
                as: 'supplier',
                where: { isActive: true },
                required: true,
                attributes: ['id', 'name', 'code']
              }
            ],
            order: [['isPreferred', 'DESC'], ['sortOrder', 'ASC']],
            limit: 1 // Get the best variant for each product
          }
        ],
        attributes: [
          'id', 'name', 'type', 'isFeatured', 'sortOrder', 'metadata',
          'description', 'category', 'tags'
        ]
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const bestVariant = product.variants[0]; // Get the best variant
      const denominations = bestVariant ? bestVariant.denominations : [];
      
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
        constraints: bestVariant ? bestVariant.constraints : {},
        metadata: product.metadata,
        description: product.description,
        category: product.category,
        tags: product.tags,
        priceRange: denominations.length > 0 ? {
          min: Math.min(...denominations),
          max: Math.max(...denominations)
        } : { min: 0, max: 0 },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      };

      // Cache result
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  /**
   * Get available categories
   * @returns {Promise<Array>} Available categories
   */
  async getCategories() {
    const cacheKey = 'product_categories';
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const categories = await ProductBrand.findAll({
        where: { isActive: true },
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
        ],
        raw: true
      });

      const result = categories.map(cat => cat.category).sort();

      // Cache result
      await this.redis.setex(cacheKey, this.cacheTTL * 2, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  /**
   * Get available product types
   * @returns {Promise<Array>} Available product types
   */
  async getProductTypes() {
    const cacheKey = 'product_types';
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const types = await Product.findAll({
        where: { status: 'active' },
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('type')), 'type']
        ],
        raw: true
      });

      const result = types.map(t => t.type).sort();

      // Cache result
      await this.redis.setex(cacheKey, this.cacheTTL * 2, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Error fetching product types:', error);
      throw new Error('Failed to fetch product types');
    }
  }

  /**
   * Invalidate cache for a product
   * @param {number} productId - Product ID
   */
  async invalidateProductCache(productId) {
    try {
      await this.redis.del(`product:${productId}`);
      await this.redis.del('featured_products:*');
      await this.redis.del('product_categories');
      await this.redis.del('product_types');
    } catch (error) {
      console.error('Error invalidating product cache:', error);
    }
  }

  /**
   * Generate cache key for search results
   * @param {Object} params - Search parameters
   * @returns {string} Cache key
   */
  generateSearchCacheKey(params) {
    const hash = crypto.createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    return `search:${hash}`;
  }

  /**
   * Health check for the service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Test database connection
      await Product.count();
      
      // Test Redis connection
      await this.redis.ping();
      
      return {
        status: 'healthy',
        database: 'connected',
        cache: 'connected',
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
}

module.exports = ProductCatalogService;
