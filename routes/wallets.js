const express = require('express');
const router = express.Router();

// Example GET endpoint for wallets
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Wallets endpoint is working.' });
});

module.exports = router;

