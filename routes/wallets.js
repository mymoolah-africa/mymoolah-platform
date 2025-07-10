const express = require('express');
const { body, param } = require('express-validator');
const WalletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const walletController = new WalletController();

// Apply authentication middleware to all wallet routes
router.use(authMiddleware);

// POST /api/v1/wallets - Create a new wallet
router.post('/',
  [
    body('user_id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    body('account_number').optional().isString().withMessage('Account number must be a string')
  ],
  walletController.createWallet.bind(walletController)
);

// GET /api/v1/wallets/:id - Get wallet by ID
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Wallet ID must be a positive integer')
  ],
  walletController.getWalletById.bind(walletController)
);

// GET /api/v1/wallets/:id/balance - Get wallet balance
router.get('/:id/balance',
  [
    param('id').isInt({ min: 1 }).withMessage('Wallet ID must be a positive integer')
  ],
  walletController.getWalletBalance.bind(walletController)
);

// POST /api/v1/wallets/:id/credit - Credit wallet
router.post('/:id/credit',
  [
    param('id').isInt({ min: 1 }).withMessage('Wallet ID must be a positive integer'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
  ],
  walletController.creditWalletById.bind(walletController)
);

// POST /api/v1/wallets/:id/debit - Debit wallet
router.post('/:id/debit',
  [
    param('id').isInt({ min: 1 }).withMessage('Wallet ID must be a positive integer'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
  ],
  walletController.debitWalletById.bind(walletController)
);

// GET /api/v1/wallets/:id/transactions - Get wallet transactions
router.get('/:id/transactions',
  [
    param('id').isInt({ min: 1 }).withMessage('Wallet ID must be a positive integer')
  ],
  walletController.getWalletTransactions.bind(walletController)
);

module.exports = router; 