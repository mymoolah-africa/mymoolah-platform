'use strict';

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { portalAuth } = require('../middleware/portalAuth');
const rateLimit = require('express-rate-limit');
const { body, query, param } = require('express-validator');

const adminController = new AdminController();

// Rate limiting configuration
// Disable express-rate-limit's trust proxy validation (Express returns true even when set to 1)
const standardLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
});

const strictLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many admin requests from this IP, please try again later.',
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
});

// Validation schemas
const createPortalUserValidation = [
  body('entityId')
    .notEmpty()
    .withMessage('Entity ID is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Entity ID must be between 1 and 255 characters'),
  
  body('entityName')
    .notEmpty()
    .withMessage('Entity name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Entity name must be between 1 and 255 characters'),
  
  body('entityType')
    .isIn(['supplier', 'client', 'merchant', 'reseller', 'admin'])
    .withMessage('Invalid entity type'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'user', 'viewer'])
    .withMessage('Invalid role'),
  
  body('hasDualRole')
    .optional()
    .isBoolean()
    .withMessage('hasDualRole must be a boolean'),
  
  body('dualRoles')
    .optional()
    .isArray()
    .withMessage('dualRoles must be an array'),
  
  body('permissions')
    .optional()
    .isObject()
    .withMessage('permissions must be an object')
];

const getPortalUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('entityType')
    .optional()
    .isIn(['supplier', 'client', 'merchant', 'reseller', 'admin'])
    .withMessage('Invalid entity type'),
  
  query('search')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Search term must be less than 255 characters')
];

// Public endpoints (no authentication required)

/**
 * @route GET /api/v1/admin/health
 * @desc Admin portal health check
 * @access Public
 */
router.get('/health',
  standardLimit,
  adminController.healthCheck.bind(adminController)
);

// Protected endpoints (admin authentication required)

/**
 * @route GET /api/v1/admin/dashboard
 * @desc Get admin dashboard data
 * @access Private (Admin only)
 */
router.get('/dashboard',
  strictLimit,
  portalAuth('admin'),
  adminController.getDashboard.bind(adminController)
);

/**
 * @route GET /api/v1/admin/users
 * @desc Get all portal users with pagination
 * @access Private (Admin only)
 */
router.get('/users',
  portalAuth('admin'),
  standardLimit,
  getPortalUsersValidation,
  adminController.getPortalUsers.bind(adminController)
);

/**
 * @route POST /api/v1/admin/users
 * @desc Create new portal user
 * @access Private (Admin only)
 */
router.post('/users',
  portalAuth('admin'),
  strictLimit,
  createPortalUserValidation,
  adminController.createPortalUser.bind(adminController)
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  
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

  // Handle authorization errors
  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
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
