#!/bin/bash

##############################################################################
# Fix Merge Conflict and Continue
# 
# Purpose: Resolve merge conflict by stashing local changes, then pull
# Usage: ./scripts/fix-merge-and-continue.sh
##############################################################################

set -e

echo "🔧 Fixing merge conflict and pulling latest changes..."
echo ""

# Stash local changes
echo "Stashing local changes..."
git stash push -m "Local changes before pull $(date +%Y-%m-%d_%H:%M:%S)"

# Pull latest changes
echo "Pulling latest changes..."
git pull origin main

echo ""
echo "✅ Done! Latest changes pulled successfully."
echo ""
echo "💡 If you need your stashed changes back, run: git stash pop"
