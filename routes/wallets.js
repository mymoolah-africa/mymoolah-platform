const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireKYCVerification } = require('../middleware/kycMiddleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// GET /api/v1/wallets - Get all wallets
router.get('/', async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getAllWallets(req, res);
  } catch (error) {
    console.error('Error getting all wallets:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get wallets' 
    });
  }
});

// GET /api/v1/wallets/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getBalance(req, res);
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet balance' });
  }
});

// GET /api/v1/wallets/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getTransactionHistory(req, res);
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet transactions' });
  }
});

// POST /api/v1/wallets/deposit
router.post('/deposit', [
  authMiddleware,
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  body('source')
    .isIn(['bank_transfer', 'card', 'cash'])
    .withMessage('Source must be bank_transfer, card, or cash'),
  validateRequest
], async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.creditWallet(req, res);
  } catch (error) {
    console.error('Error processing deposit:', error);
    return res.status(500).json({ success: false, message: 'Failed to process deposit' });
  }
});

// POST /api/v1/wallets/withdraw
router.post('/withdraw', [
  authMiddleware,
  requireKYCVerification,
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  body('destination')
    .isIn(['bank_account', 'card', 'cash'])
    .withMessage('Destination must be bank_account, card, or cash'),
  validateRequest
], async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.debitWallet(req, res);
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({ success: false, message: 'Failed to process withdrawal' });
  }
});

// POST /api/v1/wallets/send
router.post('/send', [
  authMiddleware,
  requireKYCVerification,
  body('receiverPhoneNumber')
    .notEmpty()
    .withMessage('Receiver phone number is required'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  validateRequest
], async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.sendMoney(req, res);
  } catch (error) {
    console.error('Error sending money:', error);
    return res.status(500).json({ success: false, message: 'Failed to send money' });
  }
});

// GET /api/v1/wallets/summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getTransactionSummary(req, res);
  } catch (error) {
    console.error('Error getting wallet summary:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet summary' });
  }
});

// GET /api/v1/wallets/details
router.get('/details', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletDetails(req, res);
  } catch (error) {
    console.error('Error getting wallet details:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet details' });
  }
});

// Admin routes (require admin authentication)
// GET /api/v1/wallets/:walletId
router.get('/:walletId', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletById(req, res);
  } catch (error) {
    console.error('Error getting wallet by ID:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet' });
  }
});

// GET /api/v1/wallets/:walletId/balance
router.get('/:walletId/balance', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletBalance(req, res);
  } catch (error) {
    console.error('Error getting wallet balance by ID:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet balance' });
  }
});

// POST /api/v1/wallets/:walletId/credit
router.post('/:walletId/credit', [
  authMiddleware,
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least R0.01'),
  validateRequest
], async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.creditWalletById(req, res);
  } catch (error) {
    console.error('Error crediting wallet:', error);
    return res.status(500).json({ success: false, message: 'Failed to credit wallet' });
  }
});

// POST /api/v1/wallets/:walletId/debit
router.post('/:walletId/debit', [
  authMiddleware,
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least R0.01'),
  validateRequest
], async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.debitWalletById(req, res);
  } catch (error) {
    console.error('Error debiting wallet:', error);
    return res.status(500).json({ success: false, message: 'Failed to debit wallet' });
  }
});

// GET /api/v1/wallets/:walletId/transactions
router.get('/:walletId/transactions', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletTransactions(req, res);
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet transactions' });
  }
});

module.exports = router;

