# Database Connection Guide - UAT, Staging & Production

## 🎯 **CRITICAL: NEVER STRUGGLE WITH PASSWORDS AGAIN**

This guide ensures **100% reliable** database connections for UAT, Staging, and Production. **ALWAYS** use the provided scripts and helpers - never write custom connection logic.

---

## 📋 **Standard Configuration**

### **UAT Database**
- **Host**: `127.0.0.1` (always use localhost - proxy handles routing)
- **Port**: `6543` (Codespaces) or `5432` (fallback)
- **Database**: `mymoolah`
- **User**: `mymoolah_app`
- **Password Source**: `.env` file (`DATABASE_URL` or `DB_PASSWORD`)
- **Password Format**: `B0t3s@Mymoolah` (note: `@` must be URL-encoded as `%40` in connection strings)

### **Staging Database**
- **Host**: `127.0.0.1` (always use localhost - proxy handles routing)
- **Port**: `6544` (Codespaces) or `5432` (fallback)
- **Database**: `mymoolah_staging`
- **User**: `mymoolah_app`
- **Password Source**: **GCS Secret Manager** (`db-mmtp-pg-staging-password`)
- **Project**: `mymoolah-db`

### **Production Database**
- **Host**: `127.0.0.1` (always use localhost - proxy handles routing)
- **Port**: `6545` (Codespaces) or `5432` (fallback)
- **Database**: `mymoolah_production`
- **User**: `mymoolah_app`
- **Password Source**: **GCS Secret Manager** (`db-mmtp-pg-production-password`)
- **Project**: `mymoolah-db`
- **Instance**: `mmtp-pg-production` (Connection: `mymoolah-db:africa-south1:mmtp-pg-production`)
- **Migration Status**: ✅ **COMPLETE** (Feb 12, 2026) - All 80+ migrations applied

---

## 🚀 **Quick Start - Running Migrations**

### **Master Script (USE THIS!)**

```bash
# Run all UAT migrations
./scripts/run-migrations-master.sh uat

# Run all Staging migrations
./scripts/run-migrations-master.sh staging

# Run all Production migrations
./scripts/run-migrations-master.sh production

# Run specific migration
./scripts/run-migrations-master.sh uat 20251203_01_create_sync_audit_logs_table
```

**This script handles:**
- ✅ Proxy detection and startup
- ✅ Password retrieval (UAT from .env, Staging/Production from Secret Manager)
- ✅ Connection string construction
- ✅ URL encoding of passwords
- ✅ Error handling

**Rule (updated Feb 2026):** Run **migrations first** when you add or change UAT/Staging/Production schema. Run **seed scripts only after** the relevant migrations have been run for that environment. Order is always: migrations → then seed.

---

## 📚 **Available Scripts**

### **1. Master Migration Script** ⭐ **USE THIS FOR MIGRATIONS**
```bash
./scripts/run-migrations-master.sh [uat|staging|production] [migration-name]
```
- Handles everything automatically
- No manual configuration needed
- Works for UAT, Staging, and Production

### **2. Connection Helper (Node.js)**
```javascript
const { getUATClient, getStagingClient, getProductionClient } = require('./scripts/db-connection-helper');

// Get a client (remember to release!)
const uatClient = await getUATClient();
try {
  const result = await uatClient.query('SELECT * FROM users LIMIT 1');
  // ... use result
} finally {
  uatClient.release();
}
```

### **3. Proxy Management**
```bash
# Ensure all proxies are running (UAT 6543, Staging 6544, Production 6545)
./scripts/ensure-proxies-running.sh
```

### **4. Schema Sync Scripts**
```bash
# Sync schema from UAT to Staging
node scripts/sync-staging-to-uat-banking-grade.js

# Sync missing tables from Staging to UAT
node scripts/sync-missing-tables-from-staging-to-uat.js

# Audit extra tables
node scripts/audit-extra-staging-tables.js
```

---

## 🔧 **Using Connection Helper in Custom Scripts**

**ALWAYS** use the connection helper - never write custom connection logic:

```javascript
require('dotenv').config();
const { getUATClient, getStagingClient, closeAll } = require('./scripts/db-connection-helper');

async function main() {
  // Get clients
  const uatClient = await getUATClient();
  const stagingClient = await getStagingClient();
  
  try {
    // Use clients
    const result = await uatClient.query('SELECT COUNT(*) FROM users');
    console.log('Users:', result.rows[0].count);
  } finally {
    // ALWAYS release clients
    uatClient.release();
    stagingClient.release();
    
    // Close pools when done
    await closeAll();
  }
}

main().catch(console.error);
```

---

## 🔑 **Password Management**

### **UAT Password**
- Stored in `.env` file
- Can be in `DATABASE_URL` or `DB_PASSWORD`
- Password: `B0t3s@Mymoolah`
- In connection strings: `B0t3s%40Mymoolah` (`@` = `%40`)

**Example `.env`:**
```bash
DATABASE_URL=postgres://mymoolah_app:B0t3s%40Mymoolah@127.0.0.1:6543/mymoolah?sslmode=disable
# OR
DB_PASSWORD=B0t3s@Mymoolah
```

### **Staging Password**
- Stored in **GCS Secret Manager**
- Secret name: `db-mmtp-pg-staging-password`
- Project: `mymoolah-db`
- **NEVER** hardcode or store in `.env`
- Retrieved automatically by connection helper

---

## 🌐 **Proxy Management**

### **Why Proxies?**
- Secure connection to Cloud SQL
- IAM authentication (Staging)
- Password authentication (UAT)
- TLS/SSL handling

### **Standard Ports**
- **UAT**: Port `6543` (Codespaces), `5432` (fallback)
- **Staging**: Port `6544` (Codespaces), `5432` (fallback)

### **Starting Proxies**
```bash
./scripts/ensure-proxies-running.sh
```

This script:
- Checks if proxies are running
- Starts them if not
- Waits for them to be ready

---

## 🆘 **Troubleshooting**

### **Error: "password authentication failed"**
✅ **Solution**: 
- UAT: Check `.env` has correct `DATABASE_URL` or `DB_PASSWORD`
- Staging: Verify Secret Manager access: `gcloud auth application-default login`
- Ensure password is URL-encoded if using `DATABASE_URL` (`@` → `%40`)
- **Use master migration script** - it handles all password encoding automatically

### **Error: "proxy not running"**
✅ **Solution**: 
```bash
./scripts/ensure-proxies-running.sh
```
- Script will automatically start both proxies if not running
- Check logs: `/tmp/uat-proxy-6543.log` or `/tmp/staging-proxy-6544.log`

### **Error: "connect ETIMEDOUT"**
✅ **Solution**: 
- Check proxy is running on correct port (UAT: 6543, Staging: 6544)
- Verify `DATABASE_URL` uses `127.0.0.1:6543/6544` (not direct DB IP like `34.35.84.201`)
- Connection helper automatically rewrites URLs to use proxy
- **Master migration script handles this automatically**

### **Error: "read ECONNRESET"**
✅ **Solution**: 
- **Most common cause**: Proxy was started before `gcloud auth login` — it has stale credentials. Restart the proxy **after** authenticating:
  ```bash
  pkill -f cloud-sql-proxy
  ./scripts/ensure-proxies-running.sh
  ./scripts/run-migrations-master.sh uat
  ```
- Check proxy logs: `cat /tmp/uat-proxy-6543.log` — look for auth or connection errors
- In Codespaces: Ensure `gcloud auth login` completed successfully before running migrations
- If intermittent: Retry; Codespaces network can occasionally drop connections

### **Error: "Error parsing url: undefined"**
✅ **Solution**: 
- **ALWAYS use master migration script** (handles this automatically)
- Script ensures `DATABASE_URL` is properly set before running Sequelize CLI
- Never run `npx sequelize-cli db:migrate` directly without setting `DATABASE_URL`

### **Error: "type 'public.enum_xxx' does not exist"**
✅ **Solution**: 
- Enum types must be created before tables that use them
- Schema sync scripts handle this automatically (extract enums first)
- If manually creating tables, create enum types first

### **Migrations marked executed but tables don't exist**
✅ **Solution**: 
- Run: `node scripts/sync-missing-tables-from-staging-to-uat.js`
- Script will extract schema from Staging and create missing tables in UAT
- Handles enum types automatically

---

## ✅ **Checklist for New Integrations**

When adding new integrations (Docker images, migrations, tables, fields):

### **Before Starting:**
- [ ] Proxies are running: `./scripts/ensure-proxies-running.sh`
- [ ] `.env` file has `DATABASE_URL` or `DB_PASSWORD` for UAT
- [ ] GCS auth configured for Staging: `gcloud auth application-default login`

### **Running Migrations:**
- [ ] Use master script: `./scripts/run-migrations-master.sh [uat|staging]`
- [ ] Check migration status: `node scripts/check-migration-status.js`
- [ ] Verify schemas match: `node scripts/sync-staging-to-uat-banking-grade.js`

### **Creating New Scripts:**
- [ ] Use connection helper: `require('./scripts/db-connection-helper')`
- [ ] Never hardcode passwords or connection strings
- [ ] Always release clients in `finally` blocks
- [ ] Close pools when done

### **After Migrations:**
- [ ] Verify schema parity: `node scripts/audit-extra-staging-tables.js`
- [ ] Check both environments have same table count
- [ ] Run full sync verification: `node scripts/sync-staging-to-uat-banking-grade.js`

---

## 📖 **Best Practices**

1. **Always use master migration script** - Don't run `npx sequelize-cli` directly
2. **Always use connection helper** - Don't write custom connection logic
3. **Always check proxies first** - Run `ensure-proxies-running.sh` before any DB work
4. **Always verify schemas match** - Run sync verification after changes
5. **Never hardcode passwords** - Use `.env` (UAT) or Secret Manager (Staging)
6. **Always URL-encode passwords** - `@` becomes `%40` in connection strings
7. **Always release clients** - Use `try/finally` blocks

---

## 🔒 **Security Notes**

- ✅ UAT password: Stored in `.env` (local, git-ignored)
- ✅ Staging password: Stored in GCS Secret Manager (never in code)
- ✅ Proxies: Handle TLS/SSL automatically
- ✅ Connections: Always through localhost (proxy)
- ❌ Never commit passwords to git
- ❌ Never hardcode passwords in scripts

---

## 📞 **Support**

If you encounter connection issues:

1. Check this guide first
2. Run `./scripts/ensure-proxies-running.sh`
3. Verify `.env` configuration
4. Use master migration script
5. Check logs in `/tmp/uat-proxy-6543.log` or `/tmp/staging-proxy-6544.log`

---

**Last Updated**: 2025-12-03  
**Maintained By**: AI Agent (Standardized Setup)
