/**
 * Referral Payout Service - MyMoolah Treasury Platform
 * 
 * Daily batch processing for referral earnings payouts
 * Runs at 2:00 AM SAST daily
 * Credits user wallets with accumulated referral earnings
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

const { ReferralEarning, ReferralPayout, UserReferralStats, User, Wallet, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');

class ReferralPayoutService {
  /**
   * Process daily payouts for all pending referral earnings
   * Called by cron job at 2:00 AM SAST
   * @returns {Promise<Object>} Payout batch summary
   */
  async processDailyPayouts() {
    const batchId = `PAYOUT-${new Date().toISOString().split('T')[0]}`;
    
    console.log(`💰 Starting daily referral payout batch: ${batchId}`);
    
    // 1. Create batch record
    const batch = await ReferralPayout.create({
      batchId,
      payoutDate: new Date(),
      status: 'processing',
      startedAt: new Date()
    });
    
    try {
      // 2. Get all pending earnings
      const pendingEarnings = await ReferralEarning.findAll({
        where: { status: 'pending' },
        include: [
          {
            model: User,
            as: 'earner',
            attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
          }
        ],
        order: [['earnerUserId', 'ASC'], ['created_at', 'ASC']]
      });
      
      if (pendingEarnings.length === 0) {
        await batch.update({
          status: 'completed',
          completedAt: new Date(),
          totalUsers: 0,
          totalAmountCents: 0,
          totalEarningsCount: 0,
          message: 'No pending earnings to process'
        });
        console.log(`✅ Payout batch complete: No pending earnings`);
        return {
          success: true,
          batchId,
          totalUsers: 0,
          totalAmountCents: 0,
          totalEarningsCount: 0
        };
      }
      
      console.log(`📊 Found ${pendingEarnings.length} pending earnings to process`);
      
      // 3. Aggregate by user
      const userEarnings = {};
      pendingEarnings.forEach(earning => {
        if (!userEarnings[earning.earnerUserId]) {
          userEarnings[earning.earnerUserId] = [];
        }
        userEarnings[earning.earnerUserId].push(earning);
      });
      
      console.log(`👥 Processing payouts for ${Object.keys(userEarnings).length} users`);
      
      // 4. Credit each user's wallet
      let totalPaidCents = 0;
      let userCount = 0;
      let failedUsers = [];
      
      for (const [userId, earnings] of Object.entries(userEarnings)) {
        try {
          const totalCents = earnings.reduce((sum, e) => sum + e.earnedAmountCents, 0);
          const totalRand = totalCents / 100;
          
          // Get user's wallet
          const wallet = await Wallet.findOne({
            where: { userId },
            include: [{ model: User, as: 'user' }]
          });
          
          if (!wallet) {
            console.error(`⚠️ Wallet not found for user ${userId}`);
            failedUsers.push({ userId, reason: 'Wallet not found' });
            continue;
          }
          
          // Credit wallet (amount in Rand)
          await wallet.credit(totalRand, 'referral_earnings', {});
          
          // Create transaction record for payout
          const transactionId = `REF_PAYOUT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          await Transaction.create({
            transactionId,
            userId: parseInt(userId),
            walletId: wallet.walletId,
            amount: totalRand,
            type: 'credit',
            status: 'completed',
            description: `Referral earnings payout (${earnings.length} transactions)`,
            currency: wallet.currency,
            metadata: {
              batchId,
              earningsCount: earnings.length,
              earningsIds: earnings.map(e => e.id),
              referralPayout: true
            }
          });
          
          // Mark earnings as paid
          await ReferralEarning.update(
            { 
              status: 'paid', 
              paidAt: new Date(), 
              payoutBatchId: batchId 
            },
            { 
              where: { 
                id: earnings.map(e => e.id) 
              } 
            }
          );
          
          // Update stats
          await this.updateStats(parseInt(userId), totalCents);
          
          totalPaidCents += totalCents;
          userCount++;
          
          console.log(`✅ Paid R${totalRand.toFixed(2)} to user ${userId} (${earnings.length} earnings)`);
          
        } catch (userError) {
          console.error(`❌ Failed to process payout for user ${userId}:`, userError.message);
          failedUsers.push({ userId, reason: userError.message });
          // Continue with next user
        }
      }
      
      // 5. Complete batch
      await batch.update({
        status: 'completed',
        completedAt: new Date(),
        totalUsers: userCount,
        totalAmountCents: totalPaidCents,
        totalEarningsCount: pendingEarnings.length,
        failedUsers: failedUsers.length > 0 ? failedUsers : null,
        message: failedUsers.length > 0 
          ? `${userCount} users paid, ${failedUsers.length} failed`
          : `Successfully paid ${userCount} users`
      });
      
      const totalPaidRand = totalPaidCents / 100;
      console.log(`✅ Payout batch complete: ${userCount} users, R${totalPaidRand.toFixed(2)} paid`);
      
      if (failedUsers.length > 0) {
        console.warn(`⚠️ ${failedUsers.length} users failed to process`);
      }
      
      return {
        success: true,
        batchId,
        totalUsers: userCount,
        totalAmountCents: totalPaidCents,
        totalAmountRand: totalPaidRand,
        totalEarningsCount: pendingEarnings.length,
        failedUsers: failedUsers.length,
        failedDetails: failedUsers
      };
      
    } catch (error) {
      // Mark batch as failed
      await batch.update({
        status: 'failed',
        completedAt: new Date(),
        error: error.message,
        errorStack: error.stack
      });
      
      console.error(`❌ Payout batch failed:`, error);
      throw error;
    }
  }

  /**
   * Update user referral stats after payout
   * @param {number} userId - User ID
   * @param {number} amountCents - Amount paid in cents
   */
  async updateStats(userId, amountCents) {
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const [stats] = await UserReferralStats.findOrCreate({
        where: { userId },
        defaults: { userId, monthYear }
      });
      
      // Reset monthly stats if new month
      if (stats.monthYear !== monthYear) {
        await stats.resetMonthly(monthYear);
        await stats.reload();
      }
      
      // Update paid amounts
      await stats.update({
        totalPaidCents: stats.totalPaidCents + amountCents,
        pendingCents: Math.max(0, stats.pendingCents - amountCents),
        monthPaidCents: stats.monthPaidCents + amountCents
      });
      
    } catch (error) {
      console.error(`⚠️ Failed to update stats for user ${userId}:`, error.message);
      // Don't fail payout if stats update fails
    }
  }

  /**
   * Get payout history for a user
   * @param {number} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Payout records
   */
  async getUserPayoutHistory(userId, limit = 10) {
    const earnings = await ReferralEarning.findAll({
      where: {
        earnerUserId: userId,
        status: 'paid'
      },
      include: [
        {
          model: ReferralPayout,
          as: 'payout',
          attributes: ['batchId', 'payoutDate', 'status']
        }
      ],
      order: [['paidAt', 'DESC']],
      limit
    });
    
    return earnings;
  }

  /**
   * Get pending earnings summary for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Pending earnings summary
   */
  async getPendingEarnings(userId) {
    const pendingEarnings = await ReferralEarning.findAll({
      where: {
        earnerUserId: userId,
        status: 'pending'
      }
    });
    
    const totalCents = pendingEarnings.reduce((sum, e) => sum + e.earnedAmountCents, 0);
    
    return {
      count: pendingEarnings.length,
      totalCents,
      totalRand: totalCents / 100,
      earnings: pendingEarnings
    };
  }
}

module.exports = new ReferralPayoutService();

