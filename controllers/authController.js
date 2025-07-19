// controllers/authController.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Exports a class
const walletModel = require('../models/Wallet'); // Exports an instance

class AuthController {
  constructor() {}

  // Register a new user
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, phoneNumber } = req.body;
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'Email, password, firstName, and lastName are required.' });
      }
      // Create a User instance to use instance methods
      const userModel = new User();
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User already exists.' });
      }
      // Create user and wallet
      const user = await userModel.createUser({ email, password, firstName, lastName, phoneNumber });
      // Wallet is created as part of createUser, but you can double-check or handle errors here if needed
      return res.status(201).json({ success: true, message: 'User registered successfully.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Login user with multi-input support
  async login(req, res) {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Identifier and password are required.' });
      }
      
      const userModel = new User();
      let user = null;
      
      // Try to find user by email first
      user = await userModel.getUserByEmail(identifier);
      
      // If not found by email, try by phone number
      if (!user) {
        user = await userModel.getUserByPhone(identifier);
      }
      
      // If still not found, try by username
      if (!user) {
        user = await userModel.getUserByUsername(identifier);
      }
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      return res.status(200).json({ 
        success: true, 
        token,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          phoneNumber: user.phone_number,
          walletId: user.wallet_id,
          kycStatus: user.kyc_status || 'pending',
          email: user.email,
          phone: user.phone_number
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get user profile (requires authentication middleware)
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const userModel = new User();
      const user = await userModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();