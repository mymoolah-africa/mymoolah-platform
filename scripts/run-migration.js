#!/usr/bin/env node

/**
 * Run Sequelize migrations with environment variables loaded
 * This ensures DATABASE_URL and other env vars are available
 */

require('dotenv').config();

const { execSync } = require('child_process');
const path = require('path');

// Get the migration command from args or default to migrate
const command = process.argv[2] || 'migrate';
const args = process.argv.slice(3).join(' ');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('');
  console.error('Please ensure:');
  console.error('  1. .env file exists in the project root');
  console.error('  2. DATABASE_URL is set in .env file');
  console.error('  3. In Codespaces, ensure Cloud SQL Auth Proxy is running');
  console.error('');
  process.exit(1);
}

// Check if using Cloud SQL Auth Proxy (in Codespaces)
let dbUrl;
try {
  dbUrl = new URL(process.env.DATABASE_URL);
} catch (e) {
  console.error('❌ ERROR: Invalid DATABASE_URL format');
  console.error(`   Value: ${process.env.DATABASE_URL}`);
  process.exit(1);
}

const isProxy = dbUrl.hostname === '127.0.0.1' || dbUrl.hostname === 'localhost';
const PROXY_PORT = process.env.PROXY_PORT || '6543';

// Check if we're in Codespaces (direct DB connection won't work)
const isDirectConnection = !isProxy && (dbUrl.hostname.includes('34.35.84.201') || dbUrl.hostname.includes('googleapis.com'));

if (isDirectConnection) {
  console.log('⚠️  Detected direct database connection (won\'t work in Codespaces)');
  console.log('   Attempting to use Cloud SQL Auth Proxy...');
  
  // Check if proxy is running
  const net = require('net');
  const checkProxy = () => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        resolve(false);
      });
      socket.connect(parseInt(PROXY_PORT), '127.0.0.1');
    });
  };
  
  checkProxy().then((proxyRunning) => {
    if (!proxyRunning) {
      console.error('');
      console.error('❌ Cloud SQL Auth Proxy is NOT running on port ' + PROXY_PORT);
      console.error('');
      console.error('Please start the proxy first:');
      console.error('  ./scripts/start-codespace-with-proxy.sh');
      console.error('  OR');
      console.error('  ./scripts/one-click-restart-and-start.sh');
      console.error('');
      process.exit(1);
    }
    
    // Update DATABASE_URL to use proxy
    dbUrl.hostname = '127.0.0.1';
    dbUrl.port = PROXY_PORT;
    dbUrl.searchParams.set('sslmode', 'disable');
    process.env.DATABASE_URL = dbUrl.toString();
    console.log(`✅ Updated DATABASE_URL to use proxy: ${dbUrl.hostname}:${dbUrl.port}`);
    console.log('');
    runMigration();
  });
} else {
  // In Codespaces, if using proxy but DATABASE_URL points to wrong port, fix it
  if (isProxy && dbUrl.port !== PROXY_PORT) {
    console.log(`⚠️  DATABASE_URL port (${dbUrl.port}) doesn't match proxy port (${PROXY_PORT})`);
    console.log(`   Updating DATABASE_URL to use proxy port ${PROXY_PORT}...`);
    dbUrl.port = PROXY_PORT;
    process.env.DATABASE_URL = dbUrl.toString();
  }
  runMigration();
}

function runMigration() {
  if (isProxy || dbUrl.hostname === '127.0.0.1') {
    console.log('ℹ️  Using Cloud SQL Auth Proxy connection');
    console.log(`   Host: ${dbUrl.hostname}:${dbUrl.port}`);
    console.log(`   Database: ${dbUrl.pathname.replace('/', '')}`);
  } else {
    console.log('ℹ️  Using direct database connection');
    console.log(`   Host: ${dbUrl.hostname}:${dbUrl.port}`);
  }

  console.log('');
  console.log(`🚀 Running: sequelize-cli db:${command} ${args}`);
  console.log('');

  try {
    // Run the migration with environment variables
    execSync(
      `npx sequelize-cli db:${command} ${args}`,
      {
        stdio: 'inherit',
        env: process.env,
        cwd: path.resolve(__dirname, '..')
      }
    );
    console.log('');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed');
    process.exit(1);
  }
}

