const { getUATClient, closeAll } = require('./db-connection-helper');

async function checkLedgerTransaction() {
  let client;
  
  try {
    client = await getUATClient();
    console.log('✅ Connected to UAT database\n');

    // Check the most recent VAS transaction (ID 41)
    const vasResult = await client.query(`
      SELECT * FROM vas_transactions 
      WHERE id = 41
    `);
    
    console.log('📱 VAS TRANSACTION ID 41:');
    console.log(vasResult.rows[0]);
    console.log('');
    
    // Check for corresponding ledger transaction
    const ledgerResult = await client.query(`
      SELECT * FROM transactions 
      WHERE "userId" = 2
      AND id >= 390
      ORDER BY id DESC
      LIMIT 5
    `);
    
    console.log('💳 RECENT LEDGER TRANSACTIONS (Leonie):');
    ledgerResult.rows.forEach(t => {
      console.log(`ID: ${t.id}, Amount: ${t.amount}, Type: ${t.type}, Desc: ${t.description}`);
    });
    console.log('');
    
    // Check what committedLedgerTransaction should be
    console.log('🔍 ANALYSIS:');
    console.log('In overlayServices.js around line 997:');
    console.log('  committedLedgerTransaction = ledgerTransaction;');
    console.log('');
    console.log('The ledgerTransaction is the wallet debit transaction.');
    console.log('Looking for a debit transaction matching VAS txn 41...');
    console.log('');
    
    const debitResult = await client.query(`
      SELECT * FROM transactions 
      WHERE "userId" = 2
      AND type = 'debit'
      AND amount = -9500
      AND "createdAt" >= '2025-12-31'
      ORDER BY id DESC
      LIMIT 1
    `);
    
    console.log('🔍 DEBIT TRANSACTION FOR R95 PURCHASE:');
    console.log(debitResult.rows[0] || 'NOT FOUND');

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

checkLedgerTransaction().catch(console.error);
