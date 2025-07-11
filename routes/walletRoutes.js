const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Basic wallet routes - to be expanded later
router.get('/balance', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Wallet balance endpoint - to be implemented',
    data: {
      balance: 0.00,
      currency: 'ZAR'
    }
  });
});

router.get('/transactions', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Wallet transactions endpoint - to be implemented',
    data: {
      transactions: []
    }
  });
});

module.exports = router;