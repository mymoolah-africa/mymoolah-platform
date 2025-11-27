'use strict';

const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { body, query, param } = require('express-validator');

const productController = new ProductController();

// Rate limiting configuration
// With trust proxy: 1, Express correctly sets req.ip to the client IP (after the first proxy)
// Disable express-rate-limit's trust proxy validation (Express returns true even when set to 1)
const standardLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
  keyGenerator: (req) => req.ip,
});

const purchaseLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 purchase requests per windowMs
  message: 'Too many purchase requests from this IP, please try again later.',
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
  keyGenerator: (req) => req.ip + '-purchase',
});

// Validation schemas
const purchaseValidation = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  
  body('denomination')
    .isInt({ min: 1 })
    .withMessage('Denomination must be a positive integer'),
  
  body('recipient')
    .optional()
    .isObject()
    .withMessage('Recipient must be an object'),
  
  body('recipient.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  
  body('recipient.phone')
    .optional()
    .matches(/^0[6-8][0-9]{8}$/)
    .withMessage('Invalid phone number format'),
  
  body('recipient.name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Recipient name must be between 1 and 255 characters'),
  
  body('idempotencyKey')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Idempotency key must be between 1 and 255 characters')
];

const searchValidation = [
  query('query')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query must be less than 255 characters'),
  
  query('type')
    .optional()
    .isIn(['airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'cash_out'])
    .withMessage('Invalid product type'),
  
  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),
  
  query('supplier')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Supplier ID must be a positive integer'),
  
  query('minPrice')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum price must be a non-negative integer'),
  
  query('maxPrice')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum price must be a non-negative integer'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const featuredValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('type')
    .optional()
    .isIn(['airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'cash_out'])
    .withMessage('Invalid product type')
];

const orderHistoryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
  
  query('type')
    .optional()
    .isIn(['airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'cash_out'])
    .withMessage('Invalid product type')
];

const productIdValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer')
];

const orderIdValidation = [
  param('orderId')
    .isUUID()
    .withMessage('Order ID must be a valid UUID')
];

// Public endpoints (no authentication required)

/**
 * @route GET /api/v1/products/featured
 * @desc Get featured products
 * @access Public
 */
router.get('/featured', 
  standardLimit,
  featuredValidation,
  productController.getFeaturedProducts.bind(productController)
);

/**
 * @route GET /api/v1/products/search
 * @desc Search products with filters
 * @access Public
 */
router.get('/search',
  standardLimit,
  searchValidation,
  productController.searchProducts.bind(productController)
);

/**
 * @route GET /api/v1/products/categories
 * @desc Get available categories
 * @access Public
 */
router.get('/categories',
  standardLimit,
  productController.getCategories.bind(productController)
);

/**
 * @route GET /api/v1/products/types
 * @desc Get available product types
 * @access Public
 */
router.get('/types',
  standardLimit,
  productController.getProductTypes.bind(productController)
);

/**
 * @route GET /api/v1/products
 * @desc Get products with optional filtering
 * @access Public
 */
router.get('/',
  standardLimit,
  searchValidation,
  productController.getProducts.bind(productController)
);

/**
 * @route GET /api/v1/products/:productId
 * @desc Get product by ID
 * @access Public
 */
router.get('/:productId',
  standardLimit,
  productIdValidation,
  productController.getProductById.bind(productController)
);

/**
 * @route GET /api/v1/products/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health',
  productController.healthCheck.bind(productController)
);

// Protected endpoints (authentication required)

/**
 * @route POST /api/v1/products/purchase
 * @desc Purchase a product
 * @access Private
 */
router.post('/purchase',
  auth,
  purchaseLimit,
  purchaseValidation,
  productController.purchaseProduct.bind(productController)
);

/**
 * @route GET /api/v1/products/orders/:orderId
 * @desc Get order by ID
 * @access Private
 */
router.get('/orders/:orderId',
  auth,
  standardLimit,
  orderIdValidation,
  productController.getOrderById.bind(productController)
);

/**
 * @route GET /api/v1/products/orders
 * @desc Get user's order history
 * @access Private
 */
router.get('/orders',
  auth,
  standardLimit,
  orderHistoryValidation,
  productController.getUserOrders.bind(productController)
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Product route error:', error);
  
  // Handle validation errors
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      timestamp: new Date().toISOString()
    });
  }

  // Handle rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      timestamp: new Date().toISOString()
    });
  }

  // Handle authentication errors
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
