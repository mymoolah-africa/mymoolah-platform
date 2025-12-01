# Database Schema Comparison Guide

## 📋 Purpose
Compare UAT and Staging database schemas to identify differences before deployment.

---

## 🚀 Step 1: Start Both Cloud SQL Auth Proxies

You need **two separate proxies** running:
- **UAT**: Port 5433
- **Staging**: Port 5434

### Option A: Use the Helper Script (Recommended)
```bash
./scripts/start-dual-proxies.sh
```

### Option B: Start Manually
```bash
# Terminal 1 - UAT Proxy
cloud-sql-proxy --port 5433 mymoolah-db:africa-south1:mmtp-pg-staging

# Terminal 2 - Staging Proxy  
cloud-sql-proxy --port 5434 mymoolah-db:africa-south1:mmtp-pg-staging
```

---

## 🔐 Step 2: Set Database Password

Get the password from Google Secret Manager:

```bash
# Get password from Secret Manager
export DB_PASSWORD=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db")

# Verify it's set (shows first 5 characters)
echo "${DB_PASSWORD:0:5}..."
```

Or manually set it:
```bash
export DB_PASSWORD="your_actual_password_here"
```

---

## 🔍 Step 3: Run Schema Comparison

```bash
node scripts/compare-uat-staging-schemas.js
```

### Expected Output:
```
🔍 Starting Database Schema Comparison...

📡 Connecting to UAT database (port 5433)...
✅ Connected to UAT

📡 Connecting to Staging database (port 5434)...
✅ Connected to Staging

📊 Fetching UAT schema...
✅ Found 45 tables in UAT

📊 Fetching Staging schema...
✅ Found 45 tables in Staging

🔄 Comparing schemas...
✅ Comparison complete

================================================================================
  DATABASE SCHEMA COMPARISON: UAT vs STAGING
================================================================================

📊 SUMMARY:
   Tables only in UAT: 0
   Tables only in Staging: 0
   Tables with differences: 0
   Identical tables: 45

✅ SCHEMAS ARE IDENTICAL - No differences found!
================================================================================
```

---

## ❌ If Differences Are Found

The script will show:
1. **Tables only in UAT** (missing in Staging) - Need to run migrations
2. **Tables only in Staging** (extra tables) - Investigate why
3. **Column differences** - Specific columns that differ

Example output:
```
❌ TABLES WITH COLUMN DIFFERENCES:

   Table: transactions
      Columns only in UAT (missing in Staging):
         - transactionId
         - fee
         - metadata
      
❌ SCHEMAS ARE DIFFERENT - Action required!

💡 RECOMMENDED ACTIONS:
   1. Run pending migrations in Staging
   2. Verify all migrations have been executed
   3. Check for manual schema changes
   4. Re-run this script to verify
```

---

## 🔧 Step 4: Fix Schema Differences

If differences are found, run migrations in Staging:

```bash
./scripts/run-migrations-staging.sh
```

Then re-run the comparison to verify:
```bash
node scripts/compare-uat-staging-schemas.js
```

---

## 🛑 Stopping Proxies

When done:
```bash
# Stop UAT proxy
lsof -ti:5433 | xargs kill

# Stop Staging proxy
lsof -ti:5434 | xargs kill

# Or stop both
lsof -ti:5433,5434 | xargs kill
```

---

## 🐛 Troubleshooting

### Error: "Connection refused"
- Proxies not running → Start them with `./scripts/start-dual-proxies.sh`
- Wrong ports → Verify 5433 and 5434 are correct

### Error: "Authentication failed"
- Wrong password → Get from Secret Manager: `gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password"`
- Not authenticated with gcloud → Run `gcloud auth login`

### Error: "ECONNREFUSED"
- Check proxies are running: `lsof -i:5433` and `lsof -i:5434`
- Verify instance name: `mmtp-pg-staging`

---

## 📊 What Gets Compared

The script compares:
1. ✅ **Tables** - Which tables exist in each database
2. ✅ **Columns** - Column names, types, constraints
3. ✅ **Data Types** - VARCHAR, INTEGER, TIMESTAMP, etc.
4. ✅ **Nullability** - NULL vs NOT NULL
5. ✅ **Primary Keys** - Which columns are primary keys
6. ✅ **Indexes** - All indexes on tables
7. ✅ **Foreign Keys** - Referential integrity constraints

---

## ✅ Success Criteria

Schemas are ready for deployment when:
- ✅ All tables match between UAT and Staging
- ✅ All columns match (name, type, constraints)
- ✅ No missing migrations in Staging
- ✅ Script shows "SCHEMAS ARE IDENTICAL"

---

**Created**: December 1, 2025  
**Last Updated**: December 1, 2025
