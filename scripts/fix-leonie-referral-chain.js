const { getUATClient, closeAll } = require('./db-connection-helper');

async function fixLeonieChain() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    const leonieId = 2;
    const andreId = 1;

    // Check current chain
    const checkResult = await client.query(`
      SELECT * FROM referral_chains WHERE user_id = $1
    `, [leonieId]);
    
    console.log('Current chain:', checkResult.rows[0]);
    console.log('');

    // Fix the chain - set level1_user_id to Andre's ID
    const updateResult = await client.query(`
      UPDATE referral_chains 
      SET level1_user_id = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `, [andreId, leonieId]);
    
    console.log('✅ FIXED! Updated chain:');
    console.log(updateResult.rows[0]);
    console.log('');
    console.log(`✅ Leonie's referral chain now points to Andre (Level 1)`);
    console.log('');
    console.log('🎯 NEXT: Make a new test purchase as Leonie to verify earnings are created');

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

fixLeonieChain().catch(console.error);
