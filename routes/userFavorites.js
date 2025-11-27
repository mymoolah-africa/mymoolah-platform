'use strict';

const express = require('express');
const router = express.Router();
const UserFavoritesController = require('../controllers/userFavoritesController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');

const userFavoritesController = new UserFavoritesController();

// Helper function to extract client IP from X-Forwarded-For header
// Cloud Run has exactly 1 proxy hop (Google Cloud Load Balancer)
// Format: X-Forwarded-For: client-ip, proxy-ip
// We want the first IP (client IP)
const getClientIP = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client-ip, proxy-ip"
    // Cloud Run has 1 proxy, so we take the first IP
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || req.ip || req.connection.remoteAddress;
  }
  return req.ip || req.connection.remoteAddress;
};

// Rate limiting configuration
// With trust proxy disabled, we manually extract IP from X-Forwarded-For header
// This prevents express-rate-limit from throwing ValidationError
const standardLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  validate: {
    trustProxy: false // Disable validation - we handle proxy manually
  },
  keyGenerator: (req) => getClientIP(req),
});

// Validation schemas
const productIdValidation = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer')
];

const productIdParamValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer')
];

// Protected endpoints (authentication required)
router.use(auth);

/**
 * @route GET /api/v1/favorites
 * @desc Get user's favorites
 * @access Private
 */
router.get('/',
  standardLimit,
  userFavoritesController.getUserFavorites.bind(userFavoritesController)
);

/**
 * @route POST /api/v1/favorites/add
 * @desc Add product to favorites
 * @access Private
 */
router.post('/add',
  standardLimit,
  productIdValidation,
  userFavoritesController.addToFavorites.bind(userFavoritesController)
);

/**
 * @route POST /api/v1/favorites/remove
 * @desc Remove product from favorites
 * @access Private
 */
router.post('/remove',
  standardLimit,
  productIdValidation,
  userFavoritesController.removeFromFavorites.bind(userFavoritesController)
);

/**
 * @route POST /api/v1/favorites/toggle
 * @desc Toggle favorite status
 * @access Private
 */
router.post('/toggle',
  standardLimit,
  productIdValidation,
  userFavoritesController.toggleFavorite.bind(userFavoritesController)
);

/**
 * @route GET /api/v1/favorites/check/:productId
 * @desc Check if product is favorite
 * @access Private
 */
router.get('/check/:productId',
  standardLimit,
  productIdParamValidation,
  userFavoritesController.checkFavorite.bind(userFavoritesController)
);

/**
 * @route GET /api/v1/favorites/count
 * @desc Get favorites count
 * @access Private
 */
router.get('/count',
  standardLimit,
  userFavoritesController.getFavoritesCount.bind(userFavoritesController)
);

module.exports = router;





