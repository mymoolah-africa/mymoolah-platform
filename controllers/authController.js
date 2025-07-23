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
      const { email, password, name, identifier, identifierType } = req.body;
      if (!email || !password || !name || !identifier || !identifierType) {
        return res.status(400).json({ success: false, message: 'Email, password, name, identifier, and identifierType are required.' });
      }
      
      // Create a User instance to use instance methods
      const userModel = new User();
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User with this email already exists' });
      }
      
      // Check if identifier already exists based on type
      let existingIdentifier = null;
      switch (identifierType) {
        case 'phone':
          existingIdentifier = await userModel.getUserByPhone(identifier);
          break;
        case 'username':
          existingIdentifier = await userModel.getUserByUsername(identifier);
          break;
        case 'account':
          existingIdentifier = await userModel.getUserByAccount(identifier);
          break;
      }
      
      if (existingIdentifier) {
        return res.status(409).json({ success: false, message: `User with this identifier already exists` });
      }
      
      // Create user and wallet with new format
      const user = await userModel.createUser({ 
        email, 
        password, 
        name,
        identifier,
        identifierType
      });
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.status(201).json({ 
        success: true, 
        message: 'User registered successfully.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          kycStatus: user.kycStatus || 'pending',
          walletId: user.walletId
        }
      });
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
          name: `${user.firstName} ${user.lastName}`,
          phoneNumber: user.phoneNumber,
          walletId: user.walletId,
          kycStatus: user.kycStatus || 'pending',
          email: user.email,
          phone: user.phoneNumber
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