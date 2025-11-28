#!/usr/bin/env node
/**
 * Align staging users, wallets, and transactions with UAT
 *
 * This script directly syncs UAT users (IDs 1-6) into staging users (IDs 1-6),
 * overwriting any placeholder data. It then remaps wallet ownership and transaction
 * userIds from the old staging IDs to the new ones, and recalculates balances.
 *
 * Requirements:
 *  - Cloud SQL proxy running for UAT on port 5433 and staging on 5434
 *  - Environment variables:
 *      UAT_DATABASE_URL        e.g. postgres://...@127.0.0.1:5433/mymoolah?sslmode=disable
 *      STAGING_DATABASE_URL    e.g. postgres://...@127.0.0.1:5434/mymoolah_staging?sslmode=disable
 *      DB_SSL=false            (ensures Sequelize disables SSL when using proxy)
 *
 * Usage:
 *   DB_SSL=false \
 *   UAT_DATABASE_URL="postgres://...@127.0.0.1:5433/mymoolah?sslmode=disable" \
 *   STAGING_DATABASE_URL="postgres://...@127.0.0.1:5434/mymoolah_staging?sslmode=disable" \
 *   node scripts/align-staging-with-uat.js
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, '').replace(/^0/, '');
}

function getSequelize(url, label) {
  if (!url) {
    console.error(`❌ Missing database URL for ${label}.`);
    process.exit(1);
  }

  const sslDisabled = !(process.env.DB_SSL === 'true');

  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: sslDisabled ? { ssl: false } : { ssl: { require: true, rejectUnauthorized: false } },
  });
}

async function main() {
  const uatUrl = process.env.UAT_DATABASE_URL;
  const stagingUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;

  if (!uatUrl) {
    console.error('❌ UAT_DATABASE_URL is required.');
    process.exit(1);
  }

  if (!stagingUrl) {
    console.error('❌ STAGING_DATABASE_URL (or DATABASE_URL) is required.');
    process.exit(1);
  }

  const uat = getSequelize(uatUrl, 'UAT');
  const staging = getSequelize(stagingUrl, 'Staging');

  const TARGET_USER_IDS = [1, 2, 3, 4, 5, 6];

  try {
    console.log('🔌 Connecting to UAT and Staging databases...');
    await uat.authenticate();
    await staging.authenticate();
    console.log('✅ Connections established\n');

    console.log('📋 Fetching UAT user profiles (IDs 1-6) ...');
    const uatUsers = await uat.query(
      `SELECT id, "firstName", "lastName", "phoneNumber", email, password_hash, status,
              "kycStatus", "kycVerifiedAt", "kycVerifiedBy", "createdAt", "updatedAt"
         FROM users
        WHERE id IN (:ids)
        ORDER BY id`,
      { type: QueryTypes.SELECT, replacements: { ids: TARGET_USER_IDS } }
    );

    if (uatUsers.length === 0) {
      console.error('❌ No UAT users found for IDs 1-6. Aborting.');
      process.exit(1);
    }

    console.log(`📊 Found ${uatUsers.length} UAT users to sync.`);

    console.log('📋 Fetching staging users to build phone → ID map...');
    const stagingUsers = await staging.query(
      `SELECT id, "phoneNumber" FROM users`,
      { type: QueryTypes.SELECT }
    );

    const stagingPhoneToId = new Map();
    stagingUsers.forEach((user) => {
      const normalized = normalizePhone(user.phoneNumber);
      if (normalized) {
        stagingPhoneToId.set(normalized, user.id);
      }
    });

    console.log('📋 Fetching wallet ownership from UAT...');
    const uatWallets = await uat.query(
      `SELECT "walletId", "userId" FROM wallets WHERE "userId" IN (:ids)`,
      { type: QueryTypes.SELECT, replacements: { ids: TARGET_USER_IDS } }
    );

    console.log('📋 Fetching staging wallets...');
    const stagingWallets = await staging.query(
      `SELECT id, "walletId", "userId" FROM wallets`,
      { type: QueryTypes.SELECT }
    );

    const transaction = await staging.transaction();

    try {
      const oldToNewUserIdMap = new Map();

      // Step 1: Build the mapping and identify users to temporarily remove
      const oldStagingIdsToRemove = [];
      for (const uatUser of uatUsers) {
        const targetId = uatUser.id;
        const normalized = normalizePhone(uatUser.phoneNumber);
        const oldStagingId = normalized ? stagingPhoneToId.get(normalized) : null;

        if (oldStagingId && oldStagingId !== targetId) {
          oldToNewUserIdMap.set(oldStagingId, targetId);
          oldStagingIdsToRemove.push(oldStagingId);
        }
      }

      // Step 2: Temporarily remove conflicting staging users (we'll remap their data later)
      if (oldStagingIdsToRemove.length > 0) {
        console.log(`🗑️  Temporarily removing ${oldStagingIdsToRemove.length} conflicting staging users...`);
        await staging.query(
          `DELETE FROM users WHERE id IN (:ids)`,
          { transaction, replacements: { ids: oldStagingIdsToRemove } }
        );
      }

      // Step 3: Insert/update UAT users into staging IDs 1-6
      for (const uatUser of uatUsers) {
        const targetId = uatUser.id;

        await staging.query(
          `INSERT INTO users (
             id, "firstName", "lastName", "phoneNumber", email, password_hash, status,
             "kycStatus", "kycVerifiedAt", "kycVerifiedBy", "createdAt", "updatedAt"
           ) VALUES (
             :id, :firstName, :lastName, :phoneNumber, :email, :passwordHash, :status,
             :kycStatus, :kycVerifiedAt, :kycVerifiedBy, :createdAt, :updatedAt
           )
           ON CONFLICT (id) DO UPDATE SET
             "firstName" = EXCLUDED."firstName",
             "lastName" = EXCLUDED."lastName",
             "phoneNumber" = EXCLUDED."phoneNumber",
             email = EXCLUDED.email,
             password_hash = EXCLUDED.password_hash,
             status = EXCLUDED.status,
             "kycStatus" = EXCLUDED."kycStatus",
             "kycVerifiedAt" = EXCLUDED."kycVerifiedAt",
             "kycVerifiedBy" = EXCLUDED."kycVerifiedBy",
             "updatedAt" = NOW()`,
          {
            transaction,
            replacements: {
              id: targetId,
              firstName: uatUser.firstName,
              lastName: uatUser.lastName,
              phoneNumber: uatUser.phoneNumber,
              email: uatUser.email,
              passwordHash: uatUser.password_hash,
              status: uatUser.status || 'active',
              kycStatus: uatUser.kycStatus || 'not_started',
              kycVerifiedAt: uatUser.kycVerifiedAt,
              kycVerifiedBy: uatUser.kycVerifiedBy,
              createdAt: uatUser.createdAt || new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }

      console.log(`✅ Synced ${uatUsers.length} user profiles into staging IDs 1-6.`);

      const uatWalletMap = new Map();
      uatWallets.forEach((wallet) => {
        uatWalletMap.set(wallet.walletId, wallet.userId);
      });

      const walletUpdates = [];
      const stagingWalletMap = new Map();

      stagingWallets.forEach((wallet) => {
        if (!wallet.walletId) return;
        stagingWalletMap.set(wallet.walletId, wallet.userId);

        const uatOwnerId = uatWalletMap.get(wallet.walletId);
        if (!uatOwnerId) return;

        const currentOwnerId = wallet.userId;
        const newOwnerId = oldToNewUserIdMap.get(currentOwnerId) || uatOwnerId;

        if (currentOwnerId !== newOwnerId) {
          walletUpdates.push({ walletId: wallet.walletId, newUserId: newOwnerId });
        }
      });

      console.log(`📊 Wallets to reassign: ${walletUpdates.length}`);

      for (const update of walletUpdates) {
        await staging.query(
          `UPDATE wallets SET "userId" = :newUserId, updated_at = NOW() WHERE "walletId" = :walletId`,
          { transaction, replacements: update }
        );
      }

      const [stagingTransactions] = await staging.query(
        `SELECT DISTINCT "walletId", "userId" FROM transactions`
      );

      const transactionUpdates = [];
      stagingTransactions.forEach((tx) => {
        if (!tx.walletId) return;
        const currentUserId = tx.userId;
        const newUserId = oldToNewUserIdMap.get(currentUserId);
        if (newUserId && currentUserId !== newUserId) {
          transactionUpdates.push({ walletId: tx.walletId, newUserId });
        }
      });

      console.log(`📊 Transactions to realign: ${transactionUpdates.length}`);

      for (const update of transactionUpdates) {
        await staging.query(
          `UPDATE transactions SET "userId" = :newUserId WHERE "walletId" = :walletId`,
          { transaction, replacements: update }
        );
      }

      console.log('🔄 Recalculating wallet balances for affected wallets...');
      const affectedWalletIds = [...new Set(walletUpdates.map((w) => w.walletId))];
      if (affectedWalletIds.length > 0) {
        for (const walletId of affectedWalletIds) {
          const [balanceResult] = await staging.query(
            `SELECT COALESCE(SUM(CASE
                WHEN type IN ('deposit', 'receive', 'transfer', 'refund') AND status = 'completed' THEN amount
                WHEN type IN ('send', 'withdraw', 'payment', 'fee') AND status = 'completed' THEN -amount
                ELSE 0
              END), 0) AS balance
             FROM transactions
             WHERE "walletId" = :walletId`,
            { transaction, replacements: { walletId } }
          );

          const balance = parseFloat(balanceResult[0]?.balance || 0);

          await staging.query(
            `UPDATE wallets SET balance = :balance, updated_at = NOW() WHERE "walletId" = :walletId`,
            { transaction, replacements: { walletId, balance } }
          );
        }
      }

      await transaction.commit();

      console.log('\n✅ Alignment complete!');
      console.log(`   User profiles synced: ${uatUsers.length}`);
      console.log(`   Wallets reassigned: ${walletUpdates.length}`);
      console.log(`   Transactions realigned: ${transactionUpdates.length}`);
      console.log(`   Wallet balances recalculated: ${affectedWalletIds.length}`);
      console.log('\n📋 Staging users 1-6 now match UAT users 1-6.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('\n❌ Alignment failed:', error.message);
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
