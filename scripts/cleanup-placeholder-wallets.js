#!/usr/bin/env node
/**
 * Clean up placeholder wallets in staging
 * 
 * This script removes placeholder wallets (WAL20250729123456JOHN, etc.)
 * that were created during initial setup but are no longer needed.
 * 
 * Safety checks:
 * - Only deletes wallets with R0 balance
 * - Only deletes wallets with no transactions
 * - Only deletes wallets matching the placeholder pattern
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

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

async function main() {
  const stagingUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;

  if (!stagingUrl) {
    console.error('❌ STAGING_DATABASE_URL (or DATABASE_URL) is required.');
    process.exit(1);
  }

  const staging = getSequelize(stagingUrl, 'Staging');

  try {
    console.log('🔌 Connecting to Staging database...');
    await staging.authenticate();
    console.log('✅ Connection established\n');

    // Find placeholder wallets (pattern: WAL20250729123456*)
    console.log('📋 Finding placeholder wallets...');
    const placeholderWallets = await staging.query(
      `SELECT id, "walletId", "userId", balance, status 
       FROM wallets 
       WHERE "walletId" LIKE 'WAL20250729123456%'
       ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    if (placeholderWallets.length === 0) {
      console.log('✅ No placeholder wallets found');
      return;
    }

    console.log(`📊 Found ${placeholderWallets.length} placeholder wallets:\n`);
    console.table(placeholderWallets);

    // Check for transactions
    console.log('\n🔍 Checking for transactions...');
    const walletsWithTransactions = [];
    const safeToDelete = [];

    for (const wallet of placeholderWallets) {
      const [txCount] = await staging.query(
        `SELECT COUNT(*) as count FROM transactions WHERE "walletId" = :walletId`,
        { type: QueryTypes.SELECT, replacements: { walletId: wallet.walletId } }
      );

      const count = parseInt(txCount.count);
      const balance = parseFloat(wallet.balance);

      if (count > 0 || balance !== 0) {
        walletsWithTransactions.push({
          walletId: wallet.walletId,
          balance: wallet.balance,
          transactions: count,
        });
      } else {
        safeToDelete.push(wallet);
      }
    }

    if (walletsWithTransactions.length > 0) {
      console.log('\n⚠️  Wallets with transactions or non-zero balance (will NOT delete):');
      console.table(walletsWithTransactions);
    }

    if (safeToDelete.length === 0) {
      console.log('\n✅ No placeholder wallets are safe to delete');
      return;
    }

    console.log(`\n🗑️  Wallets safe to delete: ${safeToDelete.length}`);
    console.table(safeToDelete);

    const transaction = await staging.transaction();

    try {
      for (const wallet of safeToDelete) {
        console.log(`🗑️  Deleting wallet ${wallet.walletId} (user ${wallet.userId})...`);
        await staging.query(
          `DELETE FROM wallets WHERE "walletId" = :walletId`,
          { transaction, replacements: { walletId: wallet.walletId } }
        );
      }

      await transaction.commit();

      console.log(`\n✅ Cleanup complete! Deleted ${safeToDelete.length} placeholder wallets.`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await staging.close();
  }
}

main();

