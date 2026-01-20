#!/usr/bin/env node

/**
 * Seed Watch to Earn Test Data
 * 
 * Creates:
 * - 1 dummy merchant float with prefunded ad float account
 * - 10 dummy ads (5 Reach + 5 Engagement, all approved)
 * 
 * Uses db-connection-helper.js for proper connection management.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

const { getUATClient } = require('./db-connection-helper');

async function seedWatchToEarn() {
  let client;
  
  try {
    console.log('📋 Connecting to UAT database...');
    client = await getUATClient();
    console.log('✅ Connected to database');
    
    // First, clear old ad views so users can watch ads again (for testing)
    console.log('🗑️  Clearing old ad views for test campaigns...');
    await client.query(`
      DELETE FROM ad_views WHERE "campaignId" LIKE '00000000-00%'
    `);
    console.log('✅ Old ad views cleared');
    
    console.log('📝 Creating dummy merchant float with ad float account...');
    
    // 1. Create dummy merchant float
    await client.query(`
      INSERT INTO merchant_floats (
        "merchantId", "merchantName", "merchantType", "floatAccountNumber", "floatAccountName",
        "currentBalance", "initialBalance", "minimumBalance", "maximumBalance",
        "adFloatBalance", "adFloatInitialBalance", "adFloatMinimumBalance",
        "settlementPeriod", "settlementMethod", status, "isActive",
        "canSellVouchers", "canRedeemVouchers", "voucherSaleCommission", "voucherRedemptionFee",
        "ledgerAccountCode", metadata, "createdAt", "updatedAt"
      ) VALUES (
        'DUMMY_AD_MERCHANT_001',
        'Test Advertiser (Dummy)',
        'other',
        'MF-AD-DUMMY-001',
        'Dummy Advertiser Float Account',
        1000.00, 1000.00, 0.00, NULL,
        600.00, 600.00, 0.00,
        'monthly', 'prefunded', 'active', true,
        false, false, 0.000, 0.000,
        '2100-05-001',
        '{"isTestMerchant": true, "createdFor": "watch_to_earn_testing"}',
        NOW(), NOW()
      )
      ON CONFLICT ("merchantId") DO UPDATE SET
        "adFloatBalance" = 600.00,
        "adFloatInitialBalance" = 600.00,
        "updatedAt" = NOW();
    `);
    
    console.log('✅ Dummy merchant float created (R600 ad float balance)');
    
    console.log('📝 Creating 10 dummy ads...');
    
    // 2. Create dummy ads (mix of Reach and Engagement)
    const ads = [
      // Reach Ads (5)
      {
        id: '00000000-0001-0000-0000-000000000001',
        title: 'Vodacom Airtime Deals',
        description: 'Get amazing airtime deals with Vodacom. Top up now and save!',
        adType: 'reach',
        costPerView: 6.00,
        rewardPerView: 2.00
      },
      {
        id: '00000000-0002-0000-0000-000000000002',
        title: 'MTN Data Bundles',
        description: 'Stream, browse, and stay connected with MTN data bundles.',
        adType: 'reach',
        costPerView: 6.00,
        rewardPerView: 2.00
      },
      {
        id: '00000000-0003-0000-0000-000000000003',
        title: 'Shoprite Specials',
        description: 'Fresh groceries at unbeatable prices. Visit Shoprite today!',
        adType: 'reach',
        costPerView: 6.00,
        rewardPerView: 2.00
      },
      {
        id: '00000000-0004-0000-0000-000000000004',
        title: 'Checkers Fresh Produce',
        description: 'Farm-fresh produce delivered to your door. Shop Checkers now!',
        adType: 'reach',
        costPerView: 6.00,
        rewardPerView: 2.00
      },
      {
        id: '00000000-0005-0000-0000-000000000005',
        title: 'Capitec Bank Savings',
        description: 'Save smarter with Capitec. Open a savings account today!',
        adType: 'reach',
        costPerView: 6.00,
        rewardPerView: 2.00
      },
      // Engagement Ads (5)
      {
        id: '00000000-0006-0000-0000-000000000006',
        title: 'Hollywoodbets - New Player Bonus',
        description: 'Sign up now and get R25 free bet! Click "I\'m Interested" to receive your bonus code.',
        adType: 'engagement',
        costPerView: 15.00,
        rewardPerView: 3.00
      },
      {
        id: '00000000-0007-0000-0000-000000000007',
        title: 'Betway Sports Betting',
        description: 'Bet on your favorite sports. Get R50 welcome bonus!',
        adType: 'engagement',
        costPerView: 15.00,
        rewardPerView: 3.00
      },
      {
        id: '00000000-0008-0000-0000-000000000008',
        title: 'Old Mutual Life Insurance',
        description: 'Protect your family with affordable life insurance. Get a free quote!',
        adType: 'engagement',
        costPerView: 15.00,
        rewardPerView: 3.00
      },
      {
        id: '00000000-0009-0000-0000-000000000009',
        title: 'TymeBank Student Account',
        description: 'Free banking for students. No monthly fees, no minimum balance!',
        adType: 'engagement',
        costPerView: 15.00,
        rewardPerView: 3.00
      },
      {
        id: '00000000-0010-0000-0000-000000000010',
        title: 'Takealot Black Friday',
        description: 'Biggest sale of the year! Free delivery on orders over R500.',
        adType: 'engagement',
        costPerView: 15.00,
        rewardPerView: 3.00
      }
    ];
    
    // Use short 15-second test video from Google (CORS-enabled, works everywhere)
    // Perfect for UAT demos - quick to watch and test the full flow
    const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    const thumbnailUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg';
    
    for (const ad of ads) {
      await client.query(`
        INSERT INTO ad_campaigns (
          id, "merchantId", title, description, "videoUrl", "thumbnailUrl",
          "durationSeconds", "adType", status, "totalBudget", "remainingBudget",
          "costPerView", "rewardPerView", "targetingRules",
          "conversionEmail", "conversionWebhookUrl",
          "moderationStatus", "moderatedAt", "moderatedBy", "moderationNotes",
          "totalViews", "totalEngagements", metadata, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          15, $7, $8, 600.00, 600.00,
          $9, $10, NULL,
          $11, NULL,
          $12, NOW(), $13, $14,
          0, 0, $15, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = $3,
          description = $4,
          "videoUrl" = $5,
          "thumbnailUrl" = $6,
          "durationSeconds" = 15,
          "adType" = $7,
          "costPerView" = $9,
          "rewardPerView" = $10,
          "updatedAt" = NOW();
      `, [
        ad.id,                           // $1
        'DUMMY_AD_MERCHANT_001',        // $2
        ad.title,                        // $3
        ad.description,                  // $4
        videoUrl,                        // $5
        thumbnailUrl,                    // $6
        ad.adType,                       // $7
        'active',                        // $8
        ad.costPerView,                  // $9
        ad.rewardPerView,                // $10
        'leads-test@mymoolah.africa',   // $11
        'approved',                      // $12
        'admin',                         // $13
        'Test ad - approved for UAT testing', // $14
        '{"isTestAd": true}'            // $15
      ]);
    }
    
    console.log(`✅ 10 dummy ads created (5 Reach + 5 Engagement)`);
    console.log('');
    console.log('📊 Summary:');
    console.log('   - 1 dummy merchant float (R600 ad float balance)');
    console.log('   - 5 Reach ads (R2.00 reward each)');
    console.log('   - 5 Engagement ads (R3.00 reward each)');
    console.log('   - All ads approved and active');
    console.log('   - Using 15-second test video (perfect for UAT demos)');
    console.log('');
    console.log('✅ Watch to Earn seed data complete!');
    
    await client.end();
    console.log('✅ Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    if (client) await client.end();
    process.exit(1);
  }
}

seedWatchToEarn();
