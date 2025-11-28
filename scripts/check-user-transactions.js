#!/usr/bin/env node
/**
 * Diagnostic script to inspect wallet transactions for a user.
 * Works across environments where schemas differ (camelCase vs snake_case).
 *
 * Usage: node scripts/check-user-transactions.js <userId>
 */

require('dotenv').config();
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

// Honour Cloud SQL SSL configuration when DATABASE_URL forces sslmode=require
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const numberFormatter = new Intl.NumberFormat('en-ZA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatAmount = (value) => {
  const amount = parseFloat(value ?? 0);
  return Number.isFinite(amount) ? numberFormatter.format(amount) : '0.00';
};

const formatDate = (value) => {
  if (!value) return 'unknown date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'unknown date' : date.toISOString();
};

async function fetchUser(userId) {
  const result = await sequelize.query(
    `
      SELECT
        id,
        COALESCE("firstName", "first_name") AS "firstName",
        COALESCE("lastName", "last_name")   AS "lastName",
        COALESCE("phoneNumber", "phone_number", phone) AS "phoneNumber",
        email
      FROM users
      WHERE id = :userId
      LIMIT 1
    `,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  return result[0];
}

async function fetchWallets(userId) {
  return sequelize.query(
    `
      SELECT
        COALESCE("walletId", "wallet_id") AS "walletId",
        COALESCE("userId", "user_id")     AS "userId",
        balance,
        currency,
        status,
        COALESCE("kycVerified", "kyc_verified")             AS "kycVerified",
        COALESCE("kycVerifiedAt", "kyc_verified_at")         AS "kycVerifiedAt",
        COALESCE("kycVerifiedBy", "kyc_verified_by")         AS "kycVerifiedBy",
        COALESCE("dailyLimit", "daily_limit")                AS "dailyLimit",
        COALESCE("monthlyLimit", "monthly_limit")            AS "monthlyLimit",
        COALESCE("dailySpent", "daily_spent")                AS "dailySpent",
        COALESCE("monthlySpent", "monthly_spent")            AS "monthlySpent",
        COALESCE("lastTransactionAt", "last_transaction_at") AS "lastTransactionAt",
        COALESCE("createdAt", created_at) AS "createdAt",
        COALESCE("updatedAt", updated_at) AS "updatedAt"
      FROM wallets
      WHERE COALESCE("userId", "user_id") = :userId
    `,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
}

async function fetchTransactionsByWalletIds(walletIds) {
  if (walletIds.length === 0) return [];

  const clauses = walletIds.map(
    (_, index) => `
      COALESCE("walletId", "wallet_id") = :wallet${index}
      OR COALESCE("senderWalletId", "sender_wallet_id") = :wallet${index}
      OR COALESCE("receiverWalletId", "receiver_wallet_id") = :wallet${index}
    `.trim()
  );

  const replacements = walletIds.reduce((acc, id, index) => {
    acc[`wallet${index}`] = id;
    return acc;
  }, {});

  return sequelize.query(
    `
      SELECT
        id,
        COALESCE("transactionId", transaction_id)            AS "transactionId",
        COALESCE("walletId", wallet_id)                      AS "walletId",
        COALESCE("senderWalletId", sender_wallet_id)         AS "senderWalletId",
        COALESCE("receiverWalletId", receiver_wallet_id)     AS "receiverWalletId",
        COALESCE("userId", user_id)                          AS "userId",
        amount,
        type,
        status,
        description,
        currency,
        COALESCE(fee, fee_amount, 0)                          AS "fee",
        COALESCE(reference, external_reference)               AS "reference",
        metadata,
        COALESCE("createdAt", created_at)                    AS "createdAt",
        COALESCE("updatedAt", updated_at)                    AS "updatedAt"
      FROM transactions
      WHERE ${clauses.join(' OR ')}
      ORDER BY COALESCE("createdAt", created_at, NOW()) DESC
    `,
    { replacements, type: QueryTypes.SELECT }
  );
}

async function fetchTransactionsByUserId(userId) {
  return sequelize.query(
    `
      SELECT
        id,
        COALESCE("transactionId", transaction_id)            AS "transactionId",
        COALESCE("walletId", wallet_id)                      AS "walletId",
        COALESCE("senderWalletId", sender_wallet_id)         AS "senderWalletId",
        COALESCE("receiverWalletId", receiver_wallet_id)     AS "receiverWalletId",
        COALESCE("userId", user_id)                          AS "userId",
        amount,
        type,
        status,
        description,
        currency,
        COALESCE(fee, fee_amount, 0)                          AS "fee",
        COALESCE(reference, external_reference)               AS "reference",
        metadata,
        COALESCE("createdAt", created_at)                    AS "createdAt",
        COALESCE("updatedAt", updated_at)                    AS "updatedAt"
      FROM transactions
      WHERE COALESCE("userId", user_id) = :userId
      ORDER BY COALESCE("createdAt", created_at, NOW()) DESC
    `,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
}

const groupTransactionsByType = (transactions) =>
  transactions.reduce((acc, tx) => {
    const key = tx.type || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

function isInternalAccounting(tx) {
  const description = (tx.description || '').toLowerCase();
  const type = (tx.type || '').toLowerCase();

  const internalTypes = ['vat_payable', 'mymoolah_revenue', 'zapper_float_credit', 'float_credit', 'revenue'];
  if (internalTypes.includes(type)) return true;

  if (description.includes('vat payable') ||
      description.includes('vat payable to') ||
      description.includes('vat to') ||
      (description.includes('vat') && description.includes('payable'))) {
    return true;
  }

  if (description.includes('mymoolah revenue') ||
      description.includes('revenue from') ||
      (description.includes('revenue') && description.includes('mymoolah'))) {
    return true;
  }

  if (description.includes('float credit') ||
      description.includes('zapper float credit') ||
      (description.includes('float') && description.includes('credit'))) {
    return true;
  }

  return false;
}

async function checkUserTransactions(userId) {
  try {
    console.log(`\n🔍 Checking transactions for User ID: ${userId}\n`);

    const user = await fetchUser(userId);
    if (!user) {
      console.log(`❌ User ID ${userId} not found`);
      return;
    }
    console.log(`✅ User found: ${user.firstName || ''} ${user.lastName || ''} (${user.phoneNumber || 'no phone'})`);

    const wallets = await fetchWallets(userId);
    if (!wallets || wallets.length === 0) {
      console.log(`❌ No wallet found for user ID ${userId}`);
      return;
    }

    wallets.forEach((wallet, index) => {
      console.log(`✅ Wallet ${index + 1}: ${wallet.walletId || 'unknown'} | Balance: R${formatAmount(wallet.balance)} | Status: ${wallet.status}`);
    });
    console.log('');

    const walletIds = wallets.map((wallet) => wallet.walletId).filter(Boolean);

    let transactions = [];
    if (walletIds.length > 0) {
      transactions = await fetchTransactionsByWalletIds(walletIds);
    }

    if (!transactions || transactions.length === 0) {
      try {
        transactions = await fetchTransactionsByUserId(userId);
      } catch {
        // Column may not exist (legacy schema); ignore
      }
    }

    console.log(`📊 Total transactions fetched: ${transactions.length}\n`);
    if (!transactions || transactions.length === 0) {
      console.log('⚠️  No transactions found in database for this user / wallet');
      return;
    }

    const transactionsByType = groupTransactionsByType(transactions);
    console.log('📋 Transactions by type:');
    Object.entries(transactionsByType).forEach(([type, list]) => {
      console.log(`  ${type}: ${list.length} transaction(s)`);
      list.forEach((tx) => {
        console.log(`    - ${tx.transactionId || 'N/A'}: R${formatAmount(tx.amount)} - ${tx.description || 'No description'} (${tx.status}) - ${formatDate(tx.createdAt)}`);
      });
    });

    const deposits = transactions.filter((tx) => {
      const description = (tx.description || '').toLowerCase();
      return tx.type === 'deposit' || tx.type === 'credit' || description.includes('deposit');
    });
    console.log(`\n💰 Deposits found: ${deposits.length}`);
    deposits.forEach((tx) => {
      console.log(`  - ${tx.transactionId || 'N/A'}: R${formatAmount(tx.amount)} - ${tx.description || 'No description'} (${tx.status}) - ${formatDate(tx.createdAt)}`);
    });

    const fiftyKTransactions = transactions.filter((tx) => {
      const amount = parseFloat(tx.amount ?? 0);
      return amount === 50000 || amount === 5000000 || amount === 50000.0;
    });
    console.log(`\n🔍 Transactions with R50,000 amount: ${fiftyKTransactions.length}`);
    if (fiftyKTransactions.length > 0) {
      fiftyKTransactions.forEach((tx) => {
        console.log(`  - ${tx.transactionId || 'N/A'}: ${tx.type || 'unknown'} - R${formatAmount(tx.amount)} - ${tx.description || 'No description'} (${tx.status}) - ${formatDate(tx.createdAt)}`);
      });
    } else {
      console.log('  ⚠️  No R50,000 transaction found!');
      const largeRange = transactions
        .filter((tx) => {
          const amount = parseFloat(tx.amount ?? 0);
          return amount >= 40000 && amount <= 60000;
        })
        .sort((a, b) => parseFloat(b.amount ?? 0) - parseFloat(a.amount ?? 0))
        .slice(0, 10);
      console.log('\n  💰 Largest transactions (R40k-R60k range):');
      largeRange.forEach((tx) => {
        console.log(`    - ${tx.transactionId || 'N/A'}: ${tx.type || 'unknown'} - R${formatAmount(tx.amount)} - ${tx.description || 'No description'} (${tx.status}) - ${formatDate(tx.createdAt)}`);
      });
    }

    const oldestTransactions = [...transactions]
      .sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0))
      .slice(0, 5);
    console.log('\n📅 Oldest 5 transactions:');
    oldestTransactions.forEach((tx) => {
      console.log(`  - ${tx.transactionId || 'N/A'}: ${tx.type || 'unknown'} - R${formatAmount(tx.amount)} - ${tx.description || 'No description'} (${tx.status}) - ${formatDate(tx.createdAt)}`);
    });

    console.log('\n🔍 Checking filter logic...');
    const filteredOut = transactions.filter(isInternalAccounting);
    filteredOut.forEach((tx) => {
      console.log(`  - ${tx.transactionId || 'N/A'}: ${tx.type || 'unknown'} - ${tx.description || 'No description'}`);
    });
    console.log(`⚠️  Transactions that would be filtered out: ${filteredOut.length}`);
    console.log(`\n✅ Transactions that would be shown: ${transactions.length - filteredOut.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

const userId = Number.parseInt(process.argv[2] || '1', 10);
if (Number.isNaN(userId)) {
  console.error('❌ User ID must be a number');
  process.exit(1);
}

checkUserTransactions(userId).catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

