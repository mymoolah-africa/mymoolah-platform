'use strict';

/**
 * User Tier Service - MyMoolah Treasury Platform
 * 
 * Manages user tier lifecycle:
 * - Calculate monthly activity
 * - Determine tier eligibility
 * - Promote/demote users
 * - Monthly automated tier review
 * - Banking-grade audit trail
 */

const { User, sequelize } = require('../models');
const notificationService = require('./notificationService');

/**
 * Calculate user's activity for a specific month
 * Counts relevant transactions and total value
 * 
 * @param {number} userId - User ID
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @returns {Promise<object>} Activity metrics
 */
async function getUserMonthlyActivity(userId, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const [result] = await sequelize.query(`
      SELECT 
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(ABS(amount)::numeric), 0)::bigint AS total_value_cents
      FROM transactions
      WHERE user_id = :userId
        AND type IN ('zapper_payment', 'send', 'payment', 'purchase', 'voucher_purchase', 'withdrawal')
        AND status = 'completed'
        AND created_at BETWEEN :startDate AND :endDate
    `, {
      replacements: { userId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
    
    return {
      transactionCount: result?.transaction_count || 0,
      totalValueCents: parseInt(result?.total_value_cents) || 0,
      period: `${year}-${String(month).padStart(2, '0')}`
    };
    
  } catch (error) {
    console.error(`❌ Error calculating activity for user ${userId}:`, error.message);
    return {
      transactionCount: 0,
      totalValueCents: 0,
      period: `${year}-${String(month).padStart(2, '0')}`
    };
  }
}

/**
 * Determine eligible tier based on activity metrics
 * Uses AND logic: user must meet BOTH transaction count AND value thresholds
 * 
 * @param {number} transactionCount - Number of transactions
 * @param {number} totalValueCents - Total transaction value in cents
 * @returns {Promise<string>} Eligible tier level
 */
async function calculateEligibleTier(transactionCount, totalValueCents) {
  try {
    const tiers = await sequelize.query(`
      SELECT tier_level, min_monthly_transactions, min_monthly_value_cents
      FROM tier_criteria
      WHERE is_active = true
      ORDER BY min_monthly_transactions DESC, min_monthly_value_cents DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    // Start from highest tier and work down
    // User must meet BOTH criteria (AND logic)
    for (const tier of tiers) {
      if (transactionCount >= tier.min_monthly_transactions && 
          totalValueCents >= tier.min_monthly_value_cents) {
        return tier.tier_level;
      }
    }
    
    return 'bronze'; // Default fallback
    
  } catch (error) {
    console.error('❌ Error calculating eligible tier:', error.message);
    return 'bronze'; // Safe fallback
  }
}

/**
 * Update user's tier with complete audit trail
 * 
 * @param {number} userId - User ID
 * @param {string} newTier - New tier level
 * @param {object} monthlyActivity - Activity metrics
 * @param {string} reason - Reason for change
 * @param {number} adminUserId - Admin user ID if manual change
 * @returns {Promise<object>} Change result
 */
async function updateUserTier(userId, newTier, monthlyActivity, reason = 'monthly_review', adminUserId = null) {
  const transaction = await sequelize.transaction();
  
  try {
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      throw new Error(`User ${userId} not found`);
    }
    
    const oldTier = user.tier_level || 'bronze';
    
    // No change needed
    if (oldTier === newTier) {
      await transaction.commit();
      return { 
        changed: false, 
        oldTier, 
        newTier,
        message: 'Tier unchanged'
      };
    }
    
    // Update user tier
    await user.update({
      tier_level: newTier,
      tier_effective_from: new Date(),
      tier_last_reviewed_at: new Date()
    }, { transaction });
    
    // Create audit trail in user_tier_history
    await sequelize.query(`
      INSERT INTO user_tier_history 
        (user_id, old_tier, new_tier, change_reason, monthly_transaction_count, monthly_transaction_value_cents, effective_from, created_at, created_by)
      VALUES 
        (:userId, :oldTier, :newTier, :reason, :txCount, :txValue, NOW(), NOW(), :createdBy)
    `, {
      replacements: {
        userId,
        oldTier,
        newTier,
        reason,
        txCount: monthlyActivity?.transactionCount || null,
        txValue: monthlyActivity?.totalValueCents || null,
        createdBy: adminUserId
      },
      transaction
    });
    
    await transaction.commit();
    
    // Determine if promotion or demotion
    const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    const isPromotion = tierOrder[newTier] > tierOrder[oldTier];
    const changeType = isPromotion ? 'promoted' : 'demoted';
    
    // Send notification to user
    try {
      await notificationService.createNotification(
        userId,
        'tier_change',
        `Tier ${isPromotion ? 'Upgrade' : 'Change'}!`,
        `You've been ${changeType} to ${newTier.toUpperCase()}! ${getTierBenefitMessage(newTier)}`,
        { 
          tierLevel: newTier, 
          oldTier,
          isPromotion,
          transactionCount: monthlyActivity?.transactionCount,
          transactionValue: monthlyActivity?.totalValueCents
        }
      );
    } catch (notifError) {
      console.error('⚠️ Failed to send tier change notification:', notifError.message);
    }
    
    console.log(`✅ User ${userId} tier ${changeType}: ${oldTier} → ${newTier}`);
    
    return { 
      changed: true, 
      oldTier, 
      newTier,
      changeType,
      isPromotion,
      message: `Successfully ${changeType} from ${oldTier} to ${newTier}`
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Failed to update tier for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Process monthly tier review for all active users
 * Runs on 1st of every month at 2 AM
 * 
 * @returns {Promise<object>} Review statistics
 */
async function processMonthlyTierReview() {
  const startTime = Date.now();
  console.log('\n🔄 ========================================');
  console.log('🔄 STARTING MONTHLY TIER REVIEW');
  console.log('🔄 ========================================\n');
  
  try {
    // Calculate previous month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;
    
    console.log(`📅 Reviewing period: ${year}-${String(month).padStart(2, '0')}`);
    
    // Get all active users
    const users = await sequelize.query(`
      SELECT id, tier_level 
      FROM users 
      WHERE status = 'active'
      ORDER BY id
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`👥 Found ${users.length} active users to review\n`);
    
    let promoted = 0;
    let demoted = 0;
    let unchanged = 0;
    let errors = 0;
    
    // Process in batches to avoid overwhelming the system
    const BATCH_SIZE = 100;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}...`);
      
      for (const user of batch) {
        try {
          // Get monthly activity
          const activity = await getUserMonthlyActivity(user.id, year, month);
          
          // Calculate eligible tier
          const eligibleTier = await calculateEligibleTier(
            activity.transactionCount,
            activity.totalValueCents
          );
          
          // Update tier
          const result = await updateUserTier(user.id, eligibleTier, activity, 'monthly_review');
          
          if (result.changed) {
            if (result.isPromotion) {
              promoted++;
            } else {
              demoted++;
            }
          } else {
            unchanged++;
          }
          
        } catch (error) {
          errors++;
          console.error(`❌ Error processing user ${user.id}:`, error.message);
        }
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n🔄 ========================================');
    console.log('🔄 MONTHLY TIER REVIEW COMPLETE');
    console.log('🔄 ========================================');
    console.log(`✅ Promoted: ${promoted}`);
    console.log(`⬇️  Demoted: ${demoted}`);
    console.log(`➡️  Unchanged: ${unchanged}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`👥 Total processed: ${users.length}`);
    console.log('🔄 ========================================\n');
    
    return {
      success: true,
      promoted,
      demoted,
      unchanged,
      errors,
      totalProcessed: users.length,
      durationSeconds: parseFloat(duration),
      period: `${year}-${String(month).padStart(2, '0')}`
    };
    
  } catch (error) {
    console.error('❌ Monthly tier review failed:', error);
    return {
      success: false,
      error: error.message,
      promoted: 0,
      demoted: 0,
      unchanged: 0,
      errors: 0,
      totalProcessed: 0
    };
  }
}

/**
 * Get user's current tier and next tier information
 * 
 * @param {number} userId - User ID
 * @returns {Promise<object>} Tier information
 */
async function getUserTierInfo(userId) {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['tier_level', 'tier_effective_from', 'tier_last_reviewed_at']
    });
    
    if (!user) {
      return null;
    }
    
    const currentTier = user.tier_level || 'bronze';
    
    // Get current month activity
    const now = new Date();
    const activity = await getUserMonthlyActivity(userId, now.getFullYear(), now.getMonth() + 1);
    
    // Get next tier requirements
    const nextTier = await getNextTier(currentTier);
    const nextTierRequirements = await getTierRequirements(nextTier);
    
    // Calculate progress to next tier
    const progress = nextTierRequirements ? {
      transactionProgress: Math.min(100, (activity.transactionCount / nextTierRequirements.min_monthly_transactions) * 100),
      valueProgress: Math.min(100, (activity.totalValueCents / nextTierRequirements.min_monthly_value_cents) * 100),
      transactionsRemaining: Math.max(0, nextTierRequirements.min_monthly_transactions - activity.transactionCount),
      valueRemaining: Math.max(0, nextTierRequirements.min_monthly_value_cents - activity.totalValueCents)
    } : null;
    
    return {
      currentTier,
      effectiveFrom: user.tier_effective_from,
      lastReviewedAt: user.tier_last_reviewed_at,
      nextTier,
      currentActivity: activity,
      nextTierRequirements,
      progress
    };
    
  } catch (error) {
    console.error(`❌ Error getting tier info for user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get tier requirements
 */
async function getTierRequirements(tierLevel) {
  try {
    const [requirements] = await sequelize.query(`
      SELECT min_monthly_transactions, min_monthly_value_cents
      FROM tier_criteria
      WHERE tier_level = :tierLevel AND is_active = true
      LIMIT 1
    `, {
      replacements: { tierLevel },
      type: sequelize.QueryTypes.SELECT
    });
    
    return requirements || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get next tier in progression
 */
function getNextTier(currentTier) {
  const progression = {
    bronze: 'silver',
    silver: 'gold',
    gold: 'platinum',
    platinum: null // Already at top
  };
  return progression[currentTier] || null;
}

/**
 * Get benefit message for tier
 */
function getTierBenefitMessage(tierLevel) {
  const benefits = {
    bronze: 'Lower fees coming soon!',
    silver: 'Enjoy reduced transaction fees!',
    gold: 'Premium member benefits unlocked!',
    platinum: 'VIP status with best rates!'
  };
  return benefits[tierLevel] || '';
}

/**
 * Get current tier fee display for a service
 */
function getTierFeeDisplay(tierLevel) {
  const fees = {
    bronze: 'R3.00',
    silver: 'R2.75',
    gold: 'R2.50',
    platinum: 'R2.25'
  };
  return fees[tierLevel] || 'R3.00';
}

module.exports = {
  getUserMonthlyActivity,
  calculateEligibleTier,
  updateUserTier,
  processMonthlyTierReview,
  getUserTierInfo,
  getTierRequirements,
  getNextTier,
  getTierBenefitMessage,
  getTierFeeDisplay
};

