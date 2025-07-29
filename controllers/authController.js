// controllers/authController.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Exports a class
const walletModel = require('../models/Wallet'); // Exports an instance

// Helper to normalize SA mobile numbers to 278XXXXXXXX format
function normalizeSAMobileNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  if (cleanNumber.startsWith('27') && cleanNumber.length === 11) {
    return cleanNumber;
  } else if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
    return '27' + cleanNumber.slice(1);
  } else if (cleanNumber.startsWith('27') && cleanNumber.length > 11) {
    // In case someone enters something like 27 82 557 1055
    return cleanNumber.slice(0, 11);
  } else if (cleanNumber.startsWith('8') && cleanNumber.length === 9) {
    // In case someone enters 825571055
    return '27' + cleanNumber;
  }
  return cleanNumber;
}

class AuthController {
  constructor() {}

  // Register a new user
  async register(req, res) {
    try {
      let { email, password, phoneNumber, name } = req.body;
      if (!email || !password || !phoneNumber || !name) {
        return res.status(400).json({ success: false, message: 'Email, password, phoneNumber, and name are required.' });
      }
      phoneNumber = normalizeSAMobileNumber(phoneNumber);

      // Split name into firstName and lastName
      const [firstName, ...rest] = name.trim().split(' ');
      const lastName = rest.join(' ');

      const userModel = new User();
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User with this email already exists' });
      }
      const existingPhone = await userModel.getUserByPhone(phoneNumber);
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'User with this mobile number already exists' });
      }
      // Create user with phoneNumber as both phoneNumber and accountNumber
      const user = await userModel.createUser({ 
        email, 
        password, 
        phoneNumber,
        firstName,
        lastName
      });
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
          email: user.email,
          phone: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`.trim(),
          kycStatus: user.kycStatus || 'pending',
          walletId: user.walletId
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Login user with phone number only
  async login(req, res) {
    try {
      let { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Mobile number and password are required.' });
      }
      identifier = normalizeSAMobileNumber(identifier);
      const userModel = new User();
      const user = await userModel.getUserByPhone(identifier);
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
          email: user.email,
          phone: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`.trim(),
          walletId: user.walletId,
          kycStatus: user.kycStatus || 'pending'
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

  // Verify JWT token
  async verify(req, res) {
    try {
      // The authMiddleware has already verified the token and set req.user
      const userId = req.user.id;
      const userModel = new User();
      const user = await userModel.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Token is valid',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`.trim(),
          walletId: user.walletId,
          kycStatus: user.kycStatus || 'pending'
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();