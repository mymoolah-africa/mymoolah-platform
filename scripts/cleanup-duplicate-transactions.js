#!/usr/bin/env node
/**
 * Banking-Grade Duplicate Transaction Cleanup Script
 * 
 * This script identifies and removes duplicate transactions from the database
 * while ensuring wallet balances remain correct.
 * 
 * Strategy:
 * 1. Identifies duplicate transactions (same transactionId or same payment request ID)
 * 2. Keeps the earliest transaction (by createdAt)
 * 3. Recalculates wallet balances to ensure correctness
 * 4. Removes duplicate transactions
 * 
 * Usage: node scripts/cleanup-duplicate-transactions.js [DATABASE_URL]
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided. Usage: node scripts/cleanup-duplicate-transactions.js [DATABASE_URL]');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialect: 'postgres'
});

async function cleanupDuplicates() {
  const transaction = await sequelize.transaction({ isolationLevel: 'SERIALIZABLE' });
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    console.log('='.repeat(80));
    console.log('DUPLICATE TRANSACTION CLEANUP');
    console.log('='.repeat(80));
    console.log('⚠️  WARNING: This will permanently delete duplicate transactions!\n');

    // Step 1: Find duplicate transaction IDs
    console.log('Step 1: Identifying duplicate transaction IDs...');
    const [duplicateTxIds] = await sequelize.query(`
      SELECT "transactionId", COUNT(*) as count, ARRAY_AGG(id ORDER BY "createdAt" ASC) as ids
      FROM "Transactions"
      WHERE "transactionId" IS NOT NULL
      GROUP BY "transactionId"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, { transaction });

    console.log(`Found ${duplicateTxIds.length} duplicate transaction ID groups`);

    // Step 2: Find duplicate transactions by payment request ID
    console.log('\nStep 2: Identifying duplicate transactions by payment request ID...');
    const [duplicateByRequestId] = await sequelize.query(`
      SELECT 
        metadata->>'requestId' as request_id,
        metadata->>'paymentRequestId' as payment_request_id,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY "createdAt" ASC) as ids
      FROM "Transactions"
      WHERE (metadata->>'requestId' IS NOT NULL OR metadata->>'paymentRequestId' IS NOT NULL)
        AND status = 'completed'
      GROUP BY metadata->>'requestId', metadata->>'paymentRequestId'
      HAVING COUNT(*) > 2
      ORDER BY count DESC
    `, { transaction });

    console.log(`Found ${duplicateByRequestId.length} duplicate payment request groups`);

    // Step 3: Identify transactions to keep (earliest) and delete (duplicates)
    const transactionsToDelete = new Set();
    
    // Process duplicate transaction IDs
    for (const dup of duplicateTxIds) {
      const ids = dup.ids;
      const keepId = ids[0]; // Keep the earliest
      const deleteIds = ids.slice(1); // Delete the rest
      
      console.log(`\n  Transaction ID: ${dup.transactionId}`);
      console.log(`    Keeping: ${keepId} (earliest)`);
      console.log(`    Deleting: ${deleteIds.join(', ')}`);
      
      deleteIds.forEach(id => transactionsToDelete.add(id));
    }

    // Process duplicate payment requests
    for (const dup of duplicateByRequestId) {
      const ids = dup.ids;
      const keepId = ids[0]; // Keep the earliest
      const deleteIds = ids.slice(1); // Delete the rest
      
      console.log(`\n  Payment Request ID: ${dup.request_id || dup.payment_request_id}`);
      console.log(`    Keeping: ${keepId} (earliest)`);
      console.log(`    Deleting: ${deleteIds.join(', ')}`);
      
      deleteIds.forEach(id => transactionsToDelete.add(id));
    }

    if (transactionsToDelete.size === 0) {
      console.log('\n✅ No duplicate transactions found. Database is clean!');
      await transaction.commit();
      return;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total duplicates to delete: ${transactionsToDelete.size}`);
    console.log(`   Total duplicates to keep: ${duplicateTxIds.length + duplicateByRequestId.length}`);

    // Step 4: Get affected users and wallets
    const deleteIdsArray = Array.from(transactionsToDelete);
    const [affectedTransactions] = await sequelize.query(`
      SELECT DISTINCT "userId", "walletId", type, amount
      FROM "Transactions"
      WHERE id = ANY(:deleteIds)
    `, {
      replacements: { deleteIds: deleteIdsArray },
      transaction
    });

    console.log(`\n📋 Affected users/wallets: ${affectedTransactions.length}`);

    // Step 5: Recalculate wallet balances before deletion
    console.log('\nStep 3: Recalculating wallet balances...');
    const affectedWallets = new Set();
    affectedTransactions.forEach(tx => {
      if (tx.walletId) affectedWallets.add(tx.walletId);
    });

    for (const walletId of affectedWallets) {
      const [wallet] = await sequelize.query(`
        SELECT "userId", balance FROM "Wallets" WHERE "walletId" = :walletId
      `, {
        replacements: { walletId },
        transaction
      });

      if (!wallet[0]) continue;

      const userId = wallet[0].userId;
      
      // Recalculate balance from all transactions (excluding ones to be deleted)
      const [allTransactions] = await sequelize.query(`
        SELECT type, amount, status
        FROM "Transactions"
        WHERE "walletId" = :walletId
          AND id != ALL(:deleteIds)
          AND status = 'completed'
        ORDER BY "createdAt" ASC
      `, {
        replacements: { walletId, deleteIds: deleteIdsArray },
        transaction
      });

      let calculatedBalance = 0;
      allTransactions.forEach(tx => {
        if (tx.type === 'send' || tx.type === 'payment' || tx.type === 'debit' || tx.type === 'withdraw' || tx.type === 'fee') {
          calculatedBalance -= parseFloat(tx.amount);
        } else if (tx.type === 'receive' || tx.type === 'credit' || tx.type === 'deposit' || tx.type === 'transfer' || tx.type === 'refund') {
          calculatedBalance += parseFloat(tx.amount);
        }
      });

      const currentBalance = parseFloat(wallet[0].balance);
      const difference = Math.abs(currentBalance - calculatedBalance);

      console.log(`\n  Wallet: ${walletId} (User: ${userId})`);
      console.log(`    Current balance: R ${currentBalance.toFixed(2)}`);
      console.log(`    Calculated balance: R ${calculatedBalance.toFixed(2)}`);
      console.log(`    Difference: R ${difference.toFixed(2)}`);

      if (difference > 0.01) {
        console.log(`    ⚠️  Balance will be corrected to: R ${calculatedBalance.toFixed(2)}`);
        await sequelize.query(`
          UPDATE "Wallets"
          SET balance = :balance
          WHERE "walletId" = :walletId
        `, {
          replacements: { balance: calculatedBalance, walletId },
          transaction
        });
      }
    }

    // Step 6: Delete duplicate transactions
    console.log(`\nStep 4: Deleting ${transactionsToDelete.size} duplicate transactions...`);
    const [deleteResult] = await sequelize.query(`
      DELETE FROM "Transactions"
      WHERE id = ANY(:deleteIds)
      RETURNING id, "transactionId", "userId", type, amount
    `, {
      replacements: { deleteIds: deleteIdsArray },
      transaction
    });

    console.log(`✅ Deleted ${deleteResult.length} duplicate transactions`);

    // Step 7: Verify cleanup
    console.log('\nStep 5: Verifying cleanup...');
    const [remainingDuplicates] = await sequelize.query(`
      SELECT "transactionId", COUNT(*) as count
      FROM "Transactions"
      WHERE "transactionId" IS NOT NULL
      GROUP BY "transactionId"
      HAVING COUNT(*) > 1
    `, { transaction });

    if (remainingDuplicates.length === 0) {
      console.log('✅ No remaining duplicates found');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.length} duplicate groups still exist`);
    }

    await transaction.commit();
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  - Duplicates deleted: ${deleteResult.length}`);
    console.log(`  - Wallets recalculated: ${affectedWallets.size}`);
    console.log(`  - Remaining duplicates: ${remainingDuplicates.length}`);

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error during cleanup:', error);
    console.error('⚠️  Transaction rolled back - no changes were made');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This script will permanently delete duplicate transactions!');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  cleanupDuplicates().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}, 5000);

