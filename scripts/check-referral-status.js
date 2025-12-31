const { getUATClient, closeAll } = require('./db-connection-helper');

async function checkReferralStatus() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    // 1. Check users
    const andreResult = await client.query(`
      SELECT id, "firstName", "lastName", "phoneNumber", "accountNumber"
      FROM users 
      WHERE "phoneNumber" = '+27825571055'
    `);
    
    const leonieResult = await client.query(`
      SELECT id, "firstName", "lastName", "phoneNumber", "accountNumber"
      FROM users 
      WHERE "phoneNumber" IN ('+27784560585', '0784560585')
    `);
    
    console.log('👤 USERS:');
    console.log('Andre:', andreResult.rows[0] || 'NOT FOUND');
    console.log('Leonie:', leonieResult.rows[0] || 'NOT FOUND');
    console.log('');

    if (!andreResult.rows[0]) {
      console.log('❌ Andre not found');
      return;
    }
    if (!leonieResult.rows[0]) {
      console.log('❌ Leonie not found');
      return;
    }

    const andreId = andreResult.rows[0].id;
    const leonieId = leonieResult.rows[0].id;
    
    console.log(`Andre ID: ${andreId}`);
    console.log(`Leonie ID: ${leonieId}\n`);

    // 2. Check referral relationship
    const referralResult = await client.query(`
      SELECT id, "referralCode", status, "activatedAt", "firstTransactionAt", "createdAt"
      FROM referrals 
      WHERE "referrerUserId" = $1 AND "referredUserId" = $2
    `, [andreId, leonieId]);
    
    console.log('🔗 REFERRAL RELATIONSHIP (Andre → Leonie):');
    if (referralResult.rows[0]) {
      console.log(`✅ FOUND:`);
      console.log(`   - ID: ${referralResult.rows[0].id}`);
      console.log(`   - Code: ${referralResult.rows[0].referralCode}`);
      console.log(`   - Status: ${referralResult.rows[0].status}`);
      console.log(`   - Activated: ${referralResult.rows[0].activatedAt || 'NOT ACTIVATED'}`);
      console.log(`   - First Transaction: ${referralResult.rows[0].firstTransactionAt || 'NO TRANSACTION'}`);
    } else {
      console.log('❌ NO REFERRAL RELATIONSHIP FOUND');
    }
    console.log('');

    // 3. Check referral chain
    const chainResult = await client.query(`
      SELECT * FROM referral_chains 
      WHERE "userId" = $1
    `, [leonieId]);
    
    console.log('⛓️ REFERRAL CHAIN (Leonie):');
    if (chainResult.rows[0]) {
      console.log(`✅ FOUND:`);
      console.log(`   - Chain Depth: ${chainResult.rows[0].chainDepth}`);
      console.log(`   - L1 (Direct): ${chainResult.rows[0].level1UserId || 'none'}`);
      console.log(`   - L2: ${chainResult.rows[0].level2UserId || 'none'}`);
      console.log(`   - L3: ${chainResult.rows[0].level3UserId || 'none'}`);
      console.log(`   - L4: ${chainResult.rows[0].level4UserId || 'none'}`);
    } else {
      console.log('❌ NO CHAIN FOUND - This is the problem! Leonie has no referral chain.');
    }
    console.log('');

    // 4. Check Leonie's recent transactions (looking for R95 purchase)
    const txnResult = await client.query(`
      SELECT id, "transactionId", "userId", amount, type, description, "createdAt"
      FROM transactions 
      WHERE "userId" = $1
      AND type IN ('debit', 'payment')
      ORDER BY "createdAt" DESC
      LIMIT 10
    `, [leonieId]);
    
    console.log('💳 LEONIE\'S RECENT TRANSACTIONS:');
    if (txnResult.rows.length === 0) {
      console.log('❌ NO TRANSACTIONS FOUND');
    } else {
      txnResult.rows.forEach(t => {
        const isR95 = Math.abs(t.amount) === 9500;
        console.log(`${isR95 ? '🎯' : '  '} ID: ${t.id}, Amount: R${Math.abs(t.amount)/100}, Type: ${t.type}, Date: ${t.createdAt.toISOString().split('T')[0]}`);
        console.log(`     Desc: ${t.description}`);
      });
    }
    console.log('');

    // 5. Check VAS transactions with commission
    const vasResult = await client.query(`
      SELECT id, "userId", "supplierId", "vasProductId", metadata, "createdAt", amount
      FROM vas_transactions 
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 5
    `, [leonieId]);
    
    console.log('📱 LEONIE\'S VAS TRANSACTIONS (with commission):');
    if (vasResult.rows.length === 0) {
      console.log('❌ NO VAS TRANSACTIONS FOUND');
    } else {
      vasResult.rows.forEach(t => {
        const commission = t.metadata?.commission;
        console.log(`- ID: ${t.id}, Amount: R${t.amount/100}, Date: ${t.createdAt.toISOString().split('T')[0]}`);
        if (commission) {
          console.log(`  Commission: ${commission.amountCents} cents, Net: ${commission.netAmountCents} cents`);
        } else {
          console.log(`  ⚠️ NO COMMISSION METADATA`);
        }
      });
    }
    console.log('');

    // 6. Check ALL referral earnings (not just Andre's)
    const allEarningsResult = await client.query(`
      SELECT * FROM referral_earnings 
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    
    console.log('💰 ALL REFERRAL EARNINGS IN DATABASE:');
    if (allEarningsResult.rows.length === 0) {
      console.log('❌ NO EARNINGS RECORDS FOUND IN ENTIRE TABLE');
    } else {
      console.log(`Found ${allEarningsResult.rows.length} earnings records:`);
      allEarningsResult.rows.forEach(e => {
        console.log(`- Earner: User ${e.earnerUserId}, From: User ${e.sourceUserId}, Amount: R${e.earnedAmountCents/100}, Level: ${e.level}, Status: ${e.status}`);
      });
    }
    console.log('');

    // 7. Check Andre's referral earnings specifically
    const andreEarningsResult = await client.query(`
      SELECT * FROM referral_earnings 
      WHERE "earnerUserId" = $1
      ORDER BY "createdAt" DESC
    `, [andreId]);
    
    console.log('💰 ANDRE\'S REFERRAL EARNINGS:');
    if (andreEarningsResult.rows.length === 0) {
      console.log('❌ NO EARNINGS FOR ANDRE');
    } else {
      andreEarningsResult.rows.forEach(e => {
        console.log(`- Amount: R${e.earnedAmountCents/100}, From: User ${e.sourceUserId}, Txn: ${e.transactionId}, Level: ${e.level}, Status: ${e.status}`);
      });
    }
    console.log('');

    // 8. Check Andre's referral stats
    const statsResult = await client.query(`
      SELECT * FROM user_referral_stats 
      WHERE "userId" = $1
    `, [andreId]);
    
    console.log('📊 ANDRE\'S REFERRAL STATS:');
    if (statsResult.rows[0]) {
      const stats = statsResult.rows[0];
      console.log(`✅ FOUND:`);
      console.log(`   - Total Referrals: ${stats.totalReferrals}`);
      console.log(`   - Active Referrals: ${stats.activeReferrals}`);
      console.log(`   - Lifetime Earnings: R${stats.lifetimeEarningsCents/100}`);
      console.log(`   - This Month Earnings: R${(stats.level1MonthCents || 0)/100}`);
      console.log(`   - Total Paid Out: R${stats.totalPaidOutCents/100}`);
    } else {
      console.log('❌ NO STATS FOUND');
    }
    console.log('');

    // 9. Summary
    console.log('═══════════════════════════════════════');
    console.log('📋 DIAGNOSIS SUMMARY');
    console.log('═══════════════════════════════════════');
    
    if (!chainResult.rows[0]) {
      console.log('🔴 PROBLEM: Leonie has NO referral chain');
      console.log('   → Referral relationship exists but chain was never built');
      console.log('   → This prevents ANY referral earnings from being calculated');
      console.log('');
      console.log('🔧 SOLUTION: Build referral chain for Leonie');
      console.log('   Run: node scripts/build-missing-referral-chains.js');
    } else if (allEarningsResult.rows.length === 0) {
      console.log('🔴 PROBLEM: Zero earnings in entire system');
      console.log('   → Code fix (reload) is applied but needs testing');
      console.log('   → Make a new test purchase to verify fix works');
    } else if (andreEarningsResult.rows.length === 0) {
      console.log('🟡 PROBLEM: Earnings exist but none for Andre');
      console.log('   → Check if Leonie\'s transactions have commission metadata');
      console.log('   → Verify Leonie\'s chain points to Andre');
    } else {
      console.log('✅ System working correctly');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      client.release();
    }
    await closeAll();
  }
}

checkReferralStatus().catch(console.error);
