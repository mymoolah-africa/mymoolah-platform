/**
 * Ad Service for Watch to Earn
 * 
 * Core business logic for serving ads and processing view completions.
 * Handles wallet credits, merchant ad float debits, and ledger posting.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

const { AdCampaign, AdView, MerchantFloat, Wallet, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const ledgerService = require('./ledgerService');

class AdService {
  /**
   * Get available ads for user
   * Simple query for launch - no complex targeting yet
   * 
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Available ads
   */
  async getAvailableAds(userId) {
    try {
      // Get ads with sufficient budget
      const ads = await AdCampaign.findAll({
        where: {
          status: 'active',
          moderationStatus: 'approved',
          remainingBudget: { [Op.gt]: 0 }
        },
        include: [{
          model: MerchantFloat,
          as: 'merchant',
          where: {
            adFloatBalance: { [Op.gte]: sequelize.col('AdCampaign.costPerView') }
          },
          required: true
        }],
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      // Filter out ads user has already viewed (fraud prevention)
      const viewedCampaignIds = await AdView.findAll({
        where: { userId, status: 'completed' },
        attributes: ['campaignId']
      });
      
      const viewedIds = viewedCampaignIds.map(v => v.campaignId);
      const availableAds = ads.filter(ad => !viewedIds.includes(ad.id));

      return availableAds;
    } catch (error) {
      console.error('❌ Error fetching available ads:', error);
      throw error;
    }
  }

  /**
   * Start ad view (record that user started watching)
   * 
   * @param {number} userId - User ID
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Created view record
   */
  async startView(userId, campaignId) {
    try {
      // Check if user already viewed this ad
      const existingView = await AdView.findOne({
        where: { userId, campaignId }
      });

      if (existingView) {
        if (existingView.status === 'completed') {
          throw new Error('You have already watched this ad');
        }
        // If started but not completed, return existing view
        return existingView;
      }

      // Create new view record
      const view = await AdView.create({
        campaignId,
        userId,
        status: 'started',
        startedAt: new Date()
      });

      return view;
    } catch (error) {
      console.error('❌ Error starting ad view:', error);
      throw error;
    }
  }

  /**
   * Complete ad view and credit user
   * Atomic transaction: debit merchant ad float, credit user wallet, update view
   * 
   * @param {number} userId - User ID
   * @param {string} campaignId - Campaign ID
   * @param {string} viewId - View ID
   * @param {number} watchDuration - Actual watch duration in seconds (server-verified)
   * @returns {Promise<Object>} Completion result
   */
  async completeView(userId, campaignId, viewId, watchDuration) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Verify view exists and not completed
      const view = await AdView.findOne({
        where: { id: viewId, userId, status: 'started' },
        transaction
      });

      if (!view) {
        throw new Error('View not found or already completed');
      }

      // 2. Get campaign and merchant float
      const campaign = await AdCampaign.findByPk(campaignId, { transaction });
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'active' || campaign.moderationStatus !== 'approved') {
        throw new Error('Campaign is not active or approved');
      }

      const merchantFloat = await MerchantFloat.findOne({
        where: { merchantId: campaign.merchantId },
        transaction
      });

      if (!merchantFloat) {
        throw new Error('Merchant float not found');
      }

      // 3. Verify watch duration (95% of video length required)
      const requiredDuration = campaign.durationSeconds * 0.95;
      if (watchDuration < requiredDuration) {
        throw new Error(
          `Video not watched completely. Required: ${Math.ceil(requiredDuration)}s, Watched: ${watchDuration}s`
        );
      }

      // 4. Check merchant has sufficient ad float balance
      if (parseFloat(merchantFloat.adFloatBalance) < parseFloat(campaign.costPerView)) {
        throw new Error('Merchant has insufficient ad float balance');
      }

      // 5. Debit merchant ad float account (prefunded)
      await merchantFloat.decrement('adFloatBalance', {
        by: campaign.costPerView,
        transaction
      });

      // 6. Credit user wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction
      });

      if (!wallet) {
        throw new Error('User wallet not found');
      }

      await wallet.credit(campaign.rewardPerView, 'ad_reward', { transaction });

      // 7. Update campaign budget and stats
      await campaign.decrement('remainingBudget', {
        by: campaign.costPerView,
        transaction
      });

      await campaign.increment('totalViews', { by: 1, transaction });

      // 8. Mark view as completed
      await view.update({
        status: 'completed',
        completedAt: new Date(),
        watchDurationSeconds: watchDuration,
        rewardAmount: campaign.rewardPerView,
        merchantDebitAmount: campaign.costPerView
      }, { transaction });

      // 9. Create transaction record
      const transactionId = `AD_VIEW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await Transaction.create({
        transactionId,
        userId,
        walletId: wallet.walletId,
        amount: campaign.rewardPerView,
        type: 'credit',
        status: 'completed',
        description: `Watch to Earn: ${campaign.title}`,
        currency: 'ZAR',
        fee: 0,
        metadata: {
          campaignId: campaign.id,
          viewId: view.id,
          adType: campaign.adType,
          merchantId: campaign.merchantId,
          merchantDebitAmount: campaign.costPerView,
          watchDuration: watchDuration,
          isWatchToEarn: true
        }
      }, { transaction });

      await transaction.commit();

      // 10. Post to ledger (async, non-blocking)
      setImmediate(async () => {
        try {
          await this.postToLedger(campaign, merchantFloat, transactionId);
        } catch (ledgerError) {
          console.error('❌ Error posting to ledger (non-blocking):', ledgerError);
        }
      });

      console.log(`✅ Ad view completed: User ${userId} earned R${campaign.rewardPerView} for watching "${campaign.title}"`);

      return {
        success: true,
        rewardAmount: campaign.rewardPerView,
        walletBalance: parseFloat(wallet.balance) + parseFloat(campaign.rewardPerView),
        viewId: view.id
      };
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error completing ad view:', error);
      throw error;
    }
  }

  /**
   * Post to ledger (double-entry accounting)
   * Debits merchant ad float account, credits user wallet, credits MM ad revenue
   * 
   * @param {Object} campaign - Ad campaign
   * @param {Object} merchantFloat - Merchant float
   * @param {string} transactionId - Transaction ID for reference
   */
  async postToLedger(campaign, merchantFloat, transactionId) {
    try {
      const mmRevenue = parseFloat(campaign.costPerView) - parseFloat(campaign.rewardPerView);

      await ledgerService.postJournalEntry({
        reference: transactionId,
        description: `Watch to Earn: ${campaign.title}`,
        lines: [
          {
            accountCode: merchantFloat.ledgerAccountCode || '2100-05-001', // Merchant ad float (liability)
            dc: 'debit',
            amount: campaign.costPerView,
            memo: 'Debit from prefunded ad float account'
          },
          {
            accountCode: '1100-01-01', // User wallet clearing (asset)
            dc: 'credit',
            amount: campaign.rewardPerView,
            memo: 'Credit user wallet for watching ad'
          },
          {
            accountCode: '4100-05-01', // Ad revenue (income)
            dc: 'credit',
            amount: mmRevenue,
            memo: 'MM ad platform revenue'
          }
        ]
      });

      console.log(`✅ Ledger posted for ad view: ${transactionId}`);
    } catch (error) {
      console.error('❌ Error posting to ledger:', error);
      // Don't throw - ledger posting is non-blocking
    }
  }

  /**
   * Get ad campaign by ID
   * 
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign
   */
  async getCampaignById(campaignId) {
    return await AdCampaign.findByPk(campaignId, {
      include: [{
        model: MerchantFloat,
        as: 'merchant'
      }]
    });
  }

  /**
   * Get user's ad view history
   * 
   * @param {number} userId - User ID
   * @param {number} limit - Max number of records
   * @returns {Promise<Array>} User's view history
   */
  async getUserViewHistory(userId, limit = 50) {
    return await AdView.findAll({
      where: { userId, status: 'completed' },
      include: [{
        model: AdCampaign,
        as: 'campaign',
        attributes: ['id', 'title', 'adType']
      }],
      order: [['completedAt', 'DESC']],
      limit
    });
  }
}

module.exports = new AdService();
