#!/usr/bin/env node
/**
 * Migrate missing wallets from UAT to staging
 * 
 * This script finds wallets that exist in UAT but not in staging,
 * and creates them in staging with the correct user mapping.
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

  const uat = getSequelize(uatUrl, 'UAT');
  const staging = getSequelize(stagingUrl, 'Staging');

  try {
    console.log('🔌 Connecting to UAT and Staging databases...');
    await uat.authenticate();
    await staging.authenticate();
    console.log('✅ Connections established\n');

    console.log('📋 Fetching UAT wallets for users 1-6...');
    const uatWallets = await uat.query(
      `SELECT id, "walletId", "userId", balance, currency, status, 
              "kycVerified", "kycVerifiedAt", "kycVerifiedBy",
              "dailyLimit", "monthlyLimit", "dailySpent", "monthlySpent",
              "lastTransactionAt", "createdAt", "updatedAt"
       FROM wallets 
       WHERE "userId" IN (1, 2, 3, 4, 5, 6)
       ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    console.log(`📊 Found ${uatWallets.length} UAT wallets`);

    console.log('📋 Fetching staging wallets...');
    const stagingWallets = await staging.query(
      `SELECT "walletId" FROM wallets`,
      { type: QueryTypes.SELECT }
    );

    const stagingWalletIds = new Set(stagingWallets.map(w => w.walletId));

    const walletsToMigrate = uatWallets.filter(w => !stagingWalletIds.has(w.walletId));

    console.log(`📊 Wallets to migrate: ${walletsToMigrate.length}\n`);

    if (walletsToMigrate.length === 0) {
      console.log('✅ All UAT wallets already exist in staging');
      return;
    }

    const transaction = await staging.transaction();

    try {
      for (const wallet of walletsToMigrate) {
        console.log(`📦 Migrating wallet ${wallet.walletId} for user ${wallet.userId}...`);
        
        await staging.query(
          `INSERT INTO wallets (
             "walletId", "userId", balance, currency, status,
             "kycVerified", "kycVerifiedAt", "kycVerifiedBy",
             "dailyLimit", "monthlyLimit", "dailySpent", "monthlySpent",
             "lastTransactionAt", created_at, updated_at
           ) VALUES (
             :walletId, :userId, :balance, :currency, :status,
             :kycVerified, :kycVerifiedAt, :kycVerifiedBy,
             :dailyLimit, :monthlyLimit, :dailySpent, :monthlySpent,
             :lastTransactionAt, :createdAt, :updatedAt
           )`,
          {
            transaction,
            replacements: {
              walletId: wallet.walletId,
              userId: wallet.userId,
              balance: wallet.balance || 0,
              currency: wallet.currency || 'ZAR',
              status: wallet.status || 'active',
              kycVerified: wallet.kycVerified || false,
              kycVerifiedAt: wallet.kycVerifiedAt,
              kycVerifiedBy: wallet.kycVerifiedBy,
              dailyLimit: wallet.dailyLimit || 5000,
              monthlyLimit: wallet.monthlyLimit || 50000,
              dailySpent: wallet.dailySpent || 0,
              monthlySpent: wallet.monthlySpent || 0,
              lastTransactionAt: wallet.lastTransactionAt,
              createdAt: wallet.createdAt || new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }

      await transaction.commit();

      console.log(`\n✅ Migration complete! Migrated ${walletsToMigrate.length} wallets.`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
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

