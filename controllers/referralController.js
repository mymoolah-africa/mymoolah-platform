/**
 * Referral Controller - MyMoolah Treasury Platform
 * 
 * Handles all referral-related API endpoints
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

const referralService = require('../services/referralService');
const referralEarningsService = require('../services/referralEarningsService');
const referralPayoutService = require('../services/referralPayoutService');
const { User } = require('../models');

class ReferralController {
  /**
   * Get combined referral dashboard data
   * GET /api/v1/referrals/dashboard
   */
  async getDashboard(req, res) {
    try {
      const userId = req.user.id;

      const [code, stats, pending, earnings] = await Promise.all([
        referralService.generateReferralCode(userId),
        referralService.getUserStats(userId),
        referralPayoutService.getPendingEarnings(userId),
        referralEarningsService.getMonthEarnings(userId)
      ]);

      const recentEarnings = earnings.earnings.slice(0, 10).map(e => ({
        id: e.id,
        amount: e.earnedAmountCents / 100,
        level: e.level,
        transactionType: e.transactionType,
        createdAt: e.createdAt,
        status: e.status
      }));

      res.json({
        success: true,
        referralCode: code,
        shareUrl: `https://wallet.mymoolah.africa/register?ref=${code}`,
        stats: {
          totalReferrals: stats.totalReferrals || 0,
          activeReferrals: stats.activeReferrals || 0,
          pendingReferrals: (stats.totalReferrals || 0) - (stats.activeReferrals || 0),
          totalEarnings: (stats.totalEarnedCents || 0) / 100,
          monthlyEarnings: (stats.monthEarnedCents || 0) / 100,
          pendingEarnings: pending.totalRand,
          referralsByLevel: {
            level1: stats.level1Count || 0,
            level2: stats.level2Count || 0,
            level3: stats.level3Count || 0
          }
        },
        recentEarnings
      });
    } catch (error) {
      console.error('[referral] dashboard error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to load referral dashboard'
      });
    }
  }

  /**
   * Get user's referral code
   * GET /api/v1/referrals/my-code
   */
  async getMyReferralCode(req, res) {
    try {
      const userId = req.user.id;
      const code = await referralService.generateReferralCode(userId);

      res.json({
        success: true,
        referralCode: code,
        signupUrl: `https://wallet.mymoolah.africa/register?ref=${code}`
      });
    } catch (error) {
      console.error('[referral] code error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral code'
      });
    }
  }

  /**
   * Send referral invitation via SMS
   * POST /api/v1/referrals/send-invite
   * POST /api/v1/referrals/invite
   * 
   * Validations (disabled in UAT via REFERRAL_SKIP_VALIDATION=true):
   * - Cannot refer yourself
   * - Cannot refer existing MyMoolah users
   */
  async sendInvite(req, res) {
    try {
      let { phoneNumber, language = 'en' } = req.body;
      const userId = req.user.id;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          errorCode: 'PHONE_REQUIRED',
          title: 'Phone Number Required',
          message: 'Please enter the phone number you want to invite.'
        });
      }
      
      // Normalize phone number to E.164 format
      phoneNumber = this.normalizePhoneNumber(phoneNumber);
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_PHONE',
          title: 'Invalid Phone Number',
          message: 'Please enter a valid South African mobile number, for example 082 123 4567.'
        });
      }
      
      // Skip validation in UAT/Codespaces for testing between existing users
      // Set REFERRAL_SKIP_VALIDATION=true in .env to disable these checks
      const skipValidation = process.env.REFERRAL_SKIP_VALIDATION === 'true';
      
      if (!skipValidation) {
        // Get current user to check self-referral
        const currentUser = await User.findByPk(userId);
        if (!currentUser) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }
        
        // Check if trying to refer yourself
        const currentUserPhone = this.normalizePhoneNumber(currentUser.phoneNumber);
        if (currentUserPhone === phoneNumber) {
          return res.status(400).json({
            success: false,
            errorCode: 'SELF_REFERRAL',
            error: 'You cannot send a referral invite to yourself',
            title: 'Self-Referral Not Allowed',
            message: 'You cannot refer yourself. Please enter a different phone number to invite a friend or family member.'
          });
        }
        
        // Check if phone number belongs to existing user
        const existingUser = await User.findOne({
          where: { phoneNumber: phoneNumber }
        });
        
        // Also check without + prefix in case stored differently
        const phoneWithout27 = phoneNumber.replace('+27', '0');
        const existingUserAlt = !existingUser ? await User.findOne({
          where: { phoneNumber: phoneWithout27 }
        }) : null;
        
        if (existingUser || existingUserAlt) {
          return res.status(400).json({
            success: false,
            errorCode: 'USER_EXISTS',
            error: 'This phone number is already registered with MyMoolah',
            title: 'User Already Registered',
            message: `This number is already an active MyMoolah user. They can start using the app right away! If they haven't signed up yet, ask them to check their messages.`
          });
        }
      } else {
        console.log('⚠️ Referral validation SKIPPED (REFERRAL_SKIP_VALIDATION=true)');
      }
      
      const result = await referralService.sendReferralInvite(userId, phoneNumber, language);
      
      res.json({
        success: true,
        ...result,
        title: 'Invite Sent',
        message: 'Your referral SMS was sent successfully.'
      });
    } catch (error) {
      console.error('[ReferralController] Error sending referral invite', {
        errorType: error.constructor?.name,
        errorCode: error.code,
        userId: req.user?.id
      });

      const errorMap = {
        REFERRAL_ALREADY_SENT: {
          status: 409,
          title: 'Invite Already Sent',
          message: 'You have already sent a referral invite to this number. Please try another number.'
        },
        SMS_SERVICE_NOT_CONFIGURED: {
          status: 503,
          title: 'SMS Temporarily Unavailable',
          message: 'We could not send the SMS right now. Please try again later.'
        },
        SMS_SEND_FAILED: {
          status: 502,
          title: 'SMS Could Not Be Sent',
          message: 'The SMS provider could not send the invite right now. Please try again later.'
        }
      };
      const mapped = errorMap[error.code] || {
        status: 400,
        title: 'Invite Not Sent',
        message: 'Referral invite could not be sent. Please try again.'
      };

      res.status(error.statusCode || mapped.status).json({
        success: false,
        error: mapped.message,
        errorCode: error.code || 'REFERRAL_INVITE_FAILED',
        title: mapped.title,
        message: mapped.message
      });
    }
  }

  /**
   * Normalize phone number to E.164 format (+27...)
   * Handles: 0821234567, 27821234567, +27821234567
   * @param {string} phone - Input phone number
   * @returns {string|null} Normalized phone number or null if invalid
   */
  normalizePhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('+27')) {
      // Already E.164
      return cleaned;
    } else if (cleaned.startsWith('27') && cleaned.length >= 11) {
      // Missing + prefix
      return '+' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      // South African local format (0821234567)
      return '+27' + cleaned.substring(1);
    } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      // Just the number without leading 0 (821234567)
      return '+27' + cleaned;
    }
    
    // Invalid format
    return null;
  }

  /**
   * Get user's referral statistics
   * GET /api/v1/referrals/stats
   */
  async getMyStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await referralService.getUserStats(userId);
      
      // Get pending earnings
      const pending = await referralPayoutService.getPendingEarnings(userId);
      
      res.json({
        success: true,
        stats: {
          totalReferrals: stats.totalReferrals || 0,
          activeReferrals: stats.activeReferrals || 0,
          totalEarnedCents: stats.totalEarnedCents || 0,
          totalEarnedRand: (stats.totalEarnedCents || 0) / 100,
          totalPaidCents: stats.totalPaidCents || 0,
          totalPaidRand: (stats.totalPaidCents || 0) / 100,
          pendingCents: pending.totalCents,
          pendingRand: pending.totalRand,
          level1Count: stats.level1Count || 0,
          level2Count: stats.level2Count || 0,
          level3Count: stats.level3Count || 0,
          monthEarnedCents: stats.monthEarnedCents || 0,
          monthEarnedRand: (stats.monthEarnedCents || 0) / 100
        }
      });
    } catch (error) {
      console.error('[referral] stats error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral stats'
      });
    }
  }

  /**
   * Get user's referral earnings (current month)
   * GET /api/v1/referrals/earnings
   */
  async getMyEarnings(req, res) {
    try {
      const userId = req.user.id;
      const earnings = await referralEarningsService.getMonthEarnings(userId);
      
      res.json({
        success: true,
        monthYear: earnings.monthYear,
        earnings: earnings.earnings.map(e => ({
          id: e.id,
          level: e.level,
          percentage: e.percentage,
          earnedAmountCents: e.earnedAmountCents,
          earnedAmountRand: e.earnedAmountCents / 100,
          transactionType: e.transactionType,
          capped: e.capped,
          createdAt: e.createdAt,
          status: e.status
        })),
        totalCents: earnings.totalCents,
        totalRand: earnings.totalCents / 100,
        count: earnings.count
      });
    } catch (error) {
      console.error('[referral] earnings error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral earnings'
      });
    }
  }

  /**
   * Get user's referral network (all levels)
   * GET /api/v1/referrals/network
   */
  async getMyNetwork(req, res) {
    try {
      const userId = req.user.id;
      const network = await referralService.getUserNetwork(userId);
      
      res.json({
        success: true,
        directReferrals: network.direct.map(r => ({
          id: r.id,
          referralCode: r.referralCode,
          status: r.status,
          signedUpAt: r.signedUpAt,
          activatedAt: r.activatedAt,
          referee: r.referee ? {
            id: r.referee.id,
            firstName: r.referee.firstName,
            lastName: r.referee.lastName,
            createdAt: r.referee.createdAt
          } : null
        })),
        stats: {
          totalReferrals: network.stats.totalReferrals || 0,
          activeReferrals: network.stats.activeReferrals || 0,
          level1Count: network.stats.level1Count || 0,
          level2Count: network.stats.level2Count || 0,
          level3Count: network.stats.level3Count || 0
        }
      });
    } catch (error) {
      console.error('[referral] network error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral network'
      });
    }
  }

  /**
   * Get pending earnings summary
   * GET /api/v1/referrals/pending
   */
  async getPendingEarnings(req, res) {
    try {
      const userId = req.user.id;
      const pending = await referralPayoutService.getPendingEarnings(userId);
      
      res.json({
        success: true,
        count: pending.count,
        totalCents: pending.totalCents,
        totalRand: pending.totalRand,
        earnings: pending.earnings.map(e => ({
          id: e.id,
          level: e.level,
          earnedAmountCents: e.earnedAmountCents,
          earnedAmountRand: e.earnedAmountCents / 100,
          transactionType: e.transactionType,
          createdAt: e.createdAt
        }))
      });
    } catch (error) {
      console.error('[referral] pending error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending earnings'
      });
    }
  }
}

module.exports = new ReferralController();

