const db = require('../config/db');

// Issue a new voucher
exports.issueVoucher = async (voucherData) => {
  // voucherData: { original_amount, issued_to, issued_by, brand_locked, locked_to_id, type, config }
  const [result] = await db.query(
    `INSERT INTO vouchers (voucher_code, original_amount, balance, status, issued_to, issued_by, brand_locked, locked_to_id, type, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [voucherData.voucher_code, voucherData.original_amount, voucherData.original_amount, 'active', voucherData.issued_to, voucherData.issued_by, voucherData.brand_locked, voucherData.locked_to_id, voucherData.type, JSON.stringify(voucherData.config || {})]
  );
  return { voucherId: result.insertId, voucher_code: voucherData.voucher_code };
};

// Redeem a voucher (partial or full)
exports.redeemVoucher = async (voucher_code, amount, redeemer_id, merchant_id, service_provider_id) => {
  // Start transaction
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Fetch voucher
    const [rows] = await conn.query('SELECT * FROM vouchers WHERE voucher_code = ? FOR UPDATE', [voucher_code]);
    const voucher = rows[0];
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status !== 'active' || voucher.balance <= 0) throw new Error('Voucher not active or already redeemed');
    // Brand lock check
    if (voucher.brand_locked && ((voucher.locked_to_id && (voucher.locked_to_id !== merchant_id && voucher.locked_to_id !== service_provider_id)))) {
      throw new Error('Voucher is brand-locked and cannot be redeemed here');
    }
    // Partial redemption logic
    if (amount > voucher.balance) throw new Error('Redemption amount exceeds voucher balance');
    const newBalance = voucher.balance - amount;
    const newStatus = newBalance === 0 ? 'fully_redeemed' : 'active';
    // Update voucher
    await conn.query('UPDATE vouchers SET balance = ?, status = ?, updated_at = NOW() WHERE voucher_code = ?', [newBalance, newStatus, voucher_code]);
    // Log redemption (optional: create a voucher_redemptions table for history)
    await conn.query(
      'INSERT INTO voucher_redemptions (voucher_id, redeemer_id, amount, merchant_id, service_provider_id, redeemed_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [voucher.voucher_id, redeemer_id, amount, merchant_id, service_provider_id]
    );
    await conn.commit();
    return { success: true, newBalance, status: newStatus };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// List all active vouchers with positive balance for a user/wallet
exports.listActiveVouchers = async (userId) => {
  const [rows] = await db.query('SELECT * FROM vouchers WHERE issued_to = ? AND balance > 0 AND status = \"active\"', [userId]);
  return rows;
};