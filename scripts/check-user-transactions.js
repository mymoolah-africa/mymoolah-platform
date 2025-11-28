/**
 * Diagnostic script to check transactions for a user
 * Usage: node scripts/check-user-transactions.js <userId>
 */

require('dotenv').config();
const { QueryTypes } = require('sequelize');

// Configure SSL for Cloud SQL connections
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  // Set NODE_ENV to production to use SSL config from config.json
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  
  // Also set NODE_TLS_REJECT_UNAUTHORIZED for Cloud SQL certificate issues
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { sequelize, Transaction, Wallet, User } = require('../models');

async function checkUserTransactions(userId) {
  try {
    console.log(`\n🔍 Checking transactions for User ID: ${userId}\n`);
    
    // Get user info (use raw query to avoid camel/snake case issues)
    const userRows = await sequelize.query(
      `
        SELECT
          id,
          "firstName"  AS "firstName",
          "lastName"   AS "lastName",
          "phoneNumber" AS "phoneNumber",
          email
        FROM users
        WHERE id = :userId
        LIMIT 1
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    if (!userRows || userRows.length === 0) {
      console.log(`❌ User ID ${userId} not found`);
      return;
    }

    const user = userRows[0];
    console.log(
      `✅ User found: ${user.firstName || ''} ${user.lastName || ''} (${user.phoneNumber || 'no phone'})`
    );
    
    // Get wallet info (raw query because table uses snake_case columns)
    const walletRows = await sequelize.query(
      `
        SELECT
          id,
          "walletId"          AS "walletId",
          "userId"            AS "userId",
          balance,
          currency,
          status,
          "kycVerified"       AS "kycVerified",
          "kycVerifiedAt"     AS "kycVerifiedAt",
          "kycVerifiedBy"     AS "kycVerifiedBy",
          "dailyLimit"        AS "dailyLimit",
          "monthlyLimit"      AS "monthlyLimit",
          "dailySpent"        AS "dailySpent",
          "monthlySpent"      AS "monthlySpent",
          "lastTransactionAt" AS "lastTransactionAt",
          created_at          AS "createdAt",
          updated_at          AS "updatedAt"
        FROM wallets
        WHERE "userId" = :userId
        LIMIT 1
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    if (!walletRows || walletRows.length === 0) {
      console.log(`❌ No wallet found for user ID ${userId}`);
      return;
    }
    const wallet = walletRows[0];
    console.log(`✅ Wallet found: ${wallet.walletId}, Balance: R${wallet.balance}\n`);
    
    // Get ALL transactions for this user (no filters, no limit to find R50k deposit)
    const allTransactions = await sequelize.query(
      `
        SELECT
          id,
          "transactionId"      AS "transactionId",
          "walletId"           AS "walletId",
          "userId"             AS "userId",
          amount,
          type,
          status,
          description,
          currency,
          fee,
          "senderWalletId"     AS "senderWalletId",
          "receiverWalletId"   AS "receiverWalletId",
          reference,
          "createdAt"          AS "createdAt",
          "updatedAt"          AS "updatedAt",
          metadata
        FROM transactions
        WHERE "userId" = :userId
        ORDER BY "createdAt" DESC
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
    
    console.log(`📊 Total transactions in database: ${allTransactions.length}\n`);
    
    if (allTransactions.length === 0) {
      console.log('⚠️  No transactions found in database for this user');
      return;
    }
    
    // Group by type
    const byType = {};
    allTransactions.forEach(tx => {
      const type = tx.type || 'unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(tx);
    });
    
    console.log('📋 Transactions by type:');
    Object.keys(byType).forEach(type => {
      console.log(`  ${type}: ${byType[type].length} transaction(s)`);
      byType[type].forEach(tx => {
        console.log(`    - ${tx.transactionId}: R${tx.amount} - ${tx.description || 'No description'} (${tx.status}) - ${tx.createdAt}`);
      });
    });
    
    // Check for deposits specifically
    const deposits = allTransactions.filter(tx => 
      tx.type === 'deposit' || 
      tx.type === 'credit' ||
      (tx.description && tx.description.toLowerCase().includes('deposit'))
    );
    
    console.log(`\n💰 Deposits found: ${deposits.length}`);
    deposits.forEach(tx => {
      console.log(`  - ${tx.transactionId}: R${tx.amount} - ${tx.description || 'No description'} (${tx.status}) - ${tx.createdAt}`);
    });
    
    // Check for R50,000 transaction specifically (check both R50,000 and 5000000 cents)
    const r50000Transactions = allTransactions.filter(tx => {
      const amount = parseFloat(tx.amount);
      return amount === 50000 || amount === 5000000 || amount === 50000.00;
    });
    
    console.log(`\n🔍 Transactions with R50,000 amount: ${r50000Transactions.length}`);
    if (r50000Transactions.length > 0) {
      r50000Transactions.forEach(tx => {
        console.log(`  - ${tx.transactionId}: ${tx.type} - R${tx.amount} - ${tx.description || 'No description'} (${tx.status}) - ${tx.createdAt}`);
      });
    } else {
      console.log(`  ⚠️  No R50,000 transaction found!`);
      // Check for large amounts close to R50k
      const largeAmounts = allTransactions
        .filter(tx => parseFloat(tx.amount) >= 40000 && parseFloat(tx.amount) <= 60000)
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 10);
      console.log(`\n  💰 Largest transactions (R40k-R60k range):`);
      largeAmounts.forEach(tx => {
        console.log(`    - ${tx.transactionId}: ${tx.type} - R${tx.amount} - ${tx.description || 'No description'} (${tx.status}) - ${tx.createdAt}`);
      });
    }
    
    // Check oldest transactions (might be the initial deposit)
    const oldestTransactions = allTransactions
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 5);
    
    console.log(`\n📅 Oldest 5 transactions:`);
    oldestTransactions.forEach(tx => {
      console.log(`  - ${tx.transactionId}: ${tx.type} - R${tx.amount} - ${tx.description || 'No description'} (${tx.status}) - ${tx.createdAt}`);
    });
    
    // Check what would be filtered out
    console.log(`\n🔍 Checking filter logic...`);
    const filteredOut = allTransactions.filter((tx) => {
      const desc = (tx.description || '').toLowerCase();
      const type = (tx.type || '').toLowerCase();
      
      const internalAccountingTypes = [
        'vat_payable',
        'mymoolah_revenue',
        'zapper_float_credit',
        'float_credit',
        'revenue'
      ];
      if (internalAccountingTypes.includes(type)) {
        return true;
      }
      
      if (desc.includes('vat payable') || 
          desc.includes('vat payable to') ||
          desc.includes('vat to') ||
          (desc.includes('vat') && desc.includes('payable'))) {
        return true;
      }
      
      if (desc.includes('mymoolah revenue') ||
          desc.includes('revenue from') ||
          desc.includes('revenue f') ||
          (desc.includes('revenue') && desc.includes('mymoolah'))) {
        return true;
      }
      
      if (desc.includes('float credit') ||
          desc.includes('float credit from') ||
          desc.includes('zapper float credit') ||
          (desc.includes('float') && desc.includes('credit'))) {
        return true;
      }
      
      return false;
    });
    
    console.log(`⚠️  Transactions that would be filtered out: ${filteredOut.length}`);
    filteredOut.forEach(tx => {
      console.log(`  - ${tx.transactionId}: ${tx.type} - ${tx.description || 'No description'}`);
    });
    
    console.log(`\n✅ Transactions that would be shown: ${allTransactions.length - filteredOut.length}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

const userId = process.argv[2] || 1;
checkUserTransactions(parseInt(userId));

