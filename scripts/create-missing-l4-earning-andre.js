#!/usr/bin/env node
/**
 * Create missing L4 earning for Andre from Neil's R10 transaction
 * 
 * Transaction 399: Neil's R10 airtime purchase
 * Expected: Andre (L4) should earn 1 cent (1% of 26 cents net commission)
 */

const { getUATClient, closeAll } = require('./db-connection-helper');

async function createMissingEarning() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    const transactionId = 399; // Neil's R10 airtime transaction
    const andreId = 1; // Andre Botes
    const neilId = 7; // Neil Botes
    const netCommissionCents = 26; // Net commission from transaction
    const level = 4; // L4
    const percentage = 1.00; // 1%
    
    // Calculate earning (should be 1 cent with Math.ceil fix)
    const baseEarningCents = Math.ceil((netCommissionCents * percentage) / 100);
    console.log(`📊 Earning Calculation:`);
    console.log(`   Net Commission: ${netCommissionCents} cents`);
    console.log(`   Level: ${level} (${percentage}%)`);
    console.log(`   Base Earning: ${baseEarningCents} cent(s)`);
    console.log(`   (Math.ceil(26 * 1 / 100) = Math.ceil(0.26) = ${baseEarningCents})\n`);

    // Check if earning already exists
    const existingCheck = await client.query(`
      SELECT id, level, earned_amount_cents, status
      FROM referral_earnings 
      WHERE transaction_id = $1 
        AND earner_user_id = $2
        AND level = $3
    `, [transactionId, andreId, level]);

    if (existingCheck.rows.length > 0) {
      console.log('✅ Earning already exists:');
      console.log(`   ID: ${existingCheck.rows[0].id}`);
      console.log(`   Amount: R${existingCheck.rows[0].earned_amount_cents/100}`);
      console.log(`   Status: ${existingCheck.rows[0].status}`);
      return;
    }

    // Get current month
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get Andre's current stats for this month/level
    const statsResult = await client.query(`
      SELECT level_4_month_cents
      FROM user_referral_stats 
      WHERE user_id = $1
    `, [andreId]);

    const currentMonthCents = statsResult.rows[0]?.level_4_month_cents || 0;
    const newCumulativeCents = currentMonthCents + baseEarningCents;

    console.log(`📊 Stats:`);
    console.log(`   Current L4 month earnings: R${currentMonthCents/100}`);
    console.log(`   New cumulative: R${newCumulativeCents/100}\n`);

    // Create the earning
    console.log('🔄 Creating missing L4 earning for Andre...');
    const result = await client.query(`
      INSERT INTO referral_earnings (
        earner_user_id, 
        transaction_user_id, 
        transaction_id, 
        level, 
        percentage, 
        transaction_revenue_cents, 
        earned_amount_cents, 
        month_year, 
        cumulative_month_cents, 
        capped, 
        status, 
        transaction_type,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING id, earned_amount_cents, status
    `, [
      andreId,           // earner_user_id
      neilId,            // transaction_user_id
      transactionId,     // transaction_id
      level,             // level
      percentage,        // percentage
      netCommissionCents, // transaction_revenue_cents
      baseEarningCents,  // earned_amount_cents
      monthYear,         // month_year
      newCumulativeCents, // cumulative_month_cents
      false,             // capped
      'pending',         // status
      'vas_purchase'     // transaction_type
    ]);

    const earning = result.rows[0];
    console.log(`✅ Created earning:`);
    console.log(`   ID: ${earning.id}`);
    console.log(`   Amount: R${earning.earned_amount_cents/100}`);
    console.log(`   Status: ${earning.status}`);

    // Update Andre's stats
    console.log('\n🔄 Updating Andre\'s referral stats...');
    await client.query(`
      UPDATE user_referral_stats 
      SET 
        level_4_month_cents = $1,
        total_earned_cents = COALESCE(total_earned_cents, 0) + $2,
        updated_at = NOW()
      WHERE user_id = $3
    `, [newCumulativeCents, baseEarningCents, andreId]);

    console.log('✅ Stats updated\n');
    console.log('='.repeat(80));
    console.log('✅ SUCCESS: Missing L4 earning created for Andre!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closeAll();
  }
}

createMissingEarning();

