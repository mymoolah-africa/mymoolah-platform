#!/usr/bin/env node

/**
 * Check what parent table the partition CREATE statements actually reference
 * This will show us if partitions are trying to use the wrong parent table
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  throw new Error('UAT password not found.');
}

function detectProxyPort(ports, name) {
  for (const port of ports) {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error(`${name} proxy not running.`);
}

async function main() {
  console.log('\n🔍 Checking Partition SQL References\n');
  
  try {
    const uatPassword = getUATPassword();
    const uatPort = detectProxyPort([6543, 5433], 'UAT');
    
    const uatClient = new Pool({
      host: '127.0.0.1',
      port: uatPort,
      user: 'mymoolah_app',
      password: uatPassword,
      database: 'mymoolah',
      ssl: false,
    });

    console.log('✅ Connected to UAT\n');

    // Check what parent table partitions actually reference in UAT
    const partitionTables = [
      'transactions_2025_01',
      'vas_transactions_2025_01'
    ];

    for (const partitionTable of partitionTables) {
      console.log(`📋 Checking: ${partitionTable}`);
      
      // Query UAT to see what parent it references
      const result = await uatClient.query(`
        SELECT 
          c.relname as partition_name,
          p.relname as parent_name,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM pg_inherits i 
              JOIN pg_class c2 ON c2.oid = i.inhparent
              WHERE i.inhrelid = c.oid
            ) THEN 'partition'
            ELSE 'unknown'
          END as type
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_inherits i ON i.inhrelid = c.oid
        LEFT JOIN pg_class p ON p.oid = i.inhparent
        WHERE n.nspname = 'public' 
          AND c.relname = $1
      `, [partitionTable]);

      if (result.rows.length > 0 && result.rows[0].parent_name) {
        console.log(`   ✅ Parent table: ${result.rows[0].parent_name}`);
      } else {
        console.log(`   ⚠️  Could not determine parent table`);
      }
    }

    // Extract actual CREATE statement using pg_dump
    console.log('\n📋 Extracting actual CREATE statement from UAT...\n');
    
    const env = { ...process.env, PGPASSWORD: uatPassword };
    const tempDir = path.join(__dirname, '..', '.temp-check');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const testTable = 'transactions_2025_01';
    const schemaFile = path.join(tempDir, `${testTable}.sql`);
    
    execSync(
      `pg_dump -h 127.0.0.1 -p ${uatPort} -U mymoolah_app -d mymoolah --schema-only --table=${testTable} > "${schemaFile}" 2>/dev/null`,
      { env, stdio: 'pipe' }
    );

    if (fs.existsSync(schemaFile)) {
      const schema = fs.readFileSync(schemaFile, 'utf8');
      const createMatch = schema.match(/CREATE TABLE[^;]+;/s);
      
      if (createMatch) {
        const createSQL = createMatch[0];
        console.log('📄 Actual CREATE statement from pg_dump:');
        console.log('─'.repeat(80));
        console.log(createSQL);
        console.log('─'.repeat(80));
        
        // Check what parent it references
        const parentMatch = createSQL.match(/PARTITION OF\s+([^\s(]+)/i);
        if (parentMatch) {
          const parentTable = parentMatch[1].replace(/["']/g, '');
          console.log(`\n🔍 Parent table referenced: "${parentTable}"\n`);
        }
      }
    }

    // Cleanup
    try {
      fs.unlinkSync(schemaFile);
      fs.rmdirSync(tempDir);
    } catch {}

    await uatClient.end();
    console.log('✅ Check complete\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
