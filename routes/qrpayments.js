/**
 * QR Payments Routes - MyMoolah Treasury Platform
 * 
 * Routes for QR Code Payment functionality
 * Handles QR code scanning, merchant validation, and payment processing
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const QRPaymentController = require('../controllers/qrPaymentController');
const authMiddleware = require('../middleware/auth');

// Initialize QR Payment Controller
const qrPaymentController = new QRPaymentController();

// QR CODE SCANNING ENDPOINTS

/**
 * @route   POST /api/v1/qr/scan
 * @desc    Scan and decode QR code
 * @access  Private
 */
router.post('/scan', [
  body('qrCode').notEmpty().withMessage('QR code is required'),
  body('qrType').optional().isIn(['zapper', 'generic', 'merchant']).withMessage('Invalid QR type')
], qrPaymentController.scanQRCode.bind(qrPaymentController));

/**
 * @route   POST /api/v1/qr/validate
 * @desc    Validate QR code and get merchant details
 * @access  Private
 */
router.post('/validate', [
  body('qrCode').notEmpty().withMessage('QR code is required'),
  body('amount').optional().isNumeric().withMessage('Amount must be numeric')
], qrPaymentController.validateQRCode.bind(qrPaymentController));

// MERCHANT ENDPOINTS

/**
 * @route   GET /api/v1/qr/merchants
 * @desc    Get list of supported QR merchants
 * @access  Private
 */
router.get('/merchants', qrPaymentController.getMerchants.bind(qrPaymentController));

/**
 * @route   GET /api/v1/qr/merchants/:merchantId
 * @desc    Get specific merchant details
 * @access  Private
 */
router.get('/merchants/:merchantId', qrPaymentController.getMerchantDetails.bind(qrPaymentController));

/**
 * @route   POST /api/v1/qr/merchants/:merchantId/validate
 * @desc    Validate wallet at specific merchant
 * @access  Private
 */
router.post('/merchants/:merchantId/validate', [
  body('walletId').notEmpty().withMessage('Wallet ID is required'),
  body('amount').isNumeric().withMessage('Amount must be numeric')
], qrPaymentController.validateWalletAtMerchant.bind(qrPaymentController));

// PAYMENT PROCESSING ENDPOINTS

/**
 * @route   POST /api/v1/qr/payment/initiate
 * @desc    Initiate QR payment
 * @access  Private
 */
router.post('/payment/initiate', authMiddleware, [
  body('qrCode').notEmpty().withMessage('QR code is required'),
  body('amount').isNumeric().withMessage('Amount must be numeric'),
  body('walletId').notEmpty().withMessage('Wallet ID is required'),
  body('reference').optional().isString().withMessage('Reference must be string'),
  body('tipAmount').optional().isNumeric().withMessage('Tip amount must be numeric')
], qrPaymentController.initiatePayment.bind(qrPaymentController));

/**
 * @route   POST /api/v1/qr/payment/confirm
 * @desc    Confirm QR payment
 * @access  Private
 */
router.post('/payment/confirm', [
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('otp').optional().isString().withMessage('OTP must be string')
], qrPaymentController.confirmPayment.bind(qrPaymentController));

/**
 * @route   GET /api/v1/qr/payment/status/:paymentId
 * @desc    Get payment status
 * @access  Private
 */
router.get('/payment/status/:paymentId', qrPaymentController.getPaymentStatus.bind(qrPaymentController));

// QR CODE GENERATION ENDPOINTS

/**
 * @route   POST /api/v1/qr/generate
 * @desc    Generate QR code for payment
 * @access  Private
 */
router.post('/generate', [
  body('amount').isNumeric().withMessage('Amount must be numeric'),
  body('merchantId').optional().isString().withMessage('Merchant ID must be string'),
  body('reference').optional().isString().withMessage('Reference must be string')
], qrPaymentController.generateQRCode.bind(qrPaymentController));

// HEALTH AND STATUS ENDPOINTS

/**
 * @route   GET /api/v1/qr/health
 * @desc    Health check for QR payment service
 * @access  Public
 */
router.get('/health', qrPaymentController.healthCheck.bind(qrPaymentController));

/**
 * @route   GET /api/v1/qr/status
 * @desc    Get QR payment service status
 * @access  Public
 */
router.get('/status', qrPaymentController.getServiceStatus.bind(qrPaymentController));

module.exports = router;
