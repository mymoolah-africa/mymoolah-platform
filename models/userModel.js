// models/userModel.js

exports.findUserByEmailOrMobile = async (email, mobile) => {
  // Fake user for testing
  if (email === 'test@example.com') {
    return { id: 1, email: 'test@example.com', name: 'Test User', password: '$2a$10$...' }; // bcrypt hash
  }
  return null;
};

exports.assignRoleToUser = async (userId, roleId) => {
  return { user_id: userId, role_id: roleId, assigned_at: new Date().toISOString() };
};

exports.getUserRoles = async (userId) => {
  return [{ role_id: 1, name: 'user', description: 'Standard user' }];
};

exports.createNotification = async (userId, type, message) => {
  return {
    notification_id: Math.floor(Math.random() * 10000),
    user_id: userId,
    type,
    message,
    status: 'sent',
    created_at: new Date().toISOString(),
    read_at: null
  };
};