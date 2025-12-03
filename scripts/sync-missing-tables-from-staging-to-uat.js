#!/usr/bin/env node

/**
 * Sync Missing Tables from Staging to UAT
 * 
 * Purpose: Create tables that exist in Staging but not in UAT
 *          This handles cases where migrations are marked as executed
 *          but tables weren't actually created
 * 
 * Usage: node scripts/sync-missing-tables-from-staging-to-uat.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get password from Secret Manager (for Staging)
function getPasswordFromSecretManager(secretName) {
  try {
    const password = execSync(
      `gcloud secrets versions access latest --secret="${secretName}" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return password.replace(/[\r\n\s]+$/g, '').trim();
  } catch (error) {
    throw new Error(`Failed to get password from Secret Manager: ${secretName} - ${error.message}`);
  }
}

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

// Get list of tables
async function getTables(client) {
  const result = await client.query(`
    SELECT c.relname as table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind IN ('r', 'p')
      AND c.relname NOT LIKE 'Sequelize%'
    ORDER BY c.relname
  `);
  return result.rows.map(row => row.table_name);
}

// Check if table exists
async function tableExists(client, tableName) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relname = $1
        AND c.relkind IN ('r', 'p')
    ) as exists
  `, [tableName]);
  return result.rows[0]?.exists || false;
}

// Get table schema from Staging
async function getTableSchema(config, tableName) {
  try {
    const { execSync } = require('child_process');
    const env = { ...process.env, PGPASSWORD: config.password };
    const schemaFile = `/tmp/schema_${tableName}_${Date.now()}.sql`;
    execSync(
      `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} --schema-only --table="${tableName}" --no-owner --no-acl > "${schemaFile}" 2>/dev/null`,
      { env, stdio: 'pipe' }
    );
    
    if (fs.existsSync(schemaFile)) {
      const schema = fs.readFileSync(schemaFile, 'utf8');
      fs.unlinkSync(schemaFile);
      return schema;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  🔄 SYNC MISSING TABLES: STAGING → UAT');
  console.log('='.repeat(80) + '\n');

  // Get passwords
  const uatPassword = getUATPassword();
  let stagingPassword;
  
  try {
    stagingPassword = getPasswordFromSecretManager('db-mmtp-pg-staging-password');
    console.log('✅ Staging password retrieved from Secret Manager\n');
  } catch (error) {
    throw new Error(`Failed to retrieve Staging password: ${error.message}`);
  }

  // Detect proxy ports
  console.log('🔍 Detecting Cloud SQL Auth Proxy ports...\n');
  const uatProxyPort = detectProxyPort([6543, 5432], 'UAT');
  const stagingProxyPort = detectProxyPort([6544, 5432], 'Staging');
  console.log(`✅ UAT proxy running on port ${uatProxyPort}`);
  console.log(`✅ Staging proxy running on port ${stagingProxyPort}\n`);

  // Create connection pools
  const uatConfig = {
    host: '127.0.0.1',
    port: uatProxyPort,
    database: 'mymoolah',
    user: 'mymoolah_app',
    password: uatPassword,
    ssl: false
  };

  const stagingConfig = {
    host: '127.0.0.1',
    port: stagingProxyPort,
    database: 'mymoolah_staging',
    user: 'mymoolah_app',
    password: stagingPassword,
    ssl: false
  };

  const uatPool = new Pool(uatConfig);
  const stagingPool = new Pool(stagingConfig);

  try {
    const uatClient = await uatPool.connect();
    const stagingClient = await stagingPool.connect();

    try {
      console.log('📋 Fetching table lists...\n');
      
      const uatTables = await getTables(uatClient);
      const stagingTables = await getTables(stagingClient);

      console.log(`   UAT: ${uatTables.length} tables`);
      console.log(`   Staging: ${stagingTables.length} tables\n`);

      // Find tables in Staging but not in UAT
      const uatTableSet = new Set(uatTables);
      const missingTables = stagingTables.filter(t => !uatTableSet.has(t));

      if (missingTables.length === 0) {
        console.log('✅ All tables are synchronized! No missing tables.\n');
        return;
      }

      console.log(`📋 Found ${missingTables.length} missing table(s) in UAT:\n`);
      missingTables.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t}`);
      });
      console.log();

      // Step 1: Extract and create all enum types from Staging
      console.log('📋 Step 1: Extracting enum types from Staging...\n');
      try {
        const enumResult = await stagingClient.query(`
          SELECT 
            t.typname as enum_name,
            string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) as enum_values
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
          GROUP BY t.typname
          ORDER BY t.typname
        `);
        
        if (enumResult.rows.length > 0) {
          console.log(`   Found ${enumResult.rows.length} enum type(s) in Staging\n`);
          
          let enumsCreated = 0;
          for (const enumRow of enumResult.rows) {
            const enumName = enumRow.enum_name;
            const enumValues = enumRow.enum_values.split(',');
            
            // Check if enum already exists in UAT
            const exists = await uatClient.query(`
              SELECT EXISTS(
                SELECT 1 FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public' AND t.typname = $1
              ) as exists
            `, [enumName]);
            
            if (!exists.rows[0].exists) {
              // Create enum type
              const valuesList = enumValues.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
              const createEnumSQL = `CREATE TYPE "public"."${enumName}" AS ENUM (${valuesList})`;
              
              try {
                await uatClient.query(createEnumSQL);
                console.log(`   ✅ Created enum: ${enumName}`);
                enumsCreated++;
              } catch (error) {
                console.log(`   ⚠️  Could not create enum ${enumName}: ${error.message.split('\n')[0]}`);
              }
            }
          }
          console.log(`\n   Summary: ${enumsCreated} enum(s) created\n`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not extract enums: ${error.message.split('\n')[0]}\n`);
      }

      // Step 2: Sync each missing table
      let appliedCount = 0;
      let failedCount = 0;

      for (const tableName of missingTables) {
        console.log(`📋 Processing: ${tableName}...`);
        
        try {
          // Get schema from Staging
          const schema = await getTableSchema(stagingConfig, tableName);
          
          if (!schema || !schema.includes('CREATE TABLE')) {
            console.log(`   ⚠️  Could not extract schema for ${tableName}`);
            failedCount++;
            continue;
          }

          // Extract just the CREATE TABLE statement
          const createTableMatch = schema.match(/CREATE TABLE[^;]+;/s);
          if (!createTableMatch) {
            console.log(`   ⚠️  No CREATE TABLE statement found for ${tableName}`);
            failedCount++;
            continue;
          }

          const createTableSQL = createTableMatch[0];

          // Apply to UAT
          const client = await uatPool.connect();
          try {
            await client.query('BEGIN');
            await client.query(createTableSQL);
            await client.query('COMMIT');
            
            // Verify table was created
            const exists = await tableExists(uatClient, tableName);
            if (exists) {
              console.log(`   ✅ Created: ${tableName}`);
              appliedCount++;
            } else {
              console.log(`   ❌ Failed: ${tableName} - table not found after creation`);
              failedCount++;
            }
          } catch (error) {
            try {
              await client.query('ROLLBACK');
            } catch {}
            
            const errorMsg = error.message.split('\n')[0];
            if (errorMsg.includes('already exists')) {
              console.log(`   ⚠️  Table already exists: ${tableName}`);
            } else {
              console.log(`   ❌ Failed: ${tableName} - ${errorMsg}`);
              failedCount++;
            }
          } finally {
            client.release();
          }
        } catch (error) {
          console.log(`   ❌ Error processing ${tableName}: ${error.message.split('\n')[0]}`);
          failedCount++;
        }
        
        console.log();
      }

      console.log('='.repeat(80));
      console.log('  📊 SUMMARY');
      console.log('='.repeat(80) + '\n');
      console.log(`   ✅ Created: ${appliedCount} table(s)`);
      console.log(`   ❌ Failed: ${failedCount} table(s)\n`);

    } finally {
      uatClient.release();
      stagingClient.release();
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await uatPool.end();
    await stagingPool.end();
  }
}

main().catch(error => {
  console.error(`\n❌ Unhandled error: ${error.message}`);
  process.exit(1);
});
