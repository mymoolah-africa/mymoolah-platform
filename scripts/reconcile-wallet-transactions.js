#!/usr/bin/env node
/**
 * Wallet Transaction Reconciliation Script
 * 
 * This script performs a comprehensive audit of wallet transactions to:
 * 1. Check for duplicate transactions
 * 2. Verify wallet balance calculations
 * 3. Identify any discrepancies
 * 
 * Usage: node scripts/reconcile-wallet-transactions.js [DATABASE_URL] [user1_phone] [user2_phone]
 * Example: node scripts/reconcile-wallet-transactions.js "postgres://..." "0825571055" "0784560585"
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;
const USER1_PHONE = process.argv[3] || '0825571055';
const USER2_PHONE = process.argv[4] || '0784560585';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided. Usage: node scripts/reconcile-wallet-transactions.js [DATABASE_URL] [user1_phone] [user2_phone]');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialect: 'postgres'
});

async function reconcileTransactions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    console.log('='.repeat(80));
    console.log('WALLET TRANSACTION RECONCILIATION AUDIT');
    console.log('='.repeat(80));
    console.log(`User 1: ${USER1_PHONE}`);
    console.log(`User 2: ${USER2_PHONE}\n`);

    // Find users
    const [user1] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "phoneNumber" 
      FROM users 
      WHERE "phoneNumber" = :phone
      LIMIT 1
    `, { replacements: { phone: USER1_PHONE } });
    
    const [user2] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "phoneNumber" 
      FROM users 
      WHERE "phoneNumber" = :phone
      LIMIT 1
    `, { replacements: { phone: USER2_PHONE } });

    if (!user1[0] || !user2[0]) {
      console.log('❌ One or both users not found');
      if (!user1[0]) console.log(`  User 1 (${USER1_PHONE}) not found`);
      if (!user2[0]) console.log(`  User 2 (${USER2_PHONE}) not found`);
      process.exit(1);
    }

    const userId1 = user1[0].id;
    const userId2 = user2[0].id;
    const userName1 = `${user1[0].firstName} ${user1[0].lastName}`;
    const userName2 = `${user2[0].firstName} ${user2[0].lastName}`;

    console.log(`\n📊 USER 1: ${userName1} (${USER1_PHONE})`);
    console.log(`   User ID: ${userId1}`);
    
    const [wallet1] = await sequelize.query(`
      SELECT balance, "walletId"
      FROM wallets
      WHERE "userId" = :userId
      LIMIT 1
    `, { replacements: { userId: userId1 } });
    
    if (wallet1[0]) {
      console.log(`   Wallet Balance: R ${parseFloat(wallet1[0].balance).toFixed(2)}`);
      console.log(`   Wallet ID: ${wallet1[0].walletId}`);
    }

    console.log(`\n📊 USER 2: ${userName2} (${USER2_PHONE})`);
    console.log(`   User ID: ${userId2}`);
    
    const [wallet2] = await sequelize.query(`
      SELECT balance, "walletId"
      FROM wallets
      WHERE "userId" = :userId
      LIMIT 1
    `, { replacements: { userId: userId2 } });
    
    if (wallet2[0]) {
      console.log(`   Wallet Balance: R ${parseFloat(wallet2[0].balance).toFixed(2)}`);
      console.log(`   Wallet ID: ${wallet2[0].walletId}`);
    }

    // Get all transactions for both users
    const [allTransactions] = await sequelize.query(`
      SELECT id, "transactionId", "userId", type, amount, description, "createdAt", 
             "walletId", "senderWalletId", "receiverWalletId", status, metadata
      FROM transactions
      WHERE "userId" IN (:userId1, :userId2)
        AND status = 'completed'
      ORDER BY "createdAt" DESC
    `, { replacements: { userId1, userId2 } });

    console.log(`\n📋 TOTAL TRANSACTIONS FOUND: ${allTransactions.length}`);

    // Group by user
    const user1Transactions = allTransactions.filter(tx => tx.userId === userId1);
    const user2Transactions = allTransactions.filter(tx => tx.userId === userId2);

    console.log(`   User 1 transactions: ${user1Transactions.length}`);
    console.log(`   User 2 transactions: ${user2Transactions.length}`);

    // Check for duplicates by transactionId
    console.log('\n🔍 CHECKING FOR DUPLICATE TRANSACTION IDs...');
    const txnIdMap = new Map();
    allTransactions.forEach(tx => {
      if (!txnIdMap.has(tx.transactionId)) {
        txnIdMap.set(tx.transactionId, []);
      }
      txnIdMap.get(tx.transactionId).push(tx);
    });

    let duplicateCount = 0;
    txnIdMap.forEach((txs, txnId) => {
      if (txs.length > 1) {
        duplicateCount++;
        console.log(`\n⚠️ DUPLICATE TRANSACTION ID FOUND: ${txnId}`);
        txs.forEach((tx, idx) => {
          const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
          console.log(`   ${idx + 1}. ID: ${tx.id}, User ID: ${tx.userId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Created: ${date}`);
        });
      }
    });

    if (duplicateCount === 0) {
      console.log('✅ No duplicate transaction IDs found');
    } else {
      console.log(`\n⚠️ Found ${duplicateCount} duplicate transaction ID(s)`);
    }

    // Check for duplicates by content (same user, same amount, same description, within 1 second)
    console.log('\n🔍 CHECKING FOR DUPLICATE CONTENT...');
    const contentGroups = new Map();
    allTransactions.forEach(tx => {
      const timestamp = new Date(tx.createdAt).getTime();
      const roundedTime = Math.floor(timestamp / 1000) * 1000; // Round to nearest second
      const key = `${tx.userId}-${tx.amount}-${tx.description}-${roundedTime}`;
      if (!contentGroups.has(key)) {
        contentGroups.set(key, []);
      }
      contentGroups.get(key).push(tx);
    });

    let contentDuplicateCount = 0;
    contentGroups.forEach((txs, key) => {
      if (txs.length > 1) {
        contentDuplicateCount++;
        console.log(`\n⚠️ DUPLICATE CONTENT FOUND:`);
        txs.forEach((tx, idx) => {
          const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
          console.log(`   ${idx + 1}. ID: ${tx.id}, TXN ID: ${tx.transactionId}, User ID: ${tx.userId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Desc: ${tx.description}, Created: ${date}`);
        });
      }
    });

    if (contentDuplicateCount === 0) {
      console.log('✅ No duplicate content found');
    } else {
      console.log(`\n⚠️ Found ${contentDuplicateCount} duplicate content group(s)`);
    }

    // Balance reconciliation
    console.log('\n💰 BALANCE RECONCILIATION...');
    
    // Calculate expected balance for user 1 from all transactions
    const [allTx1] = await sequelize.query(`
      SELECT type, amount, status
      FROM transactions
      WHERE "userId" = :userId
        AND status = 'completed'
        AND type NOT IN ('mymoolah_revenue', 'vat_payable')
      ORDER BY "createdAt" ASC
    `, { replacements: { userId: userId1 } });
    
    let calculatedBalance1 = 0;
    const tx1Breakdown = { credits: 0, debits: 0 };
    allTx1.forEach(tx => {
      if (tx.status !== 'completed') return;
      
      if (tx.type === 'send' || tx.type === 'payment' || tx.type === 'debit' || tx.type === 'withdraw' || tx.type === 'fee' || tx.type === 'zapper_payment' || tx.type === 'zapper_fee') {
        calculatedBalance1 -= parseFloat(tx.amount);
        tx1Breakdown.debits += parseFloat(tx.amount);
      } else if (tx.type === 'receive' || tx.type === 'credit' || tx.type === 'deposit' || tx.type === 'transfer' || tx.type === 'refund' || tx.type === 'zapper_float_credit') {
        calculatedBalance1 += parseFloat(tx.amount);
        tx1Breakdown.credits += parseFloat(tx.amount);
      }
      // Note: mymoolah_revenue and vat_payable are excluded (internal accounting - not wallet-affecting)
    });
    
    const dbBalance1 = parseFloat(wallet1[0]?.balance || 0);
    const diff1 = Math.abs(dbBalance1 - calculatedBalance1);
    
    console.log(`\nUser 1 (${userName1}):`);
    console.log(`   Database Balance: R ${dbBalance1.toFixed(2)}`);
    console.log(`   Calculated Balance: R ${calculatedBalance1.toFixed(2)}`);
    console.log(`   Credits: R ${tx1Breakdown.credits.toFixed(2)}`);
    console.log(`   Debits: R ${tx1Breakdown.debits.toFixed(2)}`);
    console.log(`   Difference: R ${diff1.toFixed(2)}`);
    if (diff1 > 0.01) {
      console.log(`   ⚠️ DISCREPANCY DETECTED!`);
    } else {
      console.log(`   ✅ Balance matches`);
    }
    
    // Calculate expected balance for user 2 from all transactions
    const [allTx2] = await sequelize.query(`
      SELECT type, amount, status
      FROM transactions
      WHERE "userId" = :userId
        AND status = 'completed'
        AND type NOT IN ('mymoolah_revenue', 'vat_payable')
      ORDER BY "createdAt" ASC
    `, { replacements: { userId: userId2 } });
    
    let calculatedBalance2 = 0;
    const tx2Breakdown = { credits: 0, debits: 0 };
    allTx2.forEach(tx => {
      if (tx.status !== 'completed') return;
      
      if (tx.type === 'send' || tx.type === 'payment' || tx.type === 'debit' || tx.type === 'withdraw' || tx.type === 'fee' || tx.type === 'zapper_payment' || tx.type === 'zapper_fee') {
        calculatedBalance2 -= parseFloat(tx.amount);
        tx2Breakdown.debits += parseFloat(tx.amount);
      } else if (tx.type === 'receive' || tx.type === 'credit' || tx.type === 'deposit' || tx.type === 'transfer' || tx.type === 'refund' || tx.type === 'zapper_float_credit') {
        calculatedBalance2 += parseFloat(tx.amount);
        tx2Breakdown.credits += parseFloat(tx.amount);
      }
      // Note: mymoolah_revenue and vat_payable are excluded (internal accounting - not wallet-affecting)
    });
    
    const dbBalance2 = parseFloat(wallet2[0]?.balance || 0);
    const diff2 = Math.abs(dbBalance2 - calculatedBalance2);
    
    console.log(`\nUser 2 (${userName2}):`);
    console.log(`   Database Balance: R ${dbBalance2.toFixed(2)}`);
    console.log(`   Calculated Balance: R ${calculatedBalance2.toFixed(2)}`);
    console.log(`   Credits: R ${tx2Breakdown.credits.toFixed(2)}`);
    console.log(`   Debits: R ${tx2Breakdown.debits.toFixed(2)}`);
    console.log(`   Difference: R ${diff2.toFixed(2)}`);
    if (diff2 > 0.01) {
      console.log(`   ⚠️ DISCREPANCY DETECTED!`);
    } else {
      console.log(`   ✅ Balance matches`);
    }

    // Check for recent transactions (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayTx1] = await sequelize.query(`
      SELECT id, "transactionId", type, amount, description, "createdAt"
      FROM transactions
      WHERE "userId" = :userId
        AND "createdAt" >= :today
      ORDER BY "createdAt" DESC
    `, { replacements: { userId: userId1, today: today.toISOString() } });

    const [todayTx2] = await sequelize.query(`
      SELECT id, "transactionId", type, amount, description, "createdAt"
      FROM transactions
      WHERE "userId" = :userId
        AND "createdAt" >= :today
      ORDER BY "createdAt" DESC
    `, { replacements: { userId: userId2, today: today.toISOString() } });

    console.log(`\n📅 TODAY'S TRANSACTIONS (${today.toLocaleDateString()}):`);
    console.log(`\nUser 1 (${userName1}): ${todayTx1.length} transaction(s)`);
    todayTx1.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
      console.log(`   - ID: ${tx.id}, TXN ID: ${tx.transactionId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Desc: ${tx.description}, Created: ${date}`);
    });

    console.log(`\nUser 2 (${userName2}): ${todayTx2.length} transaction(s)`);
    todayTx2.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
      console.log(`   - ID: ${tx.id}, TXN ID: ${tx.transactionId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Desc: ${tx.description}, Created: ${date}`);
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('RECONCILIATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Duplicate Transaction IDs: ${duplicateCount === 0 ? 'NONE' : `${duplicateCount} FOUND`}`);
    console.log(`✅ Duplicate Content: ${contentDuplicateCount === 0 ? 'NONE' : `${contentDuplicateCount} GROUP(S) FOUND`}`);
    console.log(`✅ User 1 Balance Match: ${diff1 <= 0.01 ? 'YES' : 'NO (DISCREPANCY)'}`);
    console.log(`✅ User 2 Balance Match: ${diff2 <= 0.01 ? 'YES' : 'NO (DISCREPANCY)'}`);
    
    if (duplicateCount > 0 || contentDuplicateCount > 0 || diff1 > 0.01 || diff2 > 0.01) {
      console.log('\n⚠️ ISSUES DETECTED - Please review the details above');
      process.exit(1);
    } else {
      console.log('\n✅ All checks passed - No issues detected');
      process.exit(0);
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

reconcileTransactions();

