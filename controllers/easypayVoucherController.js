const EasyPayVoucherModel = require('../models/easypayVoucherModel');
const VoucherModel = require('../models/voucherModel');

// Create instances
const easypayVoucherModel = new EasyPayVoucherModel();
const voucherModel = new VoucherModel();

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

    // Create EasyPay voucher
    const easypayVoucher = await easypayVoucherModel.createEasyPayVoucher(voucherData);
    
    // Send SMS with EasyPay code (mock)
    const smsMessage = `Your EasyPay code: ${easypayVoucher.easypay_code}\nAmount: R${amount}\nValid for 48 hours. Pay at any EasyPay merchant.`;
    await mockSMSService.sendSMS(voucherData.phone_number || 'mock_number', smsMessage);
    
    // Mark SMS as sent
    await easypayVoucherModel.markSMSSent(easypayVoucher.easypay_code);

    res.status(201).json({
      success: true,
      message: 'EasyPay voucher created successfully',
      easypay_code: easypayVoucher.easypay_code,
      amount: easypayVoucher.original_amount,
      expires_at: easypayVoucher.expires_at,
      sms_sent: true
    });
  } catch (err) {
    console.error(err);
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

    // Process settlement
    const settlementResult = await easypayVoucherModel.processSettlementCallback(easypay_code, {
      amount: Number(amount),
      merchant,
      transaction_id
    });

    // Create MM voucher for the settled amount
    const mmVoucherData = {
      original_amount: settlementResult.settlement_amount,
      voucher_type: 'easypay_mm',
      issued_to: settlementResult.issued_to,
      issued_by: 'easypay_settlement',
      config: {
        easypay_code: easypay_code,
        settlement_merchant: settlementResult.settlement_merchant,
        settlement_timestamp: new Date().toISOString()
      }
    };

    const mmVoucher = await voucherModel.issueVoucher(mmVoucherData);

    res.json({
      success: true,
      message: 'Settlement processed successfully',
      easypay_code: easypay_code,
      mm_voucher_code: mmVoucher.voucher_code,
      settlement_amount: settlementResult.settlement_amount,
      settlement_merchant: settlementResult.settlement_merchant,
      mm_voucher_created: true
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to process settlement' });
  }
};

// Get EasyPay voucher status
exports.getEasyPayVoucherStatus = async (req, res) => {
  try {
    const { easypay_code } = req.params;
    const voucher = await easypayVoucherModel.getEasyPayVoucher(easypay_code);
    
    if (!voucher) {
      return res.status(404).json({ error: 'EasyPay voucher not found' });
    }

    res.json({
      easypay_code: voucher.easypay_code,
      status: voucher.status,
      amount: voucher.original_amount,
      expires_at: voucher.expires_at,
      settlement_amount: voucher.settlement_amount,
      settlement_merchant: voucher.settlement_merchant,
      settlement_timestamp: voucher.settlement_timestamp,
      mm_voucher_code: voucher.mm_voucher_code
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get EasyPay voucher status' });
  }
};

// Get pending EasyPay vouchers for user
exports.getPendingEasyPayVouchers = async (req, res) => {
  try {
    const { userId } = req.params;
    const vouchers = await easypayVoucherModel.getPendingEasyPayVouchers(userId);
    res.json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get pending EasyPay vouchers' });
  }
};

// Get settled MM vouchers for user
exports.getSettledMMVouchers = async (req, res) => {
  try {
    const { userId } = req.params;
    const vouchers = await easypayVoucherModel.getSettledMMVouchers(userId);
    res.json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get settled MM vouchers' });
  }
};

// Resend SMS (for testing)
exports.resendSMS = async (req, res) => {
  try {
    const { easypay_code } = req.params;
    const voucher = await easypayVoucherModel.getEasyPayVoucher(easypay_code);
    
    if (!voucher) {
      return res.status(404).json({ error: 'EasyPay voucher not found' });
    }

    if (voucher.status !== 'pending') {
      return res.status(400).json({ error: 'Can only resend SMS for pending vouchers' });
    }

    // Resend SMS
    const smsMessage = `Your EasyPay code: ${voucher.easypay_code}\nAmount: R${voucher.original_amount}\nValid for 48 hours. Pay at any EasyPay merchant.`;
    await mockSMSService.sendSMS('mock_number', smsMessage);
    
    // Update SMS timestamp
    await easypayVoucherModel.markSMSSent(easypay_code);

    res.json({
      success: true,
      message: 'SMS resent successfully',
      easypay_code: voucher.easypay_code
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend SMS' });
  }
};

// Cleanup expired vouchers (admin function)
exports.cleanupExpiredVouchers = async (req, res) => {
  try {
    const result = await easypayVoucherModel.cleanupExpiredVouchers();
    res.json({
      success: true,
      message: 'Expired vouchers cleaned up',
      expired_count: result.expired_count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cleanup expired vouchers' });
  }
}; 