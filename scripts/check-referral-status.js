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
      SELECT id, referral_code, status, activated_at, first_transaction_at, created_at
      FROM referrals 
      WHERE referrer_user_id = $1 AND referee_user_id = $2
    `, [andreId, leonieId]);
    
    console.log('🔗 REFERRAL RELATIONSHIP (Andre → Leonie):');
    if (referralResult.rows[0]) {
      console.log(`✅ FOUND:`);
      console.log(`   - ID: ${referralResult.rows[0].id}`);
      console.log(`   - Code: ${referralResult.rows[0].referral_code}`);
      console.log(`   - Status: ${referralResult.rows[0].status}`);
      console.log(`   - Activated: ${referralResult.rows[0].activated_at || 'NOT ACTIVATED'}`);
      console.log(`   - First Transaction: ${referralResult.rows[0].first_transaction_at || 'NO TRANSACTION'}`);
    } else {
      console.log('❌ NO REFERRAL RELATIONSHIP FOUND');
    }
    console.log('');

    // 3. Check referral chain
    const chainResult = await client.query(`
      SELECT * FROM referral_chains 
      WHERE user_id = $1
    `, [leonieId]);
    
    console.log('⛓️ REFERRAL CHAIN (Leonie):');
    if (chainResult.rows[0]) {
      console.log(`✅ FOUND:`);
      console.log(`   - Chain Depth: ${chainResult.rows[0].chain_depth}`);
      console.log(`   - L1 (Direct): ${chainResult.rows[0].level1_user_id || 'none'}`);
      console.log(`   - L2: ${chainResult.rows[0].level2_user_id || 'none'}`);
      console.log(`   - L3: ${chainResult.rows[0].level3_user_id || 'none'}`);
      console.log(`   - L4: ${chainResult.rows[0].level4_user_id || 'none'}`);
    } else {
      console.log('❌ NO CHAIN FOUND - This is the problem! Leonie has no referral chain.');
    }
    console.log('');

    // 4. Check Leonie's recent transactions
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

    // 5. Check VAS transactions
    const vasResult = await client.query(`
      SELECT id, "userId", "supplierId", "vasProductId", metadata, "createdAt", amount
      FROM vas_transactions 
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 5
    `, [leonieId]);
    
    console.log('📱 LEONIE\'S VAS TRANSACTIONS:');
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

    // 6. Check ALL referral earnings
    const allEarningsResult = await client.query(`
      SELECT * FROM referral_earnings 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('💰 ALL REFERRAL EARNINGS IN DATABASE:');
    if (allEarningsResult.rows.length === 0) {
      console.log('❌ NO EARNINGS RECORDS FOUND IN ENTIRE TABLE');
    } else {
      console.log(`Found ${allEarningsResult.rows.length} earnings records:`);
      allEarningsResult.rows.forEach(e => {
        console.log(`- Earner: User ${e.earner_user_id}, From: User ${e.source_user_id}, Amount: R${e.earned_amount_cents/100}, Level: ${e.level}, Status: ${e.status}`);
      });
    }
    console.log('');

    // 7. Check Andre's earnings
    const andreEarningsResult = await client.query(`
      SELECT * FROM referral_earnings 
      WHERE earner_user_id = $1
      ORDER BY created_at DESC
    `, [andreId]);
    
    console.log('💰 ANDRE\'S REFERRAL EARNINGS:');
    if (andreEarningsResult.rows.length === 0) {
      console.log('❌ NO EARNINGS FOR ANDRE');
    } else {
      andreEarningsResult.rows.forEach(e => {
        console.log(`- Amount: R${e.earned_amount_cents/100}, From: User ${e.source_user_id}, Txn: ${e.transaction_id}, Level: ${e.level}, Status: ${e.status}`);
      });
    }
    console.log('');

    // 8. Check Andre's stats
    const statsResult = await client.query(`
      SELECT * FROM user_referral_stats 
      WHERE user_id = $1
    `, [andreId]);
    
    console.log('📊 ANDRE\'S REFERRAL STATS:');
    if (statsResult.rows[0]) {
      const stats = statsResult.rows[0];
      console.log(`✅ FOUND:`);
      console.log(`   - Total Referrals: ${stats.total_referrals}`);
      console.log(`   - Active Referrals: ${stats.active_referrals}`);
      console.log(`   - Lifetime Earnings: R${stats.lifetime_earnings_cents/100}`);
      console.log(`   - This Month Earnings: R${(stats.level1_month_cents || 0)/100}`);
      console.log(`   - Total Paid Out: R${stats.total_paid_out_cents/100}`);
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
      console.log('   → Call: referralService.buildReferralChain(leonieId)');
    } else if (allEarningsResult.rows.length === 0) {
      console.log('🔴 PROBLEM: Zero earnings in entire system');
      console.log('   → Code fix is applied but needs testing with new purchase');
    } else if (andreEarningsResult.rows.length === 0) {
      console.log('🟡 PROBLEM: Earnings exist but none for Andre');
      console.log('   → Check Leonie\'s chain points to Andre');
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
