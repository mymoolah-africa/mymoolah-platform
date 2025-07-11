const express = require('express');
const router = express.Router();
const easypayVoucherController = require('../controllers/easypayVoucherController');

// Issue EasyPay voucher
router.post('/issue', easypayVoucherController.issueEasyPayVoucher);

// Process EasyPay settlement callback
router.post('/settlement-callback', easypayVoucherController.processSettlementCallback);

// Get EasyPay voucher status
router.get('/status/:easypay_code', easypayVoucherController.getEasyPayVoucherStatus);

// Get pending EasyPay vouchers for user
router.get('/pending/:userId', easypayVoucherController.getPendingEasyPayVouchers);

// Get settled MM vouchers for user
router.get('/settled/:userId', easypayVoucherController.getSettledMMVouchers);

// Resend SMS (for testing)
router.post('/resend-sms/:easypay_code', easypayVoucherController.resendSMS);

// Cleanup expired vouchers (admin)
router.post('/cleanup-expired', easypayVoucherController.cleanupExpiredVouchers);

module.exports = router; 