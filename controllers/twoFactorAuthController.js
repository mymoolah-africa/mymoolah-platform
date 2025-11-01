/**
 * 🔐 Two-Factor Authentication (2FA) Controller
 * 
 * Banking-Grade: Optional 2FA management endpoints
 * Users can enable/disable 2FA at their discretion
 */

const { User } = require('../models');
const twoFactorAuthService = require('../services/twoFactorAuthService');
const securityMonitoringService = require('../services/securityMonitoringService');

class TwoFactorAuthController {
  /**
   * Generate 2FA secret and QR code for setup
   * POST /api/v1/auth/2fa/setup
   */
  async setup(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // If 2FA is already enabled, return error
      if (user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled for this account'
        });
      }

      // Generate new secret
      const secretData = twoFactorAuthService.generateSecret(user.email);

      // Generate QR code
      const qrCodeDataUrl = await twoFactorAuthService.generateQRCode(secretData.qrCodeUrl);

      // Store secret temporarily (user needs to verify before enabling)
      // In production, you might want to store this in a temporary session/redis
      // For now, we'll return it but require verification before enabling

      return res.json({
        success: true,
        message: '2FA setup initiated. Please scan the QR code and verify with a token.',
        secret: secretData.secret,
        qrCodeUrl: qrCodeDataUrl,
        manualEntryKey: secretData.manualEntryKey,
        // Note: Secret is NOT saved yet - user must verify first
        verifyRequired: true
      });
    } catch (error) {
      console.error('❌ 2FA setup error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to setup 2FA'
      });
    }
  }

  /**
   * Verify and enable 2FA
   * POST /api/v1/auth/2fa/verify-and-enable
   */
  async verifyAndEnable(req, res) {
    try {
      const userId = req.user.id;
      const { token, secret } = req.body;

      if (!token || !secret) {
        return res.status(400).json({
          success: false,
          message: 'Token and secret are required'
        });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify token
      const isValid = twoFactorAuthService.verifyToken(token, secret);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token. Please try again.'
        });
      }

      // Generate backup codes
      const backupCodes = twoFactorAuthService.generateBackupCodes(10);

      // Enable 2FA
      await user.update({
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        twoFactorEnabledAt: new Date()
      });

      // Log security event
      await securityMonitoringService.logSecurityEvent({
        type: '2fa_enabled',
        severity: 'low',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          message: 'User enabled 2FA'
        }
      });

      return res.json({
        success: true,
        message: '2FA enabled successfully',
        backupCodes: backupCodes, // Show once - user should save these
        warning: 'Save these backup codes in a secure location. They will not be shown again.'
      });
    } catch (error) {
      console.error('❌ 2FA enable error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to enable 2FA'
      });
    }
  }

  /**
   * Disable 2FA
   * POST /api/v1/auth/2fa/disable
   */
  async disable(req, res) {
    try {
      const userId = req.user.id;
      const { password, token } = req.body; // Require password and 2FA token for security

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to disable 2FA'
        });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled for this account'
        });
      }

      // Verify password
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // If 2FA is enabled, require token or backup code
      if (user.twoFactorEnabled) {
        if (!token) {
          return res.status(400).json({
            success: false,
            message: '2FA token or backup code is required to disable 2FA'
          });
        }

        const isValidToken = user.verify2FAToken(token);
        const isValidBackupCode = user.verifyBackupCode(token);

        if (!isValidToken && !isValidBackupCode) {
          return res.status(401).json({
            success: false,
            message: 'Invalid 2FA token or backup code'
          });
        }

        // If backup code was used, remove it
        if (isValidBackupCode) {
          await user.removeBackupCode(token);
        }
      }

      // Disable 2FA
      await user.update({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorEnabledAt: null
      });

      // Log security event
      await securityMonitoringService.logSecurityEvent({
        type: '2fa_disabled',
        severity: 'medium',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          message: 'User disabled 2FA'
        }
      });

      return res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      console.error('❌ 2FA disable error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA'
      });
    }
  }

  /**
   * Get 2FA status
   * GET /api/v1/auth/2fa/status
   */
  async getStatus(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'twoFactorEnabled', 'twoFactorEnabledAt']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.json({
        success: true,
        twoFactorEnabled: user.twoFactorEnabled || false,
        enabledAt: user.twoFactorEnabledAt || null
      });
    } catch (error) {
      console.error('❌ 2FA status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get 2FA status'
      });
    }
  }

  /**
   * Verify 2FA token (for testing or recovery)
   * POST /api/v1/auth/2fa/verify
   */
  async verify(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled for this account'
        });
      }

      const isValid = user.verify2FAToken(token);
      const isValidBackupCode = user.verifyBackupCode(token);

      return res.json({
        success: isValid || isValidBackupCode,
        valid: isValid || isValidBackupCode,
        message: isValid || isValidBackupCode 
          ? 'Token is valid' 
          : 'Token is invalid'
      });
    } catch (error) {
      console.error('❌ 2FA verify error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify token'
      });
    }
  }
}

module.exports = new TwoFactorAuthController();

