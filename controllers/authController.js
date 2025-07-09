const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

class AuthController {
  constructor() {
    this.userModel = new User();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  }

  // Initialize database table
  async initialize() {
    try {
      await this.userModel.createTable();
      console.log('✅ Auth system initialized');
    } catch (error) {
      console.error('❌ Error initializing auth system:', error);
    }
  }

  // Validation rules for registration
  validateRegistration() {
    return [
      body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('firstName').notEmpty().trim().withMessage('First name is required'),
      body('lastName').notEmpty().trim().withMessage('Last name is required'),
      body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number is required')
    ];
  }

  // Validation rules for login
  validateLogin() {
    return [
      body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('password').notEmpty().withMessage('Password is required')
    ];
  }

  // Register new user
  async register(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, firstName, lastName, phoneNumber } = req.body;

      // Check if user already exists
      const existingUser = await this.userModel.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user
      const userData = {
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      };

      const newUser = await this.userModel.createUser(userData);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email,
          walletId: newUser.walletId 
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      // Return success response (without password)
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phoneNumber: newUser.phoneNumber,
            walletId: newUser.walletId,
            balance: newUser.balance
          },
          token
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await this.userModel.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Account is not active'
        });
      }

      // Validate password
      const isValidPassword = await this.userModel.validatePassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          walletId: user.wallet_id 
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phoneNumber: user.phone_number,
            walletId: user.wallet_id,
            balance: user.balance
          },
          token
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Get current user profile
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

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phoneNumber: user.phone_number,
            walletId: user.wallet_id,
            balance: user.balance,
            status: user.status
          }
        }
      });

    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController; 