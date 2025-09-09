/**
 * MobileMart Routes - MyMoolah Treasury Platform
 * 
 * Routes for MobileMart Fulcrum API endpoints
 * Handles all MobileMart VAS operations
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const MobileMartController = require('../controllers/mobilemartController');

// Initialize MobileMart Controller
const mobilemartController = new MobileMartController();

// ========================================
// MOBILEMART HEALTH ENDPOINT
// ========================================

/**
 * @route   GET /api/v1/mobilemart/health
 * @desc    Health check for MobileMart integration
 * @access  Public
 */
router.get('/health', mobilemartController.healthCheck.bind(mobilemartController));

// ========================================
// MOBILEMART PRODUCT ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/mobilemart/products/:vasType
 * @desc    List products for a VAS type (airtime, data, electricity, etc.)
 * @access  Public
 */
router.get('/products/:vasType', mobilemartController.listProducts.bind(mobilemartController));

// ========================================
// MOBILEMART PURCHASE ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/mobilemart/purchase/:vasType
 * @desc    Purchase a VAS product (airtime, data, electricity, etc.)
 * @access  Public
 * @body    { merchantProductId, amount, mobileNumber/accountNumber/meterNumber, reference?, ... }
 */
router.post('/purchase/:vasType', mobilemartController.purchaseProduct.bind(mobilemartController));

module.exports = router; 