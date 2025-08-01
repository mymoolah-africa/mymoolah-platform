const { EasyPayVoucher, Voucher } = require('../models');

// Mock SMS service (replace with actual SMS service)
const mockSMSService = {
  sendSMS: async (phoneNumber, message) => {
    console.log(`📱 [MOCK SMS] To: ${phoneNumber}`);
    console.log(`📱 [MOCK SMS] Message: ${message}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }
};

// Issue EasyPay voucher
exports.issueEasyPayVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    
    // Validate required fields
    if (!voucherData.original_amount || !voucherData.issued_to) {
      return res.status(400).json({ error: 'Amount and issued_to are required' });
    }

    // Validate amount (10-4000)
    const amount = Number(voucherData.original_amount);
    if (isNaN(amount) || amount < 10 || amount > 4000) {
      return res.status(400).json({ error: 'Amount must be between 10 and 4000' });
    }

    // Generate EasyPay code and MM voucher code
    const easypayCode = 'EP' + Date.now().toString().slice(-10);
    const mmVoucherCode = 'MM' + Date.now().toString().slice(-10);
    
    // Set expiration (48 hours from now)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    
    // Create EasyPay voucher
    const easypayVoucher = await EasyPayVoucher.create({
      easypayCode,
      mmVoucherCode,
      originalAmount: amount,
      status: 'pending',
      issuedTo: voucherData.issued_to,
      issuedBy: 'system',
      expiresAt,
      callbackReceived: false,
      smsSent: false
    });
    
    // Send SMS with EasyPay code (mock)
    const smsMessage = `Your EasyPay code: ${easypayVoucher.easypayCode}\nAmount: R${amount}\nValid for 48 hours. Pay at any EasyPay merchant.`;
    await mockSMSService.sendSMS(voucherData.phone_number || 'mock_number', smsMessage);
    
    // Mark SMS as sent
    await easypayVoucher.update({
      smsSent: true,
      smsTimestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'EasyPay voucher created successfully',
      easypay_code: easypayVoucher.easypayCode,
      amount: easypayVoucher.originalAmount,
      expires_at: easypayVoucher.expiresAt,
      sms_sent: true
    });
  } catch (err) {
    console.error('❌ Issue EasyPay voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to create EasyPay voucher' });
  }
};

// Process EasyPay settlement callback
exports.processSettlementCallback = async (req, res) => {
  try {
    const { easypay_code, amount, merchant, transaction_id } = req.body;
    
    if (!easypay_code || !amount || !merchant) {
      return res.status(400).json({ error: 'EasyPay code, amount, and merchant are required' });
    }

    // Find EasyPay voucher
    const easypayVoucher = await EasyPayVoucher.findOne({
      where: { easypayCode: easypay_code }
    });
    
    if (!easypayVoucher) {
      return res.status(404).json({ error: 'EasyPay voucher not found' });
    }
    
    if (easypayVoucher.status !== 'pending') {
      return res.status(400).json({ error: 'EasyPay voucher is not pending' });
    }

    // Update EasyPay voucher with settlement info
    await easypayVoucher.update({
      status: 'settled',
      settlementAmount: Number(amount),
      settlementMerchant: merchant,
      settlementTimestamp: new Date(),
      callbackReceived: true
    });

    // Create MM voucher for the settled amount
    const mmVoucher = await Voucher.create({
      voucherCode: easypayVoucher.mmVoucherCode,
      originalAmount: Number(amount),
      balance: Number(amount),
      status: 'active',
      voucherType: 'easypay_mm',
      issuedTo: easypayVoucher.issuedTo,
      issuedBy: 'easypay_settlement',
      config: {
        easypay_code: easypay_code,
        settlement_merchant: merchant,
        settlement_timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Settlement processed successfully',
      easypay_code: easypay_code,
      mm_voucher_code: mmVoucher.voucherCode,
      settlement_amount: mmVoucher.originalAmount,
      settlement_merchant: merchant,
      mm_voucher_created: true
    });
  } catch (err) {
    console.error('❌ Process settlement error:', err);
    res.status(400).json({ error: err.message || 'Failed to process settlement' });
  }
};

// Get EasyPay voucher status
exports.getEasyPayVoucherStatus = async (req, res) => {
  try {
    const { easypay_code } = req.params;
    const voucher = await EasyPayVoucher.findOne({
      where: { easypayCode: easypay_code }
    });
    
    if (!voucher) {
      return res.status(404).json({ error: 'EasyPay voucher not found' });
    }

    res.json({
      easypay_code: voucher.easypayCode,
      status: voucher.status,
      amount: voucher.originalAmount,
      expires_at: voucher.expiresAt,
      settlement_amount: voucher.settlementAmount,
      settlement_merchant: voucher.settlementMerchant,
      settlement_timestamp: voucher.settlementTimestamp,
      mm_voucher_code: voucher.mmVoucherCode
    });
  } catch (err) {
    console.error('❌ Get EasyPay voucher status error:', err);
    res.status(500).json({ error: 'Failed to get EasyPay voucher status' });
  }
};

// Get pending EasyPay vouchers for user
exports.getPendingEasyPayVouchers = async (req, res) => {
  try {
    const { userId } = req.params;
    const vouchers = await EasyPayVoucher.findAll({
      where: {
        userId: userId,
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: vouchers
    });
  } catch (err) {
    console.error('❌ Get pending EasyPay vouchers error:', err);
    res.status(500).json({ error: 'Failed to get pending EasyPay vouchers' });
  }
};

// Get settled MM vouchers for user
exports.getSettledMMVouchers = async (req, res) => {
  try {
    const { userId } = req.params;
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        voucherType: 'easypay_mm',
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: vouchers
    });
  } catch (err) {
    console.error('❌ Get settled MM vouchers error:', err);
    res.status(500).json({ error: 'Failed to get settled MM vouchers' });
  }
};

// Resend SMS (for testing)
exports.resendSMS = async (req, res) => {
  try {
    const { easypay_code } = req.params;
    const voucher = await EasyPayVoucher.findOne({
      where: { easypayCode: easypay_code }
    });
    
    if (!voucher) {
      return res.status(404).json({ error: 'EasyPay voucher not found' });
    }

    if (voucher.status !== 'pending') {
      return res.status(400).json({ error: 'Can only resend SMS for pending vouchers' });
    }

    // Resend SMS
    const smsMessage = `Your EasyPay code: ${voucher.easypayCode}\nAmount: R${voucher.originalAmount}\nValid for 48 hours. Pay at any EasyPay merchant.`;
    await mockSMSService.sendSMS('mock_number', smsMessage);
    
    // Update SMS timestamp
    await voucher.update({
      smsSent: true,
      smsTimestamp: new Date()
    });

    res.json({
      success: true,
      message: 'SMS resent successfully',
      easypay_code: voucher.easypayCode
    });
  } catch (err) {
    console.error('❌ Resend SMS error:', err);
    res.status(500).json({ error: 'Failed to resend SMS' });
  }
};

// Cleanup expired vouchers (admin function)
exports.cleanupExpiredVouchers = async (req, res) => {
  try {
    const expiredVouchers = await EasyPayVoucher.findAll({
      where: {
        status: 'pending',
        expiresAt: {
          [require('sequelize').Op.lt]: new Date()
        }
      }
    });
    
    let expiredCount = 0;
    for (const voucher of expiredVouchers) {
      await voucher.update({ status: 'expired' });
      expiredCount++;
    }
    
    res.json({
      success: true,
      message: 'Expired vouchers cleaned up',
      expired_count: expiredCount
    });
  } catch (err) {
    console.error('❌ Cleanup expired vouchers error:', err);
    res.status(500).json({ error: 'Failed to cleanup expired vouchers' });
  }
}; 