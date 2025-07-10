const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// GET /api/v1/transactions - List all transactions
router.get('/', transactionController.getAllTransactions);

// GET /api/v1/transactions/:id - Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// GET /api/v1/transactions/wallet/:walletId - Get transactions for specific wallet
router.get('/wallet/:walletId', transactionController.getTransactionsByWallet);

module.exports = router;