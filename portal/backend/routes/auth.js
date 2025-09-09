'use strict';

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const authController = new AuthController();

// Rate limiting for authentication endpoints
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

// Public endpoints

/**
 * @route POST /api/v1/admin/auth/login
 * @desc Admin portal login
 * @access Public
 */
router.post('/login',
  loginLimit,
  loginValidation,
  authController.login.bind(authController)
);

/**
 * @route POST /api/v1/admin/auth/logout
 * @desc Admin portal logout
 * @access Public
 */
router.post('/logout',
  generalLimit,
  authController.logout.bind(authController)
);

/**
 * @route GET /api/v1/admin/auth/verify
 * @desc Verify JWT token
 * @access Public
 */
router.get('/verify',
  generalLimit,
  authController.verifyToken.bind(authController)
);

/**
 * @route POST /api/v1/admin/auth/refresh
 * @desc Refresh JWT token
 * @access Public
 */
router.post('/refresh',
  generalLimit,
  authController.refreshToken.bind(authController)
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Auth route error:', error);
  
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

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
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
