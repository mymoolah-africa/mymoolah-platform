/**
 * Seed Watch to Earn Test Data
 * 
 * Creates:
 * - 1 dummy merchant float with prefunded ad float account
 * - 10 dummy ads (mix of Reach and Engagement types, all approved)
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create dummy merchant float with prefunded ad float account
    await queryInterface.bulkInsert('merchant_floats', [{
      merchantId: 'DUMMY_AD_MERCHANT_001',
      merchantName: 'Test Advertiser (Dummy)',
      merchantType: 'other',
      floatAccountNumber: 'MF-AD-DUMMY-001',
      floatAccountName: 'Dummy Advertiser Float Account',
      currentBalance: 1000.00, // For voucher operations (separate)
      initialBalance: 1000.00,
      minimumBalance: 0.00,
      maximumBalance: null,
      adFloatBalance: 600.00, // Prefunded ad budget: R600 = 100 ad views at R6.00 each
      adFloatInitialBalance: 600.00,
      adFloatMinimumBalance: 0.00,
      settlementPeriod: 'monthly',
      settlementMethod: 'prefunded',
      status: 'active',
      isActive: true,
      canSellVouchers: false,
      canRedeemVouchers: false,
      voucherSaleCommission: 0.000,
      voucherRedemptionFee: 0.000,
      ledgerAccountCode: '2100-05-001', // Merchant ad float ledger account
      metadata: JSON.stringify({
        isTestMerchant: true,
        createdFor: 'watch_to_earn_testing'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // 2. Create 10 dummy ads (mix of Reach and Engagement, all approved)
    const dummyAds = [
      // Reach Ads (5)
      {
        id: '00000000-0001-0000-0000-000000000001',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Vodacom Airtime Deals',
        description: 'Get amazing airtime deals with Vodacom. Top up now and save!',
        videoUrl: 'gs://mymoolah-ads/test/vodacom-airtime.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/vodacom-airtime-thumb.jpg',
        durationSeconds: 25,
        adType: 'reach',
        status: 'active',
        totalBudget: 600.00,
        remainingBudget: 600.00,
        costPerView: 6.00,
        rewardPerView: 2.00,
        targetingRules: null,
        conversionEmail: null,
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0002-0000-0000-000000000002',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'MTN Data Bundles',
        description: 'Stream, browse, and stay connected with MTN data bundles.',
        videoUrl: 'gs://mymoolah-ads/test/mtn-data.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/mtn-data-thumb.jpg',
        durationSeconds: 20,
        adType: 'reach',
        status: 'active',
        totalBudget: 600.00,
        remainingBudget: 600.00,
        costPerView: 6.00,
        rewardPerView: 2.00,
        targetingRules: null,
        conversionEmail: null,
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0003-0000-0000-000000000003',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Shoprite Specials',
        description: 'Fresh groceries at unbeatable prices. Visit Shoprite today!',
        videoUrl: 'gs://mymoolah-ads/test/shoprite-specials.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/shoprite-specials-thumb.jpg',
        durationSeconds: 30,
        adType: 'reach',
        status: 'active',
        totalBudget: 600.00,
        remainingBudget: 600.00,
        costPerView: 6.00,
        rewardPerView: 2.00,
        targetingRules: null,
        conversionEmail: null,
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0004-0000-0000-000000000004',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Checkers Fresh Produce',
        description: 'Farm-fresh produce delivered to your door. Shop Checkers now!',
        videoUrl: 'gs://mymoolah-ads/test/checkers-produce.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/checkers-produce-thumb.jpg',
        durationSeconds: 25,
        adType: 'reach',
        status: 'active',
        totalBudget: 600.00,
        remainingBudget: 600.00,
        costPerView: 6.00,
        rewardPerView: 2.00,
        targetingRules: null,
        conversionEmail: null,
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0005-0000-0000-000000000005',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Capitec Bank Savings',
        description: 'Save smarter with Capitec. Open a savings account today!',
        videoUrl: 'gs://mymoolah-ads/test/capitec-savings.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/capitec-savings-thumb.jpg',
        durationSeconds: 30,
        adType: 'reach',
        status: 'active',
        totalBudget: 600.00,
        remainingBudget: 600.00,
        costPerView: 6.00,
        rewardPerView: 2.00,
        targetingRules: null,
        conversionEmail: null,
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Engagement Ads (5) - with email/webhook for lead delivery
      {
        id: '00000000-0006-0000-0000-000000000006',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Hollywoodbets - New Player Bonus',
        description: 'Sign up now and get R25 free bet! Click "I\'m Interested" to receive your bonus code.',
        videoUrl: 'gs://mymoolah-ads/test/hollywoodbets-bonus.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/hollywoodbets-bonus-thumb.jpg',
        durationSeconds: 25,
        adType: 'engagement',
        status: 'active',
        totalBudget: 1500.00,
        remainingBudget: 1500.00,
        costPerView: 15.00,
        rewardPerView: 3.00,
        targetingRules: null,
        conversionEmail: 'leads-test@mymoolah.africa', // Test email
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test engagement ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0007-0000-0000-000000000007',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Betway Sports Betting',
        description: 'Bet on your favorite sports. Get R50 welcome bonus!',
        videoUrl: 'gs://mymoolah-ads/test/betway-sports.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/betway-sports-thumb.jpg',
        durationSeconds: 30,
        adType: 'engagement',
        status: 'active',
        totalBudget: 1500.00,
        remainingBudget: 1500.00,
        costPerView: 15.00,
        rewardPerView: 3.00,
        targetingRules: JSON.stringify({ minAge: 18 }), // Age-restricted (future)
        conversionEmail: 'leads-test@mymoolah.africa',
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test engagement ad - age-restricted (18+)',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true, ageRestricted: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0008-0000-0000-000000000008',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Old Mutual Life Insurance',
        description: 'Protect your family with affordable life insurance. Get a free quote!',
        videoUrl: 'gs://mymoolah-ads/test/old-mutual-insurance.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/old-mutual-insurance-thumb.jpg',
        durationSeconds: 30,
        adType: 'engagement',
        status: 'active',
        totalBudget: 1500.00,
        remainingBudget: 1500.00,
        costPerView: 15.00,
        rewardPerView: 3.00,
        targetingRules: null,
        conversionEmail: 'leads-test@mymoolah.africa',
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test engagement ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0009-0000-0000-000000000009',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'TymeBank Student Account',
        description: 'Free banking for students. No monthly fees, no minimum balance!',
        videoUrl: 'gs://mymoolah-ads/test/tymebank-student.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/tymebank-student-thumb.jpg',
        durationSeconds: 20,
        adType: 'engagement',
        status: 'active',
        totalBudget: 1500.00,
        remainingBudget: 1500.00,
        costPerView: 15.00,
        rewardPerView: 3.00,
        targetingRules: null,
        conversionEmail: 'leads-test@mymoolah.africa',
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test engagement ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0010-0000-0000-000000000010',
        merchantId: 'DUMMY_AD_MERCHANT_001',
        title: 'Takealot Black Friday',
        description: 'Biggest sale of the year! Free delivery on orders over R500.',
        videoUrl: 'gs://mymoolah-ads/test/takealot-sale.mp4',
        thumbnailUrl: 'gs://mymoolah-ads/test/takealot-sale-thumb.jpg',
        durationSeconds: 25,
        adType: 'engagement',
        status: 'active',
        totalBudget: 1500.00,
        remainingBudget: 1500.00,
        costPerView: 15.00,
        rewardPerView: 3.00,
        targetingRules: null,
        conversionEmail: 'leads-test@mymoolah.africa',
        conversionWebhookUrl: null,
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationNotes: 'Test engagement ad - approved for UAT testing',
        totalViews: 0,
        totalEngagements: 0,
        metadata: JSON.stringify({ isTestAd: true }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    console.log('✅ Watch to Earn test data seeded:');
    console.log('   - 1 dummy merchant float (R600 ad float balance)');
    console.log('   - 10 dummy ads (5 Reach + 5 Engagement, all approved)');
  },

  async down(queryInterface, Sequelize) {
    // Delete dummy ads
    await queryInterface.bulkDelete('ad_campaigns', {
      merchantId: 'DUMMY_AD_MERCHANT_001'
    }, {});

    // Delete dummy merchant float
    await queryInterface.bulkDelete('merchant_floats', {
      merchantId: 'DUMMY_AD_MERCHANT_001'
    }, {});

    console.log('✅ Watch to Earn test data removed');
  }
};
