#!/usr/bin/env node

/**
 * Diagnostic Test: Test Partition Table Creation
 * 
 * Purpose: Manually test creating a partition to see the REAL PostgreSQL error
 * This helps diagnose why partitions are failing silently
 * 
 * Usage: node scripts/test-partition-creation.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');

// Get UAT password from .env
function getUATPassword() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) return decodeURIComponent(url.password);
    } catch (e) {
      const urlString = process.env.DATABASE_URL;
      const hostPattern = '@127.0.0.1:';
      const hostIndex = urlString.indexOf(hostPattern);
      if (hostIndex > 0) {
        const userPassStart = urlString.indexOf('://') + 3;
        const passwordStart = urlString.indexOf(':', userPassStart) + 1;
        if (passwordStart > userPassStart && passwordStart < hostIndex) {
          const password = urlString.substring(passwordStart, hostIndex);
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
      }
    }
  }
  if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
  throw new Error('UAT password not found. Set DATABASE_URL or DB_PASSWORD in .env file.');
}

// Detect proxy port
function detectProxyPort(ports, name) {
  for (const port of ports) {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error(`${name} proxy not running. Start it on port ${ports[0]} or ${ports[1]}`);
}

// Get table type
async function getTableType(client, tableName) {
  const result = await client.query(`
    SELECT 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_inherits i 
          JOIN pg_class c ON c.oid = i.inhrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = $1
        ) THEN 'partition'
        WHEN EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' 
            AND c.relname = $1
            AND c.relkind = 'p'
            AND NOT EXISTS (
              SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid
            )
        ) THEN 'partitioned'
        WHEN EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' 
            AND c.relname = $1
            AND c.relkind = 'r'
        ) THEN 'regular'
        ELSE 'none'
      END as table_type
  `, [tableName]);
  
  return result.rows[0]?.table_type || 'none';
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  🔍 DIAGNOSTIC TEST: Partition Table Creation');
  console.log('='.repeat(80));
  console.log('\n📋 This script tests creating a partition table to diagnose errors\n');

  try {
    const uatPassword = getUATPassword();
    const stagingPort = detectProxyPort([6544, 5434], 'Staging');
    
    console.log(`🔍 Using Staging proxy port: ${stagingPort}\n`);

    // Connect to Staging
    const stagingClient = new Pool({
      host: '127.0.0.1',
      port: stagingPort,
      user: 'mymoolah_app',
      database: 'mymoolah_staging',
      ssl: false,
      // IAM auth - no password
    });

    console.log('✅ Connected to Staging database\n');

    // Test 1: Check if parent tables exist and their type
    console.log('📋 Test 1: Checking parent table status...\n');
    
    const parentTables = ['transactions', 'transactions_partitioned', 'vas_transactions', 'vas_transactions_partitioned'];
    
    for (const parentTable of parentTables) {
      const tableType = await getTableType(stagingClient, parentTable);
      console.log(`   ${parentTable}: ${tableType === 'none' ? '❌ NOT FOUND' : `✅ ${tableType.toUpperCase()}`}`);
    }
    
    console.log('\n📋 Test 2: Attempting to create a partition manually...\n');
    
    // Test 2: Try creating a partition
    const testPartitionSQL = `
      CREATE TABLE IF NOT EXISTS public.transactions_2025_01 
      PARTITION OF public.transactions_partitioned 
      FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
    `;
    
    console.log('🔍 Testing with SQL:');
    console.log('   CREATE TABLE IF NOT EXISTS public.transactions_2025_01');
    console.log('   PARTITION OF public.transactions_partitioned');
    console.log('   FOR VALUES FROM (\'2025-01-01 00:00:00+00\') TO (\'2025-02-01 00:00:00+00\');\n');
    
    const client = await stagingClient.connect();
    try {
      await client.query('BEGIN');
      await client.query(testPartitionSQL);
      await client.query('COMMIT');
      
      console.log('✅ SUCCESS! Partition created successfully.\n');
      
      // Verify it exists
      const exists = await getTableType(stagingClient, 'transactions_2025_01');
      if (exists === 'partition') {
        console.log('✅ Verified: transactions_2025_01 exists as a partition\n');
      } else {
        console.log(`⚠️  WARNING: transactions_2025_01 exists but type is: ${exists}\n`);
      }
      
      // Clean up - drop the test partition
      console.log('🧹 Cleaning up test partition...');
      await stagingClient.query('DROP TABLE IF EXISTS public.transactions_2025_01 CASCADE');
      console.log('✅ Cleanup complete\n');
      
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      console.log('❌ FAILED! Here is the actual error from PostgreSQL:\n');
      console.log('='.repeat(80));
      console.log('ERROR MESSAGE:');
      console.log('='.repeat(80));
      console.log(error.message);
      console.log('='.repeat(80));
      console.log('\n💡 Diagnosis:');
      
      if (error.message.includes('not partitioned')) {
        console.log('   → The parent table exists but is NOT set up as a partitioned table');
        console.log('   → This means transactions_partitioned is either:');
        console.log('      - Missing');
        console.log('      - Exists as a regular table (not partitioned)');
        console.log('   → Solution: Parent table needs to be recreated as partitioned');
      } else if (error.message.includes('does not exist')) {
        console.log('   → The parent table does not exist');
        console.log('   → Solution: Create transactions_partitioned first');
      } else if (error.message.includes('already exists')) {
        console.log('   → The partition already exists');
        console.log('   → This is actually OK - it means it was created successfully');
      } else {
        console.log('   → Unknown error - see full error message above');
      }
      console.log('');
    } finally {
      client.release();
    }

    // Test 3: Try alternative parent name
    console.log('📋 Test 3: Testing with alternative parent table name...\n');
    
    const testPartitionSQL2 = `
      CREATE TABLE IF NOT EXISTS public.transactions_2025_01 
      PARTITION OF public.transactions 
      FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
    `;
    
    console.log('🔍 Testing with SQL:');
    console.log('   CREATE TABLE IF NOT EXISTS public.transactions_2025_01');
    console.log('   PARTITION OF public.transactions');
    console.log('   FOR VALUES FROM (\'2025-01-01 00:00:00+00\') TO (\'2025-02-01 00:00:00+00\');\n');
    
    const client2 = await stagingClient.connect();
    try {
      await client2.query('BEGIN');
      await client2.query(testPartitionSQL2);
      await client2.query('COMMIT');
      
      console.log('✅ SUCCESS! Partition created with "transactions" as parent.\n');
      
      // Clean up
      await stagingClient.query('DROP TABLE IF EXISTS public.transactions_2025_01 CASCADE');
      
    } catch (error) {
      try {
        await client2.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      console.log('❌ FAILED with "transactions" as parent:');
      console.log(`   ${error.message.split('\n')[0]}\n`);
    } finally {
      client2.release();
    }

    await stagingClient.end();
    
    console.log('='.repeat(80));
    console.log('  ✅ DIAGNOSTIC TEST COMPLETE');
    console.log('='.repeat(80));
    console.log('\n💡 Review the results above to understand why partitions are failing.\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();
