const { getUATClient, closeAll } = require('./db-connection-helper');

async function checkAndreWallet() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    const andreId = 1;

    // 1. Check wallet balance
    const walletResult = await client.query(`
      SELECT * FROM wallets 
      WHERE "userId" = $1
    `, [andreId]);
    
    console.log('💰 ANDRE\'S WALLET:');
    if (walletResult.rows[0]) {
      console.log(`   Balance: R${walletResult.rows[0].balance}`);
      console.log(`   Wallet ID: ${walletResult.rows[0].walletId}`);
    }
    console.log('');

    // 2. Check recent transactions (last 20)
    const txnResult = await client.query(`
      SELECT id, "transactionId", amount, type, description, "createdAt"
      FROM transactions 
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 20
    `, [andreId]);
    
    console.log('💳 ANDRE\'S RECENT TRANSACTIONS (Last 20):');
    txnResult.rows.forEach(t => {
      const isReferral = t.description?.toLowerCase().includes('referral');
      console.log(`${isReferral ? '🎯' : '  '} ID: ${t.id}, Amount: R${t.amount/100}, Type: ${t.type}, Date: ${t.createdAt.toISOString().split('T')[0]}`);
      console.log(`     Desc: ${t.description}`);
    });
    console.log('');

    // 3. Check referral earnings
    const earningsResult = await client.query(`
      SELECT * FROM referral_earnings 
      WHERE earner_user_id = $1
      ORDER BY created_at DESC
    `, [andreId]);
    
    console.log('💰 ANDRE\'S REFERRAL EARNINGS:');
    earningsResult.rows.forEach(e => {
      console.log(`- ID: ${e.id}, Amount: R${e.earned_amount_cents/100}, Txn: ${e.transaction_id}, Status: ${e.status}, Created: ${e.created_at.toISOString().split('T')[0]}`);
    });
    console.log('');

    // 4. Check referral payouts
    const payoutResult = await client.query(`
      SELECT * FROM referral_payouts 
      ORDER BY payout_date DESC
      LIMIT 5
    `);
    
    console.log('💸 RECENT REFERRAL PAYOUTS:');
    if (payoutResult.rows.length === 0) {
      console.log('❌ NO PAYOUTS FOUND');
    } else {
      payoutResult.rows.forEach(p => {
        console.log(`- Batch: ${p.batch_id}, Status: ${p.status}, Users: ${p.total_users}, Amount: R${p.total_amount_cents/100}`);
        console.log(`  Started: ${p.started_at}, Completed: ${p.completed_at || 'NOT COMPLETED'}`);
      });
    }
    console.log('');

    // 5. Summary
    console.log('═══════════════════════════════════════');
    console.log('📋 SUMMARY');
    console.log('═══════════════════════════════════════');
    
    const referralTxns = txnResult.rows.filter(t => t.description?.toLowerCase().includes('referral'));
    if (referralTxns.length === 0) {
      console.log('❌ NO referral payout transactions found');
      console.log('   → Payout script may have failed');
      console.log('   → Or wallet credit transaction not created');
    } else {
      console.log(`✅ Found ${referralTxns.length} referral payout transaction(s)`);
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

checkAndreWallet().catch(console.error);
