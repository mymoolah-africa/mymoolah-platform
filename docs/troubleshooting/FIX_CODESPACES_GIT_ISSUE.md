# Fix Codespaces Git Issue - FETCH_HEAD and main showing as untracked

**Issue**: `FETCH_HEAD` and `main` appearing as untracked files in VS Code Source Control panel.

---

## 🔍 **Diagnosis Commands (Run in CS)**

```bash
cd /workspaces/mymoolah-platform

# Check if these are actual files in the working directory
ls -la FETCH_HEAD main 2>&1

# Check git status
git status

# Check if there are actual files with these names
find . -maxdepth 1 -name "FETCH_HEAD" -o -name "main" 2>/dev/null

# Check git repository state
git log --oneline -5
git branch -a
```

---

## ✅ **Fix Commands**

### **Option 1: If these are actual files (shouldn't exist)**

```bash
cd /workspaces/mymoolah-platform

# Remove any files with these names (if they exist)
rm -f FETCH_HEAD main

# Verify they're gone
ls -la FETCH_HEAD main 2>&1 || echo "✅ Files removed"

# Refresh git status
git status
```

### **Option 2: If VS Code Source Control is confused**

```bash
cd /workspaces/mymoolah-platform

# Refresh git state
git fetch origin
git status

# If still showing, try:
git gc --prune=now
git status
```

### **Option 3: Reset VS Code Source Control**

1. Close VS Code Source Control panel
2. Reload VS Code window: `Cmd+Shift+P` → "Reload Window"
3. Reopen Source Control panel

### **Option 4: Clean git state** ⚠️ **DANGEROUS - READ WARNING**

**⚠️ CRITICAL WARNING:** `git clean -fd` **DELETES ALL UNTRACKED FILES**, including `.env`!
Your Codespaces `.env` contains UAT keys and secrets. **DO NOT run `git clean -fd`** unless you have a backup.

**If you must run it:**
1. **First backup .env:** `cp .env .env.backup.$(date +%Y%m%d)`
2. Then run the commands below
3. **Restore .env:** `cp .env.backup.* .env`

```bash
cd /workspaces/mymoolah-platform

# BACKUP .env FIRST!
cp .env .env.backup.$(date +%Y%m%d) 2>/dev/null || true

# Ensure clean state
git fetch origin
git reset --hard origin/main
# git clean -fd  # REMOVED - use only if you understand it deletes .env
git status
```

**Prefer Option 1, 2, or 3** instead of Option 4.

---

## 🎯 **Expected Result**

After running the fix:
- `git status` should show clean working tree
- VS Code Source Control should not show `FETCH_HEAD` or `main` as files
- Only actual changed files should appear

---

## 📋 **If Issue Persists**

1. Check if there are actual files: `ls -la FETCH_HEAD main`
2. Check git status: `git status --porcelain`
3. Reload VS Code window
4. Check VS Code Source Control settings
