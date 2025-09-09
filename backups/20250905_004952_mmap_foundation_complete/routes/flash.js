/**
 * Flash Routes - MyMoolah Treasury Platform
 * 
 * Routes for Flash Partner API v4 endpoints
 * Handles all Flash transactional operations
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const FlashController = require('../controllers/flashController');

// Initialize Flash Controller
const flashController = new FlashController();

// ========================================
// FLASH HEALTH AND STATUS ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/flash/health
 * @desc    Health check for Flash integration
 * @access  Public
 */
router.get('/health', flashController.healthCheck.bind(flashController));

// ========================================
// FLASH ACCOUNT ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/flash/accounts/:accountNumber/products
 * @desc    List products for an account
 * @access  Public
 */
router.get('/accounts/:accountNumber/products', flashController.listProducts.bind(flashController));

/**
 * @route   GET /api/v1/flash/accounts/:accountNumber/products/:productCode
 * @desc    Lookup a specific product
 * @access  Public
 */
router.get('/accounts/:accountNumber/products/:productCode', flashController.lookupProduct.bind(flashController));

// ========================================
// 1VOUCHER ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/flash/1voucher/purchase
 * @desc    Purchase a 1Voucher
 * @access  Public
 * @body    { reference, accountNumber, amount, metadata? }
 */
router.post('/1voucher/purchase', flashController.purchase1Voucher.bind(flashController));

/**
 * @route   POST /api/v1/flash/1voucher/disburse
 * @desc    Disburse a 1Voucher
 * @access  Public
 * @body    { reference, accountNumber, amount, metadata? }
 */
router.post('/1voucher/disburse', flashController.disburse1Voucher.bind(flashController));

/**
 * @route   POST /api/v1/flash/1voucher/redeem
 * @desc    Redeem a 1Voucher
 * @access  Public
 * @body    { reference, accountNumber, pin, amount, mobileNumber?, metadata? }
 */
router.post('/1voucher/redeem', flashController.redeem1Voucher.bind(flashController));

/**
 * @route   POST /api/v1/flash/1voucher/refund
 * @desc    Refund a 1Voucher redemption
 * @access  Public
 * @body    { reference, accountNumber, amount, mobileNumber?, metadata? }
 */
router.post('/1voucher/refund', flashController.refund1Voucher.bind(flashController));

// ========================================
// GIFT VOUCHER ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/flash/gift-vouchers/purchase
 * @desc    Purchase a Gift Voucher
 * @access  Public
 * @body    { reference, accountNumber, amount, productCode, storeId, terminalId, barcode?, metadata? }
 */
router.post('/gift-vouchers/purchase', flashController.purchaseGiftVoucher.bind(flashController));

// ========================================
// CASH OUT PIN ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/flash/cash-out-pin/purchase
 * @desc    Purchase a Cash Out PIN
 * @access  Public
 * @body    { reference, accountNumber, amount, productCode, metadata? }
 */
router.post('/cash-out-pin/purchase', flashController.purchaseCashOutPin.bind(flashController));

/**
 * @route   POST /api/v1/flash/cash-out-pin/cancel
 * @desc    Cancel a Cash Out PIN purchase
 * @access  Public
 * @body    { reference, accountNumber, serial, productCode, metadata? }
 */
router.post('/cash-out-pin/cancel', flashController.cancelCashOutPin.bind(flashController));

// ========================================
// CELLULAR ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/flash/cellular/pinless/purchase
 * @desc    Purchase a Cellular Pinless Recharge
 * @access  Public
 * @body    { reference, subAccountNumber, amount, productCode, mobileNumber, metadata? }
 */
router.post('/cellular/pinless/purchase', flashController.purchaseCellularRecharge.bind(flashController));

// ========================================
// EEZI VOUCHER ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/flash/eezi-voucher/purchase
 * @desc    Purchase an Eezi Voucher
 * @access  Public
 * @body    { reference, accountNumber, amount, productCode, metadata? }
 */
router.post('/eezi-voucher/purchase', flashController.purchaseEeziVoucher.bind(flashController));

// ========================================
// PREPAID UTILITIES ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/flash/prepaid-utilities/lookup
 * @desc    Lookup a meter number for prepaid utilities
 * @access  Public
 * @body    { reference, accountNumber, amount, meterNumber, isFBE?, metadata? }
 */
router.post('/prepaid-utilities/lookup', flashController.lookupMeter.bind(flashController));

/**
 * @route   POST /api/v1/flash/prepaid-utilities/purchase
 * @desc    Purchase a prepaid utility voucher
 * @access  Public
 * @body    { reference, accountNumber, amount, transactionID, metadata? }
 */
router.post('/prepaid-utilities/purchase', flashController.purchasePrepaidUtility.bind(flashController));

module.exports = router; 