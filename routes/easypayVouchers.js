const express = require('express');
const router = express.Router();
const easyPayVoucherController = require('../controllers/easypayVoucherController');

// Issue a new EasyPay voucher
router.post('/', easyPayVoucherController.issueEasyPayVoucher);

// Process EasyPay settlement callback
router.post('/settlement', easyPayVoucherController.processSettlementCallback);

// Get EasyPay voucher status
router.get('/status/:easypay_code', easyPayVoucherController.getEasyPayVoucherStatus);

// Get pending EasyPay vouchers for a user
router.get('/pending/:userId', easyPayVoucherController.getPendingEasyPayVouchers);

// Get settled MM vouchers for a user
router.get('/settled/:userId', easyPayVoucherController.getSettledMMVouchers);

// Resend SMS (disabled, returns error)
router.post('/resend/:easypay_code', easyPayVoucherController.resendSMS);

// Cleanup expired vouchers (admin)
router.post('/cleanup', easyPayVoucherController.cleanupExpiredVouchers);

module.exports = router;