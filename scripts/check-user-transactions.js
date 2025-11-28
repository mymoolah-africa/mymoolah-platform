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
        SELECT *
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
    const firstName = user.firstName || user.firstname || '';
    const lastName = user.lastName || user.lastname || '';
    const phone = user.phoneNumber || user.phonenumber || user.phone || 'no phone';
    console.log(
      `✅ User found: ${firstName} ${lastName} (${phone})`
    );
    
    // Get wallet info (raw query because table uses snake_case columns)
    const walletRows = await sequelize.query(
      `
        SELECT *
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
    const walletId = wallet.walletId || wallet.walletid || wallet.id || 'unknown';
    const walletBalance = wallet.balance || wallet.balance_amount || 0;
    const walletCurrency = wallet.currency || wallet.currency_code || 'ZAR';
    console.log(`✅ Wallet found: ${walletId}, Balance: R${walletBalance}\n`);
    
    // Get ALL transactions for this user (no filters, no limit to find R50k deposit)
    const allTransactions = await sequelize.query(
      `
        SELECT *
        FROM transactions
        WHERE "userId" = :userId
        ORDER BY id DESC
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
        const created = tx.createdAt || tx.created_at || tx.createdat || 'unknown date';
        const amount = tx.amount || tx.amount_cents || 0;
        const description = tx.description || tx.details || 'No description';
        const transactionId = tx.transactionId || tx.transactionid || tx.id || 'N/A';
        const status = tx.status || 'unknown';
        console.log(`    - ${transactionId}: R${amount} - ${description} (${status}) - ${created}`);
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
      const created = tx.createdAt || tx.created_at || tx.createdat || 'unknown date';
      const amount = tx.amount || 0;
      const description = tx.description || tx.details || 'No description';
      const transactionId = tx.transactionId || tx.transactionid || tx.id || 'N/A';
      const status = tx.status || 'unknown';
      console.log(`  - ${transactionId}: R${amount} - ${description} (${status}) - ${created}`);
    });
    
    // Check for R50,000 transaction specifically (check both R50,000 and 5000000 cents)
    const r50000Transactions = allTransactions.filter(tx => {
      const amount = parseFloat(tx.amount || tx.amount_cents || 0);
      return amount === 50000 || amount === 5000000 || amount === 50000.00;
    });
    
    console.log(`\n🔍 Transactions with R50,000 amount: ${r50000Transactions.length}`);
    if (r50000Transactions.length > 0) {
      r50000Transactions.forEach(tx => {
        const created = tx.createdAt || tx.created_at || tx.createdat || 'unknown date';
        const amount = tx.amount || 0;
        const description = tx.description || tx.details || 'No description';
        const transactionId = tx.transactionId || tx.transactionid || tx.id || 'N/A';
        const status = tx.status || 'unknown';
        console.log(`  - ${transactionId}: ${tx.type || 'unknown'} - R${amount} - ${description} (${status}) - ${created}`);
      });
    } else {
      console.log(`  ⚠️  No R50,000 transaction found!`);
      // Check for large amounts close to R50k
      const largeAmounts = allTransactions
        .filter(tx => {
          const amount = parseFloat(tx.amount || tx.amount_cents || 0);
          return amount >= 40000 && amount <= 60000;
        })
        .sort((a, b) => {
          const amountB = parseFloat(b.amount || b.amount_cents || 0);
          const amountA = parseFloat(a.amount || a.amount_cents || 0);
          return amountB - amountA;
        })
        .slice(0, 10);
      console.log(`\n  💰 Largest transactions (R40k-R60k range):`);
      largeAmounts.forEach(tx => {
        const created = tx.createdAt || tx.created_at || tx.createdat || 'unknown date';
        const amount = tx.amount || 0;
        const description = tx.description || tx.details || 'No description';
        const transactionId = tx.transactionId || tx.transactionid || tx.id || 'N/A';
        const status = tx.status || 'unknown';
        console.log(`    - ${transactionId}: ${tx.type || 'unknown'} - R${amount} - ${description} (${status}) - ${created}`);
      });
    }
    
    // Check oldest transactions (might be the initial deposit)
    const oldestTransactions = allTransactions
      .sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0))
      .slice(0, 5);
    
    console.log(`\n📅 Oldest 5 transactions:`);
    oldestTransactions.forEach(tx => {
      const created = tx.createdAt || tx.created_at || tx.createdat || 'unknown date';
      const amount = tx.amount || 0;
      const description = tx.description || tx.details || 'No description';
      const transactionId = tx.transactionId || tx.transactionid || tx.id || 'N/A';
      const status = tx.status || 'unknown';
      console.log(`  - ${transactionId}: ${tx.type || 'unknown'} - R${amount} - ${description} (${status}) - ${created}`);
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

