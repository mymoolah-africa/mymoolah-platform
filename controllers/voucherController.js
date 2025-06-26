const voucherModel = require('../models/voucherModel');

exports.issueVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    // Validate required fields here as needed
    const result = await voucherModel.issueVoucher(voucherData);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to issue voucher' });
  }
};

exports.redeemVoucher = async (req, res) => {
  try {
    const { voucher_code, amount, redeemer_id, merchant_id, service_provider_id } = req.body;
    if (!voucher_code || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid voucher_code and amount are required' });
    }
    const result = await voucherModel.redeemVoucher(voucher_code, amount, redeemer_id, merchant_id, service_provider_id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to redeem voucher' });
  }
};

exports.listActiveVouchers = async (req, res) => {
  try {
    const userId = req.params.userId;
    const vouchers = await voucherModel.listActiveVouchers(userId);
    res.json(vouchers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list vouchers' });
  }
};