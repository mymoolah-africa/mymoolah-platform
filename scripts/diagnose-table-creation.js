#!/usr/bin/env node

/**
 * Quick Diagnostic: Test creating one simple table to see what happens
 * 
 * This will show us the actual PostgreSQL behavior
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');

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

async function main() {
  console.log('\n🔍 Quick Diagnostic: Testing Table Creation\n');
  
  const stagingPort = detectProxyPort([6544, 5434], 'Staging');
  const stagingClient = new Pool({
    host: '127.0.0.1',
    port: stagingPort,
    user: 'mymoolah_app',
    database: 'mymoolah_staging',
    ssl: false,
  });

  try {
    // Test 1: Check if a simple table can be created
    console.log('Test 1: Creating a simple test table...');
    try {
      await stagingClient.query(`
        CREATE TABLE IF NOT EXISTS diagnostic_test_table (
          id SERIAL PRIMARY KEY,
          test_value TEXT
        );
      `);
      console.log('✅ CREATE executed without error');
      
      // Check if it exists
      const result = await stagingClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'diagnostic_test_table'
        ) as exists;
      `);
      
      if (result.rows[0].exists) {
        console.log('✅ Table EXISTS after creation');
        await stagingClient.query('DROP TABLE diagnostic_test_table');
        console.log('✅ Test table cleaned up\n');
      } else {
        console.log('❌ Table DOES NOT EXIST after creation!\n');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 2: Check what tables currently exist
    console.log('Test 2: Listing existing tables...');
    const tables = await stagingClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Found ${tables.rows.length} tables in staging`);
    console.log('Sample tables:', tables.rows.slice(0, 5).map(r => r.table_name).join(', '), '...\n');

    // Test 3: Check parent tables
    console.log('Test 3: Checking parent partitioned tables...');
    const parentTables = ['transactions', 'transactions_partitioned', 'vas_transactions', 'vas_transactions_partitioned'];
    
    for (const table of parentTables) {
      const exists = await stagingClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' 
          AND c.relname = $1
        ) as exists
      `, [table]);
      
      if (exists.rows[0].exists) {
        // Check if it's partitioned
        const isPartitioned = await stagingClient.query(`
          SELECT c.relkind = 'p' AND NOT EXISTS (
            SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid
          ) as is_partitioned
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' 
          AND c.relname = $1
        `, [table]);
        
        const type = isPartitioned.rows[0]?.is_partitioned ? 'PARTITIONED' : 'REGULAR';
        console.log(`   ${table}: EXISTS (${type})`);
      } else {
        console.log(`   ${table}: NOT FOUND`);
      }
    }

    await stagingClient.end();
    console.log('\n✅ Diagnostic complete\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    await stagingClient.end();
    process.exit(1);
  }
}

main();
