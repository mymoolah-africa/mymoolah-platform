/**
 * OTP Service - MyMoolah Treasury Platform
 * 
 * Banking-grade OTP generation, storage, and verification
 * Supports password reset and phone number change flows
 * 
 * Features:
 * - 6-digit OTP generation (cryptographically secure)
 * - Bcrypt hashing for secure storage
 * - 10-minute expiry
 * - One-time use (marked as verified after use)
 * - Rate limiting (max 3 OTPs per phone per hour)
 * - Audit trail (IP, user agent, timestamps)
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-30
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;
const MAX_OTPS_PER_WINDOW = 3;
const BCRYPT_ROUNDS = 10;

class OtpService {
  constructor() {
    // Lazy load models to avoid circular dependencies
    this._OtpVerification = null;
    this._User = null;
  }

  /**
   * Get OtpVerification model (lazy load)
   */
  get OtpVerification() {
    if (!this._OtpVerification) {
      const { OtpVerification } = require('../models');
      this._OtpVerification = OtpVerification;
    }
    return this._OtpVerification;
  }

  /**
   * Get User model (lazy load)
   */
  get User() {
    if (!this._User) {
      const { User } = require('../models');
      this._User = User;
    }
    return this._User;
  }

  /**
   * Generate a cryptographically secure 6-digit OTP
   * @returns {string} 6-digit OTP
   */
  generateOtp() {
    // Use crypto.randomInt for secure random number generation
    const min = Math.pow(10, OTP_LENGTH - 1); // 100000
    const max = Math.pow(10, OTP_LENGTH) - 1;  // 999999
    const otp = crypto.randomInt(min, max + 1);
    return otp.toString();
  }

  /**
   * Hash OTP using bcrypt for secure storage
   * @param {string} otp - Plaintext OTP
   * @returns {Promise<string>} Hashed OTP
   */
  async hashOtp(otp) {
    return await bcrypt.hash(otp, BCRYPT_ROUNDS);
  }

  /**
   * Verify OTP against stored hash
   * @param {string} otp - Plaintext OTP to verify
   * @param {string} hash - Stored hash
   * @returns {Promise<boolean>} True if match
   */
  async verifyOtpHash(otp, hash) {
    return await bcrypt.compare(otp, hash);
  }

  /**
   * Check rate limit for OTP requests
   * @param {string} phoneNumber - Phone number to check
   * @param {string} type - OTP type
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
   */
  async checkRateLimit(phoneNumber, type) {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

    const count = await this.OtpVerification.count({
      where: {
        phoneNumber,
        type,
        createdAt: { [Op.gte]: windowStart }
      }
    });

    const resetAt = new Date(windowStart);
    resetAt.setHours(resetAt.getHours() + RATE_LIMIT_WINDOW_HOURS);

    return {
      allowed: count < MAX_OTPS_PER_WINDOW,
      remaining: Math.max(0, MAX_OTPS_PER_WINDOW - count),
      resetAt
    };
  }

  /**
   * Create and store a new OTP
   * @param {object} params - OTP parameters
   * @param {number} [params.userId] - User ID (optional for password reset)
   * @param {string} params.phoneNumber - Phone number (E.164 format)
   * @param {string} params.type - OTP type: 'password_reset', 'phone_change', 'login_verification'
   * @param {string} [params.ipAddress] - IP address (for audit)
   * @param {string} [params.userAgent] - User agent (for audit)
   * @param {object} [params.metadata] - Additional metadata
   * @returns {Promise<{success: boolean, otp?: string, expiresAt?: Date, error?: string}>}
   */
  async createOtp({ userId, phoneNumber, type, ipAddress, userAgent, metadata }) {
    try {
      // Check rate limit
      const rateLimit = await this.checkRateLimit(phoneNumber, type);
      if (!rateLimit.allowed) {
        console.log(`⚠️ OTP rate limit exceeded for ${phoneNumber} (${type})`);
        return {
          success: false,
          error: 'Too many OTP requests. Please try again later.',
          resetAt: rateLimit.resetAt
        };
      }

      // Invalidate any existing unused OTPs for this phone + type
      await this.invalidateExistingOtps(phoneNumber, type);

      // Generate and hash OTP
      const otp = this.generateOtp();
      const otpHash = await this.hashOtp(otp);

      // Calculate expiry (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

      // Store OTP
      await this.OtpVerification.create({
        userId,
        phoneNumber,
        otpHash,
        type,
        expiresAt,
        ipAddress,
        userAgent,
        metadata: metadata || null
      });

      console.log(`✅ OTP created for ${phoneNumber} (${type}), expires at ${expiresAt.toISOString()}`);

      return {
        success: true,
        otp, // Return plaintext OTP to send via SMS
        expiresAt,
        expiresInMinutes: OTP_EXPIRY_MINUTES
      };
    } catch (error) {
      console.error('❌ Error creating OTP:', error.message);
      return {
        success: false,
        error: 'Failed to create OTP. Please try again.'
      };
    }
  }

  /**
   * Invalidate existing unused OTPs for a phone + type combination
   * @param {string} phoneNumber - Phone number
   * @param {string} type - OTP type
   */
  async invalidateExistingOtps(phoneNumber, type) {
    const updated = await this.OtpVerification.update(
      { verified: true, verifiedAt: new Date() },
      {
        where: {
          phoneNumber,
          type,
          verified: false,
          expiresAt: { [Op.gt]: new Date() } // Only invalidate non-expired ones
        }
      }
    );

    if (updated[0] > 0) {
      console.log(`🗑️ Invalidated ${updated[0]} existing OTP(s) for ${phoneNumber} (${type})`);
    }
  }

  /**
   * Verify an OTP
   * @param {object} params - Verification parameters
   * @param {string} params.phoneNumber - Phone number
   * @param {string} params.type - OTP type
   * @param {string} params.otp - OTP to verify
   * @returns {Promise<{success: boolean, userId?: number, metadata?: object, error?: string}>}
   */
  async verifyOtp({ phoneNumber, type, otp }) {
    try {
      // Find the most recent unexpired, unverified OTP for this phone + type
      const otpRecord = await this.OtpVerification.findOne({
        where: {
          phoneNumber,
          type,
          verified: false,
          expiresAt: { [Op.gt]: new Date() }
        },
        order: [['createdAt', 'DESC']]
      });

      if (!otpRecord) {
        console.log(`⚠️ No valid OTP found for ${phoneNumber} (${type})`);
        return {
          success: false,
          error: 'Invalid or expired OTP. Please request a new one.'
        };
      }

      // Check if can verify
      const canVerify = otpRecord.canVerify();
      if (!canVerify.canVerify) {
        console.log(`⚠️ OTP cannot be verified: ${canVerify.reason}`);
        return {
          success: false,
          error: canVerify.reason
        };
      }

      // Verify OTP hash
      const isValid = await this.verifyOtpHash(otp, otpRecord.otpHash);

      if (!isValid) {
        // Increment attempts
        await otpRecord.incrementAttempts();
        const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts;
        
        console.log(`⚠️ Invalid OTP for ${phoneNumber}, ${remainingAttempts} attempts remaining`);
        
        if (remainingAttempts <= 0) {
          return {
            success: false,
            error: 'Maximum attempts exceeded. Please request a new OTP.'
          };
        }
        
        return {
          success: false,
          error: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
        };
      }

      // Mark as verified
      await otpRecord.markAsVerified();
      console.log(`✅ OTP verified successfully for ${phoneNumber} (${type})`);

      return {
        success: true,
        userId: otpRecord.userId,
        metadata: otpRecord.metadata
      };
    } catch (error) {
      console.error('❌ Error verifying OTP:', error.message);
      return {
        success: false,
        error: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  /**
   * Cleanup expired OTPs (for cron job)
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupExpiredOtps() {
    try {
      // Delete OTPs that are expired AND either:
      // 1. Already verified, OR
      // 2. Expired more than 24 hours ago (keep recent for audit)
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const deleted = await this.OtpVerification.destroy({
        where: {
          [Op.or]: [
            // Verified OTPs older than 24 hours
            {
              verified: true,
              createdAt: { [Op.lt]: cutoffDate }
            },
            // Expired and unused OTPs older than 24 hours
            {
              expiresAt: { [Op.lt]: cutoffDate }
            }
          ]
        }
      });

      if (deleted > 0) {
        console.log(`🗑️ Cleaned up ${deleted} expired OTP record(s)`);
      }

      return deleted;
    } catch (error) {
      console.error('❌ Error cleaning up expired OTPs:', error.message);
      return 0;
    }
  }

  /**
   * Get OTP statistics for monitoring
   * @returns {Promise<object>} Statistics
   */
  async getStats() {
    const now = new Date();
    const oneHourAgo = new Date(now);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const [totalPending, totalVerified, lastHourCreated, lastHourVerified] = await Promise.all([
      this.OtpVerification.count({
        where: {
          verified: false,
          expiresAt: { [Op.gt]: now }
        }
      }),
      this.OtpVerification.count({
        where: { verified: true }
      }),
      this.OtpVerification.count({
        where: {
          createdAt: { [Op.gte]: oneHourAgo }
        }
      }),
      this.OtpVerification.count({
        where: {
          verified: true,
          verifiedAt: { [Op.gte]: oneHourAgo }
        }
      })
    ]);

    return {
      pendingOtps: totalPending,
      verifiedOtps: totalVerified,
      lastHour: {
        created: lastHourCreated,
        verified: lastHourVerified
      },
      config: {
        expiryMinutes: OTP_EXPIRY_MINUTES,
        maxAttempts: MAX_ATTEMPTS,
        rateLimitPerHour: MAX_OTPS_PER_WINDOW
      }
    };
  }

  /**
   * Create OTP for password reset
   * @param {string} phoneNumber - User's phone number
   * @param {string} [ipAddress] - IP address
   * @param {string} [userAgent] - User agent
   * @returns {Promise<{success: boolean, otp?: string, error?: string}>}
   */
  async createPasswordResetOtp(phoneNumber, ipAddress, userAgent) {
    // Find user by phone number first
    const user = await this.User.findOne({
      where: { phoneNumber }
    });

    if (!user) {
      // Don't reveal if user exists - security best practice
      console.log(`⚠️ Password reset requested for non-existent phone: ${phoneNumber}`);
      // Return success but don't actually send OTP
      return {
        success: true,
        message: 'If an account exists with this phone number, an OTP will be sent.'
      };
    }

    return await this.createOtp({
      userId: user.id,
      phoneNumber,
      type: 'password_reset',
      ipAddress,
      userAgent
    });
  }

  /**
   * Create OTP for phone number change
   * @param {number} userId - User ID
   * @param {string} newPhoneNumber - New phone number to verify
   * @param {string} [ipAddress] - IP address
   * @param {string} [userAgent] - User agent
   * @returns {Promise<{success: boolean, otp?: string, error?: string}>}
   */
  async createPhoneChangeOtp(userId, newPhoneNumber, ipAddress, userAgent) {
    // Check if new phone number is already in use
    const existingUser = await this.User.findOne({
      where: { phoneNumber: newPhoneNumber }
    });

    if (existingUser) {
      return {
        success: false,
        error: 'This phone number is already registered to another account.'
      };
    }

    return await this.createOtp({
      userId,
      phoneNumber: newPhoneNumber,
      type: 'phone_change',
      ipAddress,
      userAgent,
      metadata: { newPhoneNumber }
    });
  }

  /**
   * Verify password reset OTP
   * @param {string} phoneNumber - Phone number
   * @param {string} otp - OTP to verify
   * @returns {Promise<{success: boolean, userId?: number, error?: string}>}
   */
  async verifyPasswordResetOtp(phoneNumber, otp) {
    return await this.verifyOtp({
      phoneNumber,
      type: 'password_reset',
      otp
    });
  }

  /**
   * Verify phone change OTP
   * @param {string} phoneNumber - New phone number
   * @param {string} otp - OTP to verify
   * @returns {Promise<{success: boolean, userId?: number, metadata?: object, error?: string}>}
   */
  async verifyPhoneChangeOtp(phoneNumber, otp) {
    return await this.verifyOtp({
      phoneNumber,
      type: 'phone_change',
      otp
    });
  }
}

// Export singleton instance
module.exports = new OtpService();

