const { Voucher, VoucherType, User } = require('../models');

// Generate EasyPay number using Luhn algorithm
const generateEasyPayNumber = () => {
  const EASYPAY_PREFIX = '9';
  const RECEIVER_ID = '1234'; // MyMoolah's EasyPay receiver ID
  
  // Generate random account number (8 digits)
  const accountNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  
  // Combine receiver ID and account number
  const baseDigits = RECEIVER_ID + accountNumber;
  
  // Calculate check digit using Luhn algorithm
  const checkDigit = generateLuhnCheckDigit(baseDigits);
  
  // Return complete EasyPay number (14 digits)
  return EASYPAY_PREFIX + baseDigits + checkDigit;
};

const generateLuhnCheckDigit = (digits) => {
  let sum = 0;
  let isEven = false;
  
  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (10 - (sum % 10)) % 10;
};

// Generate MM voucher code
const generateMMVoucherCode = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `MMVOUCHER_${timestamp}_${random}`;
};

// Issue a new voucher
exports.issueVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    const amount = Number(voucherData.original_amount);
    
    // Validate minimum and maximum value
    if (isNaN(amount) || amount < 5.00 || amount > 4000.00) {
      return res.status(400).json({ error: 'Voucher value must be between 5.00 and 4000.00' });
    }
    
    // Generate voucher code
    const voucherCode = generateMMVoucherCode();
    
    // Create voucher
    const voucher = await Voucher.create({
      voucherCode,
      originalAmount: amount,
      balance: amount,
      status: 'active',
      voucherType: 'standard',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    res.status(201).json({
      success: true,
      message: 'Voucher issued successfully',
      data: {
        voucher_code: voucher.voucherCode,
        original_amount: voucher.originalAmount,
        balance: voucher.balance,
        status: voucher.status
      }
    });
  } catch (err) {
    console.error('❌ Issue voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to issue voucher' });
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

    // Validate amount (50-4000)
    const amount = Number(voucherData.original_amount);
    if (isNaN(amount) || amount < 50 || amount > 4000) {
      return res.status(400).json({ error: 'Amount must be between 50 and 4000' });
    }

    // Generate EasyPay number
    const easyPayCode = generateEasyPayNumber();
    
    // Set expiration (96 hours from now - 4 days)
    const expiresAt = new Date(Date.now() + 96 * 60 * 60 * 1000);
    
    // Create EasyPay voucher
    const voucher = await Voucher.create({
      easyPayCode,
      originalAmount: amount,
      balance: 0, // No balance until settled
      status: 'pending',
      voucherType: 'easypay_pending',
      expiresAt,
      metadata: {
        issuedTo: voucherData.issued_to,
        issuedBy: 'system',
        callbackReceived: false,
        smsSent: false
      }
    });
    


    res.status(201).json({
      success: true,
      message: 'EasyPay voucher created successfully',
      data: {
        easypay_code: voucher.easyPayCode,
        amount: voucher.originalAmount,
        expires_at: voucher.expiresAt,
        sms_sent: false
      }
    });
  } catch (err) {
    console.error('❌ Issue EasyPay voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to issue EasyPay voucher' });
  }
};

// Process EasyPay settlement callback
exports.processEasyPaySettlement = async (req, res) => {
  try {
    const { easypay_code, settlement_amount, merchant_id, transaction_id } = req.body;
    
    // Find the pending EasyPay voucher
    const voucher = await Voucher.findOne({
      where: {
        easyPayCode: easypay_code,
        voucherType: 'easypay_pending',
        status: 'pending'
      }
    });
    
    if (!voucher) {
      return res.status(404).json({ error: 'EasyPay voucher not found or already settled' });
    }
    
    // Generate MM voucher code
    const mmVoucherCode = generateMMVoucherCode();
    
    // Update voucher to settled state
    await voucher.update({
      voucherCode: mmVoucherCode,
      status: 'active',
      voucherType: 'easypay_active',
      balance: voucher.originalAmount,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months
      metadata: {
        ...voucher.metadata,
        settlementAmount: settlement_amount,
        settlementMerchant: merchant_id,
        settlementTimestamp: new Date().toISOString(),
        callbackReceived: true,
        transactionId: transaction_id
      }
    });
    

    
    res.json({
      success: true,
      message: 'EasyPay voucher settled successfully',
      data: {
        easypay_code: easypay_code,
        mm_voucher_code: mmVoucherCode,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('❌ Process EasyPay settlement error:', err);
    res.status(500).json({ error: err.message || 'Failed to process settlement' });
  }
};

// Redeem a voucher
exports.redeemVoucher = async (req, res) => {
  try {
    const { voucher_code, amount, redeemer_id, merchant_id, service_provider_id } = req.body;
    const amt = Number(amount);
    
    if (!voucher_code || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Valid voucher_code and amount are required' });
    }
    
    // Find voucher by code
    const voucher = await Voucher.findOne({ where: { voucherCode: voucher_code } });
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    if (!voucher.canRedeem()) {
      return res.status(400).json({ error: 'Voucher cannot be redeemed' });
    }
    
    if (voucher.balance < amt) {
      return res.status(400).json({ error: 'Insufficient voucher balance' });
    }
    
    // Update voucher balance
    await voucher.update({
      balance: voucher.balance - amt,
      redemptionCount: voucher.redemptionCount + 1
    });
    
    // If balance is 0, mark as redeemed
    if (voucher.balance === 0) {
      await voucher.update({ status: 'redeemed' });
    }
    
    res.json({
      success: true,
      message: 'Voucher redeemed successfully',
      data: {
        voucher_code: voucher.voucherCode,
        redeemed_amount: amt,
        remaining_balance: voucher.balance,
        status: voucher.status
      }
    });
  } catch (err) {
    console.error('❌ Redeem voucher error:', err);
    res.status(400).json({ error: err.message || 'Failed to redeem voucher' });
  }
};

// List active vouchers for a user
exports.listActiveVouchers = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: vouchers
    });
  } catch (err) {
    console.error('❌ List vouchers error:', err);
    res.status(500).json({ error: 'Failed to list vouchers' });
  }
};

// List active vouchers for authenticated user
exports.listActiveVouchersForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      data: { vouchers: vouchers } 
    });
  } catch (err) {
    console.error('❌ List my vouchers error:', err);
    res.status(500).json({ error: 'Failed to list vouchers' });
  }
};

// List redeemed vouchers for authenticated user
exports.listRedeemedVouchersForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'redeemed'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      data: { vouchers: vouchers } 
    });
  } catch (err) {
    console.error('❌ List my redeemed vouchers error:', err);
    res.status(500).json({ error: 'Failed to list redeemed vouchers' });
  }
};



// Get voucher by code
exports.getVoucherByCode = async (req, res) => {
  try {
    const { voucher_code } = req.params;
    
    const voucher = await Voucher.findOne({
      where: { voucherCode: voucher_code }
    });
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    res.json({
      success: true,
      data: voucher
    });
  } catch (err) {
    console.error('❌ Get voucher error:', err);
    res.status(500).json({ error: 'Failed to get voucher' });
  }
};

// Get voucher redemption history
exports.getVoucherRedemptions = async (req, res) => {
  try {
    const { voucher_id } = req.params;
    
    const voucher = await Voucher.findByPk(voucher_id);
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    res.json({
      success: true,
      data: {
        voucher_id: voucher.id,
        voucher_code: voucher.voucherCode,
        redemption_count: voucher.redemptionCount,
        max_redemptions: voucher.maxRedemptions,
        status: voucher.status
      }
    });
  } catch (err) {
    console.error('❌ Get voucher redemptions error:', err);
    res.status(500).json({ error: 'Failed to get voucher redemptions' });
  }
};

// Get voucher balance for authenticated user
exports.getVoucherBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all active vouchers for the user
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      attributes: ['balance', 'originalAmount', 'redemptionCount']
    });
    
    // Calculate totals
    const totalBalance = vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.balance), 0);
    const totalOriginalValue = vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.originalAmount), 0);
    const totalRedeemed = totalOriginalValue - totalBalance;
    const voucherCount = vouchers.length;
    
    res.json({
      success: true,
      data: {
        totalBalance: totalBalance.toFixed(2),
        totalOriginalValue: totalOriginalValue.toFixed(2),
        totalRedeemed: totalRedeemed.toFixed(2),
        voucherCount: voucherCount,
        redemptionRate: voucherCount > 0 ? ((totalRedeemed / totalOriginalValue) * 100).toFixed(1) : '0.0'
      }
    });
  } catch (err) {
    console.error('❌ Get voucher balance error:', err);
    res.status(500).json({ error: 'Failed to get voucher balance' });
  }
};