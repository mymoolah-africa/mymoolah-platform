// controllers/authController.js

const { User, Wallet } = require('../models'); // Use Sequelize models
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Use canonical MSISDN utilities
const { normalizeToE164, maskMsisdn } = require('../utils/msisdn');

class AuthController {
  constructor() {}

  // Register a new user
  async register(req, res) {
    try {
      let { name, email, phoneNumber, password, idNumber, idType } = req.body;
      
      // Require ID details at registration for OCR comparison later
      if (!name || !email || !phoneNumber || !password || !idNumber || !idType) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, mobile number, password, ID number and ID type are required.' 
        });
      }
      // Normalize to canonical E.164
      phoneNumber = normalizeToE164(phoneNumber);

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
      
      // Check for existing user by ID number
      const existingId = await User.findOne({ where: { idNumber } });
      if (existingId) {
        return res.status(409).json({ success: false, message: 'User with this ID number already exists' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Account number policy: mirror the canonical MSISDN (E.164)
      const accountNumber = phoneNumber; // Single internal source of truth
      
      // Create user
      const user = await User.create({ 
        email, 
        password_hash: passwordHash, 
        phoneNumber,
        firstName,
        lastName,
        idNumber,
        idType,
        idVerified: false,
        accountNumber,
        balance: 0.00,
        status: 'active',
        kycStatus: 'not_started'
      });
      
      // Create wallet for user
      const wallet = await Wallet.create({
        userId: user.id,
        // De-PII walletId (do not expose phone numbers)
        walletId: `WAL-${user.id}`,
        balance: 0.00,
        currency: 'ZAR',
        status: 'active',
        kycVerified: false,
        dailyLimit: 100000.00,
        monthlyLimit: 1000000.00,
        dailySpent: 0.00,
        monthlySpent: 0.00
      });
      
      // Phase 5: Process referral code if provided (non-blocking)
      const { referralCode } = req.body;
      if (referralCode) {
        setImmediate(async () => {
          try {
            const referralService = require('../services/referralService');
            await referralService.processSignup(referralCode, user.id);
            console.log(`✅ Referral signup processed: ${referralCode} → User ${user.id}`);
          } catch (refError) {
            console.error('⚠️ Referral signup processing failed:', refError.message);
            // Don't fail registration if referral processing fails
          }
        });
      }
      
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
          idNumber: user.idNumber,
          idType: user.idType,
          idVerified: user.idVerified,
          kycStatus: user.kycStatus,
          walletId: wallet.walletId,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Change password for authenticated user
  async changePassword(req, res) {
    try {
      const userId = req.user && req.user.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { currentPassword, newPassword, confirmNewPassword } = req.body || {};
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'All password fields are required' });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
      }

      // Same strength rule used on registration
      const strength = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strength.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and contain a letter, a number, and a special character' });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
      if (sameAsOld) {
        return res.status(400).json({ success: false, message: 'New password must be different from current password' });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await user.update({ password_hash: newHash });

      return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('❌ Change password error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
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
      
      const originalIdentifier = identifier;
      
      // Normalize to E.164 format
      try {
        identifier = normalizeToE164(identifier);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mobile number format. Use 082XXXXXXXX or +27XXXXXXXXX'
        });
      }
      
      // DEBUG: Log normalized phone number for troubleshooting
      console.log(`🔍 [LOGIN] Original: ${maskMsisdn(originalIdentifier)}, Normalized: ${maskMsisdn(identifier)}`);
      
      // Search by E.164 phoneNumber (all users now have E.164 format after migration)
      const user = await User.findOne({ 
        where: { 
          phoneNumber: identifier
        },
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status']
        }]
      });
      
      if (!user) {
        console.log(`❌ [LOGIN] User not found for any phone format. Searched: ${uniqueFormats.join(', ')} (original: ${originalIdentifier})`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid mobile number or password.' 
        });
      }
      
      console.log(`✅ [LOGIN] User found: ${user.id}, phoneNumber in DB: ${user.phoneNumber} (matched format)`);
      
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
          balance: user.wallet?.balance || 0,
          createdAt: user.createdAt
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
          balance: user.wallet?.balance || 0,
          createdAt: user.createdAt
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

  // Refresh token
  async refreshToken(req, res) {
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
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      // Generate new token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Token refreshed successfully',
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
          balance: user.wallet?.balance || 0,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

// Create instance and export methods
const authController = new AuthController();

module.exports = {
  register: authController.register.bind(authController),
  login: authController.login.bind(authController),
  getProfile: authController.getProfile.bind(authController),
  verify: authController.verify.bind(authController),
  refreshToken: authController.refreshToken.bind(authController),
  changePassword: authController.changePassword.bind(authController)
};