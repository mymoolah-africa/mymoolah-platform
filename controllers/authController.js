// controllers/authController.js

const { User, Wallet } = require('../models'); // Use Sequelize models
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Normalize South African mobile numbers
function normalizeSAMobileNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it already starts with 2727, fix it to just 27
  if (cleaned.startsWith('2727')) {
    cleaned = '27' + cleaned.substring(4);
  }
  
  // If it starts with 0, replace with +27
  if (cleaned.startsWith('0')) {
    cleaned = '+27' + cleaned.substring(1);
  }
  
  // If it starts with 27 and has 11 digits, convert to +27 format
  if (cleaned.startsWith('27') && cleaned.length === 11) {
    cleaned = '+27' + cleaned.substring(2);
  }
  
  // If it still doesn't start with +, add +27
  if (!cleaned.startsWith('+')) {
    cleaned = '+27' + cleaned;
  }
  
  return cleaned;
}

class AuthController {
  constructor() {}

  // Register a new user
  async register(req, res) {
    try {
      let { name, email, phoneNumber, password } = req.body;
      
      if (!name || !email || !phoneNumber || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, mobile number and password are required.' 
        });
      }
      phoneNumber = normalizeSAMobileNumber(phoneNumber);

      // Split name into firstName and lastName
      const [firstName, ...rest] = name.trim().split(' ');
      const lastName = rest.join(' ');

      // Check for existing user by email
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User with this email already exists' });
      }
      
      // Check for existing user by phone number
      const existingPhone = await User.findOne({ where: { phoneNumber } });
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'User with this mobile number already exists' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Generate account number
      const accountNumber = 'ACC' + Date.now().toString().slice(-9);
      
      // Create user
      const user = await User.create({ 
        email, 
        password_hash: passwordHash, 
        phoneNumber,
        firstName,
        lastName,
        accountNumber,
        balance: 0.00,
        status: 'active',
        kycStatus: 'not_started'
      });
      
      // Create wallet for user
      const wallet = await Wallet.create({
        userId: user.id,
        walletId: `WAL-${accountNumber}`,
        balance: 0.00,
        currency: 'ZAR',
        status: 'active',
        kycVerified: false,
        dailyLimit: 100000.00,
        monthlyLimit: 1000000.00,
        dailySpent: 0.00,
        monthlySpent: 0.00
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
          kycStatus: user.kycStatus,
          walletId: wallet.walletId
        }
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Login user with phone number only
  async login(req, res) {
    try {
      let { identifier, password } = req.body;
      
      if (!identifier || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Mobile number and password are required.' 
        });
      }
      
      identifier = normalizeSAMobileNumber(identifier);
      
      // Find user by phone number
      const user = await User.findOne({ 
        where: { phoneNumber: identifier },
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status']
        }]
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid mobile number or password.' 
        });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid mobile number or password.' 
        });
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is not active. Please contact support.' 
        });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        success: true, 
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`.trim(),
          kycStatus: user.kycStatus,
          walletId: user.wallet?.walletId,
          balance: user.wallet?.balance || 0
        }
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId, {
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status']
        }]
      });
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`.trim(),
          kycStatus: user.kycStatus,
          walletId: user.wallet?.walletId,
          balance: user.wallet?.balance || 0
        }
      });
    } catch (error) {
      console.error('❌ Get profile error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Verify token
  async verify(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      
      return res.json({ success: true, message: 'Token is valid' });
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }
}

// Create instance and export methods
const authController = new AuthController();

module.exports = {
  register: authController.register.bind(authController),
  login: authController.login.bind(authController),
  getProfile: authController.getProfile.bind(authController),
  verify: authController.verify.bind(authController)
};