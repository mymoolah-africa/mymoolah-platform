const voucherModel = require('../models/voucherModel');

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
    voucherData.original_amount = amount; // Ensure it's a number for DB
    // Continue as before
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
    const amt = Number(amount);
    if (!voucher_code || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Valid voucher_code and amount are required' });
    }
    const result = await voucherModel.redeemVoucher(voucher_code, amt, redeemer_id, merchant_id, service_provider_id);
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