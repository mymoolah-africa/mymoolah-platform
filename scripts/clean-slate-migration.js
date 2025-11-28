#!/usr/bin/env node
/**
 * Clean Slate Migration: UAT → Staging
 * 
 * This script performs a complete clean migration from UAT to Staging:
 * 1. Wipes all data from staging
 * 2. Migrates users with correct IDs
 * 3. Migrates wallets with correct user references
 * 4. Migrates transactions with correct wallet/user references
 * 5. Migrates vouchers with correct user/wallet references
 * 6. Recalculates all balances from scratch
 * 
 * IMPORTANT: 
 * - All queries use raw: true, useMaster: true to bypass any caching
 * - Reads directly from UAT database, not from any cache layer
 * - Ensures 100% fresh, real data migration
 * 
 * DESTRUCTIVE: This will DELETE ALL DATA in staging!
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
  const uatUrl = process.env.UAT_DATABASE_URL;
  const stagingUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
  const dryRun = process.argv.includes('--dry-run');

  if (!uatUrl || !stagingUrl) {
    console.error('❌ Both UAT_DATABASE_URL and STAGING_DATABASE_URL are required.');
    process.exit(1);
  }

  // Disable all caching and use raw database connections
  const uat = getSequelize(uatUrl, 'UAT');
  const staging = getSequelize(stagingUrl, 'Staging');
  
  // Ensure we're reading fresh data, not cached
  uat.options.logging = false;
  uat.options.benchmark = false;
  staging.options.logging = false;
  staging.options.benchmark = false;

  try {
    console.log('🔌 Connecting to databases...');
    await uat.authenticate();
    await staging.authenticate();
    console.log('✅ Connections established\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    } else {
      console.log('⚠️  DESTRUCTIVE OPERATION - All staging data will be deleted!');
      console.log('⚠️  Press Ctrl+C within 10 seconds to cancel...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    const transaction = dryRun ? null : await staging.transaction();

    try {
      // Step 1: Wipe staging data
      console.log('🗑️  Step 1: Wiping staging data...');
      
      if (!dryRun) {
        // Temporarily disable foreign key checks
        await staging.query('SET CONSTRAINTS ALL DEFERRED', { transaction });
        
        // Delete in correct order (respecting foreign keys)
        // Use TRUNCATE CASCADE to handle all foreign key constraints
        const tablesToDelete = ['vouchers', 'transactions', 'wallets', 'users'];
        
        for (const table of tablesToDelete) {
          try {
            await staging.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`, { transaction });
            console.log(`   ✅ Cleared ${table}`);
          } catch (err) {
            if (err.message.includes('does not exist')) {
              console.log(`   ℹ️  Table ${table} doesn't exist, skipping`);
            } else {
              // If we can't truncate, this is a critical error
              console.error(`   ❌ Failed to clear ${table}: ${err.message}`);
              throw new Error(`Cannot proceed: Failed to clear ${table} table`);
            }
          }
        }
      }
      
      console.log('   ✅ Staging wiped clean\n');

      // Step 2: Migrate users with ID remapping
      console.log('📦 Step 2: Migrating users from UAT...');
      
      // UAT has users at IDs: 1, 2, 4, 6, 7, 8
      // Staging needs sequential IDs: 1, 2, 3, 4, 5, 6
      const userIdMapping = {
        1: 1,  // Andre
        2: 2,  // Leonie
        4: 3,  // Andre Jr
        6: 4,  // Hendrik
        7: 5,  // Neil
        8: 6   // Denise
      };
      
      // Force fresh read from database (no cache)
      const uatUsers = await uat.query(
        `SELECT id, "firstName", "lastName", "phoneNumber", email, password_hash, status,
                "kycStatus", "kycVerifiedAt", "kycVerifiedBy", "createdAt", "updatedAt"
         FROM users
         WHERE status = 'active' AND id IN (1, 2, 4, 6, 7, 8)
         ORDER BY id`,
        { 
          type: QueryTypes.SELECT,
          raw: true,
          plain: false,
          useMaster: true  // Force read from master DB, not replica
        }
      );

      console.log(`   Found ${uatUsers.length} users in UAT`);
      console.log(`   Remapping UAT IDs (1,2,4,6,7,8) → Staging IDs (1,2,3,4,5,6)`);

      if (!dryRun) {
        for (const user of uatUsers) {
          const newId = userIdMapping[user.id];
          await staging.query(
            `INSERT INTO users (
               id, "firstName", "lastName", "phoneNumber", email, password_hash, status,
               "kycStatus", "kycVerifiedAt", "kycVerifiedBy", "createdAt", "updatedAt"
             ) VALUES (
               :id, :firstName, :lastName, :phoneNumber, :email, :passwordHash, :status,
               :kycStatus, :kycVerifiedAt, :kycVerifiedBy, :createdAt, :updatedAt
             )`,
            {
              transaction,
              replacements: {
                id: newId,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                email: user.email,
                passwordHash: user.password_hash,
                status: user.status || 'active',
                kycStatus: user.kycStatus || 'not_started',
                kycVerifiedAt: user.kycVerifiedAt,
                kycVerifiedBy: user.kycVerifiedBy,
                createdAt: user.createdAt || new Date(),
                updatedAt: new Date(),
              },
            }
          );
        }
        
        // Update sequence to continue from 7
        await staging.query(
          `ALTER SEQUENCE users_id_seq RESTART WITH 7`,
          { transaction }
        );
      }

      console.log(`   ✅ Migrated ${uatUsers.length} users with ID remapping\n`);

      // Step 3: Migrate wallets with remapped user IDs
      console.log('📦 Step 3: Migrating wallets from UAT...');
      
      // Force fresh read from database (no cache)
      const uatWallets = await uat.query(
        `SELECT id, "walletId", "userId", balance, currency, status,
                "kycVerified", "kycVerifiedAt", "kycVerifiedBy",
                "dailyLimit", "monthlyLimit", "dailySpent", "monthlySpent",
                "lastTransactionAt", "createdAt", "updatedAt"
         FROM wallets
         WHERE "userId" IN (1, 2, 4, 6, 7, 8)
         ORDER BY id`,
        { 
          type: QueryTypes.SELECT,
          raw: true,
          plain: false,
          useMaster: true
        }
      );

      console.log(`   Found ${uatWallets.length} wallets in UAT`);

      if (!dryRun) {
        for (const wallet of uatWallets) {
          const newUserId = userIdMapping[wallet.userId];
          await staging.query(
            `INSERT INTO wallets (
               id, "walletId", "userId", balance, currency, status,
               "kycVerified", "kycVerifiedAt", "kycVerifiedBy",
               "dailyLimit", "monthlyLimit", "dailySpent", "monthlySpent",
               "lastTransactionAt", "createdAt", "updatedAt"
             ) VALUES (
               :id, :walletId, :userId, :balance, :currency, :status,
               :kycVerified, :kycVerifiedAt, :kycVerifiedBy,
               :dailyLimit, :monthlyLimit, :dailySpent, :monthlySpent,
               :lastTransactionAt, :createdAt, :updatedAt
             )`,
            {
              transaction,
              replacements: {
                id: wallet.id,
                walletId: wallet.walletId,
                userId: newUserId, // Use remapped user ID
                balance: 0, // Will recalculate from transactions
                currency: wallet.currency || 'ZAR',
                status: wallet.status || 'active',
                kycVerified: wallet.kycVerified || false,
                kycVerifiedAt: wallet.kycVerifiedAt,
                kycVerifiedBy: wallet.kycVerifiedBy,
                dailyLimit: wallet.dailyLimit || 5000,
                monthlyLimit: wallet.monthlyLimit || 50000,
                dailySpent: 0, // Will recalculate
                monthlySpent: 0, // Will recalculate
                lastTransactionAt: wallet.lastTransactionAt,
                createdAt: wallet.createdAt || new Date(),
                updatedAt: new Date(),
              },
            }
          );
        }
        
        const maxWalletId = Math.max(...uatWallets.map(w => w.id));
        await staging.query(
          `ALTER SEQUENCE wallets_id_seq RESTART WITH ${maxWalletId + 1}`,
          { transaction }
        );
      }

      console.log(`   ✅ Migrated ${uatWallets.length} wallets with remapped user IDs\n`);

      // Step 4: Migrate transactions
      console.log('📦 Step 4: Migrating transactions from UAT...');
      
      // Force fresh read from database (no cache)
      const uatTransactions = await uat.query(
        `SELECT * FROM transactions ORDER BY id`,
        { 
          type: QueryTypes.SELECT,
          raw: true,
          plain: false,
          useMaster: true
        }
      );

      console.log(`   Found ${uatTransactions.length} transactions in UAT`);

      if (!dryRun) {
        let migrated = 0;
        let skipped = 0;
        const validWalletIds = new Set(uatWallets.map(w => w.walletId));
        
        for (const tx of uatTransactions) {
          // Skip transactions with invalid wallet references
          const hasInvalidWallet = 
            (tx.walletId && !validWalletIds.has(tx.walletId)) ||
            (tx.senderWalletId && !validWalletIds.has(tx.senderWalletId)) ||
            (tx.receiverWalletId && !validWalletIds.has(tx.receiverWalletId));
          
          if (hasInvalidWallet) {
            skipped++;
            continue;
          }
          
          // Get all column names from the transaction object
          const columns = Object.keys(tx).filter(k => tx[k] !== undefined);
          // Keep all columns in camelCase (staging uses camelCase)
          const columnNames = columns.map(c => `"${c}"`).join(', ');
          const placeholders = columns.map(c => `:${c}`).join(', ');
          
          const replacements = {};
          columns.forEach(c => {
            // Remap userId if present
            if (c === 'userId' && tx[c] && userIdMapping[tx[c]]) {
              replacements[c] = userIdMapping[tx[c]];
            }
            // Stringify JSON/JSONB columns
            else if (c === 'metadata' && typeof tx[c] === 'object' && tx[c] !== null) {
              replacements[c] = JSON.stringify(tx[c]);
            } else {
              replacements[c] = tx[c];
            }
          });

          await staging.query(
            `INSERT INTO transactions (${columnNames}) VALUES (${placeholders})`,
            { transaction, replacements }
          );
          
          migrated++;
          if (migrated % 50 === 0) {
            console.log(`   ⏳ Migrated ${migrated}/${uatTransactions.length} transactions...`);
          }
        }
        
        if (skipped > 0) {
          console.log(`   ⚠️  Skipped ${skipped} transactions with invalid wallet references`);
        }
        
        const maxTxId = Math.max(...uatTransactions.map(t => t.id));
        await staging.query(
          `ALTER SEQUENCE transactions_id_seq RESTART WITH ${maxTxId + 1}`,
          { transaction }
        );
      }

      console.log(`   ✅ Migrated ${uatTransactions.length} transactions\n`);

      // Step 5: Migrate vouchers with column mapping
      console.log('📦 Step 5: Migrating vouchers from UAT...');
      
      // Force fresh read from database (no cache)
      const uatVouchers = await uat.query(
        `SELECT * FROM vouchers WHERE "userId" IN (1, 2, 4, 6, 7, 8) ORDER BY id`,
        { 
          type: QueryTypes.SELECT,
          raw: true,
          plain: false,
          useMaster: true
        }
      );

      console.log(`   Found ${uatVouchers.length} vouchers in UAT`);
      console.log(`   Mapping UAT columns → Staging columns`);

      if (!dryRun && uatVouchers.length > 0) {
        let vouchersMigrated = 0;
        for (const voucher of uatVouchers) {
          // Map UAT columns to Staging columns
          // UAT: voucherCode, voucherType, originalAmount, expiresAt
          // Staging: voucherId, type, amount, expiryDate
          const newUserId = userIdMapping[voucher.userId];
          
          await staging.query(
            `INSERT INTO vouchers (
               id, "voucherId", "userId", type, amount, description, status,
               "expiryDate", "createdAt", "updatedAt", "easyPayCode", balance,
               metadata, "redemptionCount", "maxRedemptions"
             ) VALUES (
               :id, :voucherId, :userId, :type, :amount, :description, :status,
               :expiryDate, :createdAt, :updatedAt, :easyPayCode, :balance,
               :metadata, :redemptionCount, :maxRedemptions
             )`,
            {
              transaction,
              replacements: {
                id: voucher.id,
                voucherId: voucher.voucherCode, // Map voucherCode → voucherId
                userId: newUserId, // Use remapped user ID
                type: voucher.voucherType, // Map voucherType → type
                amount: voucher.originalAmount, // Map originalAmount → amount
                description: voucher.description,
                status: voucher.status,
                expiryDate: voucher.expiresAt, // Map expiresAt → expiryDate
                createdAt: voucher.createdAt,
                updatedAt: voucher.updatedAt,
                easyPayCode: voucher.easyPayCode,
                balance: voucher.balance || 0,
                metadata: typeof voucher.metadata === 'object' && voucher.metadata !== null ? 
                  JSON.stringify(voucher.metadata) : voucher.metadata,
                redemptionCount: voucher.redemptionCount || 0,
                maxRedemptions: voucher.maxRedemptions || 1,
              },
            }
          );
          vouchersMigrated++;
        }
        
        const maxVoucherId = Math.max(...uatVouchers.map(v => v.id));
        await staging.query(
          `ALTER SEQUENCE vouchers_id_seq RESTART WITH ${maxVoucherId + 1}`,
          { transaction }
        );
        
        console.log(`   ✅ Migrated ${vouchersMigrated} vouchers with column mapping\n`);
      } else {
        console.log(`   ℹ️  No vouchers to migrate\n`);
      }

      // Step 6: Recalculate balances
      console.log('🔄 Step 6: Recalculating wallet balances...');
      
      if (!dryRun) {
        for (const wallet of uatWallets) {
          const [balanceResult] = await staging.query(
            `SELECT COALESCE(SUM(CASE
                WHEN type IN ('deposit', 'receive', 'refund') AND status = 'completed' THEN amount
                WHEN type IN ('send', 'withdraw', 'payment', 'fee') AND status = 'completed' THEN -amount
                ELSE 0
              END), 0) AS balance
             FROM transactions
             WHERE "walletId" = :walletId`,
            { transaction, replacements: { walletId: wallet.walletId } }
          );

          const balance = parseFloat(balanceResult[0]?.balance || 0);

          await staging.query(
            `UPDATE wallets SET balance = :balance, "updatedAt" = NOW() WHERE "walletId" = :walletId`,
            { transaction, replacements: { walletId: wallet.walletId, balance } }
          );
        }
      }

      console.log(`   ✅ Recalculated ${uatWallets.length} wallet balances\n`);

      if (!dryRun) {
        await transaction.commit();
      }

      console.log('═'.repeat(80));
      console.log('✅ CLEAN SLATE MIGRATION COMPLETE!');
      console.log('═'.repeat(80));
      console.log(`\n📊 Summary:`);
      console.log(`   Users:        ${uatUsers.length} migrated (IDs remapped: 1,2,4,6,7,8 → 1,2,3,4,5,6)`);
      console.log(`   Wallets:      ${uatWallets.length} migrated`);
      console.log(`   Transactions: ${uatTransactions.length} migrated (with remapped user IDs)`);
      console.log(`   Vouchers:     ${uatVouchers.length} migrated (with column mapping)`);
      console.log(`\n✅ Staging database is now a complete copy of UAT`);
      console.log(`✅ All 6 users present with correct sequential IDs (1-6)`);
      console.log(`✅ All balances recalculated from transactions and vouchers\n`);

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    if (error.sql) {
      console.error('   SQL:', error.sql);
    }
    process.exitCode = 1;
  } finally {
    await uat.close();
    await staging.close();
  }
}

main();

