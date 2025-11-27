#!/usr/bin/env node

/**
 * Test Staging Transactions Query
 * 
 * This script tests if we can successfully query transactions from the staging database
 * to help diagnose 500 errors in the wallet endpoints.
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Get database password
const { execSync } = require('child_process');

let dbPassword;
try {
  dbPassword = execSync(
    'gcloud secrets versions access latest --secret=db-mmtp-pg-staging-password --project=mymoolah-db',
    { encoding: 'utf8' }
  ).trim();
} catch (error) {
  console.error('❌ Failed to get database password:', error.message);
  process.exit(1);
}

// URL encode password
const encodedPassword = encodeURIComponent(dbPassword);
const DATABASE_URL = `postgres://mymoolah_app:${encodedPassword}@127.0.0.1:5434/mymoolah_staging?sslmode=disable`;

const sequelize = new Sequelize(DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres',
  dialectOptions: {
    // SSL disabled for Unix socket connections
    ssl: false
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testTransactionsQuery() {
  try {
    console.log('🔍 Testing transactions query...');
    
    // Try to query transactions directly
    const [results] = await sequelize.query(`
      SELECT 
        id, 
        "transactionId",
        "walletId",
        "userId",
        amount,
        type,
        status,
        description,
        currency,
        fee,
        "senderWalletId",
        "receiverWalletId",
        "reference",
        "createdAt"
      FROM transactions
      LIMIT 5
    `);
    
    console.log(`✅ Found ${results.length} transactions`);
    if (results.length > 0) {
      console.log('Sample transaction:', JSON.stringify(results[0], null, 2));
    }
    return true;
  } catch (error) {
    console.error('❌ Transactions query failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function testWalletsQuery() {
  try {
    console.log('🔍 Testing wallets query...');
    
    const [results] = await sequelize.query(`
      SELECT 
        id,
        "walletId",
        "userId",
        balance,
        currency,
        status
      FROM wallets
      LIMIT 5
    `);
    
    console.log(`✅ Found ${results.length} wallets`);
    if (results.length > 0) {
      console.log('Sample wallet:', JSON.stringify(results[0], null, 2));
    }
    return true;
  } catch (error) {
    console.error('❌ Wallets query failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function testColumnsExist() {
  try {
    console.log('🔍 Checking if all expected columns exist...');
    
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `);
    
    const columns = results.map(r => r.column_name);
    console.log(`✅ Found ${columns.length} columns in transactions table`);
    console.log('Columns:', columns.join(', '));
    
    const expectedColumns = [
      'id', 'transactionId', 'userId', 'walletId', 'amount', 'type',
      'status', 'description', 'fee', 'currency', 'senderWalletId',
      'receiverWalletId', 'reference', 'paymentId', 'exchangeRate',
      'failureReason', 'metadata', 'createdAt', 'updatedAt'
    ];
    
    const missingColumns = expectedColumns.filter(col => !columns.includes(col));
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns.join(', '));
      return false;
    } else {
      console.log('✅ All expected columns exist');
      return true;
    }
  } catch (error) {
    console.error('❌ Column check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Staging Database Connection and Queries\n');
  
  const connectionOk = await testConnection();
  if (!connectionOk) {
    process.exit(1);
  }
  
  const columnsOk = await testColumnsExist();
  if (!columnsOk) {
    console.log('\n⚠️  Some columns are missing. Migration may not have completed successfully.');
  }
  
  await testWalletsQuery();
  await testTransactionsQuery();
  
  await sequelize.close();
  console.log('\n✅ Test complete');
}

main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
