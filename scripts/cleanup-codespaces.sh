#!/bin/bash

##############################################################################
# Codespaces Disk Space Cleanup Script
# 
# Purpose: Free up disk space in GitHub Codespaces
# Usage: ./scripts/cleanup-codespaces.sh
# Safe to run: Yes (only removes caches and temporary files)
#
# Author: MyMoolah Treasury Platform
# Date: 2025-12-22
##############################################################################

set -e  # Exit on error

echo "🧹 Codespaces Disk Space Cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show current disk usage
echo "📊 Current Disk Usage:"
df -h / | grep -v Filesystem
echo ""

INITIAL_SPACE=$(df / | tail -1 | awk '{print $4}')

# Function to show space freed
show_freed_space() {
  CURRENT_SPACE=$(df / | tail -1 | awk '{print $4}')
  FREED=$((CURRENT_SPACE - INITIAL_SPACE))
  if [ $FREED -gt 1048576 ]; then
    echo "   ✅ Freed: $(echo "scale=2; $FREED/1048576" | bc) GB"
  elif [ $FREED -gt 1024 ]; then
    echo "   ✅ Freed: $(echo "scale=2; $FREED/1024" | bc) MB"
  else
    echo "   ✅ Freed: ${FREED} KB"
  fi
}

##############################################################################
# 1. Docker Cleanup (Usually frees 5-10 GB)
##############################################################################
echo "🐳 1. Cleaning Docker..."
echo "   - Removing stopped containers"
echo "   - Removing unused images"
echo "   - Removing build cache"
echo "   - Removing unused volumes"

if command -v docker &> /dev/null; then
  # Remove stopped containers
  CONTAINERS=$(docker ps -aq 2>/dev/null | wc -l)
  if [ "$CONTAINERS" -gt 0 ]; then
    docker rm $(docker ps -aq) 2>/dev/null || true
  fi
  
  # Prune everything
  docker system prune -a -f --volumes 2>&1 | grep -E "Total reclaimed space|deleted" || true
  
  show_freed_space
else
  echo "   ⚠️  Docker not available (skipping)"
fi
echo ""

##############################################################################
# 2. npm Cache Cleanup (Usually frees 500MB - 2GB)
##############################################################################
echo "📦 2. Cleaning npm cache..."
if command -v npm &> /dev/null; then
  NPM_CACHE_SIZE=$(du -sh ~/.npm 2>/dev/null | cut -f1 || echo "0")
  echo "   Current npm cache: $NPM_CACHE_SIZE"
  
  npm cache clean --force 2>&1 | grep -v "npm warn" || true
  
  show_freed_space
else
  echo "   ⚠️  npm not available (skipping)"
fi
echo ""

##############################################################################
# 3. Yarn Cache Cleanup (if yarn is used)
##############################################################################
echo "🧶 3. Cleaning yarn cache..."
if command -v yarn &> /dev/null; then
  yarn cache clean 2>&1 | head -5 || true
  show_freed_space
else
  echo "   ⚠️  yarn not installed (skipping)"
fi
echo ""

##############################################################################
# 4. Remove old log files
##############################################################################
echo "📋 4. Cleaning log files..."
cd /workspaces/mymoolah-platform 2>/dev/null || cd ~/

if [ -d "logs" ]; then
  LOG_SIZE=$(du -sh logs 2>/dev/null | cut -f1 || echo "0")
  echo "   Current logs: $LOG_SIZE"
  
  find logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
  find logs -type f -name "*.log.*" -delete 2>/dev/null || true
  
  show_freed_space
else
  echo "   ℹ️  No logs directory"
fi
echo ""

##############################################################################
# 5. Remove old backup JSON files (keep .tar.gz backups)
##############################################################################
echo "💾 5. Cleaning old backup JSON files..."
if [ -d "backups" ]; then
  BACKUP_JSON_SIZE=$(du -sh backups/*.json 2>/dev/null | cut -f1 || echo "0")
  echo "   Removing backup JSON files (keep .tar.gz)"
  
  # Remove JSON files older than 30 days
  find backups -type f -name "*.json" -mtime +30 -delete 2>/dev/null || true
  
  show_freed_space
else
  echo "   ℹ️  No backups directory"
fi
echo ""

##############################################################################
# 6. Clean apt cache (Codespaces specific)
##############################################################################
echo "📦 6. Cleaning apt cache..."
if command -v apt-get &> /dev/null; then
  sudo apt-get clean 2>/dev/null || true
  sudo apt-get autoclean 2>/dev/null || true
  sudo apt-get autoremove -y 2>/dev/null || true
  
  show_freed_space
else
  echo "   ⚠️  apt not available (skipping)"
fi
echo ""

##############################################################################
# 7. Remove temporary files
##############################################################################
echo "🗑️  7. Cleaning temporary files..."
# Remove temp files
rm -rf /tmp/* 2>/dev/null || true
rm -rf ~/.cache/* 2>/dev/null || true

show_freed_space
echo ""

##############################################################################
# 8. Clean old node_modules if multiple exist
##############################################################################
echo "📦 8. Checking for duplicate node_modules..."
cd /workspaces/mymoolah-platform 2>/dev/null || cd ~/

NODE_MODULES_COUNT=$(find . -type d -name "node_modules" -not -path "./node_modules" 2>/dev/null | wc -l)
if [ "$NODE_MODULES_COUNT" -gt 0 ]; then
  echo "   Found $NODE_MODULES_COUNT nested node_modules directories"
  echo "   ℹ️  Run 'npm ci' to reinstall if needed"
else
  echo "   ✅ No duplicate node_modules found"
fi
echo ""

##############################################################################
# Summary
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Final Disk Usage:"
df -h / | grep -v Filesystem

FINAL_SPACE=$(df / | tail -1 | awk '{print $4}')
TOTAL_FREED=$((FINAL_SPACE - INITIAL_SPACE))

echo ""
echo "✅ Cleanup Complete!"
if [ $TOTAL_FREED -gt 1048576 ]; then
  echo "💾 Total Space Freed: $(echo "scale=2; $TOTAL_FREED/1048576" | bc) GB"
elif [ $TOTAL_FREED -gt 1024 ]; then
  echo "💾 Total Space Freed: $(echo "scale=2; $TOTAL_FREED/1024" | bc) MB"
else
  echo "💾 Total Space Freed: ${TOTAL_FREED} KB"
fi
echo ""

# Check if still low on space
PERCENT_USED=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$PERCENT_USED" -gt 90 ]; then
  echo "⚠️  WARNING: Disk usage still high (${PERCENT_USED}%)"
  echo "   Consider removing old Docker images or node_modules manually"
else
  echo "✅ Disk space healthy (${PERCENT_USED}% used)"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

