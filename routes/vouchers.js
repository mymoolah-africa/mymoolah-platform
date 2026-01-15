const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const authMiddleware = require('../middleware/auth');

// Issue a new voucher
router.post('/issue', authMiddleware, voucherController.issueVoucher);

// Issue EasyPay Top-up voucher
router.post('/easypay/topup/issue', authMiddleware, voucherController.issueEasyPayVoucher);

// Process EasyPay Top-up settlement callback
// Note: This route is for EasyPay callbacks and UAT simulation
router.post('/easypay/topup/settlement', (req, res, next) => {
  console.log('🔔 Route matched: /easypay/topup/settlement', {
    method: req.method,
    path: req.path,
    url: req.url,
    body: req.body
  });
  next();
}, voucherController.processEasyPaySettlement);

// Issue EasyPay Cash-out voucher
router.post('/easypay/cashout/issue', authMiddleware, voucherController.issueEasyPayCashout);

// Process EasyPay Cash-out settlement callback
router.post('/easypay/cashout/settlement', voucherController.processEasyPayCashoutSettlement);

// Cancel EasyPay Cash-out voucher
router.delete('/easypay/cashout/:voucherId', authMiddleware, voucherController.cancelEasyPayCashout);

// Legacy routes (for backward compatibility)
router.post('/easypay/issue', authMiddleware, voucherController.issueEasyPayVoucher);
router.post('/easypay/settlement', voucherController.processEasyPaySettlement);

// Redeem a voucher (must be authenticated so we credit the redeemer's wallet)
router.post('/redeem', authMiddleware, voucherController.redeemVoucher);

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

// POST /api/v1/vouchers/:voucherId/cancel - Cancel EasyPay voucher with full refund (must come before /:voucher_id routes)
router.post('/:voucherId/cancel', authMiddleware, voucherController.cancelEasyPayVoucher);

// Get voucher redemption history
router.get('/:voucher_id/redemptions', voucherController.getVoucherRedemptions);

// GET /api/v1/vouchers/redeemed - List redeemed vouchers for authenticated user
router.get('/redeemed', authMiddleware, voucherController.listRedeemedVouchersForMe);

// POST /api/v1/vouchers/trigger-expiration - Manual trigger for EasyPay expiration handler (admin only)
router.post('/trigger-expiration', authMiddleware, voucherController.triggerExpirationHandler);

module.exports = router;