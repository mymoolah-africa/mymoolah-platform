const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

// Issue a new voucher
router.post('/issue', voucherController.issueVoucher);

// Redeem a voucher
router.post('/redeem', voucherController.redeemVoucher);

// List all active vouchers for a user
router.get('/user/:userId', voucherController.listActiveVouchers);

// Get voucher by code
router.get('/code/:voucher_code', voucherController.getVoucherByCode);

// Get voucher redemption history
router.get('/:voucher_id/redemptions', voucherController.getVoucherRedemptions);

// List all vouchers (for admin/testing)
router.get('/', (req, res) => {
  res.json({ message: 'Voucher API is working. Use specific endpoints for operations.' });
});

module.exports = router;