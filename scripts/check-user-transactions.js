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

const normalizeUser = (row = {}) => ({
  id: row.id,
  firstName: row.firstName ?? row.firstname ?? row.first_name ?? '',
  lastName: row.lastName ?? row.lastname ?? row.last_name ?? '',
  phoneNumber: row.phoneNumber ?? row.phonenumber ?? row.phone_number ?? row.phone ?? null,
  email: row.email ?? null
});

const normalizeWallet = (row = {}) => ({
  walletId: row.walletId ?? row.wallet_id ?? null,
  userId: row.userId ?? row.user_id ?? null,
  balance: row.balance ?? 0,
  currency: row.currency ?? 'ZAR',
  status: row.status ?? 'unknown',
  kycVerified: row.kycVerified ?? row.kyc_verified ?? null,
  kycVerifiedAt: row.kycVerifiedAt ?? row.kyc_verified_at ?? null,
  kycVerifiedBy: row.kycVerifiedBy ?? row.kyc_verified_by ?? null,
  dailyLimit: row.dailyLimit ?? row.daily_limit ?? null,
  monthlyLimit: row.monthlyLimit ?? row.monthly_limit ?? null,
  dailySpent: row.dailySpent ?? row.daily_spent ?? null,
  monthlySpent: row.monthlySpent ?? row.monthly_spent ?? null,
  lastTransactionAt: row.lastTransactionAt ?? row.last_transaction_at ?? null,
  createdAt: row.createdAt ?? row.created_at ?? null,
  updatedAt: row.updatedAt ?? row.updated_at ?? null
});

const normalizeTransaction = (row = {}) => ({
  id: row.id,
  transactionId: row.transactionId ?? row.transaction_id ?? row.id ?? null,
  walletId: row.walletId ?? row.wallet_id ?? null,
  senderWalletId: row.senderWalletId ?? row.sender_wallet_id ?? null,
  receiverWalletId: row.receiverWalletId ?? row.receiver_wallet_id ?? null,
  userId: row.userId ?? row.user_id ?? null,
  amount: row.amount ?? row.amount_cents ?? 0,
  type: row.type ?? 'unknown',
  status: row.status ?? 'unknown',
  description: row.description ?? row.details ?? '',
  currency: row.currency ?? row.currency_code ?? 'ZAR',
  fee: row.fee ?? row.fee_amount ?? 0,
  reference: row.reference ?? row.external_reference ?? null,
  metadata: row.metadata ?? {},
  createdAt: row.createdAt ?? row.created_at ?? null,
  updatedAt: row.updatedAt ?? row.updated_at ?? null
});

const runQueryWithFallback = async (queryCandidates, replacements = {}) => {
  let fallbackError = null;
  for (const sql of queryCandidates) {
    try {
      return await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    } catch (error) {
      if (error?.original?.code === '42703') {
        fallbackError = error;
        continue;
      }
      throw error;
    }
  }
  if (fallbackError) {
    throw fallbackError;
  }
  return [];
};

async function fetchUser(userId) {
  const result = await sequelize.query(
    `
      SELECT *
      FROM users
      WHERE id = :userId
      LIMIT 1
    `,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  return result[0] ? normalizeUser(result[0]) : undefined;
}

async function fetchWallets(userId) {
  const queryCandidates = [
    `
      SELECT *
      FROM wallets
      WHERE "userId" = :userId
    `,
    `
      SELECT *
      FROM wallets
      WHERE "user_id" = :userId
    `
  ];

  const rows = await runQueryWithFallback(queryCandidates, { userId });
  return rows.map(normalizeWallet);
}

async function fetchTransactionsByWalletIds(walletIds) {
  if (walletIds.length === 0) return [];

  const camelClauses = walletIds.map(
    (_, index) => `"walletId" = :wallet${index} OR "senderWalletId" = :wallet${index} OR "receiverWalletId" = :wallet${index}`
  ).join(' OR ');

  const snakeClauses = walletIds.map(
    (_, index) => `wallet_id = :wallet${index} OR sender_wallet_id = :wallet${index} OR receiver_wallet_id = :wallet${index}`
  ).join(' OR ');

  const replacements = walletIds.reduce((acc, id, index) => {
    acc[`wallet${index}`] = id;
    return acc;
  }, {});

  const queryCandidates = [
    `
      SELECT *
      FROM transactions
      WHERE ${camelClauses}
      ORDER BY "createdAt" DESC NULLS LAST
    `,
    `
      SELECT *
      FROM transactions
      WHERE ${snakeClauses}
      ORDER BY created_at DESC NULLS LAST
    `
  ];

  const rows = await runQueryWithFallback(queryCandidates, replacements);
  return rows.map(normalizeTransaction);
}

async function fetchTransactionsByUserId(userId) {
  const queryCandidates = [
    `
      SELECT *
      FROM transactions
      WHERE "userId" = :userId
      ORDER BY "createdAt" DESC NULLS LAST
    `,
    `
      SELECT *
      FROM transactions
      WHERE "user_id" = :userId
      ORDER BY created_at DESC NULLS LAST
    `
  ];

  const rows = await runQueryWithFallback(queryCandidates, { userId });
  return rows.map(normalizeTransaction);
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
      console.log('⚠️  No transactions found in database for this user / wallet');

      try {
        const [{ count }] = await sequelize.query(
          'SELECT COUNT(*)::int AS count FROM transactions',
          { type: QueryTypes.SELECT }
        );
        console.log(`ℹ️  transactions table row count: ${count}`);

        const sample = await runQueryWithFallback(
          [
            `
              SELECT *
              FROM transactions
              ORDER BY "createdAt" DESC NULLS LAST
              LIMIT 5
            `,
            `
              SELECT *
              FROM transactions
              ORDER BY created_at DESC NULLS LAST
              LIMIT 5
            `
          ]
        );

        if (sample.length === 0) {
          console.log('ℹ️  transactions table currently empty.');
        } else {
          console.log('ℹ️  Sample transactions (no user match):');
          sample.forEach((row) => {
            const tx = normalizeTransaction(row);
            console.log(
              `  - ${tx.transactionId || 'N/A'} | wallet=${tx.walletId || 'N/A'} | amount=R${formatAmount(tx.amount)} | type=${tx.type} | created=${formatDate(tx.createdAt)}`
            );
          });
        }
      } catch (insightError) {
        console.log('⚠️  Unable to compute global transaction insights:', insightError.message);
      }

      return;
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