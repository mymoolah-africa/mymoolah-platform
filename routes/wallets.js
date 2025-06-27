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
    const acctNum = account_number || `WALLET${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const result = await walletModel.createWallet(user_id, acctNum);
    res.status(201).json({ wallet_id: result.walletId, account_number: result.accountNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get wallet info by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid wallet id' });
    }
    const wallet = await walletModel.getWalletById(Number(id));
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.status(200).json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get wallet balance by ID
router.get('/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid wallet id' });
    }
    const balance = await walletModel.getWalletBalance(Number(id));
    if (balance === null) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.status(200).json({ wallet_id: Number(id), balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Credit wallet
router.post('/:id/credit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid wallet id' });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const result = await walletModel.creditWallet(Number(id), amount);
    if (!result) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.status(200).json({ wallet_id: Number(id), new_balance: result.newBalance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Debit wallet
router.post('/:id/debit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid wallet id' });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const result = await walletModel.debitWallet(Number(id), amount);
    if (!result) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.status(200).json({ wallet_id: Number(id), new_balance: result.newBalance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List wallet transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid wallet id' });
    }
    // Optional: support pagination/filtering via query params
    const { page, limit, type, startDate, endDate } = req.query;
    const txns = await walletModel.listWalletTransactions(Number(id), {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      type,
      startDate,
      endDate
    });
    if (!txns) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.status(200).json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;