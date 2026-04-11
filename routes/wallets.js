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
    console.error('Wallet list error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get wallets',
      errorCode: 'WALLET_LIST_FAILED',
      message: 'Could not load your wallets. Please try again.'
    });
  }
});

// GET /api/v1/wallets/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getBalance(req, res);
  } catch (error) {
    console.error('Balance fetch error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get wallet balance', errorCode: 'BALANCE_FETCH_FAILED', message: 'Could not load your balance. Please try again.' });
  }
});

// GET /api/v1/wallets/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getTransactionHistory(req, res);
  } catch (error) {
    console.error('Transaction history error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get wallet transactions', errorCode: 'TRANSACTION_HISTORY_FAILED', message: 'Could not load your transactions. Please try again.' });
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
    console.error('Deposit error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to process deposit', errorCode: 'DEPOSIT_FAILED', message: 'Could not process your deposit. Please try again.' });
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
    console.error('Withdrawal error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to process withdrawal', errorCode: 'WITHDRAWAL_FAILED', message: 'Could not process your withdrawal. Please try again.' });
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
    console.error('Send money error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send money', errorCode: 'SEND_MONEY_FAILED', message: 'Could not send money. Please try again.' });
  }
});

// GET /api/v1/wallets/summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getTransactionSummary(req, res);
  } catch (error) {
    console.error('Wallet summary error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get wallet summary', errorCode: 'WALLET_SUMMARY_FAILED', message: 'Could not load your wallet summary. Please try again.' });
  }
});

// GET /api/v1/wallets/details
router.get('/details', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletDetails(req, res);
  } catch (error) {
    console.error('Wallet details error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get wallet details', errorCode: 'WALLET_DETAILS_FAILED', message: 'Could not load wallet details. Please try again.' });
  }
});

// Admin routes (require admin authentication)
// GET /api/v1/wallets/:walletId
router.get('/:walletId', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletById(req, res);
  } catch (error) {
    console.error('Wallet fetch error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get wallet', errorCode: 'WALLET_DETAILS_FAILED', message: 'Could not load wallet details. Please try again.' });
  }
});

// GET /api/v1/wallets/:walletId/balance
router.get('/:walletId/balance', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletBalance(req, res);
  } catch (error) {
    console.error('Wallet balance fetch error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get wallet balance', errorCode: 'BALANCE_FETCH_FAILED', message: 'Could not load wallet balance. Please try again.' });
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
    console.error('Wallet credit error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to credit wallet', errorCode: 'DEPOSIT_FAILED', message: 'Could not credit wallet. Please try again.' });
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
    console.error('Wallet debit error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to debit wallet', errorCode: 'WITHDRAWAL_FAILED', message: 'Could not debit wallet. Please try again.' });
  }
});

// GET /api/v1/wallets/:walletId/transactions
router.get('/:walletId/transactions', authMiddleware, async (req, res) => {
  try {
    const walletController = require('../controllers/walletController');
    await walletController.getWalletTransactions(req, res);
  } catch (error) {
    console.error('Wallet transactions error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get wallet transactions', errorCode: 'TRANSACTION_HISTORY_FAILED', message: 'Could not load wallet transactions. Please try again.' });
  }
});

module.exports = router;

