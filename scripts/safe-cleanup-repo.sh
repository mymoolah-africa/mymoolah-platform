#!/bin/bash
# Safe Repository Cleanup Script
# This script removes large files from git tracking WITHOUT rewriting history
# Run this in Codespaces to reduce repository size

set -e  # Exit on error

echo "=========================================="
echo "  Safe Repository Cleanup"
echo "=========================================="
echo ""
echo "⚠️  This script will:"
echo "   1. Remove backups/ from git tracking (keeps local files)"
echo "   2. Remove cloud-sql-proxy binaries from git tracking"
echo "   3. Clean up git repository"
echo ""
echo "✅ Safe: Does NOT rewrite git history"
echo "✅ Safe: Keeps all local files"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Step 1: Creating backup tag..."
git tag backup-before-cleanup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup tag created: backup-before-cleanup-$(date +%Y%m%d-%H%M%S)"
echo ""

echo "Step 2: Removing backups/ from git tracking..."
if git ls-files | grep -q "^backups/"; then
    git rm -r --cached backups/
    echo "✅ Removed backups/ from git tracking"
else
    echo "ℹ️  backups/ not tracked in git (already removed)"
fi
echo ""

echo "Step 3: Removing cloud-sql-proxy binaries from git tracking..."
REMOVED=0
if git ls-files | grep -q "^cloud-sql-proxy$"; then
    git rm --cached cloud-sql-proxy
    REMOVED=1
    echo "✅ Removed cloud-sql-proxy from git tracking"
fi
if git ls-files | grep -q "^bin/cloud-sql-proxy$"; then
    git rm --cached bin/cloud-sql-proxy
    REMOVED=1
    echo "✅ Removed bin/cloud-sql-proxy from git tracking"
fi
if [ $REMOVED -eq 0 ]; then
    echo "ℹ️  cloud-sql-proxy binaries not tracked in git (already removed)"
fi
echo ""

echo "Step 4: Committing changes..."
if [ -n "$(git status --porcelain)" ]; then
    git commit -m "chore: remove large files from git tracking (backups/, cloud-sql-proxy)

- Removed backups/ directory (7.8GB) from git tracking
- Removed cloud-sql-proxy binaries (63MB) from git tracking
- Files remain locally but are no longer tracked in git
- Prevents future repository size growth"
    echo "✅ Changes committed"
else
    echo "ℹ️  No changes to commit (files already removed)"
fi
echo ""

echo "Step 5: Cleaning up git repository..."
git gc --aggressive --prune=now
echo "✅ Git repository cleaned"
echo ""

echo "Step 6: Showing results..."
echo ""
echo "Git repository size:"
du -sh .git
echo ""
echo "Git object statistics:"
git count-objects -vH | grep -E "(count|size|size-pack)"
echo ""

echo "=========================================="
echo "  Cleanup Complete!"
echo "=========================================="
echo ""
echo "✅ Large files removed from git tracking"
echo "✅ Local files preserved"
echo "✅ Git repository cleaned"
echo ""
echo "📝 Next steps:"
echo "   1. Review changes: git status"
echo "   2. Push to GitHub: git push origin main"
echo "   3. Push backup tag: git push origin backup-before-cleanup-*"
echo ""
echo "💡 Note: Files still exist in git history, but won't grow larger"
echo "   For complete removal from history, see docs/REPOSITORY_CLEANUP_PLAN.md"
echo ""

