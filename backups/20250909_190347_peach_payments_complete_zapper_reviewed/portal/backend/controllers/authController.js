'use strict';

const { PortalUser } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
  constructor() {
    this.jwtSecret = process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || 'your-portal-secret-key';
    this.jwtExpiry = process.env.PORTAL_JWT_EXPIRY || '24h';
  }

  /**
   * Portal Login - Authenticate portal user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find portal user by email
      const portalUser = await PortalUser.findOne({
        where: { email: email.toLowerCase() }
      });

      if (!portalUser) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Check if account is active
      if (!portalUser.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      // Check if account is locked
      if (portalUser.isAccountLocked()) {
        return res.status(403).json({
          success: false,
          error: 'Account is temporarily locked due to too many failed login attempts'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, portalUser.passwordHash);
      
      if (!isPasswordValid) {
        // Increment login attempts
        await portalUser.incrementLoginAttempts();
        
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Reset login attempts on successful login
      await portalUser.resetLoginAttempts();

      // Generate JWT token
      const token = jwt.sign(
        {
          portalUserId: portalUser.id,
          entityId: portalUser.entityId,
          entityType: portalUser.entityType,
          role: portalUser.role,
          email: portalUser.email
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );

      // Update last login time
      await portalUser.update({ lastLoginAt: new Date() });

      // Return user data (without sensitive information)
      const userData = {
        id: portalUser.id,
        entityId: portalUser.entityId,
        entityName: portalUser.entityName,
        entityType: portalUser.entityType,
        email: portalUser.email,
        role: portalUser.role,
        hasDualRole: portalUser.hasDualRole,
        dualRoles: portalUser.dualRoles,
        isVerified: portalUser.isVerified,
        lastLoginAt: portalUser.lastLoginAt
      };

      res.json({
        success: true,
        data: {
          token,
          user: userData
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Portal Logout - Invalidate session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // In a real implementation, you might want to:
      // 1. Add token to a blacklist
      // 2. Update last logout time
      // 3. Log the logout event
      
      res.json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Verify Token - Validate JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyToken(req, res) {
    try {
      const authHeader = req.header('Authorization');
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : null;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, this.jwtSecret);

      // Get current user data
      const portalUser = await PortalUser.findByPk(decoded.portalUserId, {
        attributes: [
          'id',
          'entityId',
          'entityName',
          'entityType',
          'email',
          'role',
          'hasDualRole',
          'dualRoles',
          'isActive',
          'isVerified',
          'lastLoginAt'
        ]
      });

      if (!portalUser || !portalUser.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      res.json({
        success: true,
        data: {
          user: portalUser
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Refresh Token - Generate new token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refreshToken(req, res) {
    try {
      const authHeader = req.header('Authorization');
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : null;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      // Verify current token (even if expired)
      const decoded = jwt.verify(token, this.jwtSecret, { ignoreExpiration: true });

      // Get current user data
      const portalUser = await PortalUser.findByPk(decoded.portalUserId, {
        attributes: [
          'id',
          'entityId',
          'entityName',
          'entityType',
          'email',
          'role',
          'hasDualRole',
          'dualRoles',
          'isActive'
        ]
      });

      if (!portalUser || !portalUser.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token or user not found'
        });
      }

      // Generate new token
      const newToken = jwt.sign(
        {
          portalUserId: portalUser.id,
          entityId: portalUser.entityId,
          entityType: portalUser.entityType,
          role: portalUser.role,
          email: portalUser.email
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );

      res.json({
        success: true,
        data: {
          token: newToken
        },
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = AuthController;
