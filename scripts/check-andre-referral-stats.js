#!/usr/bin/env node
/**
 * Check Andre's referral stats to see why "This Month" shows R0.16 instead of R0.17
 */

const { getUATClient, closeAll } = require('./db-connection-helper');

async function checkStats() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    const andreId = 1;

    // Get all of Andre's earnings
    const earningsResult = await client.query(`
      SELECT re.id, re.level, re.earned_amount_cents, re.status, re.created_at,
             re.month_year,
             u."firstName" || ' ' || u."lastName" as transaction_user_name
      FROM referral_earnings re
      JOIN users u ON u.id = re.transaction_user_id
      WHERE re.earner_user_id = $1
      ORDER BY re.created_at ASC
    `, [andreId]);
    
    console.log('💰 ALL OF ANDRE\'S EARNINGS:');
    let totalCents = 0;
    let decemberCents = 0;
    
    earningsResult.rows.forEach(earning => {
      const date = new Date(earning.created_at);
      const isDecember = date.getMonth() === 11; // December is month 11 (0-indexed)
      const amount = earning.earned_amount_cents;
      totalCents += amount;
      if (isDecember) {
        decemberCents += amount;
      }
      
      console.log(`   Level ${earning.level} from ${earning.transaction_user_name}:`);
      console.log(`      Amount: R${amount/100}`);
      console.log(`      Status: ${earning.status}`);
      console.log(`      Month: ${earning.month_year || 'N/A'}`);
      console.log(`      Created: ${date.toISOString().split('T')[0]}`);
      console.log(`      Is December: ${isDecember ? 'YES' : 'NO'}`);
      console.log('');
    });
    
    console.log(`📊 TOTALS:`);
    console.log(`   All Time: R${totalCents/100}`);
    console.log(`   December: R${decemberCents/100}`);
    
    // Get Andre's stats
    const statsResult = await client.query(`
      SELECT 
        total_earned_cents,
        month_earned_cents,
        level_1_month_cents,
        level_2_month_cents,
        level_3_month_cents,
        month_year
      FROM user_referral_stats 
      WHERE user_id = $1
    `, [andreId]);
    
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`\n📊 ANDRE'S STATS:`);
      console.log(`   Total Earned (all time): R${stats.total_earned_cents/100}`);
      console.log(`   Month Earned: R${stats.month_earned_cents/100}`);
      console.log(`   Month Year: ${stats.month_year || 'N/A'}`);
      console.log(`   Level 1 Month: R${stats.level_1_month_cents/100}`);
      console.log(`   Level 2 Month: R${stats.level_2_month_cents/100}`);
      console.log(`   Level 3 Month: R${stats.level_3_month_cents/100}`);
      
      const sumOfLevels = stats.level_1_month_cents + stats.level_2_month_cents + stats.level_3_month_cents;
      console.log(`   Sum of all levels: R${sumOfLevels/100}`);
      
      console.log(`\n🔍 COMPARISON:`);
      console.log(`   Expected Total: R${totalCents/100}`);
      console.log(`   Stats Total: R${stats.total_earned_cents/100}`);
      console.log(`   Expected December: R${decemberCents/100}`);
      console.log(`   Stats Month: R${stats.month_earned_cents/100}`);
      console.log(`   Sum of Levels: R${sumOfLevels/100}`);
      
      if (stats.month_earned_cents !== decemberCents) {
        console.log(`\n   ❌ MISMATCH: Month earned (${stats.month_earned_cents}) != December total (${decemberCents})`);
        console.log(`   💡 Need to update month_earned_cents to match December total`);
      }
      
      if (stats.total_earned_cents !== totalCents) {
        console.log(`\n   ❌ MISMATCH: Total earned (${stats.total_earned_cents}) != All earnings total (${totalCents})`);
        console.log(`   💡 Need to update total_earned_cents to match all earnings`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await closeAll();
  }
}

checkStats();


