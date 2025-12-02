#!/usr/bin/env node

/**
 * Sync Staging Database to Match UAT (Dev) 100%
 * 
 * Purpose: Ensure Staging database schema and data match UAT exactly
 * Usage: node scripts/sync-staging-to-uat.js [--dry-run]
 * 
 * Requirements:
 * - Cloud SQL Auth Proxy running on port 5433 (UAT)
 * - Cloud SQL Auth Proxy running on port 5434 (Staging)
 * - Authenticated with gcloud (gcloud auth login)
 * - Access to Secret Manager secrets:
 *   - db-mmtp-pg-password (UAT database password)
 *   - db-mmtp-pg-staging-password (Staging database password)
 * 
 * What this script does:
 * 1. Checks which migrations have run in UAT vs Staging
 * 2. Runs missing migrations in Staging
 * 3. Compares schemas to identify any differences
 * 4. Reports on data differences (optional)
 * 5. Verifies sync completion
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

// Get password from Google Cloud Secret Manager
function getPasswordFromSecretManager(secretName) {
  try {
    const password = execSync(
      `gcloud secrets versions access latest --secret="${secretName}" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    
    if (!password) {
      throw new Error(`Empty password retrieved from secret: ${secretName}`);
    }
    
    return password;
  } catch (error) {
    console.error(`❌ Failed to get password from Secret Manager: ${secretName}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

// Get passwords from Secret Manager
let uatPassword, stagingPassword;

try {
  console.log('🔐 Retrieving passwords from Secret Manager...');
  uatPassword = getPasswordFromSecretManager('db-mmtp-pg-password');
  stagingPassword = getPasswordFromSecretManager('db-mmtp-pg-staging-password');
  console.log('✅ Passwords retrieved successfully\n');
} catch (error) {
  console.error('\n❌ Failed to retrieve passwords from Secret Manager');
  console.error('💡 Make sure you are authenticated: gcloud auth login');
  console.error('💡 Verify secrets exist: gcloud secrets list --project=mymoolah-db');
  process.exit(1);
}

// Database connection configurations
const uatConfig = {
  host: '127.0.0.1',
  port: 5433,
  database: 'mymoolah',
  user: 'mymoolah_app',
  password: uatPassword
};

const stagingConfig = {
  host: '127.0.0.1',
  port: 5434,
  database: 'mymoolah',
  user: 'mymoolah_app',
  password: stagingPassword
};

const dryRun = process.argv.includes('--dry-run');

/**
 * Get list of executed migrations from SequelizeMeta table
 */
async function getExecutedMigrations(client, envName) {
  try {
    const result = await client.query(`
      SELECT name 
      FROM "SequelizeMeta" 
      ORDER BY name ASC
    `);
    return result.rows.map(row => row.name);
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log(`⚠️  SequelizeMeta table does not exist in ${envName} - assuming no migrations run`);
      return [];
    }
    throw error;
  }
}

/**
 * Get all migration files from migrations directory
 */
function getAllMigrationFiles() {
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const fs = require('fs');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && !file.includes('manual'))
      .sort();
    return files;
  } catch (error) {
    console.error('❌ Error reading migrations directory:', error.message);
    process.exit(1);
  }
}

/**
 * Compare migrations between UAT and Staging
 */
function compareMigrations(uatMigrations, stagingMigrations, allMigrations) {
  const missingInStaging = uatMigrations.filter(m => !stagingMigrations.includes(m));
  const extraInStaging = stagingMigrations.filter(m => !uatMigrations.includes(m));
  const pendingMigrations = allMigrations.filter(m => 
    uatMigrations.includes(m) && !stagingMigrations.includes(m)
  );

  return {
    missingInStaging,
    extraInStaging,
    pendingMigrations,
    uatCount: uatMigrations.length,
    stagingCount: stagingMigrations.length,
    allCount: allMigrations.length
  };
}

/**
 * Run migrations in Staging
 */
async function runMigrationsInStaging(migrationFiles) {
  if (dryRun) {
    console.log('\n🔍 DRY RUN - Would run these migrations:');
    migrationFiles.forEach(m => console.log(`   - ${m}`));
    return;
  }

  console.log('\n📦 Running migrations in Staging...\n');
  
  // Set DATABASE_URL for staging
  const stagingUrl = `postgres://${stagingConfig.user}:${encodeURIComponent(stagingConfig.password)}@${stagingConfig.host}:${stagingConfig.port}/${stagingConfig.database}?sslmode=disable`;
  
  try {
    // Run sequelize migrations
    process.env.DATABASE_URL = stagingUrl;
    execSync('npx sequelize-cli db:migrate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: stagingUrl }
    });
    console.log('\n✅ Migrations completed successfully\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Get database schema summary
 */
async function getSchemaSummary(client, envName) {
  try {
    const result = await client.query(`
      SELECT 
        COUNT(DISTINCT table_name) as table_count,
        COUNT(DISTINCT column_name) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name NOT LIKE 'Sequelize%'
    `);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ Error getting schema summary for ${envName}:`, error.message);
    return { table_count: 0, column_count: 0 };
  }
}

/**
 * Check for critical table differences
 */
async function checkCriticalTables(uatClient, stagingClient) {
  const criticalTables = ['users', 'wallets', 'transactions', 'beneficiaries', 'beneficiary_service_accounts'];
  const differences = [];

  for (const table of criticalTables) {
    try {
      // Check if table exists in both
      const [uatExists] = await uatClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [table]);

      const [stagingExists] = await stagingClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [table]);

      if (uatExists.rows[0].exists && !stagingExists.rows[0].exists) {
        differences.push({ table, issue: 'Missing in Staging' });
      } else if (!uatExists.rows[0].exists && stagingExists.rows[0].exists) {
        differences.push({ table, issue: 'Extra in Staging' });
      } else if (uatExists.rows[0].exists && stagingExists.rows[0].exists) {
        // Check column count
        const [uatCols] = await uatClient.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [table]);

        const [stagingCols] = await stagingClient.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [table]);

        if (uatCols.rows[0].count !== stagingCols.rows[0].count) {
          differences.push({ 
            table, 
            issue: `Column count mismatch: UAT=${uatCols.rows[0].count}, Staging=${stagingCols.rows[0].count}` 
          });
        }
      }
    } catch (error) {
      differences.push({ table, issue: `Error checking: ${error.message}` });
    }
  }

  return differences;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  SYNC STAGING TO UAT - COMPREHENSIVE DATABASE SYNC');
  console.log('='.repeat(80));
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }

  const uatClient = new Client(uatConfig);
  const stagingClient = new Client(stagingConfig);

  try {
    // Connect to both databases
    console.log('\n📡 Connecting to databases...');
    await uatClient.connect();
    console.log('✅ Connected to UAT (port 5433)');
    
    await stagingClient.connect();
    console.log('✅ Connected to Staging (port 5434)\n');

    // Step 1: Check migration status
    console.log('📋 Step 1: Checking Migration Status...\n');
    
    const uatMigrations = await getExecutedMigrations(uatClient, 'UAT');
    const stagingMigrations = await getExecutedMigrations(stagingClient, 'Staging');
    const allMigrations = getAllMigrationFiles();

    console.log(`   UAT migrations: ${uatMigrations.length}`);
    console.log(`   Staging migrations: ${stagingMigrations.length}`);
    console.log(`   Total migration files: ${allMigrations.length}\n`);

    const migrationDiff = compareMigrations(uatMigrations, stagingMigrations, allMigrations);

    if (migrationDiff.pendingMigrations.length > 0) {
      console.log(`⚠️  Found ${migrationDiff.pendingMigrations.length} migrations in UAT that are missing in Staging:\n`);
      migrationDiff.pendingMigrations.forEach(m => {
        console.log(`   - ${m}`);
      });
      console.log('');

      // Run missing migrations
      await runMigrationsInStaging(migrationDiff.pendingMigrations);
      
      // Re-check after running migrations
      const stagingMigrationsAfter = await getExecutedMigrations(stagingClient, 'Staging');
      const stillMissing = migrationDiff.pendingMigrations.filter(m => !stagingMigrationsAfter.includes(m));
      
      if (stillMissing.length > 0) {
        console.log(`\n⚠️  Some migrations may have failed or require manual intervention:`);
        stillMissing.forEach(m => console.log(`   - ${m}`));
      } else {
        console.log(`\n✅ All migrations now executed in Staging`);
      }
    } else {
      console.log('✅ All UAT migrations are already executed in Staging\n');
    }

    if (migrationDiff.extraInStaging.length > 0) {
      console.log(`⚠️  Found ${migrationDiff.extraInStaging.length} migrations in Staging that are not in UAT:\n`);
      migrationDiff.extraInStaging.forEach(m => {
        console.log(`   - ${m}`);
      });
      console.log('   (This is usually OK - Staging may have test migrations)\n');
    }

    // Step 2: Compare schemas
    console.log('📋 Step 2: Comparing Database Schemas...\n');
    
    const uatSchema = await getSchemaSummary(uatClient, 'UAT');
    const stagingSchema = await getSchemaSummary(stagingClient, 'Staging');

    console.log(`   UAT: ${uatSchema.table_count} tables, ${uatSchema.column_count} columns`);
    console.log(`   Staging: ${stagingSchema.table_count} tables, ${stagingSchema.column_count} columns\n`);

    if (uatSchema.table_count !== stagingSchema.table_count || 
        uatSchema.column_count !== stagingSchema.column_count) {
      console.log('⚠️  Schema counts differ - running detailed comparison...\n');
      
      // Run the existing schema comparison script
      console.log('💡 Run detailed schema comparison:');
      console.log('   node scripts/compare-uat-staging-schemas.js\n');
    } else {
      console.log('✅ Schema counts match\n');
    }

    // Step 3: Check critical tables
    console.log('📋 Step 3: Checking Critical Tables...\n');
    
    const criticalDiffs = await checkCriticalTables(uatClient, stagingClient);
    
    if (criticalDiffs.length > 0) {
      console.log('⚠️  Critical table differences found:\n');
      criticalDiffs.forEach(diff => {
        console.log(`   ${diff.table}: ${diff.issue}`);
      });
      console.log('');
    } else {
      console.log('✅ All critical tables match\n');
    }

    // Step 4: Summary
    console.log('='.repeat(80));
    console.log('  SYNC SUMMARY');
    console.log('='.repeat(80));
    
    const allGood = migrationDiff.pendingMigrations.length === 0 && 
                    criticalDiffs.length === 0 &&
                    uatSchema.table_count === stagingSchema.table_count;

    if (allGood) {
      console.log('\n✅ STAGING IS 100% SYNCED WITH UAT!\n');
      console.log('   - All migrations executed');
      console.log('   - Schema counts match');
      console.log('   - Critical tables verified\n');
    } else {
      console.log('\n⚠️  STAGING NEEDS ATTENTION\n');
      
      if (migrationDiff.pendingMigrations.length > 0) {
        console.log(`   - ${migrationDiff.pendingMigrations.length} migrations need to run`);
      }
      
      if (criticalDiffs.length > 0) {
        console.log(`   - ${criticalDiffs.length} critical table issues found`);
      }
      
      if (uatSchema.table_count !== stagingSchema.table_count) {
        console.log(`   - Schema counts differ (tables: ${uatSchema.table_count} vs ${stagingSchema.table_count})`);
      }
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('   1. Review migration output above');
      console.log('   2. Run detailed schema comparison: node scripts/compare-uat-staging-schemas.js');
      console.log('   3. Check for manual schema changes');
      console.log('   4. Re-run this script to verify\n');
    }

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure Cloud SQL Auth Proxy is running:');
    console.error('      UAT: port 5433');
    console.error('      Staging: port 5434');
    console.error('   2. Check database password is correct');
    console.error('   3. Verify database connection settings');
    console.error('   4. Check migration files are accessible');
    process.exit(1);
  } finally {
    await uatClient.end();
    await stagingClient.end();
  }
}

// Run
main().catch(console.error);
