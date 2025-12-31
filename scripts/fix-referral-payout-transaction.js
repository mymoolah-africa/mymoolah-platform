const { getUATClient, closeAll } = require('./db-connection-helper');

async function fixPayoutTransaction() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    const andreId = 1;
    
    // Find the referral payout transaction
    const txnResult = await client.query(`
      SELECT * FROM transactions 
      WHERE "userId" = $1
      AND description LIKE '%Referral earnings payout%'
      AND "createdAt" >= '2025-12-31'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, [andreId]);
    
    if (!txnResult.rows[0]) {
      console.log('❌ No referral payout transaction found');
      return;
    }
    
    const txn = txnResult.rows[0];
    console.log('💳 Found transaction:');
    console.log(`   ID: ${txn.id}`);
    console.log(`   Transaction ID: ${txn.transactionId}`);
    console.log(`   Current Amount: R${txn.amount}`);
    console.log(`   Should be: R0.01`);
    console.log('');
    
    // Fix the amount
    const updateResult = await client.query(`
      UPDATE transactions 
      SET amount = 0.01
      WHERE id = $1
      RETURNING *
    `, [txn.id]);
    
    console.log('✅ Transaction amount corrected:');
    console.log(`   Old: R${txn.amount}`);
    console.log(`   New: R${updateResult.rows[0].amount}`);
    console.log('');
    
    // Also fix wallet balance (it was credited with R1.00 instead of R0.01)
    const walletResult = await client.query(`
      SELECT * FROM wallets WHERE "userId" = $1
    `, [andreId]);
    
    const wallet = walletResult.rows[0];
    const currentBalance = parseFloat(wallet.balance);
    const correctedBalance = currentBalance - 1.00 + 0.01; // Remove R1.00, add R0.01
    
    console.log('💼 Wallet balance correction:');
    console.log(`   Current: R${currentBalance.toFixed(2)}`);
    console.log(`   Adjustment: -R0.99 (remove excess R1.00, keep R0.01)`);
    console.log(`   Corrected: R${correctedBalance.toFixed(2)}`);
    console.log('');
    
    const walletUpdateResult = await client.query(`
      UPDATE wallets 
      SET balance = $1, "updatedAt" = NOW()
      WHERE "userId" = $2
      RETURNING *
    `, [correctedBalance, andreId]);
    
    console.log('✅ Wallet balance corrected');
    console.log(`   New balance: R${walletUpdateResult.rows[0].balance}`);
    console.log('');
    console.log('🎉 FIX COMPLETE! Refresh dashboard to see R0.01 correctly displayed');

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

fixPayoutTransaction().catch(console.error);
