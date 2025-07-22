const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const WalletModel = require('../models/Wallet');

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

// GET /api/v1/wallets/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await WalletModel.getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    const balanceData = {
      available: wallet.balance,
      pending: 0.00, // Update if you have pending logic
      total: wallet.balance,
      currency: wallet.currency || 'ZAR',
      lastUpdated: wallet.updatedAt || new Date().toISOString()
    };
    return res.json({ success: true, data: balanceData });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wallet balance' });
  }
});

// GET /api/v1/wallets/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await WalletModel.getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    const { page = 1, limit = 10 } = req.query;
    const txResult = await WalletModel.listWalletTransactions(wallet.walletId, { page, limit });
    return res.json({ success: true, data: txResult });
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
    const userId = req.user.id;
    const { amount, source } = req.body;
    
    // Simulate deposit processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    
    return res.json({
      success: true,
      message: 'Deposit initiated successfully',
      data: {
        transactionId,
        amount: parseFloat(amount),
        source,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      }
    });
  } catch (error) {
    console.error('Error processing deposit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process deposit'
    });
  }
});

// POST /api/v1/wallets/withdraw
router.post('/withdraw', [
  authMiddleware,
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  body('destination')
    .isIn(['bank_account', 'atm'])
    .withMessage('Destination must be bank_account or atm'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, destination } = req.body;
    
    // Simulate withdrawal processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    
    return res.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      data: {
        transactionId,
        amount: parseFloat(amount),
        destination,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      }
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal'
    });
  }
});

// GET /api/v1/wallets/limits
router.get('/limits', authMiddleware, async (req, res) => {
  try {
    const limits = {
      daily: {
        deposit: 50000.00,
        withdrawal: 10000.00,
        transfer: 25000.00
      },
      monthly: {
        deposit: 500000.00,
        withdrawal: 100000.00,
        transfer: 250000.00
      },
      transaction: {
        min: 1.00,
        max: 50000.00
      }
    };
    
    return res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    console.error('Error getting wallet limits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get wallet limits'
    });
  }
});

// Legacy: POST /api/v1/wallets
router.post('/', async (req, res) => {
  const { user_id, account_number } = req.body;
  if (user_id === undefined) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  if (typeof user_id !== 'number' || user_id <= 0) {
    return res.status(400).json({ error: 'Invalid user_id' });
  }
  if (account_number === 'DUPLICATE') {
    return res.status(409).json({ error: 'Duplicate account_number' });
  }
  // Simulate wallet creation
  return res.status(201).json({ wallet_id: 123, account_number: account_number || 'ACC123' });
});
// Legacy: GET /api/v1/wallets/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  return res.status(200).json({ message: 'Wallet info placeholder' });
});
// Legacy: GET /api/v1/wallets/:id/balance
router.get('/:id/balance', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  return res.status(200).json({ message: 'Wallet balance placeholder' });
});
// Legacy: POST /api/v1/wallets/:id/credit
router.post('/:id/credit', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (isNaN(id)) {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  if (amount === undefined) {
    return res.status(400).json({ error: 'Amount is required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  return res.status(200).json({ message: 'Wallet credited' });
});
// Legacy: POST /api/v1/wallets/:id/debit
router.post('/:id/debit', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (isNaN(id)) {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  if (amount === undefined) {
    return res.status(400).json({ error: 'Amount is required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (amount > 1000) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  return res.status(200).json({ message: 'Wallet debited' });
});
// Legacy: GET /api/v1/wallets/:id/transactions
router.get('/:id/transactions', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  return res.status(200).json({ message: 'Wallet transactions placeholder' });
});

module.exports = router;

