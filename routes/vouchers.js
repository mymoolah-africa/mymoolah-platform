const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const authMiddleware = require('../middleware/auth');

// Issue a new voucher
router.post('/issue', voucherController.issueVoucher);

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

// List all vouchers (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const VoucherModel = require('../models/voucherModel');
    const voucherModel = new VoucherModel();
    
    voucherModel.db.all(`
      SELECT 
        v.id,
        v.voucherId,
        v.userId,
        v.type,
        v.amount,
        v.description,
        v.status,
        v.expiryDate,
        v.createdAt,
        v.updatedAt,
        u.firstName,
        u.lastName,
        u.email
      FROM vouchers v
      LEFT JOIN users u ON v.userId = u.id
      ORDER BY v.createdAt DESC
    `, [], (err, rows) => {
      if (err) {
        console.error('❌ Error getting vouchers:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      res.json({ 
        success: true,
        message: 'Vouchers retrieved successfully',
        data: { vouchers: rows || [] }
      });
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