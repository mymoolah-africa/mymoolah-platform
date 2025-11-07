# Codespaces Sync - Permanent Fix Script

**Use this script in Codespaces to permanently resolve .env merge conflicts**

## 🔧 **CODESPACES BACKEND FIX**

```bash
cd /workspaces/mymoolah-platform

# Pull latest code
git pull origin main

# Remove .env files from git tracking (keeps local files)
git rm --cached .env .env.backup 2>/dev/null || true

# If there are uncommitted changes, commit them
if [ -n "$(git status --porcelain)" ]; then
    git add .gitignore
    git commit -m "chore: remove .env files from git tracking"
    git push origin main
fi

# Verify .env files are no longer tracked
echo "Checking tracked .env files:"
git ls-files | grep "\.env" || echo "✅ No .env files tracked (correct!)"
```

## 🔧 **CODESPACES FRONTEND FIX**

```bash
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend

# Pull latest code
git pull origin main

# Remove .env files from git tracking (keeps local files)
git rm --cached .env .env.backup 2>/dev/null || true

# If there are uncommitted changes, commit them
if [ -n "$(git status --porcelain)" ]; then
    git add .gitignore
    git commit -m "chore: remove .env files from git tracking"
    git push origin main
fi

# Verify .env files are no longer tracked
echo "Checking tracked .env files:"
git ls-files | grep "\.env" || echo "✅ No .env files tracked (correct!)"
```

## ✅ **VERIFICATION**

After running both scripts:

```bash
# Backend
cd /workspaces/mymoolah-platform
git ls-files | grep "\.env"
# Should return: (empty)

# Frontend
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend
git ls-files | grep "\.env"
# Should return: (empty)
```

## 🎯 **RESULT**

- ✅ `.env` files no longer tracked
- ✅ No more merge conflicts
- ✅ Future `git pull` will work smoothly
- ✅ Each environment keeps its own `.env`


