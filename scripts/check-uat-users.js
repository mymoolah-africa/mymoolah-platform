#!/usr/bin/env node
/**
 * Check what users exist in UAT database
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

  if (!uatUrl) {
    console.error('❌ UAT_DATABASE_URL is required.');
    process.exit(1);
  }

  const uat = getSequelize(uatUrl, 'UAT');

  try {
    console.log('🔌 Connecting to UAT database...');
    await uat.authenticate();
    console.log('✅ Connection established\n');

    console.log('📋 All Users in UAT:\n');
    const users = await uat.query(
      `SELECT id, "firstName", "lastName", "phoneNumber", email, "kycStatus", status
       FROM users 
       ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    console.table(users);

    console.log(`\n📊 Total users: ${users.length}`);
    console.log('\n📋 User IDs present:', users.map(u => u.id).join(', '));

  } catch (error) {
    console.error('\n❌ Check failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await uat.close();
  }
}

main();

