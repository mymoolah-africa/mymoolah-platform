#!/bin/bash

##############################################################################
# Test Using EXACT Working Method from test-staging-transactions.js
# 
# This replicates the working script's method:
# 1. Get password from Secret Manager
# 2. URL encode it
# 3. Use Sequelize with DATABASE_URL
##############################################################################

echo "🧪 Testing with EXACT Working Method"
echo "====================================="
echo ""
echo "This replicates the method from test-staging-transactions.js"
echo ""

# Wait longer for password propagation
echo "⏰ Waiting 90 seconds for Cloud SQL password to fully propagate..."
sleep 90
echo ""

# Check proxy
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo "❌ Staging proxy NOT running on port 6544"
  exit 1
fi
echo "✅ Staging proxy running on port 6544"
echo ""

# Get password from Secret Manager (same as working script)
echo "Step 1: Getting password from Secret Manager..."
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" 2>/dev/null | tr -d '\n\r' || echo "")

if [ -z "$PASSWORD" ]; then
  echo "❌ Failed to get password from Secret Manager"
  exit 1
fi

echo "✅ Password retrieved (length: ${#PASSWORD} characters)"
echo "   First 10 chars: ${PASSWORD:0:10}..."
echo ""

# Create test script using Node.js (same method as working script)
cat > /tmp/test-working-method.js << 'TESTSCRIPT'
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

// Get password exactly like working script
let dbPassword;
try {
  dbPassword = execSync(
    'gcloud secrets versions access latest --secret=db-mmtp-pg-staging-password --project=mymoolah-db',
    { encoding: 'utf8' }
  ).trim();
  console.log(`✅ Password retrieved (length: ${dbPassword.length} characters)`);
} catch (error) {
  console.error('❌ Failed to get database password:', error.message);
  process.exit(1);
}

// URL encode password - EXACT same as working script
const encodedPassword = encodeURIComponent(dbPassword);
const DATABASE_URL = `postgres://mymoolah_app:${encodedPassword}@127.0.0.1:6544/mymoolah_staging?sslmode=disable`;

console.log(`📋 Using DATABASE_URL (password URL-encoded)`);
console.log(`   Database: mymoolah_staging`);
console.log(`   Port: 6544`);
console.log(`   Password encoded: ${encodedPassword.substring(0, 15)}...`);
console.log('');

// Use Sequelize - EXACT same as working script
const sequelize = new Sequelize(DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres',
  dialectOptions: {
    ssl: false  // SSL disabled for proxy connections
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅✅✅ CONNECTION SUCCESSFUL! ✅✅✅');
    console.log('');
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT current_database(), current_user, version()');
    console.log('📊 Connection Info:');
    console.log(`   Database: ${results[0].current_database}`);
    console.log(`   User: ${results[0].current_user}`);
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    await sequelize.close();
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
TESTSCRIPT

echo "Step 2: Testing connection using Sequelize (working method)..."
echo ""

if node /tmp/test-working-method.js; then
  echo ""
  echo "✅✅✅ SUCCESS! Connection works with this method! ✅✅✅"
  echo ""
  echo "This means:"
  echo "   - The password in Secret Manager is correct"
  echo "   - Cloud SQL password matches"
  echo "   - Connection works with URL-encoded password in DATABASE_URL"
  echo ""
  echo "💡 The scripts need to use URL encoding when constructing DATABASE_URL"
else
  echo ""
  echo "❌ Connection still failed"
  echo ""
  echo "Possible reasons:"
  echo "   1. Cloud SQL password hasn't propagated yet (wait more time)"
  echo "   2. Cloud SQL password is different from Secret Manager"
  echo "   3. Database 'mymoolah_staging' doesn't exist or has wrong permissions"
  echo ""
  echo "💡 Next step: Set password via Cloud Console UI for reliability"
fi

rm -f /tmp/test-working-method.js
