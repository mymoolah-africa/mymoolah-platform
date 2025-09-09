'use strict';

const ProductCatalogService = require('../services/productCatalogService');
const ProductPurchaseService = require('../services/productPurchaseService');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

class ProductController {
  constructor() {
    this.catalogService = new ProductCatalogService();
    this.purchaseService = new ProductPurchaseService();
  }

  /**
   * Get featured products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFeaturedProducts(req, res) {
    try {
      const { limit = 12, type } = req.query;
      
      // Validate parameters
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 50.'
        });
      }

      const products = await this.catalogService.getFeaturedProducts(parsedLimit, type);

      res.json({
        success: true,
        data: {
          products,
          count: products.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching featured products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch featured products',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Search products with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchProducts(req, res) {
    try {
      const {
        query = '',
        type,
        category,
        supplier,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20
      } = req.query;

      // Validate parameters
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const parsedMinPrice = minPrice ? parseInt(minPrice) : null;
      const parsedMaxPrice = maxPrice ? parseInt(maxPrice) : null;

      if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid page parameter. Must be greater than 0.'
        });
      }

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 100.'
        });
      }

      if (parsedMinPrice && (isNaN(parsedMinPrice) || parsedMinPrice < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid minPrice parameter. Must be non-negative.'
        });
      }

      if (parsedMaxPrice && (isNaN(parsedMaxPrice) || parsedMaxPrice < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid maxPrice parameter. Must be non-negative.'
        });
      }

      if (parsedMinPrice && parsedMaxPrice && parsedMinPrice > parsedMaxPrice) {
        return res.status(400).json({
          success: false,
          error: 'minPrice cannot be greater than maxPrice.'
        });
      }

      const searchParams = {
        query: query.trim(),
        type,
        category,
        supplier: supplier ? parseInt(supplier) : null,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        page: parsedPage,
        limit: parsedLimit
      };

      const result = await this.catalogService.searchProducts(searchParams);

      res.json({
        success: true,
        data: {
          ...result,
          searchParams,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search products',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get products with optional filtering (base endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProducts(req, res) {
    try {
      const {
        type,
        category,
        supplier,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20
      } = req.query;

      // Validate parameters
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const parsedMinPrice = minPrice ? parseInt(minPrice) : null;
      const parsedMaxPrice = maxPrice ? parseInt(maxPrice) : null;

      if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid page parameter. Must be greater than 0.'
        });
      }

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 100.'
        });
      }

      if (parsedMinPrice && (isNaN(parsedMinPrice) || parsedMinPrice < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid minPrice parameter. Must be non-negative.'
        });
      }

      if (parsedMaxPrice && (isNaN(parsedMaxPrice) || parsedMaxPrice < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid maxPrice parameter. Must be non-negative.'
        });
      }

      if (parsedMinPrice && parsedMaxPrice && parsedMinPrice > parsedMaxPrice) {
        return res.status(400).json({
          success: false,
          error: 'minPrice cannot be greater than maxPrice.'
        });
      }

      const searchParams = {
        query: '', // No search query for base endpoint
        type,
        category,
        supplier: supplier ? parseInt(supplier) : null,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        page: parsedPage,
        limit: parsedLimit
      };

      const result = await this.catalogService.searchProducts(searchParams);

      res.json({
        success: true,
        data: {
          ...result,
          searchParams,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductById(req, res) {
    try {
      const { productId } = req.params;

      // Validate product ID
      const parsedProductId = parseInt(productId);
      if (isNaN(parsedProductId) || parsedProductId < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid product ID.'
        });
      }

      const product = await this.catalogService.getProductById(parsedProductId);

      res.json({
        success: true,
        data: {
          product,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching product:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch product',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Purchase a product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async purchaseProduct(req, res) {
    try {
      // Validate request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { productId, denomination, recipient, idempotencyKey } = req.body;
      const userId = req.user.id;
      const clientId = req.user.clientId || null;

      // Validate denomination
      const parsedDenomination = parseInt(denomination);
      if (isNaN(parsedDenomination) || parsedDenomination < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid denomination. Must be a positive integer.'
        });
      }

      // Validate product ID
      const parsedProductId = parseInt(productId);
      if (isNaN(parsedProductId) || parsedProductId < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid product ID.'
        });
      }

      // Validate recipient if provided
      if (recipient) {
        if (typeof recipient !== 'object') {
          return res.status(400).json({
            success: false,
            error: 'Recipient must be an object.'
          });
        }

        if (recipient.email && !this.isValidEmail(recipient.email)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid email address.'
          });
        }

        if (recipient.phone && !this.isValidPhone(recipient.phone)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid phone number.'
          });
        }
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || this.generateIdempotencyKey(userId, productId, denomination);

      const purchaseData = {
        productId: parsedProductId,
        denomination: parsedDenomination,
        recipient: recipient || null,
        idempotencyKey: finalIdempotencyKey
      };

      const result = await this.purchaseService.purchaseProduct(purchaseData, userId, clientId);

      // Set appropriate status code
      const statusCode = result.success ? 201 : 400;

      res.status(statusCode).json({
        success: result.success,
        data: {
          order: result.order,
          product: result.product,
          supplier: result.supplier,
          recipient: result.recipient,
          message: result.message
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error purchasing product:', error);
      
      // Handle specific error types
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      if (error.message.includes('limit') || error.message.includes('constraint')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process purchase',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get order by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      // Validate order ID format
      if (!this.isValidUUID(orderId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid order ID format.'
        });
      }

      const order = await this.purchaseService.getOrderById(orderId, userId);

      res.json({
        success: true,
        data: {
          order,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching order:', error);
      
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch order',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user's order history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, type } = req.query;

      // Validate parameters
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);

      if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid page parameter. Must be greater than 0.'
        });
      }

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 100.'
        });
      }

      // Validate status if provided
      if (status && !['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status parameter.'
        });
      }

      // Validate type if provided
      if (type && !['airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'cash_out'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid type parameter.'
        });
      }

      const params = {
        page: parsedPage,
        limit: parsedLimit,
        status,
        type
      };

      const result = await this.purchaseService.getUserOrders(userId, params);

      res.json({
        success: true,
        data: {
          ...result,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching user orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order history',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get available categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategories(req, res) {
    try {
      const categories = await this.catalogService.getCategories();

      res.json({
        success: true,
        data: {
          categories,
          count: categories.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get available product types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductTypes(req, res) {
    try {
      const types = await this.catalogService.getProductTypes();

      res.json({
        success: true,
        data: {
          types,
          count: types.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching product types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product types',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async healthCheck(req, res) {
    try {
      const health = await this.catalogService.healthCheck();

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Utility methods

  /**
   * Validate email address
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number (SA format)
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid
   */
  isValidPhone(phone) {
    const phoneRegex = /^0[6-8][0-9]{8}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate UUID format
   * @param {string} uuid - UUID to validate
   * @returns {boolean} True if valid
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Generate idempotency key
   * @param {number} userId - User ID
   * @param {number} productId - Product ID
   * @param {number} denomination - Denomination
   * @returns {string} Idempotency key
   */
  generateIdempotencyKey(userId, productId, denomination) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${userId}_${productId}_${denomination}_${timestamp}_${random}`;
  }
}

module.exports = ProductController;
