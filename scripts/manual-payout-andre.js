const { getUATClient, closeAll } = require('./db-connection-helper');

async function manualPayout() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    const andreId = 1;
    
    // 1. Get pending earnings
    const earningsResult = await client.query(`
      SELECT * FROM referral_earnings 
      WHERE earner_user_id = $1 AND status = 'pending'
    `, [andreId]);
    
    console.log(`💰 Found ${earningsResult.rows.length} pending earnings for Andre`);
    
    if (earningsResult.rows.length === 0) {
      console.log('No pending earnings to pay');
      return;
    }
    
    const totalCents = earningsResult.rows.reduce((sum, e) => sum + e.earned_amount_cents, 0);
    const totalRand = totalCents / 100;
    
    console.log(`💵 Total to pay: R${totalRand.toFixed(2)} (${totalCents} cents)`);
    console.log('');
    
    // 2. Get Andre's wallet
    const walletResult = await client.query(`
      SELECT * FROM wallets WHERE "userId" = $1
    `, [andreId]);
    
    if (!walletResult.rows[0]) {
      console.error('❌ Wallet not found');
      return;
    }
    
    const wallet = walletResult.rows[0];
    const oldBalance = parseFloat(wallet.balance);
    const newBalance = oldBalance + totalRand;
    
    console.log(`💼 Andre's Wallet:`);
    console.log(`   Old Balance: R${oldBalance.toFixed(2)}`);
    console.log(`   Payout Amount: +R${totalRand.toFixed(2)}`);
    console.log(`   New Balance: R${newBalance.toFixed(2)}`);
    console.log('');
    
    // 3. Update wallet balance
    const updateResult = await client.query(`
      UPDATE wallets 
      SET balance = $1, "updatedAt" = NOW()
      WHERE "userId" = $2
      RETURNING *
    `, [newBalance, andreId]);
    
    console.log('✅ Wallet balance updated');
    console.log('');
    
    // 4. Create transaction record
    const transactionId = `REF_PAYOUT_${Date.now()}_manual`;
    const txnResult = await client.query(`
      INSERT INTO transactions (
        "transactionId", "userId", "walletId", amount, type, status, description, currency, metadata, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *
    `, [
      transactionId,
      andreId,
      wallet.walletId,
      totalCents, // Store in cents
      'credit',
      'completed',
      `Referral earnings payout (${earningsResult.rows.length} earnings)`,
      'ZAR',
      JSON.stringify({
        referralPayout: true,
        earningsCount: earningsResult.rows.length,
        earningsIds: earningsResult.rows.map(e => e.id)
      })
    ]);
    
    console.log('✅ Transaction record created:', transactionId);
    console.log('');
    
    // 5. Mark earnings as paid
    const earningIds = earningsResult.rows.map(e => e.id);
    const updateEarningsResult = await client.query(`
      UPDATE referral_earnings 
      SET status = 'paid', paid_at = NOW(), payout_batch_id = 'MANUAL-2025-12-31'
      WHERE id = ANY($1::int[])
      RETURNING id
    `, [earningIds]);
    
    console.log(`✅ Marked ${updateEarningsResult.rows.length} earnings as paid`);
    console.log('');
    
    // 6. Update stats
    const statsResult = await client.query(`
      UPDATE user_referral_stats 
      SET 
        total_earned_cents = total_earned_cents + $1,
        total_paid_cents = total_paid_cents + $1,
        updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `, [totalCents, andreId]);
    
    if (statsResult.rows[0]) {
      console.log('✅ Stats updated');
      console.log(`   Lifetime Earnings: R${statsResult.rows[0].total_earned_cents/100}`);
      console.log(`   Total Paid Out: R${statsResult.rows[0].total_paid_cents/100}`);
    }
    console.log('');
    
    console.log('🎉 PAYOUT COMPLETE!');
    console.log(`✅ Andre's wallet credited with R${totalRand.toFixed(2)}`);
    console.log(`✅ Check dashboard - balance should now be R${newBalance.toFixed(2)}`);

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

manualPayout().catch(console.error);
