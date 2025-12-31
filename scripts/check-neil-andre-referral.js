#!/usr/bin/env node
/**
 * Check Neil Botes (L4) referral relationship with Andre Botes
 * and investigate why Andre didn't earn commission on Neil's R10 purchase
 */

const { getUATClient, closeAll } = require('./db-connection-helper');

async function checkReferralStatus() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    // 1. Find users
    const usersResult = await client.query(`
      SELECT id, "firstName", "lastName", "phoneNumber", "accountNumber"
      FROM users 
      WHERE "firstName" IN ('Andre', 'Neil') AND "lastName" = 'Botes'
      ORDER BY id
    `);
    
    console.log('👤 USERS:');
    usersResult.rows.forEach(user => {
      console.log(`   ${user.firstName}: { id: ${user.id}, phone: ${user.phoneNumber} }`);
    });
    
    const andre = usersResult.rows.find(u => u.firstName === 'Andre');
    const neil = usersResult.rows.find(u => u.firstName === 'Neil');
    
    if (!andre || !neil) {
      console.log('\n❌ Could not find both Andre and Neil');
      return;
    }
    
    console.log(`\nAndre ID: ${andre.id}`);
    console.log(`Neil ID: ${neil.id}\n`);

    // 2. Check referral chain for Neil
    const chainResult = await client.query(`
      SELECT user_id, chain_depth, level_1_user_id, level_2_user_id, level_3_user_id, level_4_user_id
      FROM referral_chains 
      WHERE user_id = $1
    `, [neil.id]);
    
    console.log('⛓️  REFERRAL CHAIN (Neil):');
    if (chainResult.rows.length === 0) {
      console.log('   ❌ NO CHAIN FOUND');
    } else {
      const chain = chainResult.rows[0];
      console.log(`   Chain Depth: ${chain.chain_depth}`);
      console.log(`   L1: ${chain.level_1_user_id || 'none'}`);
      console.log(`   L2: ${chain.level_2_user_id || 'none'}`);
      console.log(`   L3: ${chain.level_3_user_id || 'none'}`);
      console.log(`   L4: ${chain.level_4_user_id || 'none'}`);
      
      // Check if Andre is L4
      if (chain.level_4_user_id === andre.id) {
        console.log(`   ✅ CONFIRMED: Andre (${andre.id}) IS L4 of Neil (${neil.id})`);
      } else {
        console.log(`   ❌ Andre (${andre.id}) is NOT L4. L4 is: ${chain.level_4_user_id || 'none'}`);
      }
    }

    // 3. Check Neil's recent transactions (check for R10 airtime - could be -10.00 or -1000 cents)
    const transactionsResult = await client.query(`
      SELECT id, amount, type, status, description, currency, "createdAt"
      FROM transactions 
      WHERE "userId" = $1 
        AND type IN ('payment', 'debit')
        AND description ILIKE '%airtime%'
        AND (amount = -10.00 OR amount = -1000)
      ORDER BY "createdAt" DESC
      LIMIT 10
    `, [neil.id]);
    
    console.log(`\n💳 NEIL'S RECENT AIRTIME TRANSACTIONS (R10):`);
    if (transactionsResult.rows.length === 0) {
      console.log('   ❌ NO R10 AIRTIME TRANSACTIONS FOUND');
    } else {
      transactionsResult.rows.forEach(txn => {
        console.log(`   ID: ${txn.id}, Amount: R${Math.abs(txn.amount)}, Date: ${txn.createdAt.toISOString().split('T')[0]}`);
        console.log(`      Desc: ${txn.description}`);
      });
    }

    // 4. Check VAS transactions for Neil
    const vasResult = await client.query(`
      SELECT id, amount, "vasType", "supplierId", status, metadata, "createdAt"
      FROM vas_transactions 
      WHERE "userId" = $1 
        AND amount = 1000
        AND "vasType" = 'airtime'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `, [neil.id]);
    
    console.log(`\n📱 NEIL'S VAS TRANSACTIONS (R10 Airtime):`);
    if (vasResult.rows.length === 0) {
      console.log('   ❌ NO VAS TRANSACTIONS FOUND');
    } else {
      vasResult.rows.forEach(vas => {
        const commission = vas.metadata?.commission;
        console.log(`   ID: ${vas.id}, Amount: R${vas.amount/100}, Date: ${vas.createdAt.toISOString().split('T')[0]}`);
        if (commission) {
          console.log(`      Commission: ${commission.grossAmountCents} cents, Net: ${commission.netAmountCents} cents`);
        } else {
          console.log(`      ⚠️  NO COMMISSION METADATA`);
        }
      });
    }

    // 5. Check referral earnings for Andre from Neil's transactions
    const earningsResult = await client.query(`
      SELECT re.id, re."earnerUserId", re."transactionUserId", re."transaction_id", re.level, 
             re."earnedAmountCents", re.status, re."createdAt"
      FROM referral_earnings re
      JOIN transactions t ON t.id = re."transaction_id"
      WHERE re."earnerUserId" = $1
        AND re."transactionUserId" = $2
        AND t.description LIKE '%airtime%'
      ORDER BY re."createdAt" DESC
      LIMIT 10
    `, [andre.id, neil.id]);
    
    console.log(`\n💰 ANDRE'S REFERRAL EARNINGS FROM NEIL'S TRANSACTIONS:`);
    if (earningsResult.rows.length === 0) {
      console.log('   ❌ NO EARNINGS FOUND');
    } else {
      earningsResult.rows.forEach(earning => {
        console.log(`   Level ${earning.level}: R${earning.earnedAmountCents/100} (${earning.status})`);
        console.log(`      Transaction ID: ${earning.transaction_id}, Created: ${earning.createdAt.toISOString().split('T')[0]}`);
      });
    }

    // 6. Check all referral earnings for Andre (any level)
    const allEarningsResult = await client.query(`
      SELECT re.id, re."earnerUserId", re."transactionUserId", re."transaction_id", re.level, 
             re."earnedAmountCents", re.status, re."createdAt",
             u."firstName" || ' ' || u."lastName" as transaction_user_name
      FROM referral_earnings re
      JOIN transactions t ON t.id = re."transaction_id"
      JOIN users u ON u.id = re."transactionUserId"
      WHERE re."earnerUserId" = $1
      ORDER BY re."createdAt" DESC
      LIMIT 10
    `, [andre.id]);
    
    console.log(`\n💰 ALL OF ANDRE'S REFERRAL EARNINGS (any level):`);
    if (allEarningsResult.rows.length === 0) {
      console.log('   ❌ NO EARNINGS FOUND');
    } else {
      allEarningsResult.rows.forEach(earning => {
        console.log(`   Level ${earning.level} from ${earning.transaction_user_name}: R${earning.earnedAmountCents/100} (${earning.status})`);
      });
    }

    // 7. Check if there's a ledger transaction for Neil's purchase
    if (transactionsResult.rows.length > 0) {
      const latestTxn = transactionsResult.rows[0];
      const ledgerResult = await client.query(`
        SELECT id, transaction_id, user_id, amount, type, status, description, metadata
        FROM transactions 
        WHERE id = $1
      `, [latestTxn.id]);
      
      console.log(`\n📋 LATEST TRANSACTION DETAILS:`);
      if (ledgerResult.rows.length > 0) {
        const txn = ledgerResult.rows[0];
        console.log(`   ID: ${txn.id}`);
        console.log(`   Transaction ID: ${txn.transaction_id}`);
        console.log(`   Amount: R${txn.amount}`);
        console.log(`   Type: ${txn.type}`);
        console.log(`   Status: ${txn.status}`);
        console.log(`   Metadata: ${JSON.stringify(txn.metadata, null, 2)}`);
      }
    }

    // 8. Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 DIAGNOSIS SUMMARY');
    console.log('='.repeat(80));
    
    const chain = chainResult.rows[0];
    const hasChain = chain && chain.level_4_user_id === andre.id;
    const hasVasTxn = vasResult.rows.length > 0;
    const hasCommission = hasVasTxn && vasResult.rows[0].metadata?.commission;
    const hasEarnings = earningsResult.rows.length > 0;
    
    console.log(`✅ Referral Chain: ${hasChain ? 'CORRECT (Andre is L4)' : '❌ INCORRECT'}`);
    console.log(`✅ VAS Transaction: ${hasVasTxn ? 'FOUND' : '❌ NOT FOUND'}`);
    console.log(`✅ Commission Metadata: ${hasCommission ? 'FOUND' : '❌ NOT FOUND'}`);
    console.log(`✅ Referral Earnings: ${hasEarnings ? 'FOUND' : '❌ NOT FOUND'}`);
    
    if (!hasEarnings && hasCommission) {
      console.log('\n🔍 POSSIBLE ISSUES:');
      console.log('   1. Referral earnings calculation may not have run');
      console.log('   2. Commission amount may be below minimum threshold');
      console.log('   3. Transaction may not have triggered referral calculation');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await closeAll();
  }
}

checkReferralStatus();

