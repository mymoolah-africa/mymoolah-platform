#!/usr/bin/env node

/**
 * Audit Extra Staging Tables
 * 
 * Purpose: Identify and analyze tables that exist in Staging but not in UAT
 *          to determine if they should be removed or kept
 * 
 * Usage: node scripts/audit-extra-staging-tables.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');

// Get password from Secret Manager
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

// Get list of all tables (including partitions)
async function getTables(client) {
  const result = await client.query(`
    SELECT 
      c.relname as table_name,
      c.relkind as table_kind,
      CASE 
        WHEN EXISTS (SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid) THEN 'partition'
        WHEN c.relkind = 'p' THEN 'partitioned'
        WHEN c.relkind = 'r' THEN 'regular'
        ELSE 'unknown'
      END as table_type,
      pg_size_pretty(pg_total_relation_size(c.oid)) as size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind IN ('r', 'p')  -- 'r' = regular table, 'p' = partition table
      AND c.relname NOT LIKE 'Sequelize%'
    ORDER BY c.relname
  `);
  return result.rows;
}

// Get detailed table information
async function getTableDetails(client, tableName) {
  try {
    // Get table creation time (from pg_stat_user_tables if available)
    const statsResult = await client.query(`
      SELECT 
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE relname = $1
    `, [tableName]);

    // Get column count and sample columns
    const columnsResult = await client.query(`
      SELECT 
        COUNT(*) as column_count,
        STRING_AGG(column_name, ', ' ORDER BY ordinal_position) FILTER (WHERE ordinal_position <= 5) as sample_columns
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);

    // Get row count (actual)
    const countResult = await client.query(`SELECT COUNT(*) as row_count FROM "${tableName}"`);

    // Get parent table if this is a partition
    const parentResult = await client.query(`
      SELECT 
        p.relname as parent_table
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      WHERE c.relname = $1
    `, [tableName]);

    return {
      stats: statsResult.rows[0] || {},
      columns: columnsResult.rows[0] || {},
      rowCount: parseInt(countResult.rows[0]?.row_count || '0'),
      parentTable: parentResult.rows[0]?.parent_table || null
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

// Get table schema (CREATE TABLE statement)
async function getTableSchema(config, tableName) {
  try {
    const { execSync } = require('child_process');
    const env = { ...process.env, PGPASSWORD: config.password };
    const schemaFile = `/tmp/schema_${tableName}_${Date.now()}.sql`;
    execSync(
      `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} --schema-only --table="${tableName}" --no-owner --no-acl > "${schemaFile}" 2>/dev/null`,
      { env, stdio: 'pipe' }
    );
    
    if (require('fs').existsSync(schemaFile)) {
      const schema = require('fs').readFileSync(schemaFile, 'utf8');
      require('fs').unlinkSync(schemaFile); // Clean up
      return schema;
    }
    return 'Schema file not created';
  } catch (error) {
    return `Error extracting schema: ${error.message}`;
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  🔍 AUDIT EXTRA STAGING TABLES');
  console.log('='.repeat(80) + '\n');

  // Get passwords
  const uatPassword = getUATPassword();
  let stagingPassword;
  
  try {
    stagingPassword = getPasswordFromSecretManager('db-mmtp-pg-staging-password');
    console.log('✅ Staging password retrieved from Secret Manager\n');
  } catch (error) {
    throw new Error(`Failed to retrieve Staging password from Secret Manager: ${error.message}`);
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
    // Get clients
    const uatClient = await uatPool.connect();
    const stagingClient = await stagingPool.connect();

    try {
      console.log('📋 Fetching table lists from UAT and Staging...\n');
      
      // Get all tables from both databases
      const uatTables = await getTables(uatClient);
      const stagingTables = await getTables(stagingClient);

      console.log(`   UAT: ${uatTables.length} tables`);
      console.log(`   Staging: ${stagingTables.length} tables\n`);

      // Find tables in Staging but not in UAT
      const uatTableNames = new Set(uatTables.map(t => t.table_name));
      const extraTables = stagingTables.filter(t => !uatTableNames.has(t.table_name));

      console.log('='.repeat(80));
      console.log(`  📊 FOUND ${extraTables.length} EXTRA TABLE(S) IN STAGING`);
      console.log('='.repeat(80) + '\n');

      if (extraTables.length === 0) {
        console.log('✅ No extra tables found! Staging matches UAT.\n');
        return;
      }

      // Analyze each extra table
      for (let i = 0; i < extraTables.length; i++) {
        const table = extraTables[i];
        console.log(`${i + 1}. ${table.table_name}`);
        console.log(`   Type: ${table.table_type} (kind: ${table.table_kind})`);
        console.log(`   Size: ${table.size}`);
        
        // Get detailed information
        const details = await getTableDetails(stagingClient, table.table_name);
        
        if (details.error) {
          console.log(`   ⚠️  Error getting details: ${details.error}`);
        } else {
          console.log(`   Columns: ${details.columns.column_count}`);
          console.log(`   Rows: ${details.rowCount}`);
          
          if (details.parentTable) {
            console.log(`   Parent table: ${details.parentTable}`);
          }
          
          if (details.columns.sample_columns) {
            console.log(`   Sample columns: ${details.columns.sample_columns}${details.columns.column_count > 5 ? '...' : ''}`);
          }
          
          if (details.stats.inserts) {
            console.log(`   Activity: ${details.stats.inserts} inserts, ${details.stats.updates} updates, ${details.stats.deletes} deletes`);
          }
        }
        
        // Get schema snippet
        console.log(`   📋 Extracting schema...`);
        const schema = await getTableSchema(stagingConfig, table.table_name);
        const schemaLines = schema.split('\n').slice(0, 10).join('\n');
        console.log(`   Schema preview:\n${schemaLines.split('\n').map(l => `      ${l}`).join('\n')}`);
        
        console.log();
      }

      // Summary and recommendations
      console.log('='.repeat(80));
      console.log('  💡 RECOMMENDATIONS');
      console.log('='.repeat(80) + '\n');

      const partitionTables = extraTables.filter(t => t.table_type === 'partition');
      const regularTables = extraTables.filter(t => t.table_type === 'regular');
      const partitionedTables = extraTables.filter(t => t.table_type === 'partitioned');

      console.log(`   Partitions: ${partitionTables.length}`);
      console.log(`   Regular tables: ${regularTables.length}`);
      console.log(`   Partitioned tables (parents): ${partitionedTables.length}\n`);

      if (regularTables.length > 0) {
        console.log('   ⚠️  Regular tables found in Staging but not UAT:');
        regularTables.forEach(t => {
          console.log(`      - ${t.table_name}`);
        });
        console.log('   💡 These may be staging-specific or should be removed.\n');
      }

      if (partitionTables.length > 0) {
        console.log('   ⚠️  Partition tables found in Staging but not UAT:');
        partitionTables.forEach(t => {
          console.log(`      - ${t.table_name}`);
        });
        console.log('   💡 These may be orphaned partitions or need to be created in UAT.\n');
      }

      if (partitionedTables.length > 0) {
        console.log('   ⚠️  Partitioned parent tables found in Staging but not UAT:');
        partitionedTables.forEach(t => {
          console.log(`      - ${t.table_name}`);
        });
        console.log('   💡 These are parent tables for partitioning. Check if UAT needs them.\n');
      }

      console.log('='.repeat(80) + '\n');

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

// Run
main().catch(error => {
  console.error(`\n❌ Unhandled error: ${error.message}`);
  process.exit(1);
});
