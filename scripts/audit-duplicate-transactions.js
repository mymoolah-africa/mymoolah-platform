#!/usr/bin/env node
/**
 * Audit script to check for duplicate transactions
 * Usage: node scripts/audit-duplicate-transactions.js [DATABASE_URL]
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided. Usage: node scripts/audit-duplicate-transactions.js [DATABASE_URL]');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialect: 'postgres'
});

async function auditTransactions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find users
    const [user1] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "phoneNumber" 
      FROM "Users" 
      WHERE "phoneNumber" = '0825571055'
      LIMIT 1
    `);
    
    const [user2] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "phoneNumber" 
      FROM "Users" 
      WHERE "phoneNumber" = '0784560585'
      LIMIT 1
    `);

    if (!user1[0] || !user2[0]) {
      console.log('❌ Users not found');
      process.exit(1);
    }

    const userId1 = user1[0].id;
    const userId2 = user2[0].id;

    console.log('=== USER 1: Andre Botes (0825571055) ===');
    console.log(`User ID: ${userId1}`);
    
    const [wallet1] = await sequelize.query(`
      SELECT balance, "walletId"
      FROM "Wallets"
      WHERE "userId" = ${userId1}
      LIMIT 1
    `);
    
    if (wallet1[0]) {
      console.log(`Wallet Balance: R ${parseFloat(wallet1[0].balance).toFixed(2)}`);
      console.log(`Wallet ID: ${wallet1[0].walletId}`);
    }

    // Get transactions for user 1 from today around 19:02
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [transactions1] = await sequelize.query(`
      SELECT id, "transactionId", type, amount, description, "createdAt", "walletId", "senderWalletId", "receiverWalletId"
      FROM "Transactions"
      WHERE "userId" = ${userId1}
        AND "createdAt" >= '${today.toISOString()}'
      ORDER BY "createdAt" DESC
    `);

    console.log(`\nTransactions for User 1 (today): ${transactions1.length} found`);
    transactions1.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
      console.log(`  - ID: ${tx.id}, TXN ID: ${tx.transactionId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Desc: ${tx.description}, Created: ${date}`);
    });

    console.log('\n=== USER 2: Leonie Botes (0784560585) ===');
    console.log(`User ID: ${userId2}`);
    
    const [wallet2] = await sequelize.query(`
      SELECT balance, "walletId"
      FROM "Wallets"
      WHERE "userId" = ${userId2}
      LIMIT 1
    `);
    
    if (wallet2[0]) {
      console.log(`Wallet Balance: R ${parseFloat(wallet2[0].balance).toFixed(2)}`);
      console.log(`Wallet ID: ${wallet2[0].walletId}`);
    }

    const [transactions2] = await sequelize.query(`
      SELECT id, "transactionId", type, amount, description, "createdAt", "walletId", "senderWalletId", "receiverWalletId"
      FROM "Transactions"
      WHERE "userId" = ${userId2}
        AND "createdAt" >= '${today.toISOString()}'
      ORDER BY "createdAt" DESC
    `);

    console.log(`\nTransactions for User 2 (today): ${transactions2.length} found`);
    transactions2.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
      console.log(`  - ID: ${tx.id}, TXN ID: ${tx.transactionId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Desc: ${tx.description}, Created: ${date}`);
    });

    // Check for exact duplicates based on transactionId
    console.log('\n=== DUPLICATE CHECK BY TRANSACTION ID ===');
    const [allToday] = await sequelize.query(`
      SELECT id, "transactionId", "userId", type, amount, description, "createdAt"
      FROM "Transactions"
      WHERE "createdAt" >= '${today.toISOString()}'
        AND ("userId" = ${userId1} OR "userId" = ${userId2})
      ORDER BY "createdAt" DESC
    `);

    const duplicateGroups = {};
    allToday.forEach(tx => {
      const key = tx.transactionId;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(tx);
    });

    let foundDuplicates = false;
    Object.entries(duplicateGroups).forEach(([txnId, txs]) => {
      if (txs.length > 1) {
        foundDuplicates = true;
        console.log(`\n⚠️ DUPLICATE TRANSACTION ID FOUND: ${txnId}`);
        txs.forEach(tx => {
          const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
          console.log(`  - Transaction ID: ${tx.id}, User ID: ${tx.userId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Created: ${date}`);
        });
      }
    });

    if (!foundDuplicates) {
      console.log('No duplicate transaction IDs found in database');
    }

    // Check for duplicates by userId + amount + description + time (within 1 second)
    console.log('\n=== DUPLICATE CHECK BY CONTENT (within 1 second) ===');
    const [allTodayDetailed] = await sequelize.query(`
      SELECT id, "transactionId", "userId", type, amount, description, "createdAt", "walletId", "senderWalletId", "receiverWalletId"
      FROM "Transactions"
      WHERE "createdAt" >= '${today.toISOString()}'
        AND ("userId" = ${userId1} OR "userId" = ${userId2})
      ORDER BY "userId", "createdAt" DESC
    `);

    const contentGroups = {};
    allTodayDetailed.forEach(tx => {
      // Group by userId + amount + description + rounded timestamp (to nearest second)
      const timestamp = new Date(tx.createdAt).getTime();
      const roundedTime = Math.floor(timestamp / 1000) * 1000; // Round to nearest second
      const key = `${tx.userId}-${tx.amount}-${tx.description}-${roundedTime}`;
      if (!contentGroups[key]) {
        contentGroups[key] = [];
      }
      contentGroups[key].push(tx);
    });

    let foundContentDuplicates = false;
    Object.entries(contentGroups).forEach(([key, txs]) => {
      if (txs.length > 1) {
        foundContentDuplicates = true;
        console.log(`\n⚠️ DUPLICATE CONTENT FOUND:`);
        txs.forEach(tx => {
          const date = new Date(tx.createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
          console.log(`  - ID: ${tx.id}, TXN ID: ${tx.transactionId}, User ID: ${tx.userId}, Type: ${tx.type}, Amount: R ${parseFloat(tx.amount).toFixed(2)}, Desc: ${tx.description}, Created: ${date}`);
        });
      }
    });

    if (!foundContentDuplicates) {
      console.log('No duplicate content found in database');
    }

    // Balance reconciliation
    console.log('\n=== BALANCE RECONCILIATION ===');
    
    // Calculate expected balance for user 1 from all transactions
    const [allTx1] = await sequelize.query(`
      SELECT type, amount
      FROM "Transactions"
      WHERE "userId" = ${userId1}
        AND status = 'completed'
      ORDER BY "createdAt" ASC
    `);
    
    let calculatedBalance1 = 0;
    allTx1.forEach(tx => {
      if (tx.type === 'send' || tx.type === 'payment' || tx.type === 'debit') {
        calculatedBalance1 -= parseFloat(tx.amount);
      } else if (tx.type === 'receive' || tx.type === 'credit' || tx.type === 'deposit') {
        calculatedBalance1 += parseFloat(tx.amount);
      }
    });
    
    console.log(`User 1 (Andre) - Database Balance: R ${parseFloat(wallet1[0]?.balance || 0).toFixed(2)}`);
    console.log(`User 1 (Andre) - Calculated from Transactions: R ${calculatedBalance1.toFixed(2)}`);
    console.log(`Difference: R ${Math.abs(parseFloat(wallet1[0]?.balance || 0) - calculatedBalance1).toFixed(2)}`);
    
    // Calculate expected balance for user 2 from all transactions
    const [allTx2] = await sequelize.query(`
      SELECT type, amount
      FROM "Transactions"
      WHERE "userId" = ${userId2}
        AND status = 'completed'
      ORDER BY "createdAt" ASC
    `);
    
    let calculatedBalance2 = 0;
    allTx2.forEach(tx => {
      if (tx.type === 'send' || tx.type === 'payment' || tx.type === 'debit') {
        calculatedBalance2 -= parseFloat(tx.amount);
      } else if (tx.type === 'receive' || tx.type === 'credit' || tx.type === 'deposit') {
        calculatedBalance2 += parseFloat(tx.amount);
      }
    });
    
    console.log(`\nUser 2 (Leonie) - Database Balance: R ${parseFloat(wallet2[0]?.balance || 0).toFixed(2)}`);
    console.log(`User 2 (Leonie) - Calculated from Transactions: R ${calculatedBalance2.toFixed(2)}`);
    console.log(`Difference: R ${Math.abs(parseFloat(wallet2[0]?.balance || 0) - calculatedBalance2).toFixed(2)}`);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

auditTransactions();

