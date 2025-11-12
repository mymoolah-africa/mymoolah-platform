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

// In Codespaces, if using proxy but DATABASE_URL points to wrong port, fix it
if (isProxy && dbUrl.port !== PROXY_PORT) {
  console.log(`⚠️  DATABASE_URL port (${dbUrl.port}) doesn't match proxy port (${PROXY_PORT})`);
  console.log(`   Updating DATABASE_URL to use proxy port ${PROXY_PORT}...`);
  dbUrl.port = PROXY_PORT;
  process.env.DATABASE_URL = dbUrl.toString();
}

if (isProxy) {
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

