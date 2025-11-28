#!/usr/bin/env node
/**
 * List all users 1-6 with their wallets and balances in staging
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

    console.log('📋 Users 1-6 with Wallets and Balances:\n');
    console.log('═'.repeat(100));

    for (let userId = 1; userId <= 6; userId++) {
      // Get user details
      const [user] = await staging.query(
        `SELECT id, "firstName", "lastName", "phoneNumber", email, "kycStatus"
         FROM users 
         WHERE id = :userId`,
        { type: QueryTypes.SELECT, replacements: { userId } }
      );

      if (!user) {
        console.log(`\n👤 User ID ${userId}: ❌ NOT FOUND`);
        console.log('─'.repeat(100));
        continue;
      }

      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      console.log(`\n👤 User ID ${userId}: ${fullName}`);
      console.log(`   📧 Email: ${user.email || 'N/A'}`);
      console.log(`   📱 Phone: ${user.phoneNumber || 'N/A'}`);
      console.log(`   🔐 KYC Status: ${user.kycStatus || 'N/A'}`);

      // Get wallets for this user
      const wallets = await staging.query(
        `SELECT id, "walletId", balance, currency, status 
         FROM wallets 
         WHERE "userId" = :userId
         ORDER BY id`,
        { type: QueryTypes.SELECT, replacements: { userId } }
      );

      if (wallets.length === 0) {
        console.log(`   💼 Wallets: ❌ NONE`);
      } else {
        console.log(`   💼 Wallets (${wallets.length}):`);
        for (const wallet of wallets) {
          const balance = parseFloat(wallet.balance);
          const formattedBalance = balance.toLocaleString('en-ZA', {
            style: 'currency',
            currency: wallet.currency || 'ZAR',
          });
          console.log(`      • ${wallet.walletId} | ${formattedBalance} | ${wallet.status}`);
        }

        // Get transaction count
        const [txCount] = await staging.query(
          `SELECT COUNT(*) as count 
           FROM transactions 
           WHERE "userId" = :userId`,
          { type: QueryTypes.SELECT, replacements: { userId } }
        );
        console.log(`   📊 Transactions: ${txCount.count}`);
      }

      console.log('─'.repeat(100));
    }

    console.log('\n✅ Report complete!');

  } catch (error) {
    console.error('\n❌ Report failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await staging.close();
  }
}

main();

