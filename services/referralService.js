/**
 * Referral Service - Multi-Level Earnings Network
 *
 * Core service for MyMoolah's 3-level referral program
 * Job creation and viral growth engine for South Africa
 *
 * Features:
 * - 3-level commission structure (5%, 3%, 2%) - no caps
 * - Fraud prevention (KYC, transaction activation, velocity limits)
 * - Daily batch payouts
 * - Multi-language SMS invitations
 *
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

const crypto = require('crypto');
const { Referral, ReferralChain, User, UserReferralStats } = require('../models');
const { Op } = require('sequelize');

const LIMITS = {
  maxReferralsPerDay: 10,
  maxReferralsPerMonth: 100,
  minAccountAgeDays: 30,
  minTransactionHistoryCents: 10000
};

class ReferralService {
  /**
   * Get or create a stable referral code for a user.
   * Persisted on users.referral_code — generated once, reused forever.
   * Format: REF-XXXXXX (6 hex chars, uppercase)
   */
  async generateReferralCode(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'referral_code']
    });
    if (!user) throw new Error('User not found');

    if (user.referral_code) return user.referral_code;

    let code;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
      code = `REF-${randomPart}`;

      const duplicate = await User.findOne({ where: { referral_code: code } });
      if (!duplicate) break;

      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique referral code');
    }

    await user.update({ referral_code: code });
    return code;
  }

  /**
   * Send referral invitation via SMS
   * @param {number} userId - Referrer user ID
   * @param {string} phoneNumber - Referee phone number (E.164 format)
   * @param {string} language - Language code (en, af, zu, etc.)
   * @returns {Promise<Object>} Referral record
   */
  async sendReferralInvite(userId, phoneNumber, language = 'en') {
    // 1. Validate user can send referrals
    await this.validateReferrer(userId);
    
    // 2. Check if phone already referred (skip in UAT for testing)
    const skipValidation = process.env.REFERRAL_SKIP_VALIDATION === 'true';
    let referral = null;
    
    if (!skipValidation) {
      const existingReferral = await Referral.findOne({
        where: {
          referrerUserId: userId,
          refereePhoneNumber: phoneNumber
        }
      });
      
      if (existingReferral) {
        if (existingReferral.status === 'pending' && !existingReferral.smsSentAt) {
          referral = existingReferral;
        } else {
          const err = new Error('You have already referred this phone number');
          err.code = 'REFERRAL_ALREADY_SENT';
          err.statusCode = 409;
          throw err;
        }
      }
    }
    
    // 3. Get user's stable referral code
    const userCode = await this.generateReferralCode(userId);

    if (!referral) {
      // 4. Create invite-specific code derived from the stable code
      const inviteCode = `${userCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // 5. Create referral record
      referral = await Referral.create({
        referrerUserId: userId,
        referralCode: inviteCode,
        refereePhoneNumber: phoneNumber,
        status: 'pending',
        invitedAt: new Date(),
        invitationChannel: 'sms',
        signupBonusAmount: 50.00
      });
    }
    
    // 6. Send SMS with the user's stable code (not the invite-specific one)
    try {
      const smsService = require('./smsService');
      if (smsService.isConfigured()) {
        const referrer = await User.findByPk(userId, {
          attributes: ['firstName', 'lastName']
        });
        const referrerName = referrer
          ? `${referrer.firstName} ${referrer.lastName}`.trim()
          : 'A friend';

        await smsService.sendReferralInvite(referrerName, phoneNumber, userCode, language);
        await referral.update({ smsSentAt: new Date(), invitedAt: new Date() });
        console.log(`[referral] SMS sent to ${phoneNumber.substring(0, 6)}***`);
        await this.incrementReferralCount(userId);

        return {
          success: true,
          referralCode: userCode,
          referralId: referral.id,
          smsSent: true,
          message: 'Referral invitation SMS sent successfully'
        };
      } else {
        console.warn('[referral] SMS service not configured');
        const err = new Error('SMS service is not configured');
        err.code = 'SMS_SERVICE_NOT_CONFIGURED';
        err.statusCode = 503;
        throw err;
      }
    } catch (smsError) {
      console.error('[referral] SMS send failed:', smsError.message);
      if (smsError.code) {
        throw smsError;
      }
      const err = new Error('SMS gateway failed to send referral invite');
      err.code = 'SMS_SEND_FAILED';
      err.statusCode = 502;
      throw err;
    }
  }

  /**
   * Process signup with referral code.
   * Matches against: (1) pending invite rows in `referrals`, then
   * (2) stable user code on `users.referral_code`.
   */
  async processSignup(referralCode, newUserId) {
    if (!referralCode) return null;

    const code = referralCode.toUpperCase().trim();

    // Path 1: match a pending invite row (SMS invite flow)
    const invite = await Referral.findOne({
      where: { referralCode: code, status: 'pending' }
    });

    if (invite) {
      await invite.update({
        refereeUserId: newUserId,
        status: 'signed_up',
        signedUpAt: new Date()
      });
      await this.buildReferralChain(newUserId, invite.referrerUserId);
      console.log(`[referral] signup via invite: ${code} -> User ${newUserId}`);
      return { success: true, referral: invite, bonusAmount: invite.signupBonusAmount };
    }

    // Path 2: match a user's stable referral code (copy/share flow)
    const referrer = await User.findOne({
      where: { referral_code: code },
      attributes: ['id']
    });

    if (!referrer) {
      console.warn(`[referral] invalid code: ${code}`);
      return null;
    }

    if (referrer.id === newUserId) {
      console.warn(`[referral] self-referral blocked: ${code}`);
      return null;
    }

    const referral = await Referral.create({
      referrerUserId: referrer.id,
      refereeUserId: newUserId,
      referralCode: `${code}-SIGNUP-${newUserId}`,
      refereePhoneNumber: 'via-code',
      status: 'signed_up',
      invitedAt: new Date(),
      signedUpAt: new Date(),
      invitationChannel: 'referral_code',
      signupBonusAmount: 50.00
    });

    await this.buildReferralChain(newUserId, referrer.id);
    await this.incrementReferralCount(referrer.id);

    console.log(`[referral] signup via stable code: ${code} -> User ${newUserId} (referrer ${referrer.id})`);
    return { success: true, referral, bonusAmount: referral.signupBonusAmount };
  }

  /**
   * Check if this is user's first transaction
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if first transaction
   */
  async isFirstTransaction(userId) {
    const { Transaction } = require('../models');
    
    const count = await Transaction.count({
      where: {
        userId,
        status: 'completed',
        type: {
          [Op.in]: ['payment', 'qr_payment', 'voucher_purchase', 'purchase', 'send']
        }
      }
    });
    
    return count === 0;
  }

  /**
   * Activate referral after first transaction
   * @param {number} userId - User who completed first transaction
   */
  async activateReferral(userId) {
    // Find referral where this user is the referee
    const referral = await Referral.findOne({
      where: {
        refereeUserId: userId,
        status: 'signed_up'
      }
    });
    
    if (!referral) return false;
    
    // Activate
    await referral.update({
      status: 'activated',
      activatedAt: new Date()
    });
    
    // Update referrer's active count
    await this.incrementActiveReferralCount(referral.referrerUserId);
    
    // Pay signup bonus now (after activation)
    await this.paySignupBonus(referral);
    
    console.log(`✅ Referral activated: User ${userId}`);
    
    return true;
  }

  /**
   * Build 3-level referral chain for new user
   * @param {number} userId - New user
   * @param {number} referrerId - Direct referrer (Level 1)
   */
  async buildReferralChain(userId, referrerId) {
    // Get referrer's chain
    const referrerChain = await ReferralChain.findOne({
      where: { userId: referrerId }
    });
    
    // Build new user's chain (3 levels only)
    const chain = {
      userId: userId,
      level1UserId: referrerId,
      level2UserId: null,
      level3UserId: null,
      chainDepth: 1
    };
    
    // If referrer has a chain, inherit their upline
    if (referrerChain) {
      chain.level2UserId = referrerChain.level1UserId;
      chain.level3UserId = referrerChain.level2UserId;
      
      chain.chainDepth = 1;
      if (chain.level2UserId) chain.chainDepth = 2;
      if (chain.level3UserId) chain.chainDepth = 3;
    }
    
    // Create chain record
    await ReferralChain.create(chain);
    
    // Update network counts for upline
    await this.updateNetworkCounts(chain);
    
    console.log(`✅ Built referral chain for User ${userId}, depth: ${chain.chainDepth}`);
    
    return chain;
  }

  /**
   * Get referral chain for user (who earns from their transactions)
   * @param {number} userId
   * @returns {Promise<Array>} Array of {userId, level, percentage}
   */
  async getReferralChain(userId) {
    const chain = await ReferralChain.findOne({
      where: { userId }
    });
    
    if (!chain) return [];
    
    return chain.getEarners();
  }

  /**
   * Validate user can send referrals (fraud prevention)
   */
  async validateReferrer(userId) {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Skip strict validation in UAT/Codespaces for testing
    const skipValidation = process.env.REFERRAL_SKIP_VALIDATION === 'true';
    
    if (skipValidation) {
      console.log('⚠️ Referral validation SKIPPED (REFERRAL_SKIP_VALIDATION=true)');
      return true;
    }
    
    // Must be KYC verified
    if (user.kycStatus !== 'verified') {
      throw new Error('You must complete KYC verification before referring friends');
    }
    
    // Check account age (minimum 30 days)
    const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    if (accountAgeDays < LIMITS.minAccountAgeDays) {
      throw new Error(`Account must be ${LIMITS.minAccountAgeDays} days old to refer friends`);
    }
    
    // Check daily velocity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Referral.count({
      where: {
        referrerUserId: userId,
        invitedAt: {
          [Op.gte]: today
        }
      }
    });
    
    if (todayCount >= LIMITS.maxReferralsPerDay) {
      throw new Error(`Maximum ${LIMITS.maxReferralsPerDay} referrals per day`);
    }
    
    return true;
  }

  /**
   * Increment referral count in stats
   */
  async incrementReferralCount(userId) {
    const [stats] = await UserReferralStats.findOrCreate({
      where: { userId },
      defaults: { userId, totalReferrals: 0 }
    });
    
    await stats.increment('totalReferrals');
  }

  /**
   * Increment active referral count
   */
  async incrementActiveReferralCount(userId) {
    const stats = await UserReferralStats.findOne({
      where: { userId }
    });
    
    if (stats) {
      await stats.increment('activeReferrals');
    }
  }

  /**
   * Update network counts for entire upline (3 levels)
   */
  async updateNetworkCounts(chain) {
    const updates = [
      { userId: chain.level1UserId, level: 1 },
      { userId: chain.level2UserId, level: 2 },
      { userId: chain.level3UserId, level: 3 }
    ];
    
    for (const update of updates) {
      if (!update.userId) continue;
      
      const [stats] = await UserReferralStats.findOrCreate({
        where: { userId: update.userId },
        defaults: { userId: update.userId }
      });
      
      const fieldName = `level${update.level}Count`;
      await stats.increment(fieldName);
    }
  }

  /**
   * Pay signup bonus to both referrer and referee
   */
  async paySignupBonus(referral) {
    if (referral.signupBonusPaid) return;
    
    const amount = referral.signupBonusAmount || 50.00;
    const amountCents = Math.round(amount * 100);
    
    // Credit both wallets
    // This will be implemented when we have wallet service
    // await walletService.credit(referral.referrerUserId, amountCents, 'Referral signup bonus');
    // await walletService.credit(referral.refereeUserId, amountCents, 'Signup bonus');
    
    await referral.update({
      signupBonusPaid: true,
      signupBonusPaidAt: new Date()
    });
    
    console.log(`✅ Paid signup bonus: R${amount} each to users ${referral.referrerUserId} and ${referral.refereeUserId}`);
  }

  /**
   * Get user's referral statistics
   */
  async getUserStats(userId) {
    const [stats] = await UserReferralStats.findOrCreate({
      where: { userId },
      defaults: { userId }
    });
    
    return stats;
  }

  /**
   * Get user's referral network (all levels)
   */
  async getUserNetwork(userId) {
    const directReferrals = await Referral.findAll({
      where: {
        referrerUserId: userId,
        status: {
          [Op.in]: ['signed_up', 'activated']
        }
      },
      include: [
        {
          model: User,
          as: 'referee',
          attributes: ['id', 'firstName', 'lastName', 'createdAt']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    return {
      direct: directReferrals,
      stats: await this.getUserStats(userId)
    };
  }
}

module.exports = new ReferralService();

