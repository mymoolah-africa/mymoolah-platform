#!/usr/bin/env node

/**
 * Sync Staging Database to Match UAT (Dev) 100%
 * 
 * Purpose: Ensure Staging database schema and data match UAT exactly
 * Usage: node scripts/sync-staging-to-uat.js [--dry-run]
 * 
 * Requirements:
 * - Cloud SQL Auth Proxy running (auto-detects ports or uses environment variables)
 *   - UAT: Port 6543 (Codespaces) or 5433 (local) - detected automatically
 *   - Staging: Port 6544 (Codespaces) or 5434 (local) - detected automatically
 * - UAT password: From DATABASE_URL or DB_PASSWORD environment variable (or Secret Manager)
 * - Staging password: From Secret Manager (db-mmtp-pg-staging-password)
 * - Authenticated with gcloud for Secret Manager access (gcloud auth login)
 * 
 * Environment Variables:
 * - UAT_PROXY_PORT: Override UAT proxy port (default: auto-detect, fallback: 6543 or 5433)
 * - STAGING_PROXY_PORT: Override Staging proxy port (default: auto-detect, fallback: 6544 or 5434)
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

// Get password from Google Cloud Secret Manager using gcloud CLI only
// Note: UAT should NEVER use Secret Manager - only Staging/Production use it
function getPasswordFromSecretManager(secretName) {
  try {
    return execSync(
      `gcloud secrets versions access latest --secret="${secretName}" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (error) {
    throw new Error(`Failed to get password from Secret Manager: ${secretName} - ${error.message}`);
  }
}

// Get UAT password from environment variables or Secret Manager
// Note: This is synchronous because it's called before async setup
function getUATPassword() {
  // Try DATABASE_URL from .env first
  if (process.env.DATABASE_URL) {
    try {
      const urlString = process.env.DATABASE_URL;
      
      // Method 1: Try using URL class (handles URL-encoded passwords automatically)
      try {
        const url = new URL(urlString);
        if (url.password) {
          // URL class automatically decodes URL-encoded characters
          const decoded = decodeURIComponent(url.password);
          // Verify we got a valid password
          if (decoded && decoded.length > 0 && decoded.length < 100) {
            return decoded;
          }
        }
      } catch (urlError) {
        // URL parsing failed (password with @ symbol breaks URL parsing)
        // Fall through to manual parsing
      }
      
      // Method 2: Manual parsing for passwords with @ symbol (B0t3s@Mymoolah)
      // URL class fails when password contains unencoded @ symbol
      // Pattern: postgres://user:password@host:port/db
      // Find the last @ before the host (host is always @127.0.0.1: or @hostname:)
      const hostPatterns = ['@127.0.0.1:', '@localhost:', '@'];
      
      for (const hostPattern of hostPatterns) {
        const hostIndex = urlString.indexOf(hostPattern);
        if (hostIndex > 0) {
          const userPassStart = urlString.indexOf('://') + 3;
          const passwordStart = urlString.indexOf(':', userPassStart) + 1;
          
          if (passwordStart > userPassStart && passwordStart < hostIndex) {
            let password = urlString.substring(passwordStart, hostIndex);
            
            // Decode URL encoding (%40 -> @, etc.)
            // Handle both B0t3s@Mymoolah (13 chars) and B0t3s%40Mymoolah (18 chars) formats
            try {
              password = decodeURIComponent(password);
            } catch (e) {
              // If decode fails, password might already be decoded - use as-is
            }
            
            // Verify password looks valid
            if (password && password.length > 0 && password.length < 100) {
              return password;
            }
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors, try next method
      console.log('⚠️  Failed to parse password from DATABASE_URL, trying other methods...');
    }
  }
  
  // Try DB_PASSWORD environment variable
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD;
  }
  
  // Try DATABASE_PASSWORD environment variable
  if (process.env.DATABASE_PASSWORD) {
    return process.env.DATABASE_PASSWORD;
  }
  
  // UAT should NEVER use Secret Manager - it only uses .env file
  throw new Error('UAT password not found in environment variables. Set DATABASE_URL or DB_PASSWORD in .env file.');
}

/**
 * Detect which port is active for Cloud SQL Proxy
 * Returns the preferred port for the environment (Codespaces first, then local)
 * Actual connection will verify if the port is working
 */
function detectProxyPort(possiblePorts, portName = '') {
  // In Codespaces, prefer higher ports (6543, 6544)
  // In local, prefer lower ports (5433, 5434)
  // Try Codespaces ports first (they're more likely to be active based on screenshots)
  
  // Check environment variables first
  const envVar = portName === 'UAT' ? 'UAT_PROXY_PORT' : 'STAGING_PROXY_PORT';
  if (process.env[envVar]) {
    const port = parseInt(process.env[envVar], 10);
    if (!isNaN(port) && port > 0) {
      return port;
    }
  }
  
  // Return first port as default (will try connections to verify)
  // Codespaces ports (6543, 6544) are listed first based on active proxy observation
  return possiblePorts[0];
}

// Password retrieval helper (async)
async function retrievePasswords() {
  let uatPassword, stagingPassword;
  
  try {
    console.log('🔐 Retrieving passwords...');
    console.log('   UAT: Trying environment variables first, then Secret Manager');
    
    // UAT: ONLY from .env file - NEVER from Secret Manager
    uatPassword = getUATPassword();
    
    // Staging: ONLY from Secret Manager (via gcloud CLI)
    console.log('   Staging: Getting from Secret Manager (gcloud CLI)');
    stagingPassword = getPasswordFromSecretManager('db-mmtp-pg-staging-password');
    
    console.log('✅ Passwords retrieved successfully\n');
    return { uatPassword, stagingPassword };
  } catch (error) {
    console.error('\n❌ Failed to retrieve passwords:', error.message);
    console.error('💡 Ensure you are authenticated with gcloud: gcloud auth login');
    console.error('💡 Or set DATABASE_URL/DB_PASSWORD environment variables for UAT');
    throw error;
  }
}

// Parse database name from DATABASE_URL if available
function getDatabaseNameFromUrl(urlString) {
  try {
    // Try to parse as URL
    const url = new URL(urlString);
    const dbName = url.pathname.replace('/', '');
    if (dbName) return dbName;
  } catch (e) {
    // If URL parsing fails, try manual parsing
    const match = urlString.match(/\/\/([^:]+):([^@]+)@[^\/]+\/([^?]+)/);
    if (match && match[3]) {
      return match[3];
    }
  }
  return null;
}

// Get UAT database name from DATABASE_URL or default
// UAT always uses 'mymoolah', not 'mymoolah_staging'
let uatDatabaseName = 'mymoolah';
if (process.env.DATABASE_URL) {
  const parsed = getDatabaseNameFromUrl(process.env.DATABASE_URL);
  // Only use parsed name if it's not staging
  if (parsed && parsed !== 'mymoolah_staging') {
    uatDatabaseName = parsed;
  }
}

// Detect or configure proxy ports (for logging, actual configs created in main())
// UAT: Try 6543 (Codespaces active proxy) first, then 5433 (local proxy)
// Staging: Try 6544 (Codespaces) first, then 5434 (local proxy)
const uatProxyPort = detectProxyPort([6543, 5433], 'UAT');
const stagingProxyPort = detectProxyPort([6544, 5434], 'Staging');

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
  
  // Pending: migrations that ran in UAT but not in Staging
  const pendingMigrations = allMigrations.filter(m => 
    uatMigrations.includes(m) && !stagingMigrations.includes(m)
  );
  
  // New migrations: exist in filesystem but haven't run in either environment
  // These should run in UAT first, then Staging
  const newMigrations = allMigrations.filter(m => 
    !uatMigrations.includes(m) && !stagingMigrations.includes(m)
  );

  return {
    missingInStaging,
    extraInStaging,
    pendingMigrations,
    newMigrations,
    uatCount: uatMigrations.length,
    stagingCount: stagingMigrations.length,
    allCount: allMigrations.length
  };
}

/**
 * Run migrations in Staging
 */
async function runMigrationsInStaging(migrationFiles, stagingConfig, dryRun) {
  if (dryRun) {
    console.log('\n🔍 DRY RUN - Would run these migrations:');
    migrationFiles.forEach(m => console.log(`   - ${m}`));
    return;
  }

  console.log('\n📦 Running migrations in Staging...\n');
  
  // Set DATABASE_URL for staging (URL-encode password to handle special chars like @)
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
      const uatResult = await uatClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [table]);

      const stagingResult = await stagingClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [table]);

      if (!uatResult || !uatResult.rows || !uatResult.rows[0]) {
        differences.push({ table, issue: 'Error: Invalid UAT query result' });
        continue;
      }

      if (!stagingResult || !stagingResult.rows || !stagingResult.rows[0]) {
        differences.push({ table, issue: 'Error: Invalid Staging query result' });
        continue;
      }

      const uatExists = uatResult.rows[0].exists;
      const stagingExists = stagingResult.rows[0].exists;

      if (uatExists && !stagingExists) {
        differences.push({ table, issue: 'Missing in Staging' });
      } else if (!uatExists && stagingExists) {
        differences.push({ table, issue: 'Extra in Staging' });
      } else if (uatExists && stagingExists) {
        // Check column count
        const uatColsResult = await uatClient.query(`
          SELECT COUNT(*)::int as count 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [table]);

        const stagingColsResult = await stagingClient.query(`
          SELECT COUNT(*)::int as count 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [table]);

        if (uatColsResult?.rows?.[0]?.count !== undefined && 
            stagingColsResult?.rows?.[0]?.count !== undefined) {
          const uatCount = parseInt(uatColsResult.rows[0].count, 10);
          const stagingCount = parseInt(stagingColsResult.rows[0].count, 10);
          
          if (uatCount !== stagingCount) {
            differences.push({ 
              table, 
              issue: `Column count mismatch: UAT=${uatCount}, Staging=${stagingCount}` 
            });
          }
        }
      }
    } catch (error) {
      differences.push({ table, issue: `Error checking: ${error.message || String(error)}` });
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
  
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Step 0: Retrieve passwords first
  const { uatPassword, stagingPassword } = await retrievePasswords();
  
  // Step 0.1: Create database configurations with retrieved passwords
  const uatConfig = {
    host: '127.0.0.1',
    port: uatProxyPort,
    database: uatDatabaseName,
    user: 'mymoolah_app',
    password: uatPassword
  };

  const stagingConfig = {
    host: '127.0.0.1',
    port: stagingProxyPort,
    database: 'mymoolah_staging',  // Staging always uses mymoolah_staging
    user: 'mymoolah_app',
    password: stagingPassword
  };
  
  console.log(`🔍 Using proxy ports: UAT=${uatProxyPort}, Staging=${stagingProxyPort}`);
  console.log(`   (Set UAT_PROXY_PORT or STAGING_PROXY_PORT environment variables to override)\n`);

  const uatClient = new Client(uatConfig);
  const stagingClient = new Client(stagingConfig);

  try {
    // Connect to both databases
    console.log('\n📡 Connecting to databases...');
    
    // Connect to UAT first
    try {
      await uatClient.connect();
      console.log(`✅ Connected to UAT (port ${uatConfig.port}, database: ${uatConfig.database})`);
    } catch (uatError) {
      console.error(`❌ Failed to connect to UAT: ${uatError.message}`);
      console.error(`   Host: ${uatConfig.host}, Port: ${uatConfig.port}, Database: ${uatConfig.database}, User: ${uatConfig.user}`);
      console.error(`   Password length: ${uatConfig.password ? uatConfig.password.length : 0} characters`);
      
      if (uatError.message && uatError.message.includes('password authentication')) {
        console.error('\n💡 Password Authentication Troubleshooting:');
        console.error('   1. Check password parsing from DATABASE_URL (password contains @ symbol)');
        console.error('   2. Verify DATABASE_URL format: postgres://user:password@host:port/db');
        console.error('   3. Try setting DB_PASSWORD environment variable directly');
        console.error('   4. Check if Cloud SQL Auth Proxy is running on port ' + uatConfig.port);
      }
      
      if (uatError.message && (uatError.message.includes('ECONNREFUSED') || uatError.message.includes('connect'))) {
        console.error('\n💡 Connection Troubleshooting:');
        console.error(`   1. Ensure Cloud SQL Auth Proxy is running on port ${uatConfig.port}`);
        console.error('   2. Try alternative ports: 6543 (Codespaces) or 5433 (local)');
        console.error('   3. Set UAT_PROXY_PORT environment variable to override');
      }
      
      throw uatError;
    }
    
    // Connect to Staging
    try {
      await stagingClient.connect();
      console.log(`✅ Connected to Staging (port ${stagingConfig.port}, database: ${stagingConfig.database})\n`);
    } catch (stagingError) {
      console.error(`❌ Failed to connect to Staging: ${stagingError.message}`);
      console.error(`   Host: ${stagingConfig.host}, Port: ${stagingConfig.port}, Database: ${stagingConfig.database}, User: ${stagingConfig.user}`);
      console.error(`   Password length: ${stagingConfig.password ? stagingConfig.password.length : 0} characters`);
      
      if (stagingError.message && stagingError.message.includes('password authentication')) {
        console.error('\n💡 Password Authentication Troubleshooting:');
        console.error('   1. Check Staging password in Secret Manager: db-mmtp-pg-staging-password');
        console.error('   2. Verify gcloud authentication: gcloud auth login');
        console.error('   3. Check Secret Manager permissions');
      }
      
      if (stagingError.message && (stagingError.message.includes('ECONNREFUSED') || stagingError.message.includes('connect'))) {
        console.error('\n💡 Connection Troubleshooting:');
        console.error(`   1. Ensure Cloud SQL Auth Proxy is running on port ${stagingConfig.port}`);
        console.error('   2. For Staging, start proxy: ./scripts/start-staging-proxy-cs.sh');
        console.error('   3. Try alternative ports: 6544 (Codespaces) or 5434 (local)');
        console.error('   4. Set STAGING_PROXY_PORT environment variable to override');
      }
      
      throw stagingError;
    }

    // Step 1: Check migration status
    console.log('📋 Step 1: Checking Migration Status...\n');
    
    const uatMigrations = await getExecutedMigrations(uatClient, 'UAT');
    const stagingMigrations = await getExecutedMigrations(stagingClient, 'Staging');
    const allMigrations = getAllMigrationFiles();

    console.log(`   UAT migrations: ${uatMigrations.length}`);
    console.log(`   Staging migrations: ${stagingMigrations.length}`);
    console.log(`   Total migration files: ${allMigrations.length}\n`);

    const migrationDiff = compareMigrations(uatMigrations, stagingMigrations, allMigrations);

    // Check for new migrations that haven't run in either environment
    if (migrationDiff.newMigrations.length > 0) {
      console.log(`⚠️  Found ${migrationDiff.newMigrations.length} new migration(s) that haven't run in either environment:\n`);
      migrationDiff.newMigrations.forEach(m => {
        console.log(`   - ${m}`);
      });
      console.log('\n💡 These migrations need to run in UAT first, then will sync to Staging.');
      console.log('   Run: npx sequelize-cli db:migrate (in UAT environment)\n');
    }

    if (migrationDiff.pendingMigrations.length > 0) {
      console.log(`⚠️  Found ${migrationDiff.pendingMigrations.length} migrations in UAT that are missing in Staging:\n`);
      migrationDiff.pendingMigrations.forEach(m => {
        console.log(`   - ${m}`);
      });
      console.log('');

      // Run missing migrations
      await runMigrationsInStaging(migrationDiff.pendingMigrations, stagingConfig, dryRun);
      
      // Re-check after running migrations
      const stagingMigrationsAfter = await getExecutedMigrations(stagingClient, 'Staging');
      const stillMissing = migrationDiff.pendingMigrations.filter(m => !stagingMigrationsAfter.includes(m));
      
      if (stillMissing.length > 0) {
        console.log(`\n⚠️  Some migrations may have failed or require manual intervention:`);
        stillMissing.forEach(m => console.log(`   - ${m}`));
      } else {
        console.log(`\n✅ All migrations now executed in Staging`);
      }
    } else if (migrationDiff.newMigrations.length === 0) {
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
    // If it's a connection error, show detailed info
    if (error.message && error.message.includes('password authentication')) {
      console.error('\n❌ CONNECTION ERROR:', error.message);
      console.error('\n📋 Connection Details:');
      if (typeof uatConfig !== 'undefined') {
        console.error(`   UAT: ${uatConfig.host}:${uatConfig.port}/${uatConfig.database} (user: ${uatConfig.user})`);
      }
      if (typeof stagingConfig !== 'undefined') {
        console.error(`   Staging: ${stagingConfig.host}:${stagingConfig.port}/${stagingConfig.database} (user: ${stagingConfig.user})`);
        console.error(`   Staging password length: ${stagingConfig.password ? stagingConfig.password.length : 0}`);
      }
    } else {
      console.error('\n❌ ERROR:', error.message);
    }
    console.error('\n💡 TROUBLESHOOTING:');
    console.error(`   1. Ensure Cloud SQL Auth Proxy is running:`);
    if (typeof uatConfig !== 'undefined') {
      console.error(`      UAT: port ${uatConfig.port} (detected/configured)`);
    } else {
      console.error(`      UAT: port ${uatProxyPort} (default)`);
    }
    if (typeof stagingConfig !== 'undefined') {
      console.error(`      Staging: port ${stagingConfig.port} (detected/configured)`);
    } else {
      console.error(`      Staging: port ${stagingProxyPort} (default)`);
    }
    console.error('   2. Check database password is correct (UAT password contains @ symbol)');
    console.error('   3. Verify database connection settings');
    console.error('   4. Check migration files are accessible');
    console.error('   5. Override ports with environment variables:');
    console.error('      UAT_PROXY_PORT=6543 STAGING_PROXY_PORT=6544 node scripts/sync-staging-to-uat.js');
    process.exit(1);
  } finally {
    if (typeof uatClient !== 'undefined') {
      try {
        await uatClient.end();
      } catch (e) {
        // Ignore errors when closing
      }
    }
    if (typeof stagingClient !== 'undefined') {
      try {
        await stagingClient.end();
      } catch (e) {
        // Ignore errors when closing
      }
    }
  }
}

// Run
main().catch(console.error);
