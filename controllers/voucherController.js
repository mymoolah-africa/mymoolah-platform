const { Voucher, VoucherType, User } = require('../models');

exports.issueVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    // Coerce to number in case it's a string
    const amount = Number(voucherData.original_amount);
    // Validate minimum and maximum value
    if (
      isNaN(amount) ||
      amount < 5.00 ||
      amount > 4000.00
    ) {
      return res.status(400).json({ error: 'Voucher value must be between 5.00 and 4000.00' });
    }
    
    // Generate unique voucher code
    const voucherCode = 'VOUCHER' + Date.now().toString().slice(-9);
    
    // Create voucher using Sequelize
    const voucher = await Voucher.create({
      voucherCode,
      originalAmount: amount,
      balance: amount,
      status: 'active',
      voucherType: 'standard',
      issuedTo: voucherData.issued_to || 'system',
      issuedBy: 'system',
      redemptionCount: 0,
      maxRedemptions: 1
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
    
    if (voucher.status !== 'active') {
      return res.status(400).json({ error: 'Voucher is not active' });
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

exports.listActiveVouchers = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      include: [{
        model: VoucherType,
        as: 'voucherTypeAssoc',
        attributes: ['typeName', 'displayName', 'pricingModel']
      }],
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

exports.listActiveVouchersForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      include: [{
        model: VoucherType,
        as: 'voucherTypeAssoc',
        attributes: ['typeName', 'displayName', 'pricingModel']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      data: vouchers 
    });
  } catch (err) {
    console.error('❌ List my vouchers error:', err);
    res.status(500).json({ error: 'Failed to list vouchers' });
  }
};

exports.getVoucherByCode = async (req, res) => {
  try {
    const { voucher_code } = req.params;
    
    const voucher = await Voucher.findOne({
      where: { voucherCode: voucher_code },
      include: [{
        model: VoucherType,
        as: 'voucherTypeAssoc',
        attributes: ['typeName', 'displayName', 'pricingModel']
      }]
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

exports.getVoucherRedemptions = async (req, res) => {
  try {
    const { voucher_id } = req.params;
    
    // Since we don't have a separate VoucherRedemption model,
    // we'll return the voucher's redemption information
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