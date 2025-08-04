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



// Get voucher by code
router.get('/code/:voucher_code', voucherController.getVoucherByCode);

// Get voucher redemption history
router.get('/:voucher_id/redemptions', voucherController.getVoucherRedemptions);

// GET /api/v1/vouchers/redeemed - List redeemed vouchers for authenticated user
router.get('/redeemed', authMiddleware, voucherController.listRedeemedVouchersForMe);

// List all vouchers (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const { Voucher } = require('../models');
    
    const vouchers = await Voucher.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    const vouchersData = vouchers.map(voucher => ({
      id: voucher.id,
      voucherCode: voucher.voucherCode,
      easyPayCode: voucher.easyPayCode,
      userId: voucher.userId,
      voucherType: voucher.voucherType,
      originalAmount: voucher.originalAmount,
      balance: voucher.balance,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt
    }));
    
    res.json({ 
      success: true,
      message: 'Vouchers retrieved successfully',
      data: { vouchers: vouchersData }
    });
  } catch (error) {
    console.error('❌ Error in getAllVouchers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

module.exports = router;