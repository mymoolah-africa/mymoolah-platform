const { getUATClient, closeAll } = require('./db-connection-helper');

async function debugReferralIssue() {
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

    if (!andreResult.rows[0] || !leonieResult.rows[0]) {
      console.log('❌ One or both users not found');
      return;
    }

    const andreId = andreResult.rows[0].id;
    const leonieId = leonieResult.rows[0].id;

    // 2. Check referral relationship
    const referralResult = await client.query(`
      SELECT * FROM referrals 
      WHERE "referrerUserId" = $1 AND "referredUserId" = $2
    `, [andreId, leonieId]);
    
    console.log('🔗 REFERRAL RELATIONSHIP:');
    console.log(referralResult.rows[0] || 'NOT FOUND');
    console.log('');

    // 3. Check referral chain
    const chainResult = await client.query(`
      SELECT * FROM referral_chains 
      WHERE "userId" = $1
    `, [leonieId]);
    
    console.log('⛓️ REFERRAL CHAIN (Leonie):');
    console.log(chainResult.rows[0] || 'NOT FOUND');
    console.log('');

    // 4. Check recent transactions by Leonie
    const txnResult = await client.query(`
      SELECT id, "transactionId", "userId", amount, type, description, "createdAt"
      FROM transactions 
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 10
    `, [leonieId]);
    
    console.log('💳 LEONIE\'S RECENT TRANSACTIONS:');
    if (txnResult.rows.length === 0) {
      console.log('❌ NO TRANSACTIONS FOUND');
    } else {
      txnResult.rows.forEach(t => {
        console.log(`- ID: ${t.id}, Amount: R${t.amount/100}, Type: ${t.type}, Desc: ${t.description}, Date: ${t.createdAt}`);
      });
    }
    console.log('');

    // 5. Check VAS transactions
    const vasResult = await client.query(`
      SELECT id, "userId", "supplierId", "vasProductId", metadata, "createdAt"
      FROM vas_transactions 
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 3
    `, [leonieId]);
    
    console.log('📱 LEONIE\'S VAS TRANSACTIONS:');
    if (vasResult.rows.length === 0) {
      console.log('❌ NO VAS TRANSACTIONS FOUND');
    } else {
      vasResult.rows.forEach(t => {
        const commission = t.metadata?.commission;
        console.log(`- ID: ${t.id}, Supplier: ${t.supplierId}, Date: ${t.createdAt}`);
        console.log(`  Commission: ${JSON.stringify(commission)}`);
      });
    }
    console.log('');

    // 6. Check referral earnings for Andre
    const earningsResult = await client.query(`
      SELECT * FROM referral_earnings 
      WHERE "earnerUserId" = $1
      ORDER BY "createdAt" DESC
    `, [andreId]);
    
    console.log('💰 ANDRE\'S REFERRAL EARNINGS:');
    if (earningsResult.rows.length === 0) {
      console.log('❌ NO EARNINGS FOUND');
    } else {
      earningsResult.rows.forEach(e => {
        console.log(`- Amount: R${e.earnedAmountCents/100}, From: User ${e.sourceUserId}, Transaction: ${e.transactionId}, Level: ${e.level}, Status: ${e.status}`);
      });
    }
    console.log('');

    // 7. Check referral stats
    const statsResult = await client.query(`
      SELECT * FROM user_referral_stats 
      WHERE "userId" = $1
    `, [andreId]);
    
    console.log('📊 ANDRE\'S REFERRAL STATS:');
    console.log(statsResult.rows[0] || 'NOT FOUND');
    console.log('');

    // 8. Check if referral is activated
    const statusResult = await client.query(`
      SELECT * FROM referrals 
      WHERE "referredUserId" = $1
    `, [leonieId]);
    
    console.log('🔓 LEONIE\'S REFERRAL STATUS:');
    if (statusResult.rows[0]) {
      console.log(`- Status: ${statusResult.rows[0].status}`);
      console.log(`- Activated At: ${statusResult.rows[0].activatedAt || 'NOT ACTIVATED'}`);
      console.log(`- First Transaction At: ${statusResult.rows[0].firstTransactionAt || 'NO TRANSACTION'}`);
    } else {
      console.log('❌ NO REFERRAL RECORD FOUND');
    }
    console.log('');

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

debugReferralIssue();


