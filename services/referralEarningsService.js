/**
 * Referral Earnings Service
 * 
 * Calculates and records referral earnings from every transaction
 * Applies 4-level commission structure with monthly caps
 * Ensures MyMoolah keeps 90% of net revenue
 * 
 * Commission Structure:
 * - Level 1 (Direct): 4% (cap: R10,000/month)
 * - Level 2: 3% (cap: R5,000/month)
 * - Level 3: 2% (cap: R2,500/month)
 * - Level 4: 1% (cap: R1,000/month)
 * Total: 10% max (but only pay levels that exist)
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

const { ReferralChain, ReferralEarning, UserReferralStats } = require('../models');
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

// Minimum transaction for referral earnings (based on net revenue/commission, not purchase amount)
const MIN_TRANSACTION_CENTS = 1; // R0.01 - Allow even tiny commissions to generate earnings

class ReferralEarningsService {
  /**
   * Calculate and record referral earnings for a transaction
   * 
   * @param {Object} transaction - Transaction object
   * @param {number} transaction.userId - User who made the transaction
   * @param {number} transaction.id - Transaction ID
   * @param {number} transaction.netRevenueCents - MyMoolah's net revenue (after costs, VAT)
   * @param {string} transaction.type - Transaction type (vas, qr_payment, etc.)
   * @returns {Promise<Array>} Array of earning records created
   */
  async calculateEarnings(transaction) {
    const { userId, id: transactionId, netRevenueCents, type: transactionType } = transaction;
    
    console.log(`🔍 calculateEarnings called: userId=${userId}, txnId=${transactionId}, netRevenueCents=${netRevenueCents}, type=${transactionType}`);
    
    // Validate minimum transaction
    if (!netRevenueCents || netRevenueCents < MIN_TRANSACTION_CENTS) {
      console.log(`⚠️ Referral earnings skipped: netRevenueCents=${netRevenueCents} < MIN_TRANSACTION_CENTS=${MIN_TRANSACTION_CENTS}`);
      return []; // Transactions <R10 don't earn referral rewards
    }
    
    // Get referral chain for this user
    const chain = await ReferralChain.findOne({
      where: { userId }
    });
    
    console.log(`🔍 Referral chain found: ${chain ? `chainDepth=${chain.chainDepth}` : 'NONE'}`);
    
    if (!chain || chain.chainDepth === 0) {
      console.log(`ℹ️ No referral chain for user ${userId} - no earnings to calculate`);
      return []; // No referral chain, no earnings
    }
    
    // Get current month for cap tracking
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate earnings for each level
    const earners = chain.getEarners();
    const earnings = [];
    
    for (const earner of earners) {
      const { userId: earnerUserId, level, percentage } = earner;
      
      // Calculate base earning
      const baseEarningCents = Math.round((netRevenueCents * percentage) / 100);
      
      // Get current month stats for this user/level
      const stats = await this.getUserStats(earnerUserId, monthYear);
      const levelField = `level${level}MonthCents`;
      const currentMonthCents = stats[levelField] || 0;
      
      // Apply monthly cap
      const cap = MONTHLY_CAPS[level];
      const remainingCapCents = cap - currentMonthCents;
      
      let finalEarningCents = baseEarningCents;
      let capped = false;
      let originalAmountCents = null;
      
      if (remainingCapCents <= 0) {
        // Already hit cap this month
        finalEarningCents = 0;
        capped = true;
        originalAmountCents = baseEarningCents;
      } else if (baseEarningCents > remainingCapCents) {
        // Would exceed cap, apply limit
        finalEarningCents = remainingCapCents;
        capped = true;
        originalAmountCents = baseEarningCents;
      }
      
      // Skip if no earning (already capped)
      if (finalEarningCents <= 0) {
        console.log(`⚠️ User ${earnerUserId} Level ${level} already capped this month`);
        continue;
      }
      
      // Calculate cumulative for this earning
      const newCumulativeCents = currentMonthCents + finalEarningCents;
      
      // Create earning record
      const earning = await ReferralEarning.create({
        earnerUserId,
        transactionUserId: userId,
        transactionId,
        level,
        percentage,
        transactionRevenueCents: netRevenueCents,
        earnedAmountCents: finalEarningCents,
        monthYear,
        cumulativeMonthCents: newCumulativeCents,
        capped,
        originalAmountCents,
        status: 'pending',
        transactionType,
        metadata: {
          chainDepth: chain.chainDepth,
          capInfo: {
            cap,
            currentMonth: currentMonthCents,
            thisEarning: finalEarningCents,
            newTotal: newCumulativeCents,
            remaining: cap - newCumulativeCents
          }
        }
      });
      
      // Update user stats
      await this.updateEarningStats(earnerUserId, level, finalEarningCents, monthYear, newCumulativeCents >= cap);
      
      earnings.push(earning);
      
      console.log(`✅ Earning created: User ${earnerUserId} Level ${level} - ${earning.getFormattedAmount()}`);
    }
    
    return earnings;
  }

  /**
   * Get or create user referral stats
   */
  async getUserStats(userId, monthYear) {
    const [stats] = await UserReferralStats.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        monthYear,
        totalEarnedCents: 0,
        totalPaidCents: 0,
        pendingCents: 0
      }
    });
    
    // Reset monthly stats if new month
    if (stats.monthYear !== monthYear) {
      await stats.resetMonthly(monthYear);
      await stats.reload();
    }
    
    return stats;
  }

  /**
   * Update earning statistics for user
   */
  async updateEarningStats(userId, level, amountCents, monthYear, nowCapped) {
    const stats = await this.getUserStats(userId, monthYear);
    
    const updates = {
      totalEarnedCents: stats.totalEarnedCents + amountCents,
      pendingCents: stats.pendingCents + amountCents,
      monthEarnedCents: stats.monthEarnedCents + amountCents
    };
    
    // Update level-specific month totals
    const levelMonthField = `level${level}MonthCents`;
    const levelCappedField = `level${level}Capped`;
    updates[levelMonthField] = stats[levelMonthField] + amountCents;
    
    if (nowCapped) {
      updates[levelCappedField] = true;
    }
    
    await stats.update(updates);
  }

  /**
   * Get summary of how much would be earned (for preview)
   * @param {number} userId - Transaction user
   * @param {number} revenueCents - Net revenue
   * @returns {Object} Earnings breakdown
   */
  async previewEarnings(userId, revenueCents) {
    const chain = await ReferralChain.findOne({
      where: { userId }
    });
    
    if (!chain) {
      return {
        totalCents: 0,
        earners: [],
        myMoolahKeeps: revenueCents
      };
    }
    
    const earners = chain.getEarners();
    let totalEarningsCents = 0;
    const breakdown = [];
    
    for (const earner of earners) {
      const earningCents = Math.round((revenueCents * earner.percentage) / 100);
      totalEarningsCents += earningCents;
      breakdown.push({
        userId: earner.userId,
        level: earner.level,
        percentage: earner.percentage,
        amountCents: earningCents
      });
    }
    
    return {
      totalCents: totalEarningsCents,
      totalPercentage: (totalEarningsCents / revenueCents) * 100,
      earners: breakdown,
      myMoolahKeepsCents: revenueCents - totalEarningsCents,
      myMoolahKeepsPercentage: ((revenueCents - totalEarningsCents) / revenueCents) * 100
    };
  }

  /**
   * Get month-to-date earnings for user
   */
  async getMonthEarnings(userId) {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const earnings = await ReferralEarning.findAll({
      where: {
        earnerUserId: userId,
        monthYear
      },
      order: [['created_at', 'DESC']]
    });
    
    const total = earnings.reduce((sum, e) => sum + e.earnedAmountCents, 0);
    
    return {
      monthYear,
      earnings,
      totalCents: total,
      count: earnings.length
    };
  }
}

module.exports = new ReferralEarningsService();

