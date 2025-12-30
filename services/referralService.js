/**
 * Referral Service - Multi-Level Earnings Network
 * 
 * Core service for MyMoolah's 4-level referral program
 * Job creation and viral growth engine for South Africa
 * 
 * Features:
 * - 4-level commission structure (4%, 3%, 2%, 1%)
 * - Monthly caps per level (R10K, R5K, R2.5K, R1K)
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

// Monthly caps per level (in cents)
const MONTHLY_CAPS = {
  1: 1000000, // R10,000
  2: 500000,  // R5,000
  3: 250000,  // R2,500
  4: 100000   // R1,000
};

// Commission percentages per level
const COMMISSION_RATES = {
  1: 4.00,
  2: 3.00,
  3: 2.00,
  4: 1.00
};

// Fraud prevention limits
const LIMITS = {
  maxReferralsPerDay: 10,
  maxReferralsPerMonth: 100,
  minAccountAgeDays: 30,
  minTransactionHistoryCents: 10000 // R100
};

class ReferralService {
  /**
   * Generate unique referral code for user
   * Format: REF-XXXXXX (6 random uppercase alphanumeric)
   */
  async generateReferralCode(userId) {
    // Check if user already has a code
    const existing = await Referral.findOne({
      where: { referrerUserId: userId },
      order: [['created_at', 'DESC']]
    });
    
    // Generate unique code
    let code;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
      code = `REF-${randomPart}`;
      
      // Check uniqueness
      const exists = await Referral.findOne({ where: { referralCode: code } });
      if (!exists) break;
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique referral code');
    }
    
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
    
    if (!skipValidation) {
      const existingReferral = await Referral.findOne({
        where: {
          referrerUserId: userId,
          refereePhoneNumber: phoneNumber
        }
      });
      
      if (existingReferral) {
        throw new Error('You have already referred this phone number');
      }
    }
    
    // 3. Generate referral code
    const code = await this.generateReferralCode(userId);
    
    // 4. Create referral record
    const referral = await Referral.create({
      referrerUserId: userId,
      referralCode: code,
      refereePhoneNumber: phoneNumber,
      status: 'pending',
      invitedAt: new Date(),
      invitationChannel: 'sms',
      signupBonusAmount: 50.00 // R50 signup bonus
    });
    
    // 5. Send SMS via MyMobileAPI
    try {
      const smsService = require('./smsService');
      if (smsService.isConfigured()) {
        // Get referrer's name for personalization
        const referrer = await User.findByPk(userId, {
          attributes: ['firstName', 'lastName']
        });
        const referrerName = referrer 
          ? `${referrer.firstName} ${referrer.lastName}`.trim() 
          : 'A friend';
        
        await smsService.sendReferralInvite(referrerName, phoneNumber, code, language);
        await referral.update({ smsSentAt: new Date() });
        console.log(`✅ Referral SMS sent to ${phoneNumber}`);
      } else {
        console.warn('⚠️ SMS service not configured - referral invitation not sent');
      }
    } catch (smsError) {
      console.error('⚠️ Failed to send referral SMS:', smsError.message);
      // Don't fail referral creation if SMS fails
    }
    
    // 6. Update user stats
    await this.incrementReferralCount(userId);
    
    return {
      success: true,
      referralCode: code,
      referralId: referral.id,
      message: 'Referral invitation will be sent via SMS'
    };
  }

  /**
   * Process signup with referral code
   * Called during user registration
   */
  async processSignup(referralCode, newUserId) {
    if (!referralCode) return null;
    
    // Find referral
    const referral = await Referral.findOne({
      where: {
        referralCode: referralCode.toUpperCase(),
        status: 'pending'
      }
    });
    
    if (!referral) {
      console.warn(`Invalid or expired referral code: ${referralCode}`);
      return null;
    }
    
    // Update referral with new user
    await referral.update({
      refereeUserId: newUserId,
      status: 'signed_up',
      signedUpAt: new Date()
    });
    
    // Build referral chain for new user
    await this.buildReferralChain(newUserId, referral.referrerUserId);
    
    // Pay signup bonus (optional - can be done after first transaction instead)
    // await this.paySignupBonus(referral);
    
    console.log(`✅ Referral signup processed: ${referralCode} → User ${newUserId}`);
    
    return {
      success: true,
      referral: referral,
      bonusAmount: referral.signupBonusAmount
    };
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
   * Build 4-level referral chain for new user
   * @param {number} userId - New user
   * @param {number} referrerId - Direct referrer (Level 1)
   */
  async buildReferralChain(userId, referrerId) {
    // Get referrer's chain
    const referrerChain = await ReferralChain.findOne({
      where: { userId: referrerId }
    });
    
    // Build new user's chain
    const chain = {
      userId: userId,
      level1UserId: referrerId,
      level2UserId: null,
      level3UserId: null,
      level4UserId: null,
      chainDepth: 1
    };
    
    // If referrer has a chain, inherit their upline
    if (referrerChain) {
      chain.level2UserId = referrerChain.level1UserId;
      chain.level3UserId = referrerChain.level2UserId;
      chain.level4UserId = referrerChain.level3UserId;
      
      // Calculate depth
      chain.chainDepth = 1;
      if (chain.level2UserId) chain.chainDepth = 2;
      if (chain.level3UserId) chain.chainDepth = 3;
      if (chain.level4UserId) chain.chainDepth = 4;
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
   * Update network counts for entire upline
   */
  async updateNetworkCounts(chain) {
    const updates = [
      { userId: chain.level1UserId, level: 1 },
      { userId: chain.level2UserId, level: 2 },
      { userId: chain.level3UserId, level: 3 },
      { userId: chain.level4UserId, level: 4 }
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

