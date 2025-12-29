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

class ReferralController {
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
        signupUrl: `https://app.mymoolah.africa/signup?ref=${code}`
      });
    } catch (error) {
      console.error('Error getting referral code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral code',
        message: error.message
      });
    }
  }

  /**
   * Send referral invitation via SMS
   * POST /api/v1/referrals/send-invite
   */
  async sendInvite(req, res) {
    try {
      const { phoneNumber, language = 'en' } = req.body;
      const userId = req.user.id;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }
      
      // Validate phone number format (E.164)
      if (!phoneNumber.startsWith('+')) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be in E.164 format (e.g., +27123456789)'
        });
      }
      
      const result = await referralService.sendReferralInvite(userId, phoneNumber, language);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error sending referral invite:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to send referral invite'
      });
    }
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
          level4Count: stats.level4Count || 0,
          monthEarnedCents: stats.monthEarnedCents || 0,
          monthEarnedRand: (stats.monthEarnedCents || 0) / 100
        }
      });
    } catch (error) {
      console.error('Error getting referral stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral stats',
        message: error.message
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
      console.error('Error getting referral earnings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral earnings',
        message: error.message
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
          level3Count: network.stats.level3Count || 0,
          level4Count: network.stats.level4Count || 0
        }
      });
    } catch (error) {
      console.error('Error getting referral network:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get referral network',
        message: error.message
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
      console.error('Error getting pending earnings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending earnings',
        message: error.message
      });
    }
  }
}

module.exports = new ReferralController();

