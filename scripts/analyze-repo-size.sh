#!/bin/bash
# Repository Size Analysis Script
# Run this in Codespaces to identify optimization opportunities

echo "=========================================="
echo "  MyMoolah Repository Size Analysis"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1. Git Repository Size:"
GIT_SIZE=$(du -sh .git 2>/dev/null | awk '{print $1}')
echo -e "   ${GREEN}Total: ${GIT_SIZE}${NC}"
echo ""

echo "2. Git Object Statistics:"
git count-objects -vH 2>/dev/null | grep -E "(count|size|in-pack|packs)" | sed 's/^/   /'
echo ""

echo "3. Top 10 Largest Files in Git History:"
echo "   (Files that are tracked in git)"
LARGE_FILES=$(git rev-list --objects --all 2>/dev/null | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' 2>/dev/null | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort --numeric-sort --key=2 | \
  tail -10)

if [ -z "$LARGE_FILES" ]; then
  echo -e "   ${GREEN}No large files found in git history${NC}"
else
  echo "$LARGE_FILES" | while IFS= read -r line; do
    SIZE=$(echo "$line" | awk '{print $2}')
    FILE=$(echo "$line" | awk '{print $3}')
    # Convert bytes to human readable
    SIZE_HR=$(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE}B")
    echo -e "   ${YELLOW}${SIZE_HR}${NC} - ${FILE}"
  done
fi
echo ""

echo "4. Large Files in Working Directory (>5MB):"
echo "   (Files not in .gitignore)"
LARGE_WD=$(find . -type f -size +5M -not -path './.git/*' -not -path './node_modules/*' -not -path './backups/*' -exec ls -lh {} \; 2>/dev/null | awk '{print $5, $9}' | sort -h)

if [ -z "$LARGE_WD" ]; then
  echo -e "   ${GREEN}No large files found in working directory${NC}"
else
  echo "$LARGE_WD" | while IFS= read -r line; do
    echo -e "   ${YELLOW}${line}${NC}"
  done
fi
echo ""

echo "5. Top 10 Largest Directories:"
du -sh */ .[^.]* 2>/dev/null | sort -h | tail -10 | while IFS= read -r line; do
  echo "   $line"
done
echo ""

echo "6. Checking for Common Large File Types:"
echo "   Searching for .tar.gz, .zip, .pdf, .docx files..."
LARGE_ARCHIVES=$(find . -type f \( -name "*.tar.gz" -o -name "*.zip" -o -name "*.pdf" -o -name "*.docx" \) \
  -not -path './.git/*' -not -path './node_modules/*' -exec ls -lh {} \; 2>/dev/null | \
  awk '{print $5, $9}' | sort -h)

if [ -z "$LARGE_ARCHIVES" ]; then
  echo -e "   ${GREEN}No large archive/document files found${NC}"
else
  echo "$LARGE_ARCHIVES" | head -10 | while IFS= read -r line; do
    echo -e "   ${YELLOW}${line}${NC}"
  done
fi
echo ""

echo "7. Checking if backups/ directory is in git:"
if git ls-files | grep -q "^backups/"; then
  echo -e "   ${RED}WARNING: backups/ directory is tracked in git!${NC}"
  echo "   This should be in .gitignore"
  BACKUP_SIZE=$(du -sh backups/ 2>/dev/null | awk '{print $1}')
  echo "   Size: $BACKUP_SIZE"
else
  echo -e "   ${GREEN}OK: backups/ directory is not tracked in git${NC}"
fi
echo ""

echo "8. Checking for node_modules in git:"
if git ls-files | grep -q "node_modules/"; then
  echo -e "   ${RED}WARNING: node_modules/ is tracked in git!${NC}"
  echo "   This should be in .gitignore"
else
  echo -e "   ${GREEN}OK: node_modules/ is not tracked in git${NC}"
fi
echo ""

echo "9. Repository Cleanup Recommendations:"
echo ""
echo "   Safe to run immediately:"
echo "   - git gc --aggressive --prune=now"
echo "   - git remote prune origin"
echo ""
echo "   Review before running:"
echo "   - Check large files in git history (section 3)"
echo "   - Review large files in working directory (section 4)"
echo "   - Consider removing old branches"
echo ""

echo "=========================================="
echo "  Analysis Complete"
echo "=========================================="
echo ""
echo "💡 Tip: The biggest cost savings come from:"
echo "   1. Stopping Codespaces when not in use"
echo "   2. Using smaller machine types when possible"
echo "   3. Cleaning up large files from git history"
echo ""

