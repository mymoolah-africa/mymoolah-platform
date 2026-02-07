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
      // Staging/UAT: allow demo ads (staging often has NODE_ENV=production but DB name contains 'staging')
      const isNonProduction = process.env.NODE_ENV !== 'production' ||
        process.env.NODE_ENV === 'staging' ||
        (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('uat') || process.env.DATABASE_URL.includes('staging')));

      // UAT/Staging: if no ads in DB, ensure demo data so Earn Moolahs shows demo videos (same as UAT)
      if (isNonProduction) {
        const adsBefore = await AdCampaign.findAll({
          where: { status: 'active', moderationStatus: 'approved', remainingBudget: { [Op.gt]: 0 } },
          include: [{
            model: MerchantFloat,
            as: 'merchant',
            where: { adFloatBalance: { [Op.gte]: sequelize.col('AdCampaign.costPerView') } },
            required: true
          }],
          limit: 1
        });
        if (adsBefore.length === 0) {
          await this._ensureDemoAdsForNonProduction();
        }
      }

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
      // ONLY in production - UAT/Staging show all ads for testing
      const isProduction = process.env.NODE_ENV === 'production' && 
                           !process.env.DATABASE_URL?.includes('uat') &&
                           !process.env.DATABASE_URL?.includes('staging');
      
      if (isProduction) {
        const viewedCampaignIds = await AdView.findAll({
          where: { userId, status: 'completed' },
          attributes: ['campaignId']
        });
        
        const viewedIds = viewedCampaignIds.map(v => v.campaignId);
        const availableAds = ads.filter(ad => !viewedIds.includes(ad.id));
        return availableAds;
      }
      
      // UAT/Staging: Return all ads for testing (no filtering)
      return ads;
    } catch (error) {
      console.error('❌ Error fetching available ads:', error);
      throw error;
    }
  }

  /**
   * Ensure demo merchant + 10 demo ads exist in non-production (UAT/Staging).
   * Idempotent: safe to call on every request when DB has no ads; first call seeds, subsequent calls no-op.
   * So staging shows "Earn Moolahs" demo videos without manual seed step.
   */
  async _ensureDemoAdsForNonProduction() {
    const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    const thumbnailUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg';
    const demoAds = [
      { id: '00000000-0001-0000-0000-000000000001', title: 'Vodacom Airtime Deals', description: 'Get amazing airtime deals with Vodacom. Top up now and save!', adType: 'reach', costPerView: 6.00, rewardPerView: 2.00 },
      { id: '00000000-0002-0000-0000-000000000002', title: 'MTN Data Bundles', description: 'Stream, browse, and stay connected with MTN data bundles.', adType: 'reach', costPerView: 6.00, rewardPerView: 2.00 },
      { id: '00000000-0003-0000-0000-000000000003', title: 'Shoprite Specials', description: 'Fresh groceries at unbeatable prices. Visit Shoprite today!', adType: 'reach', costPerView: 6.00, rewardPerView: 2.00 },
      { id: '00000000-0004-0000-0000-000000000004', title: 'Checkers Fresh Produce', description: 'Farm-fresh produce delivered to your door. Shop Checkers now!', adType: 'reach', costPerView: 6.00, rewardPerView: 2.00 },
      { id: '00000000-0005-0000-0000-000000000005', title: 'Capitec Bank Savings', description: 'Save smarter with Capitec. Open a savings account today!', adType: 'reach', costPerView: 6.00, rewardPerView: 2.00 },
      { id: '00000000-0006-0000-0000-000000000006', title: 'Hollywoodbets - New Player Bonus', description: 'Sign up now and get R25 free bet!', adType: 'engagement', costPerView: 15.00, rewardPerView: 3.00 },
      { id: '00000000-0007-0000-0000-000000000007', title: 'Betway Sports Betting', description: 'Bet on your favorite sports. Get R50 welcome bonus!', adType: 'engagement', costPerView: 15.00, rewardPerView: 3.00 },
      { id: '00000000-0008-0000-0000-000000000008', title: 'Old Mutual Life Insurance', description: 'Protect your family with affordable life insurance.', adType: 'engagement', costPerView: 15.00, rewardPerView: 3.00 },
      { id: '00000000-0009-0000-0000-000000000009', title: 'TymeBank Student Account', description: 'Free banking for students. No monthly fees!', adType: 'engagement', costPerView: 15.00, rewardPerView: 3.00 },
      { id: '00000000-0010-0000-0000-000000000010', title: 'Takealot Black Friday', description: 'Biggest sale of the year! Free delivery on orders over R500.', adType: 'engagement', costPerView: 15.00, rewardPerView: 3.00 }
    ];
    try {
      await sequelize.query(`
        INSERT INTO merchant_floats (
          "merchantId", "merchantName", "merchantType", "floatAccountNumber", "floatAccountName",
          "currentBalance", "initialBalance", "minimumBalance", "maximumBalance",
          "adFloatBalance", "adFloatInitialBalance", "adFloatMinimumBalance",
          "settlementPeriod", "settlementMethod", status, "isActive",
          "canSellVouchers", "canRedeemVouchers", "voucherSaleCommission", "voucherRedemptionFee",
          "ledgerAccountCode", metadata, "createdAt", "updatedAt"
        ) VALUES (
          'DUMMY_AD_MERCHANT_001', 'Test Advertiser (Dummy)', 'other', 'MF-AD-DUMMY-001', 'Dummy Advertiser Float Account',
          1000.00, 1000.00, 0.00, NULL, 600.00, 600.00, 0.00,
          'monthly', 'prefunded', 'active', true, false, false, 0.000, 0.000,
          '2100-05-001', '{"isTestMerchant": true, "createdFor": "watch_to_earn_testing"}', NOW(), NOW()
        )
        ON CONFLICT ("merchantId") DO UPDATE SET
          "adFloatBalance" = 600.00, "adFloatInitialBalance" = 600.00, "updatedAt" = NOW()
      `);
      for (const ad of demoAds) {
        await sequelize.query(`
          INSERT INTO ad_campaigns (
            id, "merchantId", title, description, "videoUrl", "thumbnailUrl",
            "durationSeconds", "adType", status, "totalBudget", "remainingBudget",
            "costPerView", "rewardPerView", "targetingRules",
            "conversionEmail", "conversionWebhookUrl",
            "moderationStatus", "moderatedAt", "moderatedBy", "moderationNotes",
            "totalViews", "totalEngagements", metadata, "createdAt", "updatedAt"
          ) VALUES (
            :id, 'DUMMY_AD_MERCHANT_001', :title, :description, :videoUrl, :thumbnailUrl,
            15, :adType, 'active', 600.00, 600.00, :costPerView, :rewardPerView, NULL,
            'leads-test@mymoolah.africa', NULL, 'approved', NOW(), 'admin', 'Test ad - approved for UAT/Staging',
            0, 0, '{"isTestAd": true}', NOW(), NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = :title, description = :description, "videoUrl" = :videoUrl, "thumbnailUrl" = :thumbnailUrl,
            "durationSeconds" = 15, "costPerView" = :costPerView, "rewardPerView" = :rewardPerView, "updatedAt" = NOW()
        `, {
          replacements: {
            id: ad.id,
            title: ad.title,
            description: ad.description,
            videoUrl,
            thumbnailUrl,
            adType: ad.adType,
            costPerView: ad.costPerView,
            rewardPerView: ad.rewardPerView
          }
        });
      }
      console.log('✅ [AdService] Demo ads ensured for non-production (UAT/Staging)');
    } catch (err) {
      console.error('❌ [AdService] Failed to ensure demo ads:', err.message);
      // Non-fatal: getAvailableAds will still return [] if this fails
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
      // Check environment - UAT/Staging allows re-watching for testing
      const isProduction = process.env.NODE_ENV === 'production' && 
                           !process.env.DATABASE_URL?.includes('uat') &&
                           !process.env.DATABASE_URL?.includes('staging');

      // Check if user already viewed this ad
      const existingView = await AdView.findOne({
        where: { userId, campaignId }
      });

      if (existingView) {
        if (existingView.status === 'completed') {
          if (isProduction) {
            throw new Error('You have already watched this ad');
          }
          // UAT/Staging: Allow re-watching - delete old view and create new
          await existingView.destroy();
        } else {
          // If started but not completed, return existing view
          return existingView;
        }
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

      // Credit wallet directly with increment (simpler, doesn't require credit method)
      await wallet.increment('balance', {
        by: parseFloat(campaign.rewardPerView),
        transaction
      });

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
        receiverWalletId: wallet.walletId, // User receives the reward
        amount: campaign.rewardPerView,
        type: 'receive', // Valid ENUM value - user receives ad reward
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
          isWatchToEarn: true,
          // VAT Note: User wallet credits are not subject to VAT as individual users
          // are not VAT registered. The merchant's cost already includes VAT.
          vatExempt: true,
          vatNote: 'User reward exempt - non-VAT registered individual'
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
