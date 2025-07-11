const User = require('../models/User');
const Wallet = require('../models/Wallet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');

class AuthController {
  constructor() {
    this.userModel = new User();
    this.walletModel = new Wallet();
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize the users table
      await this.userModel.createTable();
      // Initialize the wallets table
      await this.walletModel.createTable();
      console.log('✅ Auth system initialized');
    } catch (error) {
      console.error('❌ Error initializing auth system:', error);
    }
  }

  // Validation middleware for registration
  validateRegistration() {
    return [
      body('firstName').notEmpty().withMessage('First name is required'),
      body('lastName').notEmpty().withMessage('Last name is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number is required')
    ];
  }

  // Validation middleware for login
  validateLogin() {
    return [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').notEmpty().withMessage('Password is required')
    ];
  }

  // Register a new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { firstName, lastName, email, password, phoneNumber } = req.body;

      // Check if user already exists
      const existingUser = await this.userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user (this also creates the wallet)
      const newUser = await this.userModel.createUser({
        firstName,
        lastName,
        email,
        password,
        phoneNumber
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: newUser.id,
          email: newUser.email,
          walletId: newUser.walletId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            walletId: newUser.walletId,
            balance: newUser.balance
          },
          token
        }
      });

    } catch (error) {
      console.error('❌ Error registering user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await this.userModel.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password using bcrypt directly
      const isValidPassword = bcrypt.compareSync(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Get walletId from wallets table
      let walletId = null;
      if (this.walletModel && user.id) {
        const wallet = await this.walletModel.getWalletByUserId(user.id);
        if (wallet) walletId = wallet.walletId;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          walletId: walletId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            walletId: walletId,
            balance: user.balance
          },
          token
        }
      });

    } catch (error) {
      console.error('❌ Error logging in:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get user profile (protected route)
  async profile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await this.userModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      // Get walletId from wallets table
      let walletId = null;
      if (this.walletModel && user.id) {
        const wallet = await this.walletModel.getWalletByUserId(user.id);
        if (wallet) walletId = wallet.walletId;
      }
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            walletId: walletId,
            balance: user.balance
          }
        }
      });
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await this.userModel.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await this.userModel.updateResetToken(user.id, resetToken, resetTokenExpiry);

      // In a real application, you would send this via email
      res.json({
        success: true,
        message: 'Password reset token sent to email',
        data: {
          resetToken: resetToken // Remove this in production
        }
      });

    } catch (error) {
      console.error('❌ Error in forgot password:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { resetToken, newPassword } = req.body;

      const user = await this.userModel.getUserByResetToken(resetToken);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Check if token is expired
      if (new Date() > new Date(user.resetTokenExpiry)) {
        return res.status(400).json({
          success: false,
          message: 'Reset token has expired'
        });
      }

      // Update password
      await this.userModel.updatePassword(user.id, newPassword);
      
      // Clear reset token
      await this.userModel.clearResetToken(user.id);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('❌ Error in reset password:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = AuthController;