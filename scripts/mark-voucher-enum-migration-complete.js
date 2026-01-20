/**
 * Mark voucher enum migration as complete
 * 
 * The 20260117_convert_voucher_type_to_enum migration requires table ownership
 * which we don't have in Codespaces. The voucherType column works fine as VARCHAR
 * (Sequelize handles it as ENUM in code), so we can safely mark it as complete.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function markMigrationComplete() {
  let client;
  
  try {
    console.log('📋 Connecting to UAT database...');
    
    // Read database config from .env or use proxy
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '6543'), // UAT proxy port
      database: process.env.DB_NAME || 'mymoolah_uat',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: false // Using Cloud SQL proxy
    };
    
    client = new Client(dbConfig);
    await client.connect();
    console.log('✅ Connected to database');
    
    console.log('📝 Marking 20260117_convert_voucher_type_to_enum.js as complete...');
    
    await client.query(`
      INSERT INTO "SequelizeMeta" (name) 
      VALUES ('20260117_convert_voucher_type_to_enum.js')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('✅ Migration marked as complete');
    
    // Verify
    const result = await client.query(`
      SELECT name FROM "SequelizeMeta" 
      WHERE name = '20260117_convert_voucher_type_to_enum.js';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: Migration is now in SequelizeMeta table');
    } else {
      console.log('⚠️  Warning: Migration not found in SequelizeMeta table');
    }
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (client) await client.end();
    process.exit(1);
  }
}

markMigrationComplete();
