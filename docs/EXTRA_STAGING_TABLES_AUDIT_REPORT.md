# Extra Staging Tables Audit Report
**Date:** 2025-12-03  
**Auditor:** AI Agent  
**Scope:** 6 tables found in Staging but not in UAT

## Executive Summary

**Critical Finding:** All 6 "extra" tables in Staging are **legitimate tables** with valid migrations in the codebase. They should exist in UAT but are missing due to incomplete migrations. This represents a **schema drift** issue that violates banking-grade environment consistency requirements.

## Banking-Grade / Mojaloop Best Practice Analysis

### ✅ **Principle: Environment Schema Parity**

**Standard Practice:**
- All environments (UAT, Staging, Production) MUST have identical schemas
- Schema differences violate:
  - ISO 27001 audit requirements
  - Mojaloop FSPIOP compliance standards
  - Banking regulatory requirements (identical testing environments)

**Current Violation:**
- Staging has 6 tables that UAT lacks
- This creates environment inconsistency
- Code tested in Staging may fail in UAT/Production
- Audit trails are incomplete between environments

### Recommendation: **SYNC TO UAT, NOT REMOVE FROM STAGING**

## Table-by-Table Analysis

### 1. **compliance_records** ✅ LEGITIMATE
- **Migration:** `20250814_create_reseller_compliance_tax.js` (line 477)
- **Model:** `models/ComplianceRecord.js`
- **Purpose:** Banking compliance tracking (KYC, AML, CTF, FICA, POC, licensing, audit)
- **Rows:** 0 (empty)
- **Status:** ✅ Should exist in UAT
- **Action:** Sync schema to UAT

### 2. **flash_commission_tiers** ⚠️ LEGITIMATE BUT DEPRECATED
- **Migration:** `20250829075831-add-commission-to-flash-transactions-and-tiers.js`
- **Migration Drop:** `20250829093656-drop-flash-specific-fee-tables.js` (down migration drops this table)
- **Purpose:** Flash voucher commission tier configuration
- **Rows:** 4 (has test data)
- **Status:** ⚠️ **Deprecated** - This table was replaced by generic `supplier_commission_tiers`
- **Action:** **CONFLICT** - Table exists in Staging but should have been dropped. Check if:
  - Drop migration didn't run in Staging
  - Or table was recreated manually

### 3. **mobilemart_transactions** ✅ LEGITIMATE
- **Migration:** `20250814_create_mobilemart_tables.js`
- **Model:** `models/MobileMartTransaction.js`
- **Purpose:** MobileMart VAS transaction tracking
- **Rows:** 0 (empty)
- **Status:** ✅ Should exist in UAT
- **Action:** Sync schema to UAT

### 4. **reseller_floats** ✅ LEGITIMATE
- **Migration:** `20250814_create_reseller_compliance_tax.js` (line 5)
- **Model:** `models/ResellerFloat.js`
- **Purpose:** Reseller float account management (banking-grade)
- **Rows:** 0 (empty)
- **Status:** ✅ Should exist in UAT
- **Action:** Sync schema to UAT

### 5. **sync_audit_logs** ✅ LEGITIMATE (CRITICAL)
- **Migration:** `20251203_01_create_sync_audit_logs_table.js` (created TODAY)
- **Purpose:** Banking-grade audit trail for database synchronization operations
- **Mojaloop Compliance:** Full FSPIOP traceability (trace IDs, span IDs, structured logging)
- **Rows:** 49 (active audit logs from our sync operations!)
- **Status:** ✅ **SHOULD EXIST IN UAT** - Critical for audit trail consistency
- **Action:** **PRIORITY 1** - Sync schema to UAT immediately

### 6. **tax_configurations** ✅ LEGITIMATE
- **Migration:** `20250814_create_reseller_compliance_tax.js` (line 200)
- **Model:** `models/TaxConfiguration.js`
- **Purpose:** Tax configuration management (banking compliance)
- **Rows:** 0 (empty)
- **Status:** ✅ Should exist in UAT
- **Action:** Sync schema to UAT

## Root Cause Analysis

### Why Are These Tables Missing in UAT?

1. **Incomplete Migration Execution:**
   - Migrations exist in codebase
   - Migrations were run in Staging
   - Migrations were **NOT run in UAT**
   - This indicates UAT migration process is broken or incomplete

2. **Migration Date Analysis:**
   - Most tables: Created August 14, 2025 (`20250814_*`)
   - Flash commission: Created August 29, 2025 (`20250829_*`)
   - Sync audit logs: Created TODAY December 3, 2025 (`20251203_*`)

3. **Impact:**
   - Schema drift between environments
   - Code may reference these tables and fail in UAT
   - Audit trails incomplete (especially `sync_audit_logs`)

## Recommended Actions

### ✅ **IMMEDIATE ACTION (Priority 1):**

1. **DO NOT REMOVE** these tables from Staging - they are legitimate

2. **SYNC ALL TABLES TO UAT** using our existing sync script:
   ```bash
   node scripts/fix-missing-schema-from-uat.js
   ```
   Wait - this script syncs FROM UAT TO Staging. We need the reverse.

3. **Create reverse sync script** to sync FROM Staging TO UAT, OR:
   - Run the missing migrations in UAT directly
   - Use `npx sequelize-cli db:migrate` in UAT environment

### ⚠️ **SPECIAL CASE: flash_commission_tiers**

**Conflict:** This table has a drop migration that should have removed it.

**Investigation Required:**
1. Check if `20250829093656-drop-flash-specific-fee-tables.js` ran in Staging
2. If it ran, why does the table still exist?
3. If it didn't run, why was it skipped?

**Recommendation:** 
- If deprecated, remove from both environments
- If still needed, remove the drop migration or revert it

### 🔄 **LONG-TERM FIXES:**

1. **Migration Consistency Check:**
   - Create automated check to ensure all environments have same migration status
   - Add to CI/CD pipeline

2. **Schema Validation:**
   - Before deployment, verify schema parity
   - Fail deployment if schemas differ

3. **Audit Trail:**
   - Ensure `sync_audit_logs` exists in ALL environments for consistency
   - Critical for banking compliance

## Compliance Impact

### ❌ **Current State (Non-Compliant):**

- Environment schema inconsistency
- Missing audit trail tables in UAT
- Potential for code failures in production

### ✅ **Target State (Compliant):**

- All environments have identical schemas
- All audit trails complete and consistent
- Code tested in Staging will work in UAT/Production

## Decision Matrix

| Table | Action | Reason |
|-------|--------|--------|
| compliance_records | ✅ Sync to UAT | Legitimate, missing migration |
| flash_commission_tiers | ⚠️ Investigate | Deprecated but exists |
| mobilemart_transactions | ✅ Sync to UAT | Legitimate, missing migration |
| reseller_floats | ✅ Sync to UAT | Legitimate, missing migration |
| sync_audit_logs | ✅ **URGENT: Sync to UAT** | Critical audit trail |
| tax_configurations | ✅ Sync to UAT | Legitimate, missing migration |

## Conclusion

**DO NOT REMOVE** these tables from Staging. Instead, **SYNC THEM TO UAT** by running the missing migrations. This restores environment parity and banking-grade compliance.

---

**Next Steps:**
1. Create script to identify missing migrations in UAT
2. Run missing migrations in UAT (or sync schema from Staging)
3. Verify schema parity
4. Document in changelog
