#!/bin/bash
# Quick fix for Codespaces git pull editor issue

# Abort any pending merge
git merge --abort 2>/dev/null || true

# Pull with no editor
GIT_MERGE_AUTOEDIT=no git pull origin main 2>/dev/null || git pull origin main --no-edit

# Complete any pending merge
git commit --no-edit 2>/dev/null || true

# Check status
echo "Git status:"
git status

# Run test
echo ""
echo "Running MobileMart UAT test..."
node scripts/test-mobilemart-purchases.js

