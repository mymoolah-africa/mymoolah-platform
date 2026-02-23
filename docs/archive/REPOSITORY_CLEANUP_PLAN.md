# Repository Cleanup Plan - Cost Optimization

**Date**: 2025-01-20  
**Status**: ⚠️ **ACTION REQUIRED** - Large files found in git history

---

## 🚨 **Critical Issues Found**

### **1. Backups Directory in Git History** ⚠️ **CRITICAL**
- **Size**: 7.8GB in `backups/` directory
- **Status**: Tracked in git (committed before .gitignore was updated)
- **Impact**: This is the main contributor to the 650MB .git directory size
- **Action**: Remove from git history (see commands below)

### **2. Cloud SQL Proxy Binaries** ⚠️ **HIGH PRIORITY**
- **Size**: 31MB + 32MB = 63MB total
- **Files**: `bin/cloud-sql-proxy` and `cloud-sql-proxy`
- **Status**: Tracked in git
- **Action**: Remove from git history, add to .gitignore (already done)

### **3. Git Repository Size**
- **Current Size**: 650MB
- **Target**: <100MB (after cleanup)
- **Potential Savings**: ~550MB reduction

---

## 📋 **Cleanup Commands (Run in Codespaces)**

### **⚠️ IMPORTANT: Read all steps before executing!**

### **Step 1: Backup Current State (Safety First)**
```bash
# Create a backup of your current repository state
cd /workspaces/mymoolah-platform
git tag backup-before-cleanup-$(date +%Y%m%d)
git push origin backup-before-cleanup-$(date +%Y%m%d)
```

### **Step 2: Remove Backups Directory from Git (Keep Local Files)**
```bash
# Remove backups/ from git tracking (but keep local files)
cd /workspaces/mymoolah-platform
git rm -r --cached backups/
git commit -m "chore: remove backups directory from git tracking"
```

### **Step 3: Remove Cloud SQL Proxy Binaries from Git**
```bash
# Remove cloud-sql-proxy binaries from git tracking
cd /workspaces/mymoolah-platform
git rm --cached cloud-sql-proxy bin/cloud-sql-proxy
git commit -m "chore: remove cloud-sql-proxy binaries from git tracking"
```

### **Step 4: Clean Up Git Repository**
```bash
# Clean up loose objects and optimize repository
cd /workspaces/mymoolah-platform
git gc --aggressive --prune=now
git count-objects -vH
```

### **Step 5: Remove from Git History (Advanced - Optional)**
**⚠️ WARNING: This rewrites git history. Only do this if you're comfortable with force pushing.**

If you want to completely remove these files from git history (not just stop tracking them), you'll need to use `git filter-repo` or `git filter-branch`. This is more complex and requires force pushing.

**Option A: Using git-filter-repo (Recommended)**
```bash
# Install git-filter-repo first
pip install git-filter-repo

# Remove backups/ from entire git history
git filter-repo --path backups/ --invert-paths

# Remove cloud-sql-proxy binaries from entire git history
git filter-repo --path cloud-sql-proxy --invert-paths
git filter-repo --path bin/cloud-sql-proxy --invert-paths

# Force push (WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

**Option B: Using BFG Repo-Cleaner (Easier)**
```bash
# Download BFG (Java required)
# https://rtyley.github.io/bfg-repo-cleaner/

# Remove backups directory from history
java -jar bfg.jar --delete-folders backups

# Remove cloud-sql-proxy files
java -jar bfg.jar --delete-files cloud-sql-proxy
java -jar bfg.jar --delete-files bin/cloud-sql-proxy

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## ✅ **Safe Commands (No History Rewriting)**

If you want to avoid rewriting git history, just run Steps 1-4 above. This will:
- ✅ Stop tracking the files going forward
- ✅ Keep your git history intact
- ✅ Reduce future repository growth
- ⚠️ Files will still exist in git history (but won't grow larger)

---

## 📊 **Expected Results**

### **After Safe Cleanup (Steps 1-4)**:
- Git repository size: ~650MB → ~600MB (small reduction)
- Future growth: Prevented (files no longer tracked)
- Risk: Low (no history rewriting)

### **After Full Cleanup (Including Step 5)**:
- Git repository size: ~650MB → ~50-100MB (major reduction)
- Future growth: Prevented
- Risk: Medium (requires force push, affects all collaborators)

---

## 🎯 **Recommended Approach**

### **For Immediate Cost Savings (Recommended)**:
1. ✅ Run Steps 1-4 (Safe cleanup)
2. ✅ Stop Codespaces when not in use (biggest cost savings)
3. ✅ Use smaller machine types when possible
4. ⏳ Consider full cleanup (Step 5) later if needed

### **For Maximum Repository Size Reduction**:
1. ⚠️ Run all steps including Step 5 (Full cleanup)
2. ⚠️ Coordinate with team (if working with others)
3. ⚠️ Ensure all team members are aware of force push

---

## 🔍 **Verification Commands**

After cleanup, verify the results:

```bash
# Check git repository size
du -sh .git

# Check if backups/ is still tracked
git ls-files | grep "^backups/"

# Check if cloud-sql-proxy is still tracked
git ls-files | grep "cloud-sql-proxy"

# Check git object statistics
git count-objects -vH
```

---

## 📝 **Additional Recommendations**

1. **Update .gitignore** (already done):
   - ✅ Added `cloud-sql-proxy` and `bin/cloud-sql-proxy`
   - ✅ `backups/` already in .gitignore

2. **Prevent Future Issues**:
   - Always check `.gitignore` before committing
   - Never commit binary files or backups
   - Use Git LFS for necessary large files

3. **Cost Optimization**:
   - **Stop Codespaces when not in use** (saves compute hours)
   - Use smaller machine types when possible
   - Auto-stop Codespaces after inactivity

---

## 🆘 **Need Help?**

If you encounter any issues:
1. Check the backup tag created in Step 1
2. Review git log to see what changed
3. Contact me if you need assistance with the cleanup

---

## ✅ **Checklist**

- [ ] Read all steps carefully
- [ ] Create backup tag (Step 1)
- [ ] Remove backups/ from git tracking (Step 2)
- [ ] Remove cloud-sql-proxy binaries (Step 3)
- [ ] Clean up git repository (Step 4)
- [ ] Verify cleanup results
- [ ] (Optional) Remove from git history (Step 5)
- [ ] Push changes to GitHub

