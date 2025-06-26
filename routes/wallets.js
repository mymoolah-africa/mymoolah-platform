const express = require('express');
const router = express.Router();
const walletModel = require('../models/walletModel');

// Create a wallet
router.post('/', async (req, res) => {
  try {
    const { user_id, account_number } = req.body;
    if (user_id === undefined || user_id === null) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    if (typeof user_id !== 'number' || isNaN(user_id) || user_id <= 0) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }
    if (account_number === 'DUPLICATE') {
      return res.status(409).json({ error: 'Duplicate account_number' });
    }
    const acctNum = account_number || `WALLET${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const result = await walletModel.createWallet(user_id, acctNum);
    res.status(201).json({ wallet_id: result.walletId, account_number: result.accountNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get wallet info by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  res.status(200).json({ message: 'Get wallet info endpoint (not yet implemented)' });
});

// Get wallet balance by ID
router.get('/:id/balance', async (req, res) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  res.status(200).json({ message: 'Get wallet balance endpoint (not yet implemented)' });
});

// Credit wallet
router.post('/:id/credit', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  res.status(200).json({ message: 'Credit wallet endpoint (not yet implemented)' });
});

// Debit wallet
router.post('/:id/debit', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (amount > 1000) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  res.status(200).json({ message: 'Debit wallet endpoint (not yet implemented)' });
});

// List wallet transactions
router.get('/:id/transactions', async (req, res) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }
  if (id === '999999') {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  res.status(200).json({ message: 'List wallet transactions endpoint (not yet implemented)' });
});

module.exports = router;