#!/usr/bin/env node

/**
 * Verify Referral System Tables
 * 
 * Checks if all 5 referral system tables were created successfully
 */

require('dotenv').config();
const { Pool } = require('pg');

async function verifyTables() {
  console.log('\n🔍 Verifying Referral System Tables...\n');
  
  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false
  });
  
  try {
    const client = await pool.connect();
    
    // List of tables to verify
    const expectedTables = [
      'referrals',
      'referral_chains',
      'referral_earnings',
      'referral_payouts',
      'user_referral_stats'
    ];
    
    console.log('📋 Checking for referral tables...\n');
    
    let allFound = true;
    for (const tableName of expectedTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists;
      `, [tableName]);
      
      const exists = result.rows[0].exists;
      if (exists) {
        console.log(`✅ ${tableName} - EXISTS`);
        
        // Get row count
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`   └─ Rows: ${countResult.rows[0].count}`);
        } catch (e) {
          // Table exists but might have permission issues, that's ok
        }
      } else {
        console.log(`❌ ${tableName} - MISSING`);
        allFound = false;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    if (allFound) {
      console.log('✅ ALL REFERRAL TABLES VERIFIED');
      console.log('='.repeat(60) + '\n');
      
      // Show table structures
      console.log('📊 Table Structures:\n');
      for (const tableName of expectedTables) {
        try {
          const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = $1
            ORDER BY ordinal_position;
          `, [tableName]);
          
          console.log(`\n${tableName}:`);
          columns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '[nullable]' : '[required]'}`);
          });
        } catch (e) {
          console.log(`  ⚠️  Could not read structure: ${e.message}`);
        }
      }
    } else {
      console.log('❌ SOME TABLES MISSING - Run migrations!');
      console.log('='.repeat(60) + '\n');
      process.exit(1);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error verifying tables:', error.message);
    process.exit(1);
  }
}

verifyTables();

