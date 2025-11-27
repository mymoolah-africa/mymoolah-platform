#!/usr/bin/env node
/**
 * Migrate Transactions from UAT to Staging Database
 * 
 * This script copies all transactions from UAT database to staging database.
 * It maps wallet IDs and user IDs correctly between the two databases.
 * 
 * Usage:
 *   node scripts/migrate-uat-transactions-to-staging.js [--dry-run]
 * 
 * Options:
 *   --dry-run: Show what would be migrated without actually doing it
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

// UAT Database Connection
const UAT_DATABASE = 'mymoolah';
const UAT_USER = 'mymoolah_app';
const UAT_PROXY_PORT = process.env.UAT_PROXY_PORT || '5433';

// Staging Database Connection
const STAGING_DATABASE = 'mymoolah_staging';
const STAGING_USER = 'mymoolah_app';
const STAGING_PROXY_PORT = process.env.STAGING_PROXY_PORT || '5434';

// Get database passwords
function getDatabasePassword(isUAT = false) {
  if (isUAT) {
    if (process.env.DATABASE_URL) {
      try {
        const urlString = process.env.DATABASE_URL;
        const hostPattern = '@127.0.0.1:';
        const hostIndex = urlString.indexOf(hostPattern);
        if (hostIndex > 0) {
          const userPassStart = urlString.indexOf('://') + 3;
          const passwordStart = urlString.indexOf(':', userPassStart) + 1;
          const password = urlString.substring(passwordStart, hostIndex);
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    if (process.env.DB_PASSWORD) {
      return process.env.DB_PASSWORD;
    }
    console.error('❌ UAT password not found in environment variables');
    process.exit(1);
  }
  
  try {
    return execSync(
      `gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (error) {
    console.error(`❌ Failed to get password from Secret Manager`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('🚀 Migrating Transactions from UAT to Staging');
console.log(`   Dry Run: ${dryRun ? 'Yes (no changes will be made)' : 'No'}`);
console.log('');

// Get passwords
console.log('📋 Retrieving database passwords...');
const uatPassword = getDatabasePassword(true);
const stagingPassword = getDatabasePassword(false);

// Build connection URLs
const uatUrl = `postgres://${UAT_USER}:${encodeURIComponent(uatPassword)}@127.0.0.1:${UAT_PROXY_PORT}/${UAT_DATABASE}?sslmode=disable`;
const stagingUrl = `postgres://${STAGING_USER}:${encodeURIComponent(stagingPassword)}@127.0.0.1:${STAGING_PROXY_PORT}/${STAGING_DATABASE}?sslmode=disable`;

console.log('📋 Connecting to databases...');
console.log(`   UAT: ${UAT_DATABASE}@127.0.0.1:${UAT_PROXY_PORT}`);
console.log(`   Staging: ${STAGING_DATABASE}@127.0.0.1:${STAGING_PROXY_PORT}`);
console.log('');

// Create Sequelize instances
const uatSequelize = new Sequelize(uatUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: false }
});

const stagingSequelize = new Sequelize(stagingUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: false }
});

async function migrateTransactions() {
  try {
    // Check proxies
    try {
      execSync(`lsof -i :${UAT_PROXY_PORT}`, { stdio: 'ignore' });
      console.log(`✅ UAT proxy running on port ${UAT_PROXY_PORT}`);
    } catch {
      console.error(`❌ UAT proxy not running on port ${UAT_PROXY_PORT}`);
      process.exit(1);
    }

    try {
      execSync(`lsof -i :${STAGING_PROXY_PORT}`, { stdio: 'ignore' });
      console.log(`✅ Staging proxy running on port ${STAGING_PROXY_PORT}`);
    } catch {
      console.error(`❌ Staging proxy not running on port ${STAGING_PROXY_PORT}`);
      process.exit(1);
    }

    // Test connections
    console.log('🔍 Testing database connections...');
    await uatSequelize.authenticate();
    console.log('✅ UAT database connected');
    
    await stagingSequelize.authenticate();
    console.log('✅ Staging database connected');
    console.log('');

    // Create user/wallet mapping (UAT ID -> Staging ID)
    console.log('📋 Creating user/wallet mapping...');
    const [uatUsers] = await uatSequelize.query(`
      SELECT u.id as user_id, u.email, u."phoneNumber", w."walletId"
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
      WHERE u.status = 'active'
    `);

    const [stagingUsers] = await stagingSequelize.query(`
      SELECT u.id as user_id, u.email, u."phoneNumber", w."walletId"
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
    `);

    // Create maps: email/phone -> staging user/wallet IDs
    const userMap = new Map();
    const walletMap = new Map();
    
    stagingUsers.forEach(su => {
      if (su.email) userMap.set(su.email.toLowerCase(), su.user_id);
      if (su.phoneNumber) userMap.set(su.phoneNumber, su.user_id);
      if (su.walletId) walletMap.set(su.walletId, su.user_id);
    });

    // Map UAT users to staging users
    const uatToStagingUserMap = new Map();
    const uatToStagingWalletMap = new Map();
    
    uatUsers.forEach(uu => {
      const stagingUserId = userMap.get(uu.email?.toLowerCase()) || 
                           userMap.get(uu.phoneNumber);
      if (stagingUserId) {
        uatToStagingUserMap.set(uu.user_id, stagingUserId);
      }
      if (uu.walletId) {
        const stagingWalletId = walletMap.get(uu.walletId);
        if (stagingWalletId) {
          uatToStagingWalletMap.set(uu.walletId, uu.walletId); // walletId stays the same
        }
      }
    });

    console.log(`📊 Mapped ${uatToStagingUserMap.size} users`);
    console.log(`📊 Mapped ${uatToStagingWalletMap.size} wallets`);
    console.log('');

    // Migrate transactions
    console.log('📦 Migrating transactions...');
    
    // Get all transactions - only select columns that exist in the base schema
    // The base migration only has: id, walletId, type, amount, description, status, createdAt, updatedAt
    // Other columns may not exist, so we'll use SELECT * and handle missing columns gracefully
    const [uatTransactions] = await uatSequelize.query(`
      SELECT * FROM transactions
      ORDER BY "createdAt" DESC
    `);

    console.log(`📊 Found ${uatTransactions.length} transactions in UAT`);
    console.log('');

    if (uatTransactions.length === 0) {
      console.log('⚠️  No transactions found in UAT');
      return;
    }

    // Check existing transactions in staging
    // Use id or a combination of walletId + amount + createdAt to identify duplicates
    const [existingTransactions] = await stagingSequelize.query(`
      SELECT id, "walletId", amount, "createdAt" FROM transactions
    `);
    const existingTxSet = new Set(
      existingTransactions.map(t => `${t.walletId}-${t.amount}-${t.createdAt}`)
    );

    const transactionsToMigrate = uatTransactions.filter(t => {
      const createdAt = t.createdAt || t.createdat || new Date();
      const key = `${t.walletId}-${t.amount}-${createdAt}`;
      return !existingTxSet.has(key);
    });

    console.log(`📊 Transactions to migrate: ${transactionsToMigrate.length}`);
    console.log(`📊 Transactions to skip (already exist): ${uatTransactions.length - transactionsToMigrate.length}`);
    console.log('');

    if (transactionsToMigrate.length === 0) {
      console.log('✅ All transactions already exist in staging');
      return;
    }

    if (dryRun) {
      console.log('🔍 DRY RUN: Would migrate the following transactions:');
      transactionsToMigrate.slice(0, 10).forEach((t, idx) => {
        const txId = t.transactionId || t.transactionid || t.id || 'N/A';
        console.log(`   ${idx + 1}. ${txId} - ${t.type} - R${t.amount} - ${t.walletId}`);
      });
      if (transactionsToMigrate.length > 10) {
        console.log(`   ... and ${transactionsToMigrate.length - 10} more`);
      }
      return;
    }

    // Migrate transactions
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    for (const uatTx of transactionsToMigrate) {
      try {
        // Map user ID
        let stagingUserId = null;
        if (uatTx.userId) {
          stagingUserId = uatToStagingUserMap.get(uatTx.userId);
          if (!stagingUserId) {
            skipped++;
            continue; // Skip if user not found in staging
          }
        }

        // Map wallet IDs
        let stagingWalletId = uatTx.walletId;
        let stagingSenderWalletId = uatTx.senderWalletId;
        let stagingReceiverWalletId = uatTx.receiverWalletId;

        // Verify wallet IDs exist in staging
        if (uatTx.walletId && !uatToStagingWalletMap.has(uatTx.walletId)) {
          skipped++;
          continue; // Skip if wallet not found
        }
        if (uatTx.senderWalletId && !uatToStagingWalletMap.has(uatTx.senderWalletId)) {
          skipped++;
          continue;
        }
        if (uatTx.receiverWalletId && !uatToStagingWalletMap.has(uatTx.receiverWalletId)) {
          skipped++;
          continue;
        }

        // Get timestamps (PostgreSQL returns quoted columns as-is, unquoted as lowercase)
        const createdAt = uatTx.createdAt || uatTx.createdat || new Date();
        const updatedAt = uatTx.updatedAt || uatTx.updatedat || new Date();

        // Only insert columns that exist in the base schema
        // Base schema: id, walletId, type, amount, description, status, createdAt, updatedAt
        // Note: transactionId, userId, etc. may not exist in the base schema
        const txId = uatTx.transactionId || uatTx.transactionid || uatTx.id;
        const description = uatTx.description || (txId ? `Transaction ${txId}` : `Transaction - ${uatTx.type || 'transfer'}`);
        
        await stagingSequelize.query(`
          INSERT INTO transactions (
            "walletId",
            type,
            amount,
            description,
            status,
            "createdAt",
            "updatedAt"
          ) VALUES (
            :walletId,
            :type,
            :amount,
            :description,
            :status,
            :createdAt,
            :updatedAt
          )
        `, {
          replacements: {
            walletId: stagingWalletId,
            type: uatTx.type || 'transfer',
            amount: uatTx.amount || 0,
            description: description,
            status: uatTx.status || 'completed',
            createdAt: createdAt,
            updatedAt: updatedAt
          }
        });

        migrated++;
        if (migrated % 50 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${transactionsToMigrate.length} transactions...`);
        }
      } catch (error) {
        errors++;
        if (errors <= 10) {
          const txId = uatTx.transactionId || uatTx.transactionid || uatTx.id || 'unknown';
          console.error(`   ❌ Failed to migrate transaction ${txId}: ${error.message}`);
        }
      }
    }

    console.log('');
    console.log(`✅ Transaction migration complete!`);
    console.log(`   Migrated: ${migrated} transactions`);
    if (skipped > 0) {
      console.log(`   Skipped: ${skipped} transactions (user/wallet not found in staging)`);
    }
    if (errors > 0) {
      console.log(`   Errors: ${errors} transactions`);
    }
    console.log('');

    // Recalculate wallet balances from transactions
    console.log('🔄 Recalculating wallet balances from transactions...');
    
    const [wallets] = await stagingSequelize.query(`
      SELECT "walletId" FROM wallets
    `);

    for (const wallet of wallets) {
      try {
        const [balanceResult] = await stagingSequelize.query(`
          SELECT 
            COALESCE(SUM(CASE 
              WHEN type IN ('deposit', 'receive', 'transfer') AND status = 'completed' THEN amount
              WHEN type = 'send' AND status = 'completed' THEN -amount
              WHEN type = 'withdraw' AND status = 'completed' THEN -amount
              WHEN type = 'payment' AND status = 'completed' THEN -amount
              WHEN type = 'fee' AND status = 'completed' THEN -amount
              ELSE 0
            END), 0) as balance
          FROM transactions
          WHERE "walletId" = :walletId
        `, {
          replacements: { walletId: wallet.walletId }
        });

        const calculatedBalance = parseFloat(balanceResult[0]?.balance || 0);

        await stagingSequelize.query(`
          UPDATE wallets
          SET balance = :balance, updated_at = :updatedAt
          WHERE "walletId" = :walletId
        `, {
          replacements: {
            walletId: wallet.walletId,
            balance: calculatedBalance,
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.error(`   ⚠️  Failed to recalculate balance for wallet ${wallet.walletId}: ${error.message}`);
      }
    }

    console.log(`✅ Wallet balances recalculated!`);
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exit(1);
  } finally {
    await uatSequelize.close();
    await stagingSequelize.close();
  }
}

migrateTransactions();

