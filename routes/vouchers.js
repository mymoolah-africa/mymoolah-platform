const express = require('express');
const router = express.Router();

// In-memory store for demo purposes
let vouchers = [];
let nextVoucherId = 1;

// Issue a new voucher
router.post('/issue', (req, res) => {
  const { value, brand, issued_to } = req.body;
  if (!value || typeof value !== 'number' || value <= 0) {
    return res.status(400).json({ error: 'Voucher value must be a positive number' });
  }
  if (!brand) {
    return res.status(400).json({ error: 'Brand is required' });
  }
  const voucher = {
    id: nextVoucherId++,
    code: `VOUCHER${Date.now()}${Math.floor(Math.random() * 1000)}`,
    value,
    brand,
    issued_to: issued_to || null,
    redeemed: false,
    redeemed_at: null
  };
  vouchers.push(voucher);
  res.status(201).json({ voucher });
});
// Redeem a voucher
router.post('/redeem', (req, res) => {
  const { code } = req.body;
  const voucher = vouchers.find(v => v.code === code);
  if (!voucher) {
    return res.status(404).json({ error: 'Voucher not found' });
  }
  if (voucher.redeemed) {
    return res.status(400).json({ error: 'Voucher already redeemed' });
  }
  voucher.redeemed = true;
  voucher.redeemed_at = new Date().toISOString();
  res.status(200).json({ voucher });
});
// List all vouchers (for demo/testing)
router.get('/', (req, res) => {
  res.json({ vouchers });
});

module.exports = router;