# Staging to UAT Sync Guide

**Last Updated**: December 2, 2025  
**Purpose**: Ensure Staging database is 100% synchronized with UAT (dev) environment

---

## 🎯 Overview

This guide helps you sync the Staging database to match UAT exactly. 

**CRITICAL POLICY**: UAT, Staging, and Production databases MUST always have identical database schemas. All schema changes are developed in UAT first, then synced to Staging, then to Production.

**What This Means:**
- ✅ Schema structure (tables, columns, constraints) must be identical
- ✅ All migrations are developed and tested in UAT first
- ✅ Staging schema is synced FROM UAT (never the reverse)
- ✅ Production schema is synced FROM UAT (via Staging)

**What Differs:**
- 🔑 **Credentials**: UAT uses test credentials; Staging/Production use production credentials
- 📊 **Data**: Different products, transactions, users (but same schema structure)

---

## 📋 Prerequisites

1. **Cloud SQL Auth Proxy Running**
   - UAT proxy on port **5433**
   - Staging proxy on port **5434**

2. **Database Password**
   - Set `DB_PASSWORD` environment variable, or
   - Script will use default (you'll be prompted if needed)

3. **Access to Both Databases**
   - UAT: `mymoolah-db:africa-south1:mmtp-pg` (or your UAT instance)
   - Staging: `mymoolah-db:africa-south1:mmtp-pg-staging` (or your staging instance)

---

## 🚀 Quick Start

### Step 1: Start Cloud SQL Auth Proxies

**Terminal 1 - UAT Proxy:**
```bash
cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg --port 5433
```

**Terminal 2 - Staging Proxy:**
```bash
cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging --port 5434
```

**Or use the helper script (if it exists):**
```bash
./scripts/start-dual-proxies.sh
```

### Step 2: Set Database Password

```bash
# Get password from Secret Manager
export DB_PASSWORD=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db")

# Or set manually
export DB_PASSWORD="your_actual_password_here"
```

### Step 3: Run Sync Script

**Dry Run (Recommended First):**
```bash
node scripts/sync-staging-to-uat.js --dry-run
```

**Actual Sync:**
```bash
node scripts/sync-staging-to-uat.js
```

---

## 📊 What the Script Does

The sync script performs these steps:

1. **Migration Status Check**
   - Compares executed migrations in UAT vs Staging
   - Identifies missing migrations in Staging
   - Lists any extra migrations in Staging

2. **Run Missing Migrations**
   - Executes all migrations that exist in UAT but not in Staging
   - Uses `sequelize-cli db:migrate` with Staging DATABASE_URL

3. **Schema Comparison**
   - Compares table and column counts
   - Identifies schema differences
   - Recommends detailed comparison if needed

4. **Critical Tables Check**
   - Verifies these tables exist and match:
     - `users`
     - `wallets`
     - `transactions`
     - `beneficiaries`
     - `beneficiary_service_accounts`

5. **Summary Report**
   - Reports sync status
   - Lists any issues found
   - Provides next steps

---

## 🔍 Expected Output

### Successful Sync:
```
================================================================================
  SYNC STAGING TO UAT - COMPREHENSIVE DATABASE SYNC
================================================================================

📡 Connecting to databases...
✅ Connected to UAT (port 5433)
✅ Connected to Staging (port 5434)

📋 Step 1: Checking Migration Status...

   UAT migrations: 85
   Staging migrations: 81
   Total migration files: 90

⚠️  Found 4 migrations in UAT that are missing in Staging:

   - 20251202_01_enforce_e164_beneficiaries.js
   - 20251202_02_backfill_beneficiaries_msisdn_to_e164.js
   - 20251202_03_backfill_service_accounts_msisdn_to_e164.js
   - 20251202_04_walletid_depii.js

📦 Running migrations in Staging...

[Sequelize migration output...]

✅ Migrations completed successfully

✅ All migrations now executed in Staging

📋 Step 2: Comparing Database Schemas...

   UAT: 45 tables, 523 columns
   Staging: 45 tables, 523 columns

✅ Schema counts match

📋 Step 3: Checking Critical Tables...

✅ All critical tables match

================================================================================
  SYNC SUMMARY
================================================================================

✅ STAGING IS 100% SYNCED WITH UAT!

   - All migrations executed
   - Schema counts match
   - Critical tables verified

================================================================================
```

---

## ⚠️ Troubleshooting

### Error: "Connection refused"
**Solution**: Ensure both Cloud SQL Auth Proxies are running
```bash
# Check if proxies are running
lsof -i:5433  # UAT
lsof -i:5434  # Staging

# Start if not running
cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg --port 5433 &
cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging --port 5434 &
```

### Error: "Authentication failed"
**Solution**: Verify database password
```bash
# Get password from Secret Manager
export DB_PASSWORD=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db")

# Verify it's set
echo "${DB_PASSWORD:0:5}..."
```

### Error: "Migration failed"
**Solution**: Check migration logs
- Review the migration output for specific errors
- Some migrations may require DB owner privileges
- Check if migration was already partially applied

### Schema Differences After Sync
**Solution**: Run detailed schema comparison
```bash
node scripts/compare-uat-staging-schemas.js
```

This will show:
- Tables only in UAT
- Tables only in Staging
- Column differences
- Type mismatches

---

## 📝 Post-Sync Verification

After running the sync, verify everything is working:

### 1. Check Migration Status
```bash
# Connect to Staging and check SequelizeMeta
psql -h 127.0.0.1 -p 5434 -U mymoolah_app -d mymoolah -c "SELECT COUNT(*) FROM \"SequelizeMeta\";"
```

### 2. Verify Critical Tables
```bash
# Check table counts
psql -h 127.0.0.1 -p 5434 -U mymoolah_app -d mymoolah -c "
  SELECT 'users' as table, COUNT(*) FROM users
  UNION ALL SELECT 'wallets', COUNT(*) FROM wallets
  UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
  UNION ALL SELECT 'beneficiaries', COUNT(*) FROM beneficiaries;
"
```

### 3. Test Application
- Deploy updated backend to Cloud Run Staging
- Test critical flows:
  - User login
  - Wallet balance
  - Transaction history
  - Beneficiary operations
  - Send money
  - Request money

---

## 🔄 Regular Sync Process

To keep Staging in sync with UAT going forward:

1. **After UAT Changes**
   - Run sync script: `node scripts/sync-staging-to-uat.js`
   - Review output for any issues
   - Deploy updated backend to Staging

2. **Before Staging Deployment**
   - Always sync first
   - Verify schema matches
   - Test critical flows

3. **Weekly Maintenance**
   - Run sync script weekly
   - Review schema differences
   - Update documentation if needed

---

## 📚 Related Scripts

- `scripts/compare-uat-staging-schemas.js` - Detailed schema comparison
- `scripts/run-migrations-staging.sh` - Run migrations in Staging
- `scripts/align-staging-schema-to-uat.js` - Align schema differences
- `scripts/audit-uat-staging-balances.js` - Compare wallet balances

---

## 🎯 Today's Specific Changes (Dec 2, 2025)

Today we worked on **Phase 1: E.164 Standardization**. These migrations need to run in Staging:

1. **20251202_01_enforce_e164_beneficiaries.js**
   - Adds index on `beneficiaries.msisdn`
   - Adds CHECK constraint for E.164 format

2. **20251202_02_backfill_beneficiaries_msisdn_to_e164.js**
   - Converts existing `msisdn` values to E.164 format
   - Updates `0XXXXXXXXX` → `+27XXXXXXXXX`
   - Updates `27XXXXXXXXX` → `+27XXXXXXXXX`

3. **20251202_03_backfill_service_accounts_msisdn_to_e164.js**
   - Normalizes MSISDN in `beneficiary_service_accounts.serviceData`
   - Normalizes MSISDN in `beneficiaries.vasServices` JSONB
   - Ensures both `msisdn` (E.164) and `mobileNumber` (local) are present

4. **20251202_04_walletid_depii.js**
   - Changes `walletId` format from `WAL-+27XXXXXXXXX` to `WAL-{userId}`
   - Updates all transaction records
   - **Note**: May require DB owner privileges (marked complete but not executed in UAT)

---

## ✅ Success Criteria

Staging is 100% synced when:

- ✅ All UAT migrations are executed in Staging
- ✅ Schema table/column counts match
- ✅ All critical tables exist and match
- ✅ No schema differences found
- ✅ Application works correctly in Staging

---

**Last Sync**: December 2, 2025  
**Next Sync**: After any UAT schema changes
