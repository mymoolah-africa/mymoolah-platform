const userModel = require('../models/User');
const walletModel = require('../models/walletModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult, body } = require('express-validator');

class AuthController {
  constructor() {
    this.userModel = userModel;
    this.initialize();
  }

  initialize() {
    console.log('✅ Auth system initialized');
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

      const { email, password, firstName, lastName, phoneNumber } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, firstName, and lastName are required'
        });
      }

      // Check if user already exists
      const existingUser = await this.userModel.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Create user
      const user = await this.userModel.createUser({
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      });

      // Create wallet for user
      const wallet = await walletModel.createWallet(user.id, user.walletId);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            walletId: user.walletId,
            balance: 0.00 // Wallet starts with 0 balance
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

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email
      const user = await this.userModel.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await this.userModel.validatePassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          walletId: user.walletId
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
            walletId: user.walletId,
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

  // Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Find user by email
      const user = await this.userModel.findUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token in user record
      await this.userModel.updateResetToken(user.id, resetToken, resetTokenExpiry);

      // In a real application, you would send an email here
      // For now, we'll return the token for testing purposes
      res.json({
        success: true,
        message: 'Password reset link sent successfully',
        data: {
          resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
          expiresAt: resetTokenExpiry
        }
      });

    } catch (error) {
      console.error('❌ Error requesting password reset:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Validate reset token
  async validateResetToken(req, res) {
    try {
      const { resetToken } = req.body;

      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: 'Reset token is required'
        });
      }

      // Find user by reset token
      const user = await this.userModel.findUserByResetToken(resetToken);
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

      res.json({
        success: true,
        message: 'Reset token is valid',
        data: {
          email: user.email
        }
      });

    } catch (error) {
      console.error('❌ Error validating reset token:', error);
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

      if (!resetToken || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Reset token and new password are required'
        });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Find user by reset token
      const user = await this.userModel.findUserByResetToken(resetToken);
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

      // Update password and clear reset token
      await this.userModel.updatePassword(user.id, newPassword);
      await this.userModel.clearResetToken(user.id);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('❌ Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Change password (for authenticated users)
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Get user
      const user = await this.userModel.findUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await this.userModel.validatePassword(user, currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      await this.userModel.updatePassword(userId, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('❌ Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Logout (optional - for session management)
  async logout(req, res) {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return a success message
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('❌ Error logging out:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get user profile (protected route)
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await this.userModel.findUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            walletId: user.walletId,
            balance: user.balance
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = AuthController;