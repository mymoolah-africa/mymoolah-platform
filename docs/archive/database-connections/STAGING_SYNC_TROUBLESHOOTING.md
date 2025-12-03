# 🏦 Staging Sync Troubleshooting Guide

**Date**: December 3, 2025  
**Status**: Active

---

## 🎯 Common Issues & Solutions

### **Issue 1: Audit Log Table Not Available**

**Symptom**:
```
⚠️  Audit log table not available, using console logging only
```

**Cause**: The `sync_audit_logs` table migration hasn't been run in Staging yet.

**Solution**:
```bash
# Run the migration in Staging
npx sequelize-cli db:migrate --migrations-path migrations --name 20251203_01_create_sync_audit_logs_table

# Or run all pending migrations
npx sequelize-cli db:migrate
```

**Impact**: Script will still work, but audit logs will only be in console output, not persisted to database.

---

### **Issue 2: Schema Mismatch**

**Symptom**:
```
⚠️  Schema counts differ - run detailed comparison for details
   UAT: 100 tables, 482 columns
   Staging: 63 tables, 452 columns
```

**Cause**: 
- Migrations haven't been run in Staging
- Staging database is missing tables/schema changes

**Solution**:
```bash
# Run the sync script to apply pending migrations
node scripts/sync-staging-to-uat-banking-grade.js

# The script will automatically run pending migrations
```

**Impact**: Some features may not work in Staging until schema is synced.

---

### **Issue 3: Ledger Imbalance**

**Symptom**:
```
⚠️  Ledger imbalance detected: 50100.00
   Debits: 0.00 (0 transactions)
   Credits: 50100.00 (X transactions)
```

**Cause**: 
- **Expected in staging**: Staging/test databases often have incomplete transaction sets (only credits for testing, no debits)
- **Or**: Transaction type mapping mismatch (now fixed)

**Solution**:
1. **If expected in staging**: No action needed - this is normal for test data
2. **If unexpected**: Investigate transaction types in the database:
   ```sql
   SELECT type, COUNT(*) as count, SUM(amount) as total
   FROM transactions
   WHERE status = 'completed'
   GROUP BY type
   ORDER BY type;
   ```

**Impact**: 
- **Low risk** if this is expected test data in staging
- **High risk** if this occurs in production UAT database

---

## 🔍 Debugging Steps

### **1. Check Migration Status**

```bash
# Check which migrations have been run in Staging
node scripts/sync-staging-to-uat-banking-grade.js --dry-run

# Or check directly in database
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging
SELECT * FROM "SequelizeMeta" ORDER BY name;
```

### **2. Check Schema Differences**

```bash
# Run the schema comparison script
node scripts/compare-uat-staging-schemas.js
```

### **3. Check Transaction Types**

```sql
-- In Staging database
SELECT DISTINCT type FROM transactions;
SELECT type, COUNT(*) as count, SUM(amount) as total
FROM transactions
WHERE status = 'completed'
GROUP BY type;
```

### **4. Verify Database Connections**

```bash
# Test UAT connection
psql -h 127.0.0.1 -p 6543 -U mymoolah_app -d mymoolah

# Test Staging connection
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging
```

---

## ✅ Expected Behavior

### **In Staging (Test Environment)**:
- ✅ Schema mismatch is **expected** until migrations are synced
- ✅ Audit log table may not exist initially
- ✅ Ledger imbalance is **acceptable** for test data
- ✅ Fewer tables/columns than UAT is normal

### **In UAT (Production Environment)**:
- ❌ Schema mismatch should **never** occur
- ❌ Audit log table should **always** exist
- ❌ Ledger imbalance should be **investigated** (may indicate data issues)

---

## 🚨 Critical Issues

### **1. Production UAT Ledger Imbalance**

If ledger imbalance occurs in **UAT (production)**:

1. **Immediate**: Investigate transaction types
2. **Check**: Are all transaction types being recorded correctly?
3. **Verify**: Double-entry bookkeeping is working
4. **Review**: Recent transaction processing changes

### **2. Schema Mismatch in UAT**

If schema mismatch occurs in **UAT**:

1. **Immediate**: Stop sync operations
2. **Investigate**: What migrations are missing?
3. **Review**: Migration execution logs
4. **Fix**: Run missing migrations manually if needed

---

## 📊 Transaction Type Reference

### **Credits (Money Coming In)**:
- `deposit` - Wallet deposit
- `receive` - Money received
- `refund` - Refund received
- `credit` - Credit adjustment
- `transfer` - Transfer received

### **Debits (Money Going Out)**:
- `send` - Money sent
- `payment` - Payment made
- `withdraw` / `withdrawal` - Withdrawal
- `fee` - Fee charged
- `purchase` - Purchase made

---

## 🔧 Quick Fixes

### **Fix Audit Log Table**:
```bash
cd /path/to/mymoolah
npx sequelize-cli db:migrate --migrations-path migrations --name 20251203_01_create_sync_audit_logs_table
```

### **Fix Schema Mismatch**:
```bash
# Run the sync script (it will auto-run migrations)
node scripts/sync-staging-to-uat-banking-grade.js

# Or run all migrations manually
npx sequelize-cli db:migrate
```

### **Reset Staging Database** (⚠️ Destructive):
```bash
# Only if you need to completely reset staging
# WARNING: This will delete all data in staging!
npx sequelize-cli db:migrate:undo:all
npx sequelize-cli db:migrate
```

---

## 📝 Log Analysis

### **Check Sync Audit Logs**:

```sql
-- In Staging database
SELECT 
  sync_id,
  operation_type,
  status,
  started_at,
  duration_ms,
  error_details
FROM sync_audit_logs
ORDER BY started_at DESC
LIMIT 20;
```

### **Check Console Logs**:

The sync script outputs structured JSON logs that can be parsed:
```bash
node scripts/sync-staging-to-uat-banking-grade.js 2>&1 | grep -E "(ERROR|WARN|traceId)"
```

---

## 🎯 Next Steps

1. ✅ **Run migration** for audit log table in Staging
2. ✅ **Sync migrations** to fix schema mismatch
3. ✅ **Monitor ledger** imbalance (accept if test data)
4. ✅ **Verify** all fixes work correctly

---

**Last Updated**: December 3, 2025
