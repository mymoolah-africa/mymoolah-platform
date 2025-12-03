# 🔍 Staging Migration Password Debug Guide

**Date**: December 3, 2025  
**Issue**: Password authentication failed when running migrations

---

## 🚨 Error

```
ERROR: password authentication failed for user "mymoolah_app"
```

---

## 🔍 Diagnostic Steps

### **Step 1: Test Connection with psql**

First, verify the password from Secret Manager works directly:

```bash
# Get password
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')

# Test connection
export PGPASSWORD="$PASSWORD"
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user;"
```

**If this works**: Password is correct, issue is with Sequelize CLI configuration  
**If this fails**: Password in Secret Manager doesn't match Cloud SQL

---

### **Step 2: Check Password in Secret Manager**

```bash
# Get password and check length
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')
echo "Password length: ${#PASSWORD} characters"
echo "Password (first 5 chars): ${PASSWORD:0:5}..."
```

Expected: `B0t3s@Mymoolahstaging` (21 characters)

---

### **Step 3: Test with Node.js/Sequelize**

Create a test script to verify Sequelize connection:

```bash
cat > test-staging-connection.js << 'EOF'
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

// Get password
const password = execSync(
  'gcloud secrets versions access latest --secret=db-mmtp-pg-staging-password --project=mymoolah-db',
  { encoding: 'utf8' }
).trim();

// URL encode
const encodedPassword = encodeURIComponent(password);
const DATABASE_URL = `postgres://mymoolah_app:${encodedPassword}@127.0.0.1:6544/mymoolah_staging?sslmode=disable`;

const sequelize = new Sequelize(DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres'
});

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection successful!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

test();
EOF

node test-staging-connection.js
```

---

### **Step 4: Run Migration with Explicit Environment**

Use the staging environment explicitly:

```bash
# Get password and construct DATABASE_URL
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')
ENCODED_PASSWORD=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" <<< "$PASSWORD")
export DATABASE_URL="postgres://mymoolah_app:${ENCODED_PASSWORD}@127.0.0.1:6544/mymoolah_staging?sslmode=disable"
export NODE_ENV="staging"

# Run migration with staging environment
npx sequelize-cli db:migrate --env staging --migrations-path migrations --name 20251203_01_create_sync_audit_logs_table
```

---

## 🔧 Common Fixes

### **Fix 1: Password Mismatch**

If Secret Manager password doesn't match Cloud SQL:

1. **Update Secret Manager** to match Cloud SQL password:
   ```bash
   echo -n "B0t3s@Mymoolahstaging" | gcloud secrets versions add db-mmtp-pg-staging-password --data-file=- --project=mymoolah-db
   ```

2. **Or update Cloud SQL** to match Secret Manager:
   ```bash
   # Get password from Secret Manager
   PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')
   
   # Update Cloud SQL (requires gcloud sql users set-password)
   gcloud sql users set-password mymoolah_app \
     --instance=mmtp-pg-staging \
     --password="$PASSWORD" \
     --project=mymoolah-db
   ```

### **Fix 2: Use Direct Connection (Bypass Sequelize CLI)**

If Sequelize CLI has issues, run migration directly:

```bash
# Get password
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')
ENCODED_PASSWORD=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" <<< "$PASSWORD")

# Run migration using Node.js script
cat > run-migration-direct.js << EOF
require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgres://mymoolah_app:${ENCODED_PASSWORD}@127.0.0.1:6544/mymoolah_staging?sslmode=disable';

const sequelize = new Sequelize(DATABASE_URL, {
  logging: console.log,
  dialect: 'postgres'
});

async function runMigration() {
  try {
    const migration = require('./migrations/20251203_01_create_sync_audit_logs_table.js');
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✅ Migration completed!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
EOF

node run-migration-direct.js
```

---

## 📊 Verify After Migration

```bash
# Connect and verify table exists
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')
export PGPASSWORD="$PASSWORD"
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "\d sync_audit_logs"
```

---

## 🎯 Quick Fix Command

If password in Secret Manager is correct, try this one-liner:

```bash
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r') && \
ENCODED_PASSWORD=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" <<< "$PASSWORD") && \
export DATABASE_URL="postgres://mymoolah_app:${ENCODED_PASSWORD}@127.0.0.1:6544/mymoolah_staging?sslmode=disable" && \
export NODE_ENV="staging" && \
npx sequelize-cli db:migrate --env staging --migrations-path migrations --name 20251203_01_create_sync_audit_logs_table
```

---

**Last Updated**: December 3, 2025
