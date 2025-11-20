#!/bin/bash
# Old Branch Cleanup Script
# This script helps clean up old branches that are safe to delete

set -e  # Exit on error

echo "=========================================="
echo "  Old Branch Cleanup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Checking branch status..."
echo ""

# Check which branches are merged
echo "Branches merged into main:"
MERGED=$(git branch -r --merged main | grep -v "HEAD\|main" | sed 's|origin/||')
if [ -z "$MERGED" ]; then
    echo -e "   ${GREEN}None${NC}"
else
    echo "$MERGED" | while read -r branch; do
        echo -e "   ${GREEN}✓${NC} $branch"
    done
fi
echo ""

# Safe to delete (backup branches)
echo "=== Safe to Delete (Backup Branches) ==="
echo ""
echo "1. backup-pre-cleanup (4 months old, backup branch)"
echo "2. backup/pre-reset-20250811-135131 (3 months old, backup branch)"
echo ""

read -p "Delete backup branches? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deleting backup branches..."
    
    if git show-ref --verify --quiet refs/remotes/origin/backup-pre-cleanup; then
        git push origin --delete backup-pre-cleanup 2>/dev/null && echo -e "   ${GREEN}✓${NC} Deleted backup-pre-cleanup" || echo -e "   ${RED}✗${NC} Failed to delete backup-pre-cleanup"
    else
        echo -e "   ${YELLOW}ℹ${NC} backup-pre-cleanup not found"
    fi
    
    if git show-ref --verify --quiet refs/remotes/origin/backup/pre-reset-20250811-135131; then
        git push origin --delete backup/pre-reset-20250811-135131 2>/dev/null && echo -e "   ${GREEN}✓${NC} Deleted backup/pre-reset-20250811-135131" || echo -e "   ${RED}✗${NC} Failed to delete backup/pre-reset-20250811-135131"
    else
        echo -e "   ${YELLOW}ℹ${NC} backup/pre-reset-20250811-135131 not found"
    fi
else
    echo "Skipped backup branch deletion"
fi
echo ""

# Branches that need review
echo "=== Branches Needing Review ==="
echo ""
echo "These branches may have unique commits or open PRs:"
echo ""
echo "1. sync/local-20250812-0547 (PR #4, 3 months old)"
echo "2. sync/local-20250812-195209 (PR #6, 3 months old)"
echo "3. chore/cs-autostart-redis-quiet-20251101 (PR #7, merged into main)"
echo "4. docs/codespaces-updates-20251101 (1 unique commit, 2 weeks old)"
echo "5. wip/local-20251101-1558 (1 unique commit, 3 weeks old)"
echo "6. gh-pages (GitHub Pages branch, keep if using Pages)"
echo ""

read -p "Review and delete merged branches? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Checking merged branches..."
    
    # Check chore/cs-autostart-redis-quiet-20251101 (already merged)
    if git show-ref --verify --quiet refs/remotes/origin/chore/cs-autostart-redis-quiet-20251101; then
        if git branch -r --merged main | grep -q "chore/cs-autostart-redis-quiet-20251101"; then
            read -p "Delete chore/cs-autostart-redis-quiet-20251101 (merged, PR #7)? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push origin --delete chore/cs-autostart-redis-quiet-20251101 2>/dev/null && echo -e "   ${GREEN}✓${NC} Deleted chore/cs-autostart-redis-quiet-20251101" || echo -e "   ${RED}✗${NC} Failed to delete"
            fi
        fi
    fi
    
    echo ""
    echo "⚠️  Other branches need manual review:"
    echo "   - Check PR #4, #6 status before deleting sync branches"
    echo "   - Review unique commits in docs/codespaces-updates-20251101"
    echo "   - Review unique commits in wip/local-20251101-1558"
    echo "   - Keep gh-pages if using GitHub Pages"
else
    echo "Skipped merged branch deletion"
fi
echo ""

# Clean up local branches
echo "=== Local Branch Cleanup ==="
echo ""
LOCAL_BRANCHES=$(git branch | grep -v "main" | sed 's/^[ *]*//')
if [ -z "$LOCAL_BRANCHES" ]; then
    echo -e "   ${GREEN}No local branches to clean${NC}"
else
    echo "Local branches:"
    echo "$LOCAL_BRANCHES" | while read -r branch; do
        echo "   - $branch"
    done
    echo ""
    read -p "Delete local branches? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$LOCAL_BRANCHES" | while read -r branch; do
            if git branch -d "$branch" 2>/dev/null; then
                echo -e "   ${GREEN}✓${NC} Deleted local branch: $branch"
            else
                echo -e "   ${YELLOW}ℹ${NC} Could not delete $branch (may have unmerged changes)"
            fi
        done
    fi
fi
echo ""

# Prune remote tracking
echo "=== Pruning Remote Tracking ==="
echo ""
git remote prune origin
echo -e "   ${GREEN}✓${NC} Pruned remote tracking references"
echo ""

echo "=========================================="
echo "  Cleanup Complete!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "   1. Review PRs #4, #6 before deleting sync branches"
echo "   2. Review unique commits in docs/codespaces-updates-20251101"
echo "   3. Review unique commits in wip/local-20251101-1558"
echo "   4. Keep gh-pages if using GitHub Pages"
echo ""

