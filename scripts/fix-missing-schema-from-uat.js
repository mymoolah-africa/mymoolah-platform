#!/usr/bin/env node

/**
 * Fix Missing Schema: Extract and Apply Missing Tables from UAT to Staging
 * 
 * Purpose: When migration files are missing but tables exist in UAT,
 *          extract the SCHEMA (table structure) and apply it to Staging
 * 
 * IMPORTANT: This syncs SCHEMA ONLY (empty table structures), NOT DATA (rows)
 * 
 * Usage: node scripts/fix-missing-schema-from-uat.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Get list of tables (including partitions) - use pg_class for better detection
async function getTables(client) {
  const result = await client.query(`
    SELECT c.relname as table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind IN ('r', 'p')  -- 'r' = regular table, 'p' = partition table
      AND c.relname NOT LIKE 'Sequelize%'
    ORDER BY c.relname
  `);
  return result.rows.map(row => row.table_name);
}

// Check if a specific table exists (including partitions) - use pg_class for better detection
async function tableExists(client, tableName) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relname = $1
        AND c.relkind IN ('r', 'p')  -- 'r' = regular table, 'p' = partition table
    ) as exists
  `, [tableName]);
  return result.rows[0]?.exists || false;
}

// Check if a table is a partitioned table (parent, not a partition)
async function isPartitionedTable(client, tableName) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relname = $1
        AND c.relkind = 'p'  -- 'p' = partitioned table (parent)
        AND NOT EXISTS (
          SELECT 1 FROM pg_inherits i 
          WHERE i.inhrelid = c.oid
        )  -- Not a partition itself (has no parent)
    ) as is_partitioned
  `, [tableName]);
  return result.rows[0]?.is_partitioned || false;
}

// Get table type: 'partitioned' (parent), 'partition' (child), 'regular', or 'none'
async function getTableType(client, tableName) {
  const result = await client.query(`
    SELECT 
      c.relkind,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid
        ) THEN 'partition'
        WHEN c.relkind = 'p' THEN 'partitioned'
        WHEN c.relkind = 'r' THEN 'regular'
        ELSE 'unknown'
      END as table_type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = $1
  `, [tableName]);
  
  if (result.rows.length === 0) return 'none';
  return result.rows[0].table_type || 'unknown';
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
  const stagingPassword = getPasswordFromSecretManager('db-mmtp-pg-staging-password');
  
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
    password: stagingPassword, // Password from Secret Manager (proxy handles IAM auth)
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

    console.log(`📋 Missing tables to sync (SCHEMA ONLY - tables will be empty):\n`);
    missingTables.forEach(t => console.log(`   - ${t}`));
    console.log('   ⚠️  Note: This creates empty table structures only - no data will be copied\n');

    // Get missing migrations
    const uatMigrations = await getExecutedMigrations(uatClient);
    const stagingMigrations = await getExecutedMigrations(stagingClient);
    const missingMigrations = uatMigrations.filter(m => !stagingMigrations.includes(m));

    console.log(`📋 Missing migrations: ${missingMigrations.length}\n`);
    if (missingMigrations.length > 0) {
      missingMigrations.forEach(m => console.log(`   - ${m}`));
      console.log('');
    }

    console.log('🔍 Extracting enums and schema from UAT using pg_dump...\n');

    // First, extract and create all enum types
    console.log('📋 Step 1: Extracting enum types...\n');
    const env = { ...process.env, PGPASSWORD: uatPassword };
    
    // Extract all enum types from UAT
    const enumFile = path.join(__dirname, '..', '.temp-enums.sql');
    try {
      execSync(
        `pg_dump -h ${uatConfig.host} -p ${uatConfig.port} -U ${uatConfig.user} -d ${uatConfig.database} --schema-only -t '*_enum*' 2>/dev/null | grep -E "(CREATE TYPE|ALTER TYPE)" > "${enumFile}" || pg_dump -h ${uatConfig.host} -p ${uatConfig.port} -U ${uatConfig.user} -d ${uatConfig.database} --schema-only 2>/dev/null | grep -E "CREATE TYPE.*AS ENUM" > "${enumFile}" || true`,
        { env, stdio: 'pipe' }
      );
      
      // Better approach: query for enum types directly
      const enumResult = await uatClient.query(`
        SELECT 
          'CREATE TYPE ' || quote_ident(t.typname) || ' AS ENUM (' ||
          string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) ||
          ');' as enum_definition
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        GROUP BY t.typname
        ORDER BY t.typname
      `);
      
      if (enumResult.rows.length > 0) {
        console.log(`   Found ${enumResult.rows.length} enum type(s) in UAT\n`);
        
        // Create enums in Staging
        for (const row of enumResult.rows) {
          const enumDef = row.enum_definition;
          const enumName = enumDef.match(/CREATE TYPE\s+([^\s]+)/i)?.[1];
          
          if (enumName) {
            try {
              // Check if enum already exists
              const exists = await stagingClient.query(`
                SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = $1) as exists
              `, [enumName.replace(/"/g, '')]);
              
              if (!exists.rows[0].exists) {
                // Wrap in DO block for safe creation
                const safeEnumDef = `DO $$ BEGIN ${enumDef} EXCEPTION WHEN duplicate_object THEN null; END $$;`;
                await stagingClient.query(safeEnumDef);
                console.log(`   ✅ Created enum: ${enumName}`);
              } else {
                console.log(`   ⚠️  Enum already exists: ${enumName}`);
              }
            } catch (error) {
              console.log(`   ⚠️  Could not create enum ${enumName}: ${error.message.split('\n')[0]}`);
            }
          }
        }
        console.log('');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not extract enums: ${error.message.split('\n')[0]}\n`);
    }
    
    // Clean up enum file if it exists
    try {
      if (fs.existsSync(enumFile)) fs.unlinkSync(enumFile);
    } catch {}

    console.log('📋 Step 2: Extracting and applying table schemas...\n');

    // Create temp directory for schema files
    const tempDir = path.join(__dirname, '..', '.temp-schema');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Pre-extract all schemas to detect dependencies and sort tables
    console.log('   📋 Analyzing table dependencies...\n');
    const tableSchemas = {};
    const tableDependencies = {}; // tableName -> parentTableName (if partition)
    
    for (const tableName of missingTables) {
      try {
        const schemaFile = path.join(tempDir, `${tableName}.sql`);
        execSync(
          `pg_dump -h ${uatConfig.host} -p ${uatConfig.port} -U ${uatConfig.user} -d ${uatConfig.database} --schema-only --table=${tableName} > "${schemaFile}" 2>/dev/null`,
          { env, stdio: 'pipe' }
        );
        
        if (fs.existsSync(schemaFile) && fs.readFileSync(schemaFile, 'utf8').trim().length > 0) {
          let schema = fs.readFileSync(schemaFile, 'utf8');
          schema = schema.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('--') && trimmed !== '';
          }).join('\n');
          
          const createTableMatch = schema.match(/CREATE TABLE[^;]+;/s);
          if (createTableMatch) {
            tableSchemas[tableName] = schema;
            
            // Check if this is a partition table
            const partitionMatch = createTableMatch[0].match(/PARTITION OF\s+([^\s(]+)/i);
            if (partitionMatch) {
              const parentTable = partitionMatch[1].replace(/["']/g, '');
              tableDependencies[tableName] = parentTable;
            }
          }
        }
      } catch (e) {
        // Will handle in main loop
      }
    }
    
    // Find parent partitioned tables that are missing
    const missingParentTables = new Set();
    for (const [partitionTable, parentTable] of Object.entries(tableDependencies)) {
      const parentExists = await tableExists(stagingClient, parentTable);
      if (!parentExists) {
        missingParentTables.add(parentTable);
      }
    }
    
    // Extract parent table schemas if they're missing
    if (missingParentTables.size > 0) {
      console.log(`   🔍 Found ${missingParentTables.size} missing parent partitioned table(s) - will create first:\n`);
      for (const parentTable of missingParentTables) {
        console.log(`      - ${parentTable}`);
        try {
          const schemaFile = path.join(tempDir, `${parentTable}.sql`);
          execSync(
            `pg_dump -h ${uatConfig.host} -p ${uatConfig.port} -U ${uatConfig.user} -d ${uatConfig.database} --schema-only --table=${parentTable} > "${schemaFile}" 2>/dev/null`,
            { env, stdio: 'pipe' }
          );
          
          if (fs.existsSync(schemaFile) && fs.readFileSync(schemaFile, 'utf8').trim().length > 0) {
            let schema = fs.readFileSync(schemaFile, 'utf8');
            schema = schema.split('\n').filter(line => {
              const trimmed = line.trim();
              return trimmed && !trimmed.startsWith('--') && trimmed !== '';
            }).join('\n');
            
            const createTableMatch = schema.match(/CREATE TABLE[^;]+;/s);
            if (createTableMatch) {
              tableSchemas[parentTable] = schema;
            }
          }
        } catch (e) {
          console.log(`      ⚠️  Could not extract schema for parent ${parentTable}`);
        }
      }
      console.log('');
    }
    
    // Sort tables: parent partitioned tables first, then partitions
    // Include missing parent tables in the list to create
    const allTablesToCreate = [...new Set([...Array.from(missingParentTables), ...missingTables])];
    const sortedTables = [...allTablesToCreate].sort((a, b) => {
      const aIsPartition = tableDependencies[a];
      const bIsPartition = tableDependencies[b];
      
      // If 'a' is a partition of 'b', 'b' comes first
      if (aIsPartition === b) return 1;
      if (bIsPartition === a) return -1;
      
      // Partitions come after their parents
      if (aIsPartition && !bIsPartition) return 1;
      if (!aIsPartition && bIsPartition) return -1;
      
      return 0;
    });

    let appliedCount = 0;
    let failedCount = 0;

    for (const tableName of sortedTables) {
      console.log(`   Processing: ${tableName}...`);
      
      // Check if we already extracted this schema
      const schema = tableSchemas[tableName];
      if (!schema) {
        console.log(`   ⚠️  Could not extract schema for ${tableName}`);
        failedCount++;
        continue;
      }

      // Extract just the CREATE TABLE section
      const createTableMatch = schema.match(/CREATE TABLE[^;]+;/s);
      if (!createTableMatch) {
        console.log(`   ⚠️  No CREATE TABLE found for ${tableName}`);
        failedCount++;
        continue;
      }

      let createTableSQL = createTableMatch[0];
      
      // Debug: Show what SQL we're about to execute (first 200 chars)
      const sqlPreview = createTableSQL.length > 200 
        ? createTableSQL.substring(0, 200) + '...' 
        : createTableSQL;
      console.log(`      🔍 SQL: ${sqlPreview.replace(/\n/g, ' ').trim()}`);
      
      // Check if this is a partition table - extract parent name
      const partitionMatch = createTableSQL.match(/PARTITION OF\s+([^\s(]+)/i);
      
      // If this is a partition, verify parent exists AND is partitioned
      if (tableDependencies[tableName]) {
        const parentTable = tableDependencies[tableName];
        const parentExists = await tableExists(stagingClient, parentTable);
        if (!parentExists) {
          console.log(`   ❌ Failed: ${tableName} - Parent partitioned table ${parentTable} does not exist`);
          failedCount++;
          continue;
        }
        
        // Critical check: Verify parent is actually a partitioned table
        const parentTableType = await getTableType(stagingClient, parentTable);
        if (parentTableType !== 'partitioned') {
          console.log(`   ❌ Failed: ${tableName} - Parent table ${parentTable} exists but is NOT partitioned`);
          console.log(`      ⚠️  Current type: ${parentTableType}`);
          console.log(`      💡 Parent must be a partitioned table to create partitions`);
          console.log(`      💡 This indicates a schema mismatch - parent table structure differs from UAT`);
          failedCount++;
          continue;
        }
      }
      
      // Apply to Staging using a single client connection for transaction
      // Get a new client from the pool for this transaction
      const client = await stagingPool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute CREATE TABLE and capture result
        const createResult = await client.query(createTableSQL);
        console.log(`      📊 CREATE executed (command: ${createResult.command || 'UNKNOWN'}, rowCount: ${createResult.rowCount || 0})`);
        
        // Also apply any ALTER TABLE or CREATE INDEX statements for this table
        const alterStatements = schema.match(/ALTER TABLE[^;]+;/g) || [];
        const indexStatements = schema.match(/CREATE[^;]*INDEX[^;]+;/g) || [];
        
        for (const stmt of [...alterStatements, ...indexStatements]) {
          if (stmt.includes(tableName)) {
            try {
              await client.query(stmt);
            } catch (e) {
              // Ignore errors for indexes/constraints - table creation is what matters
              console.log(`      ⚠️  Index/constraint skipped: ${e.message.split('\n')[0]}`);
            }
          }
        }
        
        // Check transaction status before commit
        const beforeCommitStatus = await client.query('SELECT txid_current(), pg_is_in_recovery()');
        console.log(`      📊 Transaction ID before commit: ${beforeCommitStatus.rows[0]?.txid_current || 'UNKNOWN'}`);
        
        await client.query('COMMIT');
        console.log(`      ✅ Transaction committed`);
        
        // Small delay to ensure transaction is fully committed
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify table actually exists after creation
        const existsAfter = await tableExists(stagingClient, tableName);
        if (existsAfter) {
          console.log(`   ✅ Applied: ${tableName}`);
          appliedCount++;
        } else {
          // Table creation succeeded but table doesn't exist - this indicates a problem
          console.log(`   ❌ Failed: ${tableName} - CREATE succeeded but table not found`);
          console.log(`      🔍 Diagnostic info:`);
          console.log(`         - CREATE command executed: ${createResult.command || 'UNKNOWN'}`);
          console.log(`         - Transaction committed successfully`);
          console.log(`         - Table verification query returned: false`);
          console.log(`      💡 Possible causes:`);
          if (partitionMatch) {
            console.log(`         - Parent table might not exist or be incorrectly structured`);
            console.log(`         - Partition syntax might be invalid`);
          } else {
            console.log(`         - CREATE statement might be invalid SQL`);
            console.log(`         - Transaction might have rolled back silently`);
            console.log(`         - Permission issues preventing table creation`);
            console.log(`         - Table might be in a different schema`);
          }
          console.log(`      💡 Run diagnostic: node scripts/test-partition-creation.js`);
          failedCount++;
        }
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          // Ignore rollback errors
        }
        
        // Capture full error details for better diagnosis
        const errorMsg = error.message;
        const firstLine = errorMsg.split('\n')[0];
        
        console.log(`   ❌ Failed: ${tableName}`);
        console.log(`      📋 Error: ${firstLine}`);
        
        // Show full error if it's a partitioning-related error
        if (errorMsg.includes('partition') || errorMsg.includes('not partitioned') || partitionMatch) {
          console.log(`      🔍 Full error details:`);
          errorMsg.split('\n').slice(0, 5).forEach(line => {
            if (line.trim()) console.log(`         ${line.trim()}`);
          });
          
          if (errorMsg.includes('not partitioned')) {
            console.log(`      💡 This means the parent table exists but is not set up as a partitioned table`);
            console.log(`      💡 You may need to drop and recreate the parent table as partitioned`);
          }
        }
        
        if (firstLine.includes('already exists')) {
          console.log(`      ⚠️  Table already exists (skipping)`);
        } else {
          failedCount++;
        }
      } finally {
        // Always release the client back to the pool
        client.release();
      }

      // Clean up temp file (if it exists)
      const schemaFile = path.join(tempDir, `${tableName}.sql`);
      try {
        if (fs.existsSync(schemaFile)) fs.unlinkSync(schemaFile);
      } catch {}
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

    // Verify final state - batch check all tables at once (much faster)
    console.log('🔍 Verifying final state...\n');
    
    // Get all staging tables in one query (much faster than individual checks)
    const finalStagingTables = await getTables(stagingClient);
    const finalStagingTableSet = new Set(finalStagingTables);
    
    // Get partition info for all tables at once
    const partitionResult = await stagingClient.query(`
      SELECT c.relname as table_name
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
    `);
    const partitionSet = new Set(partitionResult.rows.map(row => row.table_name));
    
    // Categorize missing tables
    const verifiedCreated = [];
    const verifiedMissing = [];
    const verifiedPartitions = [];
    
    for (const tableName of missingTables) {
      if (finalStagingTableSet.has(tableName)) {
        if (partitionSet.has(tableName)) {
          verifiedPartitions.push(tableName);
        } else {
          verifiedCreated.push(tableName);
        }
      } else {
        verifiedMissing.push(tableName);
      }
    }

    console.log('='.repeat(80));
    console.log('  SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n   UAT: ${uatTables.length} tables`);
    console.log(`   Staging: ${finalStagingTables.length} tables`);
    console.log(`   Tables processed: ${missingTables.length}`);
    console.log(`   ✅ Created: ${verifiedCreated.length}`);
    console.log(`   ✅ Partitions: ${verifiedPartitions.length}`);
    console.log(`   ⚠️  Missing: ${verifiedMissing.length}\n`);

    if (verifiedMissing.length > 0) {
      console.log('⚠️  Tables that could not be verified:\n');
      verifiedMissing.forEach(t => console.log(`   - ${t}`));
      console.log('\n   These may need manual verification or have dependencies.\n');
    } else if (verifiedCreated.length + verifiedPartitions.length === missingTables.length) {
      console.log('✅ All missing tables have been created successfully!\n');
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
