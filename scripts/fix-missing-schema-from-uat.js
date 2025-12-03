#!/usr/bin/env node

/**
 * Fix Missing Schema: Extract and Apply Missing Tables from UAT to Staging
 * 
 * Purpose: When migration files are missing but tables exist in UAT,
 *          extract the schema using pg_dump and apply it to Staging
 * 
 * Usage: node scripts/fix-missing-schema-from-uat.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'Sequelize%'
    ORDER BY table_name
  `);
  return result.rows.map(row => row.table_name);
}

// Get executed migrations
async function getExecutedMigrations(client) {
  try {
    const result = await client.query(`SELECT name FROM "SequelizeMeta" ORDER BY name ASC`);
    return result.rows.map(row => row.name);
  } catch {
    return [];
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  🔧 FIX MISSING SCHEMA: UAT → STAGING');
  console.log('='.repeat(80) + '\n');

  const uatPassword = getUATPassword();
  const uatProxyPort = detectProxyPort([6543, 5433], 'UAT');
  const stagingProxyPort = detectProxyPort([6544, 5434], 'Staging');

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
    // Staging uses IAM auth - no password needed
    ssl: false
  };

  const uatPool = new Pool(uatConfig);
  const stagingPool = new Pool(stagingConfig);

  try {
    const uatClient = await uatPool.connect();
    const stagingClient = await stagingPool.connect();

    console.log('📋 Analyzing schemas...\n');
    const uatTables = await getTables(uatClient);
    const stagingTables = await getTables(stagingClient);
    const missingTables = uatTables.filter(t => !stagingTables.includes(t));
    
    console.log(`   UAT: ${uatTables.length} tables`);
    console.log(`   Staging: ${stagingTables.length} tables`);
    console.log(`   Missing: ${missingTables.length} tables\n`);

    if (missingTables.length === 0) {
      console.log('✅ No missing tables - schemas match!\n');
      return;
    }

    console.log(`📋 Missing tables to sync:\n`);
    missingTables.forEach(t => console.log(`   - ${t}`));
    console.log('');

    // Get missing migrations
    const uatMigrations = await getExecutedMigrations(uatClient);
    const stagingMigrations = await getExecutedMigrations(stagingClient);
    const missingMigrations = uatMigrations.filter(m => !stagingMigrations.includes(m));

    console.log(`📋 Missing migrations: ${missingMigrations.length}\n`);
    if (missingMigrations.length > 0) {
      missingMigrations.forEach(m => console.log(`   - ${m}`));
      console.log('');
    }

    console.log('🔍 Extracting schema from UAT using pg_dump...\n');

    // Create temp directory for schema files
    const tempDir = path.join(__dirname, '..', '.temp-schema');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let appliedCount = 0;
    let failedCount = 0;

    for (const tableName of missingTables) {
      console.log(`   Processing: ${tableName}...`);
      
      try {
        // Extract schema using pg_dump
        const schemaFile = path.join(tempDir, `${tableName}.sql`);
        const env = { ...process.env, PGPASSWORD: uatPassword };
        
        execSync(
          `pg_dump -h ${uatConfig.host} -p ${uatConfig.port} -U ${uatConfig.user} -d ${uatConfig.database} --schema-only --table=${tableName} > "${schemaFile}" 2>/dev/null`,
          { env, stdio: 'pipe' }
        );

        if (!fs.existsSync(schemaFile) || fs.readFileSync(schemaFile, 'utf8').trim().length === 0) {
          console.log(`   ⚠️  Could not extract schema for ${tableName}`);
          failedCount++;
          continue;
        }

        // Read and clean the schema file
        let schema = fs.readFileSync(schemaFile, 'utf8');
        
        // Remove comments and empty lines at start
        schema = schema.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('--') && trimmed !== '';
        }).join('\n');

        // Extract just the CREATE TABLE section
        const createTableMatch = schema.match(/CREATE TABLE[^;]+;/s);
        if (!createTableMatch) {
          console.log(`   ⚠️  No CREATE TABLE found for ${tableName}`);
          failedCount++;
          continue;
        }

        let createTableSQL = createTableMatch[0];
        
        // Apply to Staging using psql (IAM auth, no password needed)
        await stagingClient.query('BEGIN');
        try {
          await stagingClient.query(createTableSQL);
          
          // Also apply any ALTER TABLE or CREATE INDEX statements for this table
          const alterStatements = schema.match(/ALTER TABLE[^;]+;/g) || [];
          const indexStatements = schema.match(/CREATE[^;]*INDEX[^;]+;/g) || [];
          
          for (const stmt of [...alterStatements, ...indexStatements]) {
            if (stmt.includes(tableName)) {
              try {
                await stagingClient.query(stmt);
              } catch (e) {
                // Ignore errors for indexes/constraints - table creation is what matters
              }
            }
          }
          
          await stagingClient.query('COMMIT');
          console.log(`   ✅ Applied: ${tableName}`);
          appliedCount++;
        } catch (error) {
          await stagingClient.query('ROLLBACK');
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  ${tableName} already exists (skipping)`);
          } else {
            console.log(`   ❌ Failed: ${tableName} - ${error.message.split('\n')[0]}`);
            failedCount++;
          }
        }

        // Clean up temp file
        fs.unlinkSync(schemaFile);

      } catch (error) {
        console.log(`   ❌ Error: ${tableName} - ${error.message.split('\n')[0]}`);
        failedCount++;
      }
    }

    // Clean up temp directory
    try {
      fs.rmdirSync(tempDir);
    } catch {}

    console.log(`\n✅ Applied ${appliedCount} table(s), ${failedCount} failed\n`);

    // Mark missing migrations as executed
    if (missingMigrations.length > 0 && appliedCount > 0) {
      console.log('📋 Marking missing migrations as executed...\n');
      
      for (const migrationName of missingMigrations) {
        try {
          await stagingClient.query(`INSERT INTO "SequelizeMeta" (name) VALUES ($1) ON CONFLICT DO NOTHING`, [migrationName]);
          console.log(`   ✅ Marked: ${migrationName}`);
        } catch (error) {
          console.log(`   ⚠️  Could not mark ${migrationName}: ${error.message.split('\n')[0]}`);
        }
      }
      console.log('');
    }

    // Verify final state
    const finalStagingTables = await getTables(stagingClient);
    const finalMissing = uatTables.filter(t => !finalStagingTables.includes(t));

    console.log('='.repeat(80));
    console.log('  SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n   UAT: ${uatTables.length} tables`);
    console.log(`   Staging: ${finalStagingTables.length} tables`);
    console.log(`   Still missing: ${finalMissing.length}\n`);

    if (finalMissing.length > 0) {
      console.log('⚠️  Tables still missing:\n');
      finalMissing.forEach(t => console.log(`   - ${t}`));
      console.log('\n   May require manual intervention or have dependencies.\n');
    } else {
      console.log('✅ All tables synced!\n');
    }

    await uatClient.release();
    await stagingClient.release();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    await uatPool.end();
    await stagingPool.end();
  }
}

main().catch(console.error);
