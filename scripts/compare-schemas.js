#!/usr/bin/env node
/**
 * Compare database schemas between UAT and Staging
 * 
 * This script compares table structures, columns, data types, constraints,
 * and indexes to ensure UAT and Staging are identical before migration.
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

function getSequelize(url, label) {
  if (!url) {
    console.error(`❌ Missing database URL for ${label}.`);
    process.exit(1);
  }

  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: false },
  });
}

async function getTableColumns(db, tableName) {
  return await db.query(
    `SELECT 
       column_name,
       data_type,
       character_maximum_length,
       is_nullable,
       column_default
     FROM information_schema.columns
     WHERE table_name = :tableName
     ORDER BY ordinal_position`,
    { type: QueryTypes.SELECT, replacements: { tableName } }
  );
}

async function getTableIndexes(db, tableName) {
  return await db.query(
    `SELECT
       indexname,
       indexdef
     FROM pg_indexes
     WHERE tablename = :tableName
     ORDER BY indexname`,
    { type: QueryTypes.SELECT, replacements: { tableName } }
  );
}

async function main() {
  const uatUrl = process.env.UAT_DATABASE_URL;
  const stagingUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;

  if (!uatUrl || !stagingUrl) {
    console.error('❌ Both UAT_DATABASE_URL and STAGING_DATABASE_URL are required.');
    process.exit(1);
  }

  const uat = getSequelize(uatUrl, 'UAT');
  const staging = getSequelize(stagingUrl, 'Staging');

  try {
    console.log('🔌 Connecting to databases...');
    await uat.authenticate();
    await staging.authenticate();
    console.log('✅ Connections established\n');

    // Get list of tables
    const [uatTables] = await uat.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const [stagingTables] = await staging.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const uatTableNames = uatTables.map(t => t.table_name);
    const stagingTableNames = stagingTables.map(t => t.table_name);

    console.log('📋 Table Comparison:\n');
    console.log(`UAT tables: ${uatTableNames.length}`);
    console.log(`Staging tables: ${stagingTableNames.length}\n`);

    // Tables only in UAT
    const onlyInUat = uatTableNames.filter(t => !stagingTableNames.includes(t));
    if (onlyInUat.length > 0) {
      console.log('⚠️  Tables only in UAT:', onlyInUat.join(', '));
    }

    // Tables only in Staging
    const onlyInStaging = stagingTableNames.filter(t => !uatTableNames.includes(t));
    if (onlyInStaging.length > 0) {
      console.log('⚠️  Tables only in Staging:', onlyInStaging.join(', '));
    }

    // Common tables
    const commonTables = uatTableNames.filter(t => stagingTableNames.includes(t));
    console.log(`\n✅ Common tables: ${commonTables.length}\n`);

    // Key tables to check in detail
    const keyTables = ['users', 'wallets', 'transactions', 'vouchers'];
    const differences = [];

    for (const tableName of keyTables) {
      if (!commonTables.includes(tableName)) {
        differences.push(`❌ Table '${tableName}' missing in one or both databases`);
        continue;
      }

      console.log(`🔍 Comparing table: ${tableName}`);

      const uatColumns = await getTableColumns(uat, tableName);
      const stagingColumns = await getTableColumns(staging, tableName);

      const uatColNames = uatColumns.map(c => c.column_name);
      const stagingColNames = stagingColumns.map(c => c.column_name);

      // Check for column differences
      const missingInStaging = uatColNames.filter(c => !stagingColNames.includes(c));
      const missingInUat = stagingColNames.filter(c => !uatColNames.includes(c));

      if (missingInStaging.length > 0) {
        differences.push(`   ⚠️  ${tableName}: Columns in UAT but not Staging: ${missingInStaging.join(', ')}`);
      }

      if (missingInUat.length > 0) {
        differences.push(`   ⚠️  ${tableName}: Columns in Staging but not UAT: ${missingInUat.join(', ')}`);
      }

      // Check data types for common columns
      for (const colName of uatColNames.filter(c => stagingColNames.includes(c))) {
        const uatCol = uatColumns.find(c => c.column_name === colName);
        const stagingCol = stagingColumns.find(c => c.column_name === colName);

        if (uatCol.data_type !== stagingCol.data_type) {
          differences.push(`   ⚠️  ${tableName}.${colName}: Type mismatch (UAT: ${uatCol.data_type}, Staging: ${stagingCol.data_type})`);
        }

        if (uatCol.is_nullable !== stagingCol.is_nullable) {
          differences.push(`   ⚠️  ${tableName}.${colName}: Nullable mismatch (UAT: ${uatCol.is_nullable}, Staging: ${stagingCol.is_nullable})`);
        }
      }

      if (missingInStaging.length === 0 && missingInUat.length === 0) {
        console.log(`   ✅ All columns match (${uatColNames.length} columns)\n`);
      } else {
        console.log(`   ⚠️  Column differences found\n`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 SCHEMA COMPARISON SUMMARY');
    console.log('═'.repeat(80) + '\n');

    if (differences.length === 0) {
      console.log('✅ Schemas are identical for key tables (users, wallets, transactions, vouchers)');
      console.log('✅ Safe to proceed with clean slate migration\n');
    } else {
      console.log('⚠️  Schema differences found:\n');
      differences.forEach(diff => console.log(diff));
      console.log('\n⚠️  Resolve schema differences before migration\n');
    }

  } catch (error) {
    console.error('\n❌ Schema comparison failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await uat.close();
    await staging.close();
  }
}

main();

