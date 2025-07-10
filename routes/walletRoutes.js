const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/walletController');

const walletController = new WalletController();

// Create a new wallet
router.post('/create', walletController.createWallet.bind(walletController));

// Get wallet by ID
router.get('/:walletId', walletController.getWalletById.bind(walletController));

// Get wallet by user ID
router.get('/user/:userId', walletController.getWalletByUserId.bind(walletController));

// Get wallet summary (detailed info)
router.get('/:walletId/summary', walletController.getWalletSummary.bind(walletController));

// Update KYC status
router.put('/:walletId/kyc', walletController.updateKYCStatus.bind(walletController));

// Update transaction limits
router.put('/:walletId/limits', walletController.updateTransactionLimits.bind(walletController));

// Check transaction limits
router.post('/:walletId/check-limits', walletController.checkTransactionLimits.bind(walletController));

module.exports = router;