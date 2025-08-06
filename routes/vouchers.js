const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const authMiddleware = require('../middleware/auth');

// Issue a new voucher
router.post('/issue', voucherController.issueVoucher);

// Issue EasyPay voucher
router.post('/easypay/issue', voucherController.issueEasyPayVoucher);

// Process EasyPay settlement callback
router.post('/easypay/settlement', voucherController.processEasyPaySettlement);

// Redeem a voucher
router.post('/redeem', voucherController.redeemVoucher);

// List all active vouchers for a user
router.get('/user/:userId', voucherController.listActiveVouchers);

// GET /api/v1/vouchers/active - List active vouchers for authenticated user
router.get('/active', authMiddleware, voucherController.listActiveVouchersForMe);

// GET /api/v1/vouchers/balance - Get total voucher balance for authenticated user
router.get('/balance', authMiddleware, voucherController.getVoucherBalance);

// GET /api/v1/vouchers/balance-summary - Get detailed voucher balance summary for authenticated user
router.get('/balance-summary', authMiddleware, voucherController.getVoucherBalanceSummary);

// GET /api/v1/vouchers/ - List all vouchers for authenticated user (for dashboard)
router.get('/', authMiddleware, voucherController.listAllVouchersForMe);

// Get voucher by code
router.get('/code/:voucher_code', voucherController.getVoucherByCode);

// Get voucher redemption history
router.get('/:voucher_id/redemptions', voucherController.getVoucherRedemptions);

// GET /api/v1/vouchers/redeemed - List redeemed vouchers for authenticated user
router.get('/redeemed', authMiddleware, voucherController.listRedeemedVouchersForMe);

module.exports = router;