#!/bin/bash
# Permanent fix for .env merge conflicts
# This script removes .env files from git tracking while keeping them locally

set -e

echo "🔧 PERMANENT FIX: Removing .env files from git tracking"
echo ""

# Backend .env
if [ -f ".env" ]; then
    echo "✅ Backend .env exists locally"
    git rm --cached .env 2>/dev/null || echo "   (not tracked)"
fi

if [ -f ".env.backup" ]; then
    echo "✅ Backend .env.backup exists locally"
    git rm --cached .env.backup 2>/dev/null || echo "   (not tracked)"
fi

# Frontend .env
if [ -f "mymoolah-wallet-frontend/.env" ]; then
    echo "✅ Frontend .env exists locally"
    git rm --cached mymoolah-wallet-frontend/.env 2>/dev/null || echo "   (not tracked)"
fi

if [ -f "mymoolah-wallet-frontend/.env.backup" ]; then
    echo "✅ Frontend .env.backup exists locally"
    git rm --cached mymoolah-wallet-frontend/.env.backup 2>/dev/null || echo "   (not tracked)"
fi

echo ""
echo "✅ .env files removed from git tracking"
echo "✅ Local .env files preserved"
echo ""
echo "Next steps:"
echo "1. Commit this change: git commit -m 'chore: remove .env files from git tracking'"
echo "2. Push to GitHub: git push origin main"
echo "3. In Codespaces, run the same commands to remove from tracking there"

