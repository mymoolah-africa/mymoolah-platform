// models/userModel.js
const db = require('../config/db');

// Find user by email or mobile
exports.findUserByEmailOrMobile = async (email, mobile) => {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE email = ? OR mobile = ? LIMIT 1',
    [email, mobile]
  );
  return rows[0] || null;
};

// Assign a role to a user
exports.assignRoleToUser = async (userId, roleId) => {
  const [result] = await db.query(
    'INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, NOW())',
    [userId, roleId]
  );
  return { user_id: userId, role_id: roleId, assigned_at: new Date().toISOString() };
};

// Get all roles for a user
exports.getUserRoles = async (userId) => {
  const [rows] = await db.query(
    `SELECT r.role_id, r.name, r.description
     FROM roles r
     JOIN user_roles ur ON ur.role_id = r.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return rows;
};

// Create a notification (for OTP, info, etc.)
exports.createNotification = async (userId, type, message) => {
  const [result] = await db.query(
    'INSERT INTO notifications (user_id, type, message, status, created_at) VALUES (?, ?, ?, ?, NOW())',
    [userId, type, message, 'sent']
  );
  return {
    notification_id: result.insertId,
    user_id: userId,
    type,
    message,
    status: 'sent',
    created_at: new Date().toISOString(),
    read_at: null
  };
};