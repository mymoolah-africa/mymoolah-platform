/**
 * Referral Earnings Service
 *
 * Calculates and records referral earnings from every transaction
 * Applies 3-level commission structure (no caps)
 * Ensures MyMoolah keeps 90% of net revenue
 *
 * Commission Structure:
 * - Level 1 (Direct): 5%
 * - Level 2: 3%
 * - Level 3: 2%
 * Total: 10% max (only pay levels that exist)
 *
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

const { ReferralChain, ReferralEarning, UserReferralStats } = require('../models');
const { Op } = require('sequelize');

// Commission percentages per level (no caps)
const COMMISSION_RATES = {
  1: 5.00,
  2: 3.00,
  3: 2.00
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
      
      // Calculate earning (no caps)
      const baseEarningCents = netRevenueCents * percentage / 100 < 1
        ? Math.ceil((netRevenueCents * percentage) / 100)
        : Math.round((netRevenueCents * percentage) / 100);
      
      const finalEarningCents = baseEarningCents;
      if (finalEarningCents <= 0) continue;
      
      // Get current month stats for cumulative tracking
      const stats = await this.getUserStats(earnerUserId, monthYear);
      const levelField = `level${level}MonthCents`;
      const currentMonthCents = stats[levelField] || 0;
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
        capped: false,
        originalAmountCents: null,
        status: 'pending',
        transactionType,
        metadata: {
          chainDepth: chain.chainDepth
        }
      });
      
      // Update user stats
      await this.updateEarningStats(earnerUserId, level, finalEarningCents, monthYear);
      
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
  async updateEarningStats(userId, level, amountCents, monthYear) {
    const stats = await this.getUserStats(userId, monthYear);
    
    const updates = {
      totalEarnedCents: stats.totalEarnedCents + amountCents,
      pendingCents: stats.pendingCents + amountCents,
      monthEarnedCents: stats.monthEarnedCents + amountCents
    };
    
    // Update level-specific month totals (for reporting)
    const levelMonthField = `level${level}MonthCents`;
    updates[levelMonthField] = stats[levelMonthField] + amountCents;
    
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

