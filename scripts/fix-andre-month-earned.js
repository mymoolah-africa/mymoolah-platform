#!/usr/bin/env node
/**
 * Fix Andre's month_earned_cents to match the sum of all level earnings
 */

const { getUATClient, closeAll } = require('./db-connection-helper');

async function fixStats() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    const andreId = 1;

    // Get current stats
    const statsResult = await client.query(`
      SELECT 
        total_earned_cents,
        month_earned_cents,
        level_1_month_cents,
        level_2_month_cents,
        level_3_month_cents,
        level_4_month_cents,
        month_year
      FROM user_referral_stats 
      WHERE user_id = $1
    `, [andreId]);

    if (statsResult.rows.length === 0) {
      console.log('❌ No stats found for Andre');
      return;
    }

    const stats = statsResult.rows[0];
    const sumOfLevels = stats.level_1_month_cents + stats.level_2_month_cents + 
                       stats.level_3_month_cents + stats.level_4_month_cents;

    console.log('📊 CURRENT STATS:');
    console.log(`   Total Earned: R${stats.total_earned_cents/100}`);
    console.log(`   Month Earned: R${stats.month_earned_cents/100}`);
    console.log(`   Sum of Levels: R${sumOfLevels/100}`);
    console.log(`   Level 1: R${stats.level_1_month_cents/100}`);
    console.log(`   Level 2: R${stats.level_2_month_cents/100}`);
    console.log(`   Level 3: R${stats.level_3_month_cents/100}`);
    console.log(`   Level 4: R${stats.level_4_month_cents/100}\n`);

    if (stats.month_earned_cents === sumOfLevels) {
      console.log('✅ Stats are already correct! No update needed.');
      return;
    }

    console.log(`🔄 Updating month_earned_cents from R${stats.month_earned_cents/100} to R${sumOfLevels/100}...`);
    
    await client.query(`
      UPDATE user_referral_stats 
      SET 
        month_earned_cents = $1,
        updated_at = NOW()
      WHERE user_id = $2
    `, [sumOfLevels, andreId]);

    console.log('✅ Stats updated successfully!\n');
    console.log('='.repeat(80));
    console.log('✅ SUCCESS: month_earned_cents now matches sum of all levels!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closeAll();
  }
}

fixStats();

