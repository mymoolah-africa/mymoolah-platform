#!/usr/bin/env node

/**
 * Script to safely add portal environment variables to existing .env file
 * This script preserves all existing environment variables and adds new portal-specific ones
 */

const fs = require('fs');
const path = require('path');

const envFilePath = path.join(__dirname, '..', '.env');
const backupFilePath = path.join(__dirname, '..', '.env.backup');

// Portal environment variables to add
const portalEnvVars = `
# =============================================================================
# PORTAL SYSTEM CONFIGURATION
# =============================================================================

# Portal Backend Configuration
PORTAL_BACKEND_PORT=3002
PORTAL_BACKEND_HOST=localhost
PORTAL_FRONTEND_URL=http://localhost:3001

# Portal Database Configuration (separate from main MMTP database)
PORTAL_DB_NAME=mymoolah_portal
PORTAL_DB_USER=mymoolah_app
PORTAL_DB_PASSWORD=AppPass_1755005621204_ChangeMe
PORTAL_DB_HOST=127.0.0.1
PORTAL_DB_PORT=5433

# Portal JWT Configuration
PORTAL_JWT_SECRET=710864202c1814964a1f186c6cbd94caeda079b297f3a259e63c0bb9e32d24cc059ba8e2fbcdf29df3821f417c76949a9
PORTAL_JWT_EXPIRY=24h

# Portal Admin User Configuration
ADMIN_PASSWORD=Admin@123!

# Portal Security Configuration
PORTAL_BCRYPT_ROUNDS=12
PORTAL_RATE_LIMIT_WINDOW_MS=900000
PORTAL_RATE_LIMIT_MAX_REQUESTS=1000

# Portal CORS Configuration
PORTAL_CORS_ORIGIN=http://localhost:3001
PORTAL_CORS_CREDENTIALS=true

# Portal Session Configuration
PORTAL_SESSION_SECRET=710864202c1814964a1f186c6cbd94caeda079b297f3a259e63c0bb9e32d24cc059ba8e2fbcdf29df3821f417c76949a9
PORTAL_SESSION_COOKIE_MAX_AGE=86400000
PORTAL_SESSION_COOKIE_SECURE=false
PORTAL_SESSION_COOKIE_HTTP_ONLY=true
PORTAL_SESSION_COOKIE_SAME_SITE=strict

# Portal Performance Configuration
PORTAL_MAX_REQUEST_SIZE=10mb
PORTAL_REQUEST_TIMEOUT=30000
PORTAL_KEEP_ALIVE_TIMEOUT=5000

# Portal Monitoring Configuration
PORTAL_MONITORING_ENABLED=true
PORTAL_HEALTH_CHECK_INTERVAL=30000

# Portal Logging Configuration
PORTAL_LOG_LEVEL=info
PORTAL_LOG_FILE=logs/portal.log`;

function addPortalEnvVars() {
  try {
    // Check if .env file exists
    if (!fs.existsSync(envFilePath)) {
      console.error('❌ .env file not found at:', envFilePath);
      process.exit(1);
    }

    // Read existing .env file
    const existingContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Check if portal variables already exist
    if (existingContent.includes('PORTAL_BACKEND_PORT')) {
      console.log('✅ Portal environment variables already exist in .env file');
      return;
    }

    // Create backup of existing .env file
    fs.writeFileSync(backupFilePath, existingContent);
    console.log('📋 Created backup of .env file at:', backupFilePath);

    // Find the insertion point (before the SECURITY section)
    const securitySectionIndex = existingContent.indexOf('# =============================================================================\n# SECURITY\n# =============================================================================');
    
    if (securitySectionIndex === -1) {
      // If SECURITY section not found, append at the end
      const newContent = existingContent.trim() + '\n' + portalEnvVars + '\n';
      fs.writeFileSync(envFilePath, newContent);
    } else {
      // Insert before SECURITY section
      const beforeSecurity = existingContent.substring(0, securitySectionIndex);
      const afterSecurity = existingContent.substring(securitySectionIndex);
      const newContent = beforeSecurity + portalEnvVars + '\n\n' + afterSecurity;
      fs.writeFileSync(envFilePath, newContent);
    }

    console.log('✅ Successfully added portal environment variables to .env file');
    console.log('📋 Portal configuration added:');
    console.log('   - Portal Backend: http://localhost:3002');
    console.log('   - Portal Frontend: http://localhost:3001');
    console.log('   - Portal Database: mymoolah_portal');
    console.log('   - Admin Password: Admin@123!');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Review the added variables in your .env file');
    console.log('   2. Adjust any values as needed for your environment');
    console.log('   3. Start the portal backend: cd portal/backend && npm run dev');
    console.log('   4. Start the portal frontend: cd portal/admin/frontend && npm run dev');

  } catch (error) {
    console.error('❌ Error adding portal environment variables:', error.message);
    
    // Restore backup if it exists
    if (fs.existsSync(backupFilePath)) {
      try {
        const backupContent = fs.readFileSync(backupFilePath, 'utf8');
        fs.writeFileSync(envFilePath, backupContent);
        console.log('🔄 Restored .env file from backup');
      } catch (restoreError) {
        console.error('❌ Failed to restore backup:', restoreError.message);
      }
    }
    
    process.exit(1);
  }
}

// Run the script
addPortalEnvVars();
