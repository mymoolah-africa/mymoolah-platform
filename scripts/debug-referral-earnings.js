require('dotenv').config();
const { Sequelize } = require('sequelize');

async function checkReferralEarnings() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialectOptions: { ssl: false }
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to UAT database\n');

    // 1. Check users
    const [andre] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "phoneNumber", "accountNumber"
      FROM users 
      WHERE "phoneNumber" = '+27825571055'
    `);
    
    const [leonie] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "phoneNumber", "accountNumber"
      FROM users 
      WHERE "phoneNumber" IN ('+27784560585', '0784560585')
    `);
    
    console.log('👤 USERS:');
    console.log('Andre:', andre[0] || 'NOT FOUND');
    console.log('Leonie:', leonie[0] || 'NOT FOUND');
    console.log('');

    if (!andre[0] || !leonie[0]) {
      console.log('❌ One or both users not found');
      return;
    }

    const andreId = andre[0].id;
    const leonieId = leonie[0].id;

    // 2. Check referral relationship
    const [referrals] = await sequelize.query(`
      SELECT * FROM referrals 
      WHERE "referrerUserId" = ${andreId} AND "referredUserId" = ${leonieId}
    `);
    
    console.log('🔗 REFERRAL RELATIONSHIP:');
    console.log(referrals[0] || 'NOT FOUND');
    console.log('');

    // 3. Check referral chain
    const [chains] = await sequelize.query(`
      SELECT * FROM referral_chains 
      WHERE "userId" = ${leonieId}
    `);
    
    console.log('⛓️ REFERRAL CHAIN (Leonie):');
    console.log(chains[0] || 'NOT FOUND');
    console.log('');

    // 4. Check recent transactions by Leonie (R95 purchase)
    const [transactions] = await sequelize.query(`
      SELECT id, "transactionId", "userId", amount, type, description, "createdAt"
      FROM transactions 
      WHERE "userId" = ${leonieId}
      AND amount = 9500
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);
    
    console.log('💳 LEONIE\'S R95 TRANSACTIONS:');
    if (transactions.length === 0) {
      console.log('❌ NO R95 TRANSACTIONS FOUND');
      // Check all transactions
      const [allTxns] = await sequelize.query(`
        SELECT id, "transactionId", "userId", amount, type, description, "createdAt"
        FROM transactions 
        WHERE "userId" = ${leonieId}
        ORDER BY "createdAt" DESC
        LIMIT 10
      `);
      console.log('All recent transactions:');
      allTxns.forEach(t => {
        console.log(`- ID: ${t.id}, Amount: R${t.amount/100}, Type: ${t.type}, Desc: ${t.description}, Date: ${t.createdAt}`);
      });
    } else {
      transactions.forEach(t => {
        console.log(`- ID: ${t.id}, Amount: R${t.amount/100}, Type: ${t.type}, Desc: ${t.description}, Date: ${t.createdAt}`);
      });
    }
    console.log('');

    // 5. Check VAS transactions
    const [vasTransactions] = await sequelize.query(`
      SELECT id, "userId", "supplierId", "vasProductId", metadata, "createdAt"
      FROM vas_transactions 
      WHERE "userId" = ${leonieId}
      ORDER BY "createdAt" DESC
      LIMIT 3
    `);
    
    console.log('📱 LEONIE\'S VAS TRANSACTIONS:');
    if (vasTransactions.length === 0) {
      console.log('❌ NO VAS TRANSACTIONS FOUND');
    } else {
      vasTransactions.forEach(t => {
        const commission = t.metadata?.commission;
        console.log(`- ID: ${t.id}, Supplier: ${t.supplierId}, Date: ${t.createdAt}`);
        console.log(`  Commission: ${JSON.stringify(commission)}`);
      });
    }
    console.log('');

    // 6. Check referral earnings for Andre
    const [earnings] = await sequelize.query(`
      SELECT * FROM referral_earnings 
      WHERE "earnerUserId" = ${andreId}
      ORDER BY "createdAt" DESC
    `);
    
    console.log('💰 ANDRE\'S REFERRAL EARNINGS:');
    if (earnings.length === 0) {
      console.log('❌ NO EARNINGS FOUND');
    } else {
      earnings.forEach(e => {
        console.log(`- Amount: R${e.earnedAmountCents/100}, From: User ${e.sourceUserId}, Transaction: ${e.transactionId}, Level: ${e.level}, Status: ${e.status}`);
      });
    }
    console.log('');

    // 7. Check referral stats
    const [stats] = await sequelize.query(`
      SELECT * FROM user_referral_stats 
      WHERE "userId" = ${andreId}
    `);
    
    console.log('📊 ANDRE\'S REFERRAL STATS:');
    console.log(stats[0] || 'NOT FOUND');
    console.log('');

    // 8. Check if referral is activated
    const [referralStatus] = await sequelize.query(`
      SELECT * FROM referrals 
      WHERE "referredUserId" = ${leonieId}
    `);
    
    console.log('🔓 LEONIE\'S REFERRAL STATUS:');
    if (referralStatus[0]) {
      console.log(`- Status: ${referralStatus[0].status}`);
      console.log(`- Activated At: ${referralStatus[0].activatedAt || 'NOT ACTIVATED'}`);
      console.log(`- First Transaction At: ${referralStatus[0].firstTransactionAt || 'NO TRANSACTION'}`);
    } else {
      console.log('❌ NO REFERRAL RECORD FOUND');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

checkReferralEarnings();


