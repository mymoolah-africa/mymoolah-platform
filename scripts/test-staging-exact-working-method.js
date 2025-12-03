#!/usr/bin/env node

/**
 * Test Staging Connection Using EXACT Working Method
 * 
 * This uses the EXACT same approach as test-staging-transactions.js that worked before
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

// Get database password - EXACT same as working script
let dbPassword;
try {
  dbPassword = execSync(
    'gcloud secrets versions access latest --secret=db-mmtp-pg-staging-password --project=mymoolah-db',
    { encoding: 'utf8' }
  ).trim();
  console.log(`✅ Password retrieved (length: ${dbPassword.length} characters)`);
} catch (error) {
  console.error('❌ Failed to get database password:', error.message);
  process.exit(1);
}

// URL encode password - EXACT same as working script
const encodedPassword = encodeURIComponent(dbPassword);
const DATABASE_URL = `postgres://mymoolah_app:${encodedPassword}@127.0.0.1:6544/mymoolah_staging?sslmode=disable`;

console.log(`📋 Using DATABASE_URL (password encoded)`);
console.log(`   Database: mymoolah_staging`);
console.log(`   Port: 6544 (Codespaces)`);
console.log('');

// Use Sequelize - EXACT same as working script
const sequelize = new Sequelize(DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres',
  dialectOptions: {
    ssl: false  // SSL disabled for proxy connections
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection with EXACT working method...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!\n');
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT current_database(), current_user, version()');
    console.log('📊 Connection Info:');
    console.log(`   Database: ${results[0].current_database}`);
    console.log(`   User: ${results[0].current_user}`);
    console.log(`   PostgreSQL: ${results[0].version.split(',')[0]}\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  
  if (connected) {
    console.log('✅ SUCCESS! Connection works with this method!');
    console.log('');
    console.log('💡 This confirms:');
    console.log('   - Database exists');
    console.log('   - Password is correct');
    console.log('   - Connection method works');
    console.log('');
    console.log('🔧 The issue is likely in how pg Client is being used.');
    console.log('   Consider using Sequelize with DATABASE_URL instead of pg Client.');
  } else {
    console.log('❌ Connection still failed even with exact working method');
    console.log('');
    console.log('💡 This suggests:');
    console.log('   - Password in Secret Manager may still be wrong');
    console.log('   - Or there\'s an issue with the proxy');
    process.exit(1);
  }
  
  await sequelize.close();
}

main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
