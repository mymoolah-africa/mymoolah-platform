# 🏦 Running Staging Migrations in Codespaces

**Date**: December 3, 2025  
**Status**: Active Guide

---

## 🎯 Quick Start

To run the audit log table migration in Staging (Codespaces):

```bash
# Option 1: Use the helper script (recommended)
./scripts/run-migration-staging-cs.sh 20251203_01_create_sync_audit_logs_table

# Option 2: Run all pending migrations
./scripts/run-migration-staging-cs.sh
```

---

## 📋 Prerequisites

1. **Cloud SQL Auth Proxy running on port 6544**:
   ```bash
   # Check if running
   lsof -ti:6544
   
   # If not running, start it:
   ./scripts/start-staging-proxy-cs.sh
   ```

2. **gcloud authenticated**:
   ```bash
   # Verify authentication
   gcloud auth application-default login
   ```

3. **Access to Secret Manager**:
   - The script will automatically retrieve the Staging password from Secret Manager

---

## 🔧 Manual Method

If you prefer to run manually:

```bash
# 1. Get password from Secret Manager
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')

# 2. URL encode the password (important for special characters like @)
ENCODED_PASSWORD=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" <<< "$PASSWORD")

# 3. Set DATABASE_URL
export DATABASE_URL="postgres://mymoolah_app:${ENCODED_PASSWORD}@127.0.0.1:6544/mymoolah_staging?sslmode=disable"

# 4. Run the migration
npx sequelize-cli db:migrate --migrations-path migrations --name 20251203_01_create_sync_audit_logs_table
```

---

## 🚨 Common Errors

### **Error: "Error parsing url: undefined"**

**Cause**: `DATABASE_URL` is not set.

**Solution**: Use the helper script or set `DATABASE_URL` manually (see above).

---

### **Error: "connect ECONNREFUSED 127.0.0.1:6544"**

**Cause**: Cloud SQL Auth Proxy is not running on port 6544.

**Solution**:
```bash
./scripts/start-staging-proxy-cs.sh
```

---

### **Error: "Failed to retrieve password from Secret Manager"**

**Cause**: 
- Not authenticated with gcloud
- No access to Secret Manager

**Solution**:
```bash
# Re-authenticate
gcloud auth application-default login

# Verify access
gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db"
```

---

## 📊 Verify Migration

After running the migration, verify it was applied:

```bash
# Connect to Staging database
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')
ENCODED_PASSWORD=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" <<< "$PASSWORD")
export PGPASSWORD="${PASSWORD}"

# Check if table exists
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "\d sync_audit_logs"

# Check migration was recorded
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT * FROM \"SequelizeMeta\" WHERE name LIKE '%sync_audit_logs%';"
```

---

## 🔍 Troubleshooting

### **Check Proxy Status**:
```bash
# List all proxy processes
ps aux | grep cloud-sql-proxy

# Check port 6544
lsof -ti:6544

# View proxy logs
tail -f /tmp/staging-proxy-6544.log
```

### **Check Database Connection**:
```bash
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" | tr -d '\n\r')
export PGPASSWORD="${PASSWORD}"
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user;"
```

---

## 📝 Notes

- **Port 6544**: Staging proxy uses port 6544 in Codespaces
- **URL Encoding**: Password must be URL-encoded (important for special characters like `@`)
- **Database**: `mymoolah_staging`
- **User**: `mymoolah_app`
- **Proxy**: Must be running before running migrations

---

**Last Updated**: December 3, 2025
