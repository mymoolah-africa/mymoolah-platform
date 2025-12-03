# Documentation Consolidation Plan

**Date**: 2025-12-03  
**Status**: In Progress

---

## 📋 Overview

Multiple overlapping documentation files exist for database connections, migrations, and Staging/UAT operations. This consolidation plan merges them into a unified, maintainable documentation structure.

---

## 🔄 Files to Consolidate

### **Category 1: Database Connections & Migrations**

#### **Keep (Primary)**:
- `docs/DATABASE_CONNECTION_GUIDE.md` ⭐ **MASTER DOCUMENT**
- `docs/QUICK_REFERENCE_DATABASE.md` ⭐ **QUICK REFERENCE**

#### **Merge into DATABASE_CONNECTION_GUIDE.md**:
- `docs/STAGING_MIGRATION_IN_CODESPACES.md` → Merge useful content, then archive
- `docs/STAGING_CONNECTION_SOLUTION.md` → Merge troubleshooting, then archive
- `docs/CODESPACES_DB_CONNECTION.md` → Merge connection details, then archive

#### **Archive (Outdated/Replaced)**:
- `docs/STAGING_MIGRATION_PASSWORD_DEBUG.md` → Replaced by standardized scripts
- `docs/STAGING_PASSWORD_TROUBLESHOOTING.md` → Covered in main guide
- `docs/PASSWORD_UPDATE_QUICK_GUIDE.md` → Outdated
- `docs/UPDATE_PASSWORD_EXAMPLES.md` → Outdated
- `docs/UPDATE_STAGING_PASSWORD_GUIDE.md` → Outdated

### **Category 2: Schema Synchronization**

#### **Keep (Active)**:
- `docs/BANKING_GRADE_STAGING_SYNC_ARCHITECTURE.md` ⭐ **ARCHITECTURE DOC**
- `docs/BANKING_GRADE_SYNC_IMPLEMENTATION_GUIDE.md` ⭐ **IMPLEMENTATION GUIDE**

#### **Merge/Update**:
- `docs/STAGING_SYNC_TROUBLESHOOTING.md` → Merge troubleshooting section into implementation guide
- `docs/STAGING_SYNC_GUIDE.md` → Merge if unique content, otherwise archive
- `docs/EXTRA_STAGING_TABLES_AUDIT_REPORT.md` → Keep as reference, add link from main guide
- `docs/EXTRA_TABLES_ACTION_PLAN.md` → Archive (task complete)

### **Category 3: Input Field Fixes**

#### **Consolidate**:
- `docs/INPUT_FIELD_FIXES_FINAL.md` → **KEEP** (most complete)
- `docs/INPUT_FIELD_FIXES_COMPLETE.md` → Merge unique content, then archive
- `docs/INPUT_FIELD_AUTO_UPDATE_AUDIT.md` → Archive (if duplicate)

---

## ✅ Consolidation Actions

1. ✅ Create comprehensive `DATABASE_CONNECTION_GUIDE.md` (already done)
2. ⏳ Merge useful troubleshooting from debug guides
3. ⏳ Update main guides with links to reference docs
4. ⏳ Move outdated docs to archive
5. ⏳ Update AGENT_HANDOVER.md
6. ⏳ Update CHANGELOG.md

---

## 📁 Archive Structure

Move archived docs to: `docs/archive/database-connections/` and `docs/archive/debug-guides/`

---

## 🎯 Final Structure

**Primary Docs**:
- `docs/DATABASE_CONNECTION_GUIDE.md` - Complete connection procedures
- `docs/QUICK_REFERENCE_DATABASE.md` - Quick commands
- `docs/BANKING_GRADE_STAGING_SYNC_ARCHITECTURE.md` - Architecture
- `docs/BANKING_GRADE_SYNC_IMPLEMENTATION_GUIDE.md` - Implementation

**Reference Docs**:
- `docs/EXTRA_STAGING_TABLES_AUDIT_REPORT.md` - Historical reference

**All Others**: Moved to archive
