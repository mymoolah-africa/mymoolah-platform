const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transactionController');

const transactionController = new TransactionController();

// Create a new transaction (deposit, withdrawal, purchase)
router.post('/create', transactionController.createTransaction.bind(transactionController));

// Get transaction by ID
router.get('/:id', transactionController.getTransactionById.bind(transactionController));

// Get transaction by reference number
router.get('/reference/:referenceNumber', transactionController.getTransactionByReference.bind(transactionController));

// Get transactions by user ID
router.get('/user/:userId', transactionController.getTransactionsByUserId.bind(transactionController));

// Get transactions by wallet ID
router.get('/wallet/:walletId', transactionController.getTransactionsByWalletId.bind(transactionController));

// Update transaction status
router.put('/:id/status', transactionController.updateTransactionStatus.bind(transactionController));

// Get transaction summary for user
router.get('/user/:userId/summary', transactionController.getTransactionSummary.bind(transactionController));

module.exports = router;