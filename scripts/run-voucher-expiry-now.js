#!/usr/bin/env node

/**
 * Run voucher expiry handler immediately
 * Processes all expired vouchers and refunds them
 */

require('dotenv').config();

// Check if Cloud SQL Auth Proxy is running (Codespaces)
// If proxy is running on port 6543, override DATABASE_URL to use it
const { execSync } = require('child_process');

let useProxy = false;
let proxyRunning = false;

// Check if proxy is running on port 6543
try {
  // Check if port 6543 is listening
  try {
    execSync('nc -z 127.0.0.1 6543 2>/dev/null || true', { stdio: 'ignore' });
    // Alternative check: look for proxy process
    try {
      const proxyPids = execSync('pgrep -f "cloud-sql-proxy.*6543" 2>/dev/null || true', { encoding: 'utf8' }).trim();
      proxyRunning = proxyPids.length > 0;
    } catch (e) {
      // pgrep not available or no matches - try netstat
      try {
        const netstat = execSync('netstat -an 2>/dev/null | grep 6543 || true', { encoding: 'utf8' }).trim();
        proxyRunning = netstat.length > 0;
      } catch (e2) {
        // Fallback: assume proxy might be running if we're in Codespaces
        proxyRunning = process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACE;
      }
    }
  } catch (e) {
    // nc not available
  }
  
  // If proxy is running, override DATABASE_URL to use it
  if (proxyRunning && process.env.DATABASE_URL) {
    try {
      const originalUrl = new URL(process.env.DATABASE_URL);
      originalUrl.hostname = '127.0.0.1';
      originalUrl.port = '6543';
      originalUrl.searchParams.set('sslmode', 'disable');
      process.env.DATABASE_URL = originalUrl.toString();
      useProxy = true;
      console.log('ℹ️  Cloud SQL Auth Proxy detected - using proxy connection (127.0.0.1:6543)\n');
    } catch (urlError) {
      console.log('⚠️  Could not parse DATABASE_URL, using as-is\n');
    }
  }
} catch (error) {
  // Ignore errors in proxy detection
}

const { sequelize } = require('../models');
const { handleExpiredVouchers } = require('../controllers/voucherController');

async function runExpiryHandler() {
  try {
    console.log('🔄 Running voucher expiry handler...\n');
    
    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established\n');
    } catch (dbErr) {
      console.error('❌ Database connection failed:', dbErr.message);
      if (isCodespaces) {
        console.error('\n💡 Make sure Cloud SQL Auth Proxy is running:');
        console.error('   ./scripts/one-click-restart-and-start.sh\n');
      } else {
        console.error('\n💡 Make sure your local database is running and DATABASE_URL is correct\n');
      }
      process.exit(1);
    }
    
    // Run the expiry handler
    await handleExpiredVouchers();
    
    console.log('\n✅ Voucher expiry handler completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running expiry handler:', error);
    process.exit(1);
  }
}

// Run it
runExpiryHandler();

