#!/usr/bin/env node

/**
 * Script to update portal database configuration to use existing mymoolah database
 */

const fs = require('fs');
const path = require('path');

const envFilePath = path.join(__dirname, '..', '.env');

function updatePortalDbConfig() {
  try {
    // Read existing .env file
    const existingContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Update portal database configuration to use existing mymoolah database
    const updatedContent = existingContent
      .replace(/PORTAL_DB_NAME=mymoolah_portal/g, 'PORTAL_DB_NAME=mymoolah')
      .replace(/PORTAL_DB_HOST=127\.0\.0\.1/g, 'PORTAL_DB_HOST=127.0.0.1')
      .replace(/PORTAL_DB_PORT=5433/g, 'PORTAL_DB_PORT=5433');
    
    // Write updated content
    fs.writeFileSync(envFilePath, updatedContent);
    
    console.log('✅ Updated portal database configuration:');
    console.log('   - Database: mymoolah (existing database)');
    console.log('   - Host: 127.0.0.1:5433 (local proxy to Google Cloud)');
    console.log('   - Portal tables will be added to existing database');
    console.log('');
    console.log('📋 Portal will use the same database as MMTP with additional tables:');
    console.log('   - portal_users');
    console.log('   - dual_role_floats');
    console.log('   - portal_sessions');
    console.log('   - portal_audit_logs');

  } catch (error) {
    console.error('❌ Error updating portal database configuration:', error.message);
    process.exit(1);
  }
}

// Run the script
updatePortalDbConfig();
