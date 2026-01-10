#!/usr/bin/env node

/**
 * Compare Database Schemas: UAT vs Staging
 * Uses db-connection-helper.js for proper credential management
 * 
 * Usage: node scripts/compare-schemas-with-helper.js
 */

const { getUATClient, getStagingClient, closeAll } = require('./db-connection-helper');

/**
 * Get all tables and their columns from a database
 */
async function getDatabaseSchema(client, envName) {
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
  console.log('='.repeat(80));

  console.log('\n📊 SUMMARY:');
  console.log(`   Tables only in UAT: ${differences.tablesOnlyInUat.length}`);
  console.log(`   Tables only in Staging: ${differences.tablesOnlyInStaging.length}`);
  console.log(`   Tables with differences: ${differences.columnDifferences.length}`);
  console.log(`   Identical tables: ${differences.identical.length}`);

  if (differences.tablesOnlyInUat.length > 0) {
    console.log('\n⚠️  TABLES ONLY IN UAT:');
    differences.tablesOnlyInUat.forEach(table => {
      console.log(`   - ${table}`);
    });
  }

  if (differences.tablesOnlyInStaging.length > 0) {
    console.log('\n⚠️  TABLES ONLY IN STAGING:');
    differences.tablesOnlyInStaging.forEach(table => {
      console.log(`   - ${table}`);
    });
  }

  if (differences.columnDifferences.length > 0) {
    console.log('\n⚠️  TABLES WITH COLUMN DIFFERENCES:');
    differences.columnDifferences.forEach(tableDiff => {
      console.log(`\n   📋 Table: ${tableDiff.table}`);
      
      if (tableDiff.columnsOnlyInUat.length > 0) {
        console.log('      Columns only in UAT:');
        tableDiff.columnsOnlyInUat.forEach(col => {
          console.log(`        - ${col}`);
        });
      }
      
      if (tableDiff.columnsOnlyInStaging.length > 0) {
        console.log('      Columns only in Staging:');
        tableDiff.columnsOnlyInStaging.forEach(col => {
          console.log(`        - ${col}`);
        });
      }
      
      if (tableDiff.columnTypeDifferences.length > 0) {
        console.log('      Column type differences:');
        tableDiff.columnTypeDifferences.forEach(diff => {
          console.log(`        - ${diff.column}:`);
          console.log(`          UAT: ${diff.uat.type} (${diff.uat.nullable})`);
          console.log(`          Staging: ${diff.staging.type} (${diff.staging.nullable})`);
        });
      }
    });
  }

  if (differences.tablesOnlyInUat.length === 0 &&
      differences.tablesOnlyInStaging.length === 0 &&
      differences.columnDifferences.length === 0) {
    console.log('\n✅ SCHEMAS ARE IDENTICAL - No differences found!');
  } else {
    console.log('\n⚠️  SCHEMA DIFFERENCES FOUND - Review above for details');
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 Starting Database Schema Comparison (Using db-connection-helper)...\n');

  let uatClient, stagingClient;

  try {
    // Connect to UAT
    console.log('📡 Connecting to UAT database...');
    uatClient = await getUATClient();
    console.log('✅ Connected to UAT\n');

    // Connect to Staging
    console.log('📡 Connecting to Staging database...');
    stagingClient = await getStagingClient();
    console.log('✅ Connected to Staging\n');

    // Get schemas
    console.log('📊 Fetching UAT schema...');
    const uatSchema = await getDatabaseSchema(uatClient, 'UAT');
    console.log(`✅ Found ${Object.keys(uatSchema).length} tables in UAT\n`);

    console.log('📊 Fetching Staging schema...');
    const stagingSchema = await getDatabaseSchema(stagingClient, 'Staging');
    console.log(`✅ Found ${Object.keys(stagingSchema).length} tables in Staging\n`);

    // Compare schemas
    console.log('🔄 Comparing schemas...');
    const differences = compareSchemas(uatSchema, stagingSchema);
    console.log('✅ Comparison complete');

    // Print results
    printResults(differences);

    // Exit with appropriate code
    const hasErrors = differences.tablesOnlyInUat.length > 0 ||
                     differences.tablesOnlyInStaging.length > 0 ||
                     differences.columnDifferences.length > 0;

    process.exit(hasErrors ? 1 : 0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure Cloud SQL Auth Proxy is running:');
    console.error('      ./scripts/ensure-proxies-running.sh');
    console.error('   2. Check database credentials are correct');
    console.error('   3. Verify database connection settings');
    process.exit(1);
  } finally {
    // Release clients
    if (uatClient) uatClient.release();
    if (stagingClient) stagingClient.release();
    await closeAll();
  }
}

// Run
main().catch(console.error);
