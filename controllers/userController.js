const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  // Extract and validate input, call userModel, handle errors, return response
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    // Find user by email
    const user = await userModel.findUserByEmailOrMobile(email, null);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Assign a role to a user
exports.assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const result = await userModel.assignRoleToUser(userId, roleId);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign role' });
  }
};

// Get all roles for a user
exports.getUserRoles = async (req, res) => {
  try {
    const userId = req.params.userId;
    const roles = await userModel.getUserRoles(userId);
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get user roles' });
  }
};

// Create a notification (for OTP, info, etc.)
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, message } = req.body;
    const result = await userModel.createNotification(userId, type, message);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
}; 