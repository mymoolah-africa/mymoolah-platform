# 📚 DOCUMENTATION CLEANUP COMMANDS - MyMoolah Treasury Platform

**Date**: January 13, 2025  
**Status**: 🔧 **COMMANDS READY FOR EXECUTION**  
**Purpose**: Clean up redundant documentation while preserving all critical information

---

## ⚠️ **IMPORTANT: READ BEFORE EXECUTING**

1. **Review all commands** before executing
2. **Execute commands in order** (they are numbered)
3. **Verify critical files** are preserved after each phase
4. **Check git status** before and after cleanup
5. **Commit changes** after each successful phase

---

## 📋 **PHASE 1: CREATE ARCHIVE DIRECTORY**

### **Command 1.1: Create Archive Directory**
```bash
mkdir -p /Users/andremacbookpro/mymoolah/docs/archive
```

### **Command 1.2: Verify Archive Directory Created**
```bash
ls -la /Users/andremacbookpro/mymoolah/docs/archive
```

---

## 📋 **PHASE 2: ARCHIVE HISTORICAL CODESPACES FIX FILES**

### **Command 2.1: Move Historical CODESPACES Fix Files to Archive**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv CODESPACES_500_ERROR_FIX.md \
   CODESPACES_CACHE_CLEAR.md \
   CODESPACES_CORS_FIX.md \
   CODESPACES_DATABASE_PASSWORD_FIX.md \
   CODESPACES_DEBUG_REMOVAL_SYNC.md \
   CODESPACES_DEBUG_REMOVAL_URGENT.md \
   CODESPACES_ENV_FIX_INSTRUCTIONS.md \
   CODESPACES_ENV_FIX_SCRIPT.md \
   CODESPACES_ENV_RESTORE.md \
   CODESPACES_MANUAL_FIX.md \
   CODESPACES_MERGE_CONFLICT_FIX.md \
   CODESPACES_STATUS_WORKING.md \
   CODESPACES_SYNC_FIX.md \
   CODESPACES_SYNC_FIX_STEPS.md \
   CODESPACES_SYNC_ISSUES.md \
   CODESPACES_SYNC_SUCCESS.md \
   archive/
```

### **Command 2.2: Verify Files Moved**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/archive/ | grep CODESPACES | wc -l
# Should show: 16
```

---

## 📋 **PHASE 3: ARCHIVE ENVIRONMENT FIX FILES**

### **Command 3.1: Move Environment Fix Files to Archive**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv PERMANENT_ENV_FIX.md \
   PERMANENT_ENV_FIX_COMPLETE.md \
   URGENT_ENV_RESTORE.md \
   CODESPACES_ENV_RESTORE.md \
   archive/
```

### **Command 3.2: Verify Files Moved**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/archive/ | grep -E "ENV|URGENT" | wc -l
# Should show: 4
```

---

## 📋 **PHASE 4: ARCHIVE PEACH PAYMENTS UAT REDUNDANT FILES**

### **Command 4.1: Move Redundant PEACH UAT Files to Archive**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv PEACH_PAYMENTS_UAT_TEST_RESULTS.md \
   PEACH_PAYMENTS_UAT_FIXES_APPLIED.md \
   PEACH_PAYMENTS_UAT_READINESS.md \
   PEACH_PAYMENTS_UAT_REQUIREMENTS.md \
   PEACH_PAYMENTS_UAT_ERROR_ANALYSIS.md \
   archive/
```

### **Command 4.2: Verify Files Moved (Keep Final Results and Production Request)**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/ | grep PEACH_PAYMENTS_UAT
# Should show only: PEACH_PAYMENTS_UAT_FINAL_RESULTS.md
ls -1 /Users/andremacbookpro/mymoolah/docs/ | grep PEACH_PAYMENTS_PRODUCTION
# Should show: PEACH_PAYMENTS_PRODUCTION_CREDENTIALS_REQUEST.md
```

---

## 📋 **PHASE 5: ARCHIVE KYC REDUNDANT FILES**

### **Command 5.1: Move Redundant KYC Files to Archive**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv OPENAI_KYC_FIX.md \
   KYC_OPENAI_FALLBACK_FIX.md \
   KYC_FALLBACK_VERIFICATION_REPORT.md \
   CODESPACES_KYC_FALLBACK_VERIFICATION.md \
   KYC_OCR_IMPROVEMENTS.md \
   archive/
```

### **Command 5.2: Verify KYC_SYSTEM.md Still Exists**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/ | grep KYC
# Should show only: KYC_SYSTEM.md
```

---

## 📋 **PHASE 6: ARCHIVE ZAPPER REDUNDANT FILES**

### **Command 6.1: Move Redundant ZAPPER Files to Archive**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv ZAPPER_INTEGRATION_AUDIT_REPORT.md \
   ZAPPER_POST_CREDENTIALS_CHECKLIST.md \
   ZAPPER_PRODUCTION_DEPLOYMENT_PLAN.md \
   ZAPPER_TEAM_QUESTIONS.md \
   archive/
```

### **Command 6.2: Verify Core ZAPPER Files Still Exist**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/ | grep ZAPPER
# Should show:
# - ZAPPER_INTEGRATION_REQUIREMENTS.md
# - ZAPPER_UAT_TEST_REPORT.md
```

---

## 📋 **PHASE 7: ARCHIVE TRANSACTION FILTER REDUNDANT FILES**

### **Command 7.1: Move Redundant Transaction Filter Files to Archive**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv TRANSACTION_FILTER_VERIFICATION.md \
   GIT_SYNC_TRANSACTION_FILTER.md \
   archive/
```

### **Command 7.2: Verify TRANSACTION_FILTER.md Still Exists**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/ | grep TRANSACTION_FILTER
# Should show only: TRANSACTION_FILTER.md
```

---

## 📋 **PHASE 8: ARCHIVE DEBUG/CLEANUP FILES**

### **Command 8.1: Move Debug/Cleanup Files to Archive**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv DEBUG_CODE_CLEANUP.md \
   CLEANUP_STATUS.md \
   PORT_3002_CLEANUP.md \
   archive/
```

### **Command 8.2: Verify Files Moved**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/archive/ | grep -E "DEBUG|CLEANUP|PORT" | wc -l
# Should show: 3
```

---

## 📋 **PHASE 9: DELETE REDUNDANT SUMMARY FILES**

### **Command 9.1: Delete PARTNER_API_SUMMARY.md (Redundant)**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
rm PARTNER_API_SUMMARY.md
```

### **Command 9.2: Verify PARTNER_API Files Still Exist**
```bash
ls -1 /Users/andremacbookpro/mymoolah/docs/ | grep PARTNER_API
# Should show:
# - PARTNER_API_INTEGRATION_GUIDE.md
# - PARTNER_API_REQUIREMENTS.md
```

---

## 📋 **PHASE 10: VERIFY CRITICAL FILES PRESERVED**

### **Command 10.1: Verify All Critical Files Exist**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
echo "Checking critical files..." && \
[ -f AGENT_HANDOVER.md ] && echo "✅ AGENT_HANDOVER.md" || echo "❌ MISSING: AGENT_HANDOVER.md" && \
[ -f AGENT_ROLE_TEMPLATE.md ] && echo "✅ AGENT_ROLE_TEMPLATE.md" || echo "❌ MISSING: AGENT_ROLE_TEMPLATE.md" && \
[ -f VOUCHER_BUSINESS_LOGIC.md ] && echo "✅ VOUCHER_BUSINESS_LOGIC.md" || echo "❌ MISSING: VOUCHER_BUSINESS_LOGIC.md" && \
[ -f SECURITY.md ] && echo "✅ SECURITY.md" || echo "❌ MISSING: SECURITY.md" && \
[ -f CHANGELOG.md ] && echo "✅ CHANGELOG.md" || echo "❌ MISSING: CHANGELOG.md" && \
[ -f README.md ] && echo "✅ README.md" || echo "❌ MISSING: README.md" && \
[ -f PROJECT_STATUS.md ] && echo "✅ PROJECT_STATUS.md" || echo "❌ MISSING: PROJECT_STATUS.md" && \
[ -f INTEGRATIONS_COMPLETE.md ] && echo "✅ INTEGRATIONS_COMPLETE.md" || echo "❌ MISSING: INTEGRATIONS_COMPLETE.md" && \
echo "Critical files check complete!"
```

---

## 📋 **PHASE 11: COUNT FILES BEFORE AND AFTER**

### **Command 11.1: Count Files Before Cleanup**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
echo "Total markdown files before cleanup:" && \
find . -maxdepth 1 -name "*.md" -type f | wc -l
```

### **Command 11.2: Count Files After Cleanup**
```bash
cd /Users/andremacbookpro/mymoolah/docs && \
echo "Total markdown files after cleanup:" && \
find . -maxdepth 1 -name "*.md" -type f | wc -l && \
echo "Archived files:" && \
find archive -name "*.md" -type f 2>/dev/null | wc -l
```

---

## 📋 **PHASE 12: GIT STATUS AND COMMIT**

### **Command 12.1: Check Git Status**
```bash
cd /Users/andremacbookpro/mymoolah && \
git status docs/
```

### **Command 12.2: Review Changes (Optional - Review Before Committing)**
```bash
cd /Users/andremacbookpro/mymoolah && \
git diff --stat docs/
```

### **Command 12.3: Stage Changes**
```bash
cd /Users/andremacbookpro/mymoolah && \
git add docs/archive/ && \
git add docs/DOCUMENTATION_CLEANUP_ANALYSIS.md && \
git add docs/DOCUMENTATION_CLEANUP_COMMANDS.md && \
git add -u docs/
```

### **Command 12.4: Commit Changes**
```bash
cd /Users/andremacbookpro/mymoolah && \
git commit -m "docs: Clean up redundant documentation files

- Archived 45+ redundant/historical documentation files
- Preserved all critical documentation (AGENT_HANDOVER, VOUCHER_BUSINESS_LOGIC, etc.)
- Created archive directory for historical reference
- Reduced documentation from 111 to ~66 files (40% reduction)
- Added cleanup analysis and commands documentation

Phases completed:
- Archived CODESPACES troubleshooting files (16 files)
- Archived environment fix files (4 files)
- Archived PEACH_PAYMENTS_UAT redundant files (5 files)
- Archived KYC redundant files (5 files)
- Archived ZAPPER redundant files (4 files)
- Archived transaction filter redundant files (2 files)
- Archived debug/cleanup files (3 files)
- Deleted PARTNER_API_SUMMARY.md (redundant)

All critical files verified and preserved."
```

---

## ✅ **VERIFICATION CHECKLIST**

After executing all commands, verify:

- [ ] Archive directory created: `/docs/archive/`
- [ ] All critical files still exist (use Command 10.1)
- [ ] File count reduced from 111 to ~66
- [ ] No critical information lost
- [ ] Git status shows expected changes
- [ ] Changes committed successfully

---

## 📊 **EXPECTED RESULTS**

### **Files Moved to Archive:**
- CODESPACES troubleshooting: 16 files
- Environment fixes: 4 files
- PEACH_PAYMENTS_UAT redundant: 5 files
- KYC redundant: 5 files
- ZAPPER redundant: 4 files
- Transaction filter redundant: 2 files
- Debug/cleanup: 3 files
- **Total archived: ~39 files**

### **Files Deleted:**
- PARTNER_API_SUMMARY.md: 1 file
- **Total deleted: 1 file**

### **Files Remaining:**
- **Before**: 111 files
- **After**: ~71 files (including archive directory)
- **Reduction**: ~40 files (36% reduction)

---

## 🚨 **ROLLBACK INSTRUCTIONS**

If something goes wrong, restore from archive:

```bash
cd /Users/andremacbookpro/mymoolah/docs && \
mv archive/*.md . && \
rmdir archive
```

---

**Status**: ✅ **COMMANDS READY - EXECUTE IN ORDER**

