#!/usr/bin/env node
/**
 * Audit UAT vs Staging Balance Discrepancy
 * 
 * Compares transactions and balance calculations between UAT and Staging for a given user.
 *
 * Usage: node scripts/audit-uat-staging-balances.js <user_id>
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const USER_ID = parseInt(process.argv[2], 10);
if (!USER_ID || Number.isNaN(USER_ID)) {
  console.log('Usage: node scripts/audit-uat-staging-balances.js <user_id>');
  console.log('Example: node scripts/audit-uat-staging-balances.js 1');
  process.exit(1);
}

function getSequelize(url, label) {
  if (!url) {
    console.error(`❌ Missing database URL for ${label}.`);
    process.exit(1);
  }

  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: false },
  });
}

async function getWalletInfo(sequelize, userId, label) {
  const [wallet] = await sequelize.query(
    `SELECT "walletId", balance, currency 
     FROM wallets 
     WHERE "userId" = :userId 
     LIMIT 1`,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );
  
  if (!wallet) {
    console.log(`⚠️  No wallet found for user ${userId} in ${label}`);
    return null;
  }
  
  console.log(`\n📊 ${label} Wallet:`);
  console.log(`   Wallet ID: ${wallet.walletId}`);
  console.log(`   Balance: R ${parseFloat(wallet.balance).toFixed(2)}`);
  console.log(`   Currency: ${wallet.currency}`);
  
  return wallet;
}

async function getTransactionSummary(sequelize, walletId, label) {
  console.log(`\n🔍 ${label} Transaction Summary for ${walletId}:`);
  
  // Get transaction counts by type
  const typeCounts = await sequelize.query(
    `SELECT type, status, COUNT(*) as count, SUM(amount) as total
     FROM transactions
     WHERE "walletId" = :walletId
     GROUP BY type, status
     ORDER BY type, status`,
    {
      replacements: { walletId },
      type: QueryTypes.SELECT,
    }
  );
  
  console.log('\n   Transaction Counts:');
  typeCounts.forEach(row => {
    console.log(`   ${row.type.padEnd(15)} ${row.status.padEnd(10)} Count: ${row.count.toString().padStart(3)} Total: R ${parseFloat(row.total).toFixed(2)}`);
  });
  
  // Calculate balance from transactions
  const [calculated] = await sequelize.query(
    `SELECT 
       SUM(CASE WHEN type IN ('deposit', 'receive', 'refund', 'cashback', 'reward') AND status = 'completed' THEN amount ELSE 0 END) as total_credits,
       SUM(CASE WHEN type IN ('withdrawal', 'send', 'purchase', 'payment', 'fee') AND status = 'completed' THEN amount ELSE 0 END) as total_debits,
       SUM(CASE WHEN type IN ('deposit', 'receive', 'refund', 'cashback', 'reward') AND status = 'completed' THEN amount ELSE 0 END) -
       SUM(CASE WHEN type IN ('withdrawal', 'send', 'purchase', 'payment', 'fee') AND status = 'completed' THEN amount ELSE 0 END) as calculated_balance
     FROM transactions
     WHERE "walletId" = :walletId`,
    {
      replacements: { walletId },
      type: QueryTypes.SELECT,
    }
  );
  
  console.log('\n   Balance Calculation:');
  console.log(`   Total Credits:  R ${parseFloat(calculated.total_credits || 0).toFixed(2)}`);
  console.log(`   Total Debits:   R ${parseFloat(calculated.total_debits || 0).toFixed(2)}`);
  console.log(`   Calculated:     R ${parseFloat(calculated.calculated_balance || 0).toFixed(2)}`);
  
  return {
    typeCounts,
    totalCredits: parseFloat(calculated.total_credits || 0),
    totalDebits: parseFloat(calculated.total_debits || 0),
    calculatedBalance: parseFloat(calculated.calculated_balance || 0),
  };
}

async function getDetailedTransactions(sequelize, walletId, label) {
  const transactions = await sequelize.query(
    `SELECT id, "transactionId", type, amount, status, description, "createdAt"
     FROM transactions
     WHERE "walletId" = :walletId
     ORDER BY "createdAt" ASC`,
    {
      replacements: { walletId },
      type: QueryTypes.SELECT,
    }
  );
  
  console.log(`\n📋 ${label} Detailed Transactions (${transactions.length} total):`);
  
  return transactions;
}

async function compareTransactions(uatTxs, stagingTxs) {
  console.log('\n🔍 Comparing Transactions Between UAT and Staging:\n');
  
  // Create maps by description and amount for easier comparison
  const uatMap = new Map();
  uatTxs.forEach(tx => {
    const key = `${tx.type}|${tx.amount}|${tx.status}|${tx.description}`;
    if (!uatMap.has(key)) {
      uatMap.set(key, []);
    }
    uatMap.get(key).push(tx);
  });
  
  const stagingMap = new Map();
  stagingTxs.forEach(tx => {
    const key = `${tx.type}|${tx.amount}|${tx.status}|${tx.description}`;
    if (!stagingMap.has(key)) {
      stagingMap.set(key, []);
    }
    stagingMap.get(key).push(tx);
  });
  
  // Find transactions in UAT but not in Staging
  console.log('❌ Transactions in UAT but NOT in Staging:');
  let foundDiff = false;
  for (const [key, txs] of uatMap.entries()) {
    const stagingCount = stagingMap.get(key)?.length || 0;
    if (txs.length !== stagingCount) {
      foundDiff = true;
      const [type, amount, status, description] = key.split('|');
      console.log(`   ${type.padEnd(15)} R ${parseFloat(amount).toFixed(2).padStart(10)} ${status.padEnd(10)} Count: UAT=${txs.length}, Staging=${stagingCount}`);
      console.log(`   Description: ${description}`);
      if (txs.length > 0) {
        console.log(`   UAT IDs: ${txs.map(t => t.id).join(', ')}`);
      }
      if (stagingMap.get(key)?.length > 0) {
        console.log(`   Staging IDs: ${stagingMap.get(key).map(t => t.id).join(', ')}`);
      }
      console.log('');
    }
  }
  
  // Find transactions in Staging but not in UAT
  console.log('\n❌ Transactions in Staging but NOT in UAT:');
  for (const [key, txs] of stagingMap.entries()) {
    const uatCount = uatMap.get(key)?.length || 0;
    if (txs.length !== uatCount) {
      foundDiff = true;
      const [type, amount, status, description] = key.split('|');
      console.log(`   ${type.padEnd(15)} R ${parseFloat(amount).toFixed(2).padStart(10)} ${status.padEnd(10)} Count: UAT=${uatCount}, Staging=${txs.length}`);
      console.log(`   Description: ${description}`);
      if (uatMap.get(key)?.length > 0) {
        console.log(`   UAT IDs: ${uatMap.get(key).map(t => t.id).join(', ')}`);
      }
      if (txs.length > 0) {
        console.log(`   Staging IDs: ${txs.map(t => t.id).join(', ')}`);
      }
      console.log('');
    }
  }
  
  if (!foundDiff) {
    console.log('   ✅ All transactions match between UAT and Staging\n');
  }
}

async function main() {
  console.log('🔍 Auditing UAT vs Staging Balance Discrepancy');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`User ID: ${USER_ID}`);
  console.log('(Compare stored vs calculated balances and transaction lists between UAT and Staging.)\n');

  const uatUrl = process.env.UAT_DATABASE_URL || process.env.DATABASE_URL;
  const stagingUrl = process.env.STAGING_DATABASE_URL;

  if (!uatUrl || !stagingUrl) {
    console.error('❌ Both UAT_DATABASE_URL and STAGING_DATABASE_URL are required.');
    process.exit(1);
  }

  const uat = getSequelize(uatUrl, 'UAT');
  const staging = getSequelize(stagingUrl, 'Staging');

  try {
    console.log('🔌 Connecting to databases...');
    await uat.authenticate();
    await staging.authenticate();
    console.log('✅ Connected to both databases\n');

    // Get wallet info
    const uatWallet = await getWalletInfo(uat, USER_ID, 'UAT');
    const stagingWallet = await getWalletInfo(staging, USER_ID, 'Staging');

    if (!uatWallet || !stagingWallet) {
      console.error('❌ Could not find wallets in both databases');
      process.exit(1);
    }

    // Compare stored balances
    const uatBalance = parseFloat(uatWallet.balance);
    const stagingBalance = parseFloat(stagingWallet.balance);
    const balanceDiff = stagingBalance - uatBalance;

    console.log('\n💰 Balance Comparison:');
    console.log(`   UAT Balance:     R ${uatBalance.toFixed(2)}`);
    console.log(`   Staging Balance: R ${stagingBalance.toFixed(2)}`);
    console.log(`   Difference:      R ${balanceDiff.toFixed(2)} ${balanceDiff > 0 ? '(Staging higher)' : '(UAT higher)'}`);

    // Get transaction summaries
    const uatSummary = await getTransactionSummary(uat, uatWallet.walletId, 'UAT');
    const stagingSummary = await getTransactionSummary(staging, stagingWallet.walletId, 'Staging');

    // Compare calculated vs stored balances
    console.log('\n🧮 Calculated vs Stored Balance:');
    console.log(`\n   UAT:`);
    console.log(`   Stored:     R ${uatBalance.toFixed(2)}`);
    console.log(`   Calculated: R ${uatSummary.calculatedBalance.toFixed(2)}`);
    console.log(`   Difference: R ${(uatBalance - uatSummary.calculatedBalance).toFixed(2)}`);
    
    console.log(`\n   Staging:`);
    console.log(`   Stored:     R ${stagingBalance.toFixed(2)}`);
    console.log(`   Calculated: R ${stagingSummary.calculatedBalance.toFixed(2)}`);
    console.log(`   Difference: R ${(stagingBalance - stagingSummary.calculatedBalance).toFixed(2)}`);

    // Get detailed transactions
    const uatTxs = await getDetailedTransactions(uat, uatWallet.walletId, 'UAT');
    const stagingTxs = await getDetailedTransactions(staging, stagingWallet.walletId, 'Staging');

    // Compare transaction counts
    console.log('\n📊 Transaction Count Comparison:');
    console.log(`   UAT:     ${uatTxs.length} transactions`);
    console.log(`   Staging: ${stagingTxs.length} transactions`);
    console.log(`   Difference: ${stagingTxs.length - uatTxs.length} transactions`);

    // Compare transactions
    await compareTransactions(uatTxs, stagingTxs);

    console.log('\n✅ Audit complete!\n');

  } catch (error) {
    console.error('\n❌ Audit failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await uat.close();
    await staging.close();
  }
}

main();

