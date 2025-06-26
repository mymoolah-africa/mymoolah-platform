const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

// Issue a new voucher
router.post('/issue', voucherController.issueVoucher);
// Redeem a voucher (partial or full)
router.post('/redeem', voucherController.redeemVoucher);
// List all active vouchers for a user
router.get('/user/:userId', voucherController.listActiveVouchers);

module.exports = router;