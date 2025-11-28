#!/usr/bin/env node
/**
 * Align staging users, wallets, and transactions with UAT
 *
 * This script cross-references UAT users (IDs 1-6) and wallet ownership
 * against the staging database. It updates staging user profiles,
 * reassigns wallet ownership, realigns transaction userIds, and finally
 * recalculates wallet balances so that the staging dashboard reflects
 * the migrated data accurately.
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

function formatPhone(phone) {
  if (!phone) return 'unknown';
  return `+${normalizePhone(phone)}`;
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
      `SELECT id, "firstName", "lastName", "phoneNumber", email
         FROM users
        WHERE id = ANY(:ids)
        ORDER BY id`,
      { type: QueryTypes.SELECT, replacements: { ids: TARGET_USER_IDS } }
    );

    if (uatUsers.length !== TARGET_USER_IDS.length) {
      console.log('⚠️  Warning: Not all target UAT users were returned. Proceeding with available data.');
    }

    const uatUsersById = new Map();
    const uatUsersByPhone = new Map();
    uatUsers.forEach((user) => {
      const normalized = normalizePhone(user.phoneNumber);
      uatUsersById.set(user.id, { ...user, normalized });
      if (normalized) {
        uatUsersByPhone.set(normalized, { ...user, normalized });
      }
    });

    console.log('📋 Fetching staging users...');
    const stagingUsers = await staging.query(
      `SELECT id, "firstName", "lastName", "phoneNumber", email
         FROM users`,
      { type: QueryTypes.SELECT }
    );

    const stagingUsersByPhone = new Map();
    stagingUsers.forEach((user) => {
      const normalized = normalizePhone(user.phoneNumber);
      if (normalized) {
        stagingUsersByPhone.set(normalized, user);
      }
    });

    const uatToStagingUserMap = new Map();
    const userProfileUpdates = [];
    const missingUsers = [];

    for (const user of uatUsers) {
      const normalized = normalizePhone(user.phoneNumber);
      const stagingUser = normalized ? stagingUsersByPhone.get(normalized) : null;

      if (!stagingUser) {
        missingUsers.push({ ...user, normalized });
        continue;
      }

      uatToStagingUserMap.set(user.id, stagingUser.id);

      const needsUpdate =
        stagingUser.firstName !== user.firstName ||
        stagingUser.lastName !== user.lastName ||
        stagingUser.phoneNumber !== user.phoneNumber;

      if (needsUpdate) {
        userProfileUpdates.push({
          id: stagingUser.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        });
      }
    }

    console.log(`📊 Found ${uatToStagingUserMap.size} matching users between UAT and staging.`);
    if (missingUsers.length > 0) {
      console.log('⚠️  Missing staging records for the following UAT users (match by phone failed):');
      missingUsers.forEach((user) => {
        console.log(`   - UAT ID ${user.id}: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
      });
      console.log('   Please create/import these users before rerunning the script.');
      if (uatToStagingUserMap.size === 0) {
        throw new Error('No staging users matched; aborting.');
      }
    }

    console.log('📋 Fetching wallet ownership from UAT...');
    const uatWallets = await uat.query(
      `SELECT "walletId", "userId"
         FROM wallets
        WHERE "userId" = ANY(:ids)`,
      { type: QueryTypes.SELECT, replacements: { ids: TARGET_USER_IDS } }
    );

    const uatWalletMap = new Map();
    uatWallets.forEach((wallet) => {
      uatWalletMap.set(wallet.walletId, wallet.userId);
    });

    console.log('📋 Fetching staging wallets...');
    const stagingWallets = await staging.query(
      `SELECT id, "walletId", "userId"
         FROM wallets`,
      { type: QueryTypes.SELECT }
    );

    const walletUpdates = [];
    const walletToUser = new Map();

    stagingWallets.forEach((wallet) => {
      if (!wallet.walletId) return;
      const uatOwnerId = uatWalletMap.get(wallet.walletId);
      if (!uatOwnerId) return;
      const stagingOwnerId = uatToStagingUserMap.get(uatOwnerId);
      if (!stagingOwnerId) return;

      walletToUser.set(wallet.walletId, stagingOwnerId);

      if (wallet.userId !== stagingOwnerId) {
        walletUpdates.push({ walletId: wallet.walletId, stagingUserId: stagingOwnerId });
      }
    });

    console.log(`📊 Wallets to update: ${walletUpdates.length}`);

    console.log('📋 Identifying transactions needing user reassignment...');
    const [stagingTransactions] = await staging.query(
      `SELECT DISTINCT "walletId", "userId"
         FROM transactions`
    );

    const transactionUpdates = [];
    stagingTransactions.forEach((tx) => {
      if (!tx.walletId) return;
      const targetUserId = walletToUser.get(tx.walletId);
      if (!targetUserId) return;
      if (tx.userId !== targetUserId) {
        transactionUpdates.push({ walletId: tx.walletId, stagingUserId: targetUserId });
      }
    });

    console.log(`📊 Transactions to realign: ${transactionUpdates.length}`);

    const transaction = await staging.transaction();

    try {
      for (const update of userProfileUpdates) {
        await staging.query(
          `UPDATE users
              SET "firstName" = :firstName,
                  "lastName" = :lastName,
                  "phoneNumber" = :phoneNumber,
                  "updatedAt" = NOW()
            WHERE id = :id`,
          { transaction, replacements: update }
        );
      }

      for (const update of walletUpdates) {
        await staging.query(
          `UPDATE wallets
              SET "userId" = :stagingUserId,
                  "updatedAt" = NOW()
            WHERE "walletId" = :walletId`,
          { transaction, replacements: update }
        );
      }

      for (const update of transactionUpdates) {
        await staging.query(
          `UPDATE transactions
              SET "userId" = :stagingUserId
            WHERE "walletId" = :walletId`,
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
            `UPDATE wallets
                SET balance = :balance,
                    "updatedAt" = NOW()
              WHERE "walletId" = :walletId`,
            { transaction, replacements: { walletId, balance } }
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    console.log('\n✅ Alignment complete!');
    console.log(`   User profiles updated: ${userProfileUpdates.length}`);
    console.log(`   Wallets reassigned: ${walletUpdates.length}`);
    console.log(`   Transactions realigned: ${transactionUpdates.length}`);
    console.log(`   Wallet balances recalculated: ${new Set(walletUpdates.map((w) => w.walletId)).size}`);

    if (missingUsers.length > 0) {
      console.log('\n⚠️  The following UAT users did not have staging counterparts:');
      missingUsers.forEach((user) => {
        console.log(`   - ${user.firstName} ${user.lastName} (${formatPhone(user.phoneNumber)})`);
      });
      console.log('   Please ensure they are migrated to staging and rerun the script.');
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
