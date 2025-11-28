#!/usr/bin/env node
/**
 * Check wallet alignment between UAT and staging for user ID 1
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
    await uat.authenticate();
    await staging.authenticate();

    console.log('📋 UAT Wallets for User ID 1:');
    const uatWallets = await uat.query(
      `SELECT id, "walletId", "userId", balance, status FROM wallets WHERE "userId" = 1`,
      { type: QueryTypes.SELECT }
    );
    console.table(uatWallets);

    console.log('\n📋 Staging Wallets for User ID 1:');
    const stagingWallets = await staging.query(
      `SELECT id, "walletId", "userId", balance, status FROM wallets WHERE "userId" = 1`,
      { type: QueryTypes.SELECT }
    );
    console.table(stagingWallets);

    console.log('\n📋 Staging Transactions for User ID 1:');
    const stagingTxs = await staging.query(
      `SELECT COUNT(*) as count, "walletId" FROM transactions WHERE "userId" = 1 GROUP BY "walletId"`,
      { type: QueryTypes.SELECT }
    );
    console.table(stagingTxs);

    console.log('\n📋 All Staging Wallets (to find Andre\'s real wallet):');
    const allWallets = await staging.query(
      `SELECT id, "walletId", "userId", balance, status FROM wallets ORDER BY id`,
      { type: QueryTypes.SELECT }
    );
    console.table(allWallets);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exitCode = 1;
  } finally {
    await uat.close();
    await staging.close();
  }
}

main();

