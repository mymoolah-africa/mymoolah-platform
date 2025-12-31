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
    
    let chain = null;
    console.log('⛓️  REFERRAL CHAIN (Neil):');
    if (chainResult.rows.length === 0) {
      console.log('   ❌ NO CHAIN FOUND');
    } else {
      chain = chainResult.rows[0];
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
      SELECT re.id, re.earner_user_id, re.transaction_user_id, re.transaction_id, re.level, 
             re.earned_amount_cents, re.status, re.created_at
      FROM referral_earnings re
      JOIN transactions t ON t.id = re.transaction_id
      WHERE re.earner_user_id = $1
        AND re.transaction_user_id = $2
        AND t.description LIKE '%airtime%'
      ORDER BY re.created_at DESC
      LIMIT 10
    `, [andre.id, neil.id]);
    
    console.log(`\n💰 ANDRE'S REFERRAL EARNINGS FROM NEIL'S TRANSACTIONS:`);
    if (earningsResult.rows.length === 0) {
      console.log('   ❌ NO EARNINGS FOUND');
    } else {
      earningsResult.rows.forEach(earning => {
        console.log(`   Level ${earning.level}: R${earning.earned_amount_cents/100} (${earning.status})`);
        console.log(`      Transaction ID: ${earning.transaction_id}, Created: ${earning.created_at.toISOString().split('T')[0]}`);
      });
    }

    // 6. Check all referral earnings for Andre (any level)
    const allEarningsResult = await client.query(`
      SELECT re.id, re.earner_user_id, re.transaction_user_id, re.transaction_id, re.level, 
             re.earned_amount_cents, re.status, re.created_at,
             u."firstName" || ' ' || u."lastName" as transaction_user_name
      FROM referral_earnings re
      JOIN transactions t ON t.id = re.transaction_id
      JOIN users u ON u.id = re.transaction_user_id
      WHERE re.earner_user_id = $1
      ORDER BY re.created_at DESC
      LIMIT 10
    `, [andre.id]);
    
    console.log(`\n💰 ALL OF ANDRE'S REFERRAL EARNINGS (any level):`);
    if (allEarningsResult.rows.length === 0) {
      console.log('   ❌ NO EARNINGS FOUND');
    } else {
      allEarningsResult.rows.forEach(earning => {
        console.log(`   Level ${earning.level} from ${earning.transaction_user_name}: R${earning.earned_amount_cents/100} (${earning.status})`);
      });
    }

    // 7. Check the ledger transaction linked to Neil's VAS transaction
    if (vasResult.rows.length > 0) {
      const vasTxn = vasResult.rows[0];
      console.log(`\n📋 VAS TRANSACTION DETAILS:`);
      console.log(`   VAS ID: ${vasTxn.id}`);
      console.log(`   Transaction ID: ${vasTxn.transactionId || 'NOT SET'}`);
      console.log(`   Amount: R${vasTxn.amount/100}`);
      console.log(`   Status: ${vasTxn.status}`);
      console.log(`   Metadata: ${JSON.stringify(vasTxn.metadata, null, 2)}`);
      
      // Find the ledger transaction by walletTransactionId from metadata
      const walletTxnId = vasTxn.metadata?.walletTransactionId;
      if (walletTxnId) {
        console.log(`\n   🔍 Looking for ledger transaction with walletTransactionId: ${walletTxnId}`);
        const ledgerResult = await client.query(`
          SELECT id, "transactionId", "userId", amount, type, status, description, metadata, "createdAt"
          FROM transactions 
          WHERE "transactionId" = $1
          ORDER BY "createdAt" DESC
          LIMIT 1
        `, [walletTxnId]);
        
        if (ledgerResult.rows.length > 0) {
          const txn = ledgerResult.rows[0];
          console.log(`\n📋 LINKED LEDGER TRANSACTION:`);
          console.log(`   ID: ${txn.id}`);
          console.log(`   Transaction ID: ${txn.transactionId}`);
          console.log(`   Amount: R${txn.amount}`);
          console.log(`   Type: ${txn.type}`);
          console.log(`   Status: ${txn.status}`);
          console.log(`   Description: ${txn.description}`);
          console.log(`   Created: ${txn.createdAt.toISOString()}`);
          
          // Check who got earnings from this transaction
          const earningsForTxn = await client.query(`
            SELECT re.id, re.earner_user_id, re.transaction_user_id, re.level, 
                   re.earned_amount_cents, re.status,
                   u."firstName" || ' ' || u."lastName" as earner_name
            FROM referral_earnings re
            JOIN users u ON u.id = re.earner_user_id
            WHERE re.transaction_id = $1
            ORDER BY re.level ASC
          `, [txn.id]);
          
          console.log(`\n🔍 REFERRAL EARNINGS FOR TRANSACTION ${txn.id}:`);
          console.log(`   Total earnings created: ${earningsForTxn.rows.length}`);
          
          if (earningsForTxn.rows.length > 0) {
            earningsForTxn.rows.forEach(earning => {
              const isAndre = earning.earner_user_id === andre.id;
              console.log(`   ${isAndre ? '✅' : '  '} Level ${earning.level}: ${earning.earner_name} (ID: ${earning.earner_user_id}) earned R${earning.earned_amount_cents/100} (${earning.status})`);
            });
            
            const andreEarning = earningsForTxn.rows.find(e => e.earner_user_id === andre.id);
            if (!andreEarning) {
              console.log(`\n   ❌ PROBLEM: Andre (ID: ${andre.id}, L4) did NOT get an earning!`);
              console.log(`   💡 Expected: Level 4 earning for Andre (1% of 26 cents = 0.26 cents)`);
              if (chain) {
                console.log(`   💡 Chain shows: L1=${chain.level_1_user_id}, L2=${chain.level_2_user_id}, L3=${chain.level_3_user_id}, L4=${chain.level_4_user_id}`);
                console.log(`   💡 Only ${earningsForTxn.rows.length} earnings created, but chain has depth ${chain.chain_depth}`);
              }
              console.log(`   💡 ROOT CAUSE: Math.round(0.26) = 0 cents - earning rounded down to 0`);
              console.log(`   💡 SOLUTION: Fixed in code - now uses Math.ceil() for amounts < 1 cent`);
              console.log(`   💡 Next: Create retroactive earning for Andre (1 cent)`);
            } else {
              console.log(`\n   ✅ Andre DID get an earning: R${andreEarning.earned_amount_cents/100}`);
            }
          } else {
            console.log(`   ❌ NO EARNINGS CREATED - This is the issue!`);
            console.log(`   💡 The referral earnings calculation did not run for this transaction.`);
            console.log(`   💡 Check if commission metadata exists and if calculateEarnings was called.`);
          }
        } else {
          console.log(`\n   ⚠️  No ledger transaction found with walletTransactionId: ${walletTxnId}`);
          console.log(`   💡 This is why referral earnings weren't created - no ledger transaction to link to`);
        }
      } else {
        console.log(`\n   ⚠️  VAS transaction has no walletTransactionId in metadata`);
        console.log(`   💡 This is why referral earnings weren't created - can't find linked transaction`);
      }
      
      // Also check if there's a transaction around the same time
      const timeWindow = new Date(vasTxn.createdAt);
      timeWindow.setMinutes(timeWindow.getMinutes() - 2);
      const timeWindowEnd = new Date(vasTxn.createdAt);
      timeWindowEnd.setMinutes(timeWindowEnd.getMinutes() + 2);
      
      const nearbyTxns = await client.query(`
        SELECT id, "transactionId", "userId", amount, type, status, description, "createdAt"
        FROM transactions 
        WHERE "userId" = $1
          AND "createdAt" BETWEEN $2 AND $3
          AND type IN ('payment', 'debit')
          AND description ILIKE '%airtime%'
        ORDER BY "createdAt" DESC
        LIMIT 5
      `, [neil.id, timeWindow, timeWindowEnd]);
      
      if (nearbyTxns.rows.length > 0) {
        console.log(`\n   🔍 Found ${nearbyTxns.rows.length} nearby transactions (within 2 minutes):`);
        nearbyTxns.rows.forEach(txn => {
          console.log(`      ID: ${txn.id}, Transaction ID: ${txn.transactionId}, Amount: R${Math.abs(txn.amount)}, Created: ${txn.createdAt.toISOString()}`);
        });
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

