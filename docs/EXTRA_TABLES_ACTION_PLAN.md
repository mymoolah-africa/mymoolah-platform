# Extra Staging Tables - Action Plan

## Current Situation

**Staging has 6 tables that UAT lacks:**
1. `compliance_records` (0 rows)
2. `flash_commission_tiers` (4 rows)
3. `mobilemart_transactions` (0 rows)
4. `reseller_floats` (0 rows)
5. `sync_audit_logs` (49 rows) ⚠️ **CRITICAL**
6. `tax_configurations` (0 rows)

## Root Cause

These tables have legitimate migrations in the codebase, but the migrations haven't been executed in UAT.

## Banking-Grade Compliance Requirement

✅ **ENVIRONMENTS MUST HAVE IDENTICAL SCHEMAS**

## Recommended Actions

### Option 1: Run Missing Migrations in UAT (RECOMMENDED)

Run the specific migrations that create these tables in UAT:

```bash
# In UAT environment
npx sequelize-cli db:migrate
```

This will execute any migrations that haven't run yet.

### Option 2: Reverse Sync from Staging to UAT

Since we have a sync script that goes UAT → Staging, we could create the reverse, but this is NOT recommended because:
- Migrations are the source of truth
- Running migrations is the proper way
- Reverse sync bypasses migration tracking

### Option 3: Manual Schema Extraction and Application

Extract schema from Staging and apply to UAT (similar to our fix-missing-schema script but reverse direction).

## Immediate Next Steps

1. **Check which migrations need to run in UAT**
   - Use: `node scripts/check-migration-status.js`
   - Identify missing migrations

2. **Run migrations in UAT**
   - Connect to UAT database
   - Run: `npx sequelize-cli db:migrate`
   - This will execute all pending migrations

3. **Verify schema parity**
   - Run: `node scripts/sync-staging-to-uat-banking-grade.js`
   - Should show "✅ Schema counts match"

4. **Special Case: flash_commission_tiers**
   - This table was deprecated (has a drop migration)
   - Check if the drop migration ran
   - If deprecated, we should drop it from Staging too
   - If still needed, investigate why it wasn't dropped

## Critical Priority

**sync_audit_logs table** - This is CRITICAL because:
- Contains 49 audit log entries
- Required for banking-grade compliance
- Needs to exist in all environments for audit trail consistency
- Created by migration: `20251203_01_create_sync_audit_logs_table.js`

## Decision Required

**Question:** Should we:
- A) Run all pending migrations in UAT (proper way)
- B) Create a reverse sync script (Staging → UAT)
- C) Something else?

**My Recommendation:** Option A - Run migrations in UAT. This is the proper, banking-grade way to handle schema changes.
