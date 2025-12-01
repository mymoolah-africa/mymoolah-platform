#!/usr/bin/env node

/**
 * Compare Database Schemas: UAT vs Staging
 * 
 * Purpose: Identify schema differences between UAT and Staging databases
 * Usage: node scripts/compare-uat-staging-schemas.js
 * 
 * Requirements:
 * - Cloud SQL Auth Proxy running on port 5433 (UAT)
 * - Cloud SQL Auth Proxy running on port 5434 (Staging)
 */

const { Client } = require('pg');

// Database connection configurations
const uatConfig = {
  host: '127.0.0.1',
  port: 5433,
  database: 'mymoolah',
  user: 'mymoolah_app',
  password: process.env.DB_PASSWORD || 'B0t3s@Mymoolah'
};

const stagingConfig = {
  host: '127.0.0.1',
  port: 5434,
  database: 'mymoolah',
  user: 'mymoolah_app',
  password: process.env.DB_PASSWORD || 'B0t3s@Mymoolah'
};

/**
 * Get all tables and their columns from a database
 */
async function getDatabaseSchema(client) {
  const query = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.character_maximum_length,
      c.is_nullable,
      c.column_default,
      CASE 
        WHEN pk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
      END as is_primary_key
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c 
      ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'Sequelize%'
    ORDER BY t.table_name, c.ordinal_position;
  `;

  const result = await client.query(query);
  
  // Organize by table
  const schema = {};
  for (const row of result.rows) {
    const tableName = row.table_name;
    if (!schema[tableName]) {
      schema[tableName] = [];
    }
    schema[tableName].push({
      column: row.column_name,
      type: row.data_type,
      length: row.character_maximum_length,
      nullable: row.is_nullable,
      default: row.column_default,
      primaryKey: row.is_primary_key
    });
  }

  return schema;
}

/**
 * Compare two schemas and report differences
 */
function compareSchemas(uatSchema, stagingSchema) {
  const differences = {
    tablesOnlyInUat: [],
    tablesOnlyInStaging: [],
    columnDifferences: [],
    identical: []
  };

  const allTables = new Set([
    ...Object.keys(uatSchema),
    ...Object.keys(stagingSchema)
  ]);

  for (const tableName of allTables) {
    const uatTable = uatSchema[tableName];
    const stagingTable = stagingSchema[tableName];

    // Table only in UAT
    if (uatTable && !stagingTable) {
      differences.tablesOnlyInUat.push(tableName);
      continue;
    }

    // Table only in Staging
    if (!uatTable && stagingTable) {
      differences.tablesOnlyInStaging.push(tableName);
      continue;
    }

    // Compare columns
    const uatColumns = new Map(uatTable.map(c => [c.column, c]));
    const stagingColumns = new Map(stagingTable.map(c => [c.column, c]));

    const allColumns = new Set([
      ...uatColumns.keys(),
      ...stagingColumns.keys()
    ]);

    const tableDiffs = {
      table: tableName,
      columnsOnlyInUat: [],
      columnsOnlyInStaging: [],
      columnTypeDifferences: []
    };

    for (const columnName of allColumns) {
      const uatCol = uatColumns.get(columnName);
      const stagingCol = stagingColumns.get(columnName);

      if (uatCol && !stagingCol) {
        tableDiffs.columnsOnlyInUat.push(columnName);
      } else if (!uatCol && stagingCol) {
        tableDiffs.columnsOnlyInStaging.push(columnName);
      } else if (uatCol && stagingCol) {
        // Compare column properties
        if (uatCol.type !== stagingCol.type ||
            uatCol.nullable !== stagingCol.nullable ||
            uatCol.primaryKey !== stagingCol.primaryKey) {
          tableDiffs.columnTypeDifferences.push({
            column: columnName,
            uat: uatCol,
            staging: stagingCol
          });
        }
      }
    }

    if (tableDiffs.columnsOnlyInUat.length > 0 ||
        tableDiffs.columnsOnlyInStaging.length > 0 ||
        tableDiffs.columnTypeDifferences.length > 0) {
      differences.columnDifferences.push(tableDiffs);
    } else {
      differences.identical.push(tableName);
    }
  }

  return differences;
}

/**
 * Print comparison results
 */
function printResults(differences) {
  console.log('\n' + '='.repeat(80));
  console.log('  DATABASE SCHEMA COMPARISON: UAT vs STAGING');
  console.log('='.repeat(80) + '\n');

  // Summary
  console.log('📊 SUMMARY:');
  console.log(`   Tables only in UAT: ${differences.tablesOnlyInUat.length}`);
  console.log(`   Tables only in Staging: ${differences.tablesOnlyInStaging.length}`);
  console.log(`   Tables with differences: ${differences.columnDifferences.length}`);
  console.log(`   Identical tables: ${differences.identical.length}`);
  console.log('');

  // Tables only in UAT
  if (differences.tablesOnlyInUat.length > 0) {
    console.log('❌ TABLES ONLY IN UAT (Missing in Staging):');
    differences.tablesOnlyInUat.forEach(table => {
      console.log(`   - ${table}`);
    });
    console.log('');
  }

  // Tables only in Staging
  if (differences.tablesOnlyInStaging.length > 0) {
    console.log('⚠️  TABLES ONLY IN STAGING (Not in UAT):');
    differences.tablesOnlyInStaging.forEach(table => {
      console.log(`   - ${table}`);
    });
    console.log('');
  }

  // Column differences
  if (differences.columnDifferences.length > 0) {
    console.log('❌ TABLES WITH COLUMN DIFFERENCES:');
    differences.columnDifferences.forEach(tableDiff => {
      console.log(`\n   Table: ${tableDiff.table}`);

      if (tableDiff.columnsOnlyInUat.length > 0) {
        console.log('      Columns only in UAT (missing in Staging):');
        tableDiff.columnsOnlyInUat.forEach(col => {
          console.log(`         - ${col}`);
        });
      }

      if (tableDiff.columnsOnlyInStaging.length > 0) {
        console.log('      Columns only in Staging (not in UAT):');
        tableDiff.columnsOnlyInStaging.forEach(col => {
          console.log(`         - ${col}`);
        });
      }

      if (tableDiff.columnTypeDifferences.length > 0) {
        console.log('      Column type differences:');
        tableDiff.columnTypeDifferences.forEach(diff => {
          console.log(`         - ${diff.column}:`);
          console.log(`            UAT:     ${diff.uat.type} ${diff.uat.nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
          console.log(`            Staging: ${diff.staging.type} ${diff.staging.nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }
    });
    console.log('');
  }

  // Identical tables
  if (differences.identical.length > 0) {
    console.log('✅ IDENTICAL TABLES (' + differences.identical.length + '):');
    const maxDisplay = 10;
    differences.identical.slice(0, maxDisplay).forEach(table => {
      console.log(`   - ${table}`);
    });
    if (differences.identical.length > maxDisplay) {
      console.log(`   ... and ${differences.identical.length - maxDisplay} more`);
    }
    console.log('');
  }

  // Status
  console.log('='.repeat(80));
  if (differences.tablesOnlyInUat.length === 0 &&
      differences.tablesOnlyInStaging.length === 0 &&
      differences.columnDifferences.length === 0) {
    console.log('✅ SCHEMAS ARE IDENTICAL - No differences found!');
  } else {
    console.log('❌ SCHEMAS ARE DIFFERENT - Action required!');
    console.log('');
    console.log('💡 RECOMMENDED ACTIONS:');
    console.log('   1. Run pending migrations in Staging: ./scripts/run-migrations-staging.sh');
    console.log('   2. Verify all migrations have been executed');
    console.log('   3. Check for manual schema changes');
    console.log('   4. Re-run this script to verify');
  }
  console.log('='.repeat(80) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 Starting Database Schema Comparison...\n');

  const uatClient = new Client(uatConfig);
  const stagingClient = new Client(stagingConfig);

  try {
    // Connect to both databases
    console.log('📡 Connecting to UAT database (port 5433)...');
    await uatClient.connect();
    console.log('✅ Connected to UAT\n');

    console.log('📡 Connecting to Staging database (port 5434)...');
    await stagingClient.connect();
    console.log('✅ Connected to Staging\n');

    // Get schemas
    console.log('📊 Fetching UAT schema...');
    const uatSchema = await getDatabaseSchema(uatClient);
    console.log(`✅ Found ${Object.keys(uatSchema).length} tables in UAT\n`);

    console.log('📊 Fetching Staging schema...');
    const stagingSchema = await getDatabaseSchema(stagingClient);
    console.log(`✅ Found ${Object.keys(stagingSchema).length} tables in Staging\n`);

    // Compare schemas
    console.log('🔄 Comparing schemas...');
    const differences = compareSchemas(uatSchema, stagingSchema);
    console.log('✅ Comparison complete\n');

    // Print results
    printResults(differences);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure Cloud SQL Auth Proxy is running:');
    console.error('      UAT: port 5433');
    console.error('      Staging: port 5434');
    console.error('   2. Check database password is correct');
    console.error('   3. Verify database connection settings');
    process.exit(1);
  } finally {
    await uatClient.end();
    await stagingClient.end();
  }
}

// Run
main().catch(console.error);
