# 🍑 PEACH PAYMENTS MIGRATION GUIDE

**Date**: November 12, 2025  
**Migration**: `20251112_add_request_money_to_peach_payments.js`

---

## 🚀 QUICK START

### **In Codespaces**

1. **Ensure Cloud SQL Auth Proxy is running**:
   ```bash
   # Check if proxy is running
   ps aux | grep cloud-sql-proxy
   
   # If not running, start it:
   ./scripts/start-codespace-with-proxy.sh
   ```

2. **Run the migration**:
   ```bash
   # Using the migration script (recommended)
   node scripts/run-migration.js migrate
   
   # Or directly with dotenv
   node -r dotenv/config node_modules/.bin/sequelize-cli db:migrate
   ```

---

## 📋 DETAILED STEPS

### **Step 1: Start Cloud SQL Auth Proxy**

The migration script needs to connect to the database via the Cloud SQL Auth Proxy.

```bash
# In Codespaces
./scripts/start-codespace-with-proxy.sh
```

**Or manually**:
```bash
# Start proxy in background
cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg --port=6543 &
```

### **Step 2: Verify Proxy is Running**

```bash
# Check if proxy is listening on port 6543
nc -z 127.0.0.1 6543 && echo "✅ Proxy is running" || echo "❌ Proxy is NOT running"
```

### **Step 3: Run Migration**

```bash
# Option 1: Using the migration script (auto-loads .env and fixes port)
node scripts/run-migration.js migrate

# Option 2: Using dotenv directly
node -r dotenv/config node_modules/.bin/sequelize-cli db:migrate

# Option 3: Set DATABASE_URL manually and run
export DATABASE_URL="postgres://user:pass@127.0.0.1:6543/mymoolah?sslmode=disable"
npx sequelize-cli db:migrate
```

---

## 🔍 TROUBLESHOOTING

### **Error: "Error parsing url: undefined"**

**Cause**: `DATABASE_URL` environment variable is not set.

**Solution**:
```bash
# Load .env file first
source .env  # or use dotenv

# Or use the migration script which loads .env automatically
node scripts/run-migration.js migrate
```

### **Error: "connect ECONNREFUSED 127.0.0.1:6543"**

**Cause**: Cloud SQL Auth Proxy is not running.

**Solution**:
```bash
# Start the proxy
./scripts/start-codespace-with-proxy.sh

# Or check if it's running on a different port
ps aux | grep cloud-sql-proxy
```

### **Error: "connect ECONNREFUSED 127.0.0.1:5433"**

**Cause**: `DATABASE_URL` is pointing to port 5433, but proxy is on 6543.

**Solution**:
```bash
# The migration script auto-fixes this, or manually:
export DATABASE_URL="postgres://user:pass@127.0.0.1:6543/mymoolah?sslmode=disable"
node scripts/run-migration.js migrate
```

### **Error: "invalid input value for enum enum_peach_payments_type"**

**Cause**: Migration hasn't been run yet.

**Solution**: Run the migration as described above.

---

## ✅ VERIFICATION

After running the migration, verify it worked:

```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Or check the enum directly in PostgreSQL
psql $DATABASE_URL -c "SELECT unnest(enum_range(NULL::enum_peach_payments_type));"
```

**Expected output**:
```
payshap_rpp
payshap_rtp
request_money_payshap  ← This should be present
```

---

## 📝 MIGRATION DETAILS

### **What This Migration Does**

Adds `'request_money_payshap'` to the `enum_peach_payments_type` enum in PostgreSQL.

### **Migration File**
- **File**: `migrations/20251112_add_request_money_to_peach_payments.js`
- **Action**: `ALTER TYPE "enum_peach_payments_type" ADD VALUE IF NOT EXISTS 'request_money_payshap';`
- **Rollback**: Not supported (PostgreSQL limitation)

### **Why This Migration is Needed**

The `PeachPayment` model was trying to create records with `type: 'request_money_payshap'`, but the database enum only had:
- `'payshap_rpp'`
- `'payshap_rtp'`

This caused the error:
```
"invalid input value for enum enum_peach_payments_type: \"request_money_payshap\""
```

---

## 🎯 NEXT STEPS

After running the migration:

1. ✅ **Re-run UAT Tests**:
   ```bash
   node scripts/test-peach-uat-complete.js
   ```

2. ✅ **Expected Result**:
   - Request Money test should now pass
   - Success rate should improve to ~84.6% (11/13)

3. ⚠️ **Bank Account Payments**:
   - Will still fail (API limitation, not a code issue)
   - Needs confirmation from Peach Payments

---

**Guide Created**: November 12, 2025  
**Status**: ✅ **READY TO RUN**

