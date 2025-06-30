const db = require('../config/db');

exports.createNotification = async (userId, type, message) => {
  const [result] = await db.query(
    `INSERT INTO notifications (user_id, type, message, \`read\`, created_at)
     VALUES (?, ?, ?, 0, NOW())`,
    [userId, type, message]
  );
  return { notification_id: result.insertId };
};

exports.listNotifications = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, type, message, \`read\`, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
};

exports.markAsRead = async (notificationId) => {
  const [result] = await db.query(
    `UPDATE notifications SET \`read\` = 1, read_at = NOW() WHERE id = ?`,
    [notificationId]
  );
  return { updated: result.affectedRows > 0 };
};