const db = require('../config/db');

exports.submitKyc = async (userId, documentType, documentUrl) => {
  const [result] = await db.query(
    `INSERT INTO kyc (user_id, document_type, document_url, status, submitted_at)
     VALUES (?, ?, ?, 'pending', NOW())`,
    [userId, documentType, documentUrl]
  );
  return { kyc_id: result.insertId, status: 'pending' };
};

exports.getKycStatus = async (userId) => {
  const [rows] = await db.query(
    `SELECT status, reviewed_at, reviewer_id, notes FROM kyc WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

exports.updateKycStatus = async (userId, status, reviewerId, notes) => {
  const [result] = await db.query(
    `UPDATE kyc SET status = ?, reviewed_at = NOW(), reviewer_id = ?, notes = ? WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1`,
    [status, reviewerId, notes, userId]
  );
  return { updated: result.affectedRows > 0 };
};