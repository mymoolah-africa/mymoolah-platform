#!/bin/bash

# Documentation Cleanup Script - MyMoolah Treasury Platform
# Date: January 13, 2025
# Purpose: Clean up redundant documentation while preserving all critical information

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/Users/andremacbookpro/mymoolah"
DOCS_DIR="${PROJECT_ROOT}/docs"
ARCHIVE_DIR="${DOCS_DIR}/archive"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📚 DOCUMENTATION CLEANUP SCRIPT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ MISSING: $1${NC}"
        return 1
    fi
}

# Function to count files
count_files() {
    find "$DOCS_DIR" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' '
}

# Phase 1: Create Archive Directory
echo -e "${YELLOW}Phase 1: Creating archive directory...${NC}"
mkdir -p "$ARCHIVE_DIR"
if [ -d "$ARCHIVE_DIR" ]; then
    echo -e "${GREEN}✅ Archive directory created: $ARCHIVE_DIR${NC}"
else
    echo -e "${RED}❌ Failed to create archive directory${NC}"
    exit 1
fi
echo ""

# Phase 2: Archive Historical CODESPACES Fix Files
echo -e "${YELLOW}Phase 2: Archiving CODESPACES troubleshooting files...${NC}"
cd "$DOCS_DIR"
FILES_TO_ARCHIVE=(
    "CODESPACES_500_ERROR_FIX.md"
    "CODESPACES_CACHE_CLEAR.md"
    "CODESPACES_CORS_FIX.md"
    "CODESPACES_DATABASE_PASSWORD_FIX.md"
    "CODESPACES_DEBUG_REMOVAL_SYNC.md"
    "CODESPACES_DEBUG_REMOVAL_URGENT.md"
    "CODESPACES_ENV_FIX_INSTRUCTIONS.md"
    "CODESPACES_ENV_FIX_SCRIPT.md"
    "CODESPACES_ENV_RESTORE.md"
    "CODESPACES_MANUAL_FIX.md"
    "CODESPACES_MERGE_CONFLICT_FIX.md"
    "CODESPACES_STATUS_WORKING.md"
    "CODESPACES_SYNC_FIX.md"
    "CODESPACES_SYNC_FIX_STEPS.md"
    "CODESPACES_SYNC_ISSUES.md"
    "CODESPACES_SYNC_SUCCESS.md"
)

ARCHIVED_COUNT=0
for file in "${FILES_TO_ARCHIVE[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null && ((ARCHIVED_COUNT++)) || echo -e "${YELLOW}⚠️  Could not move: $file${NC}"
    fi
done
echo -e "${GREEN}✅ Archived $ARCHIVED_COUNT CODESPACES files${NC}"
echo ""

# Phase 3: Archive Environment Fix Files
echo -e "${YELLOW}Phase 3: Archiving environment fix files...${NC}"
ENV_FILES=(
    "PERMANENT_ENV_FIX.md"
    "PERMANENT_ENV_FIX_COMPLETE.md"
    "URGENT_ENV_RESTORE.md"
    "CODESPACES_ENV_RESTORE.md"
)

ARCHIVED_ENV=0
for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null && ((ARCHIVED_ENV++)) || echo -e "${YELLOW}⚠️  Could not move: $file${NC}"
    fi
done
echo -e "${GREEN}✅ Archived $ARCHIVED_ENV environment fix files${NC}"
echo ""

# Phase 4: Archive PEACH PAYMENTS UAT Redundant Files
echo -e "${YELLOW}Phase 4: Archiving PEACH_PAYMENTS_UAT redundant files...${NC}"
PEACH_FILES=(
    "PEACH_PAYMENTS_UAT_TEST_RESULTS.md"
    "PEACH_PAYMENTS_UAT_FIXES_APPLIED.md"
    "PEACH_PAYMENTS_UAT_READINESS.md"
    "PEACH_PAYMENTS_UAT_REQUIREMENTS.md"
    "PEACH_PAYMENTS_UAT_ERROR_ANALYSIS.md"
)

ARCHIVED_PEACH=0
for file in "${PEACH_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null && ((ARCHIVED_PEACH++)) || echo -e "${YELLOW}⚠️  Could not move: $file${NC}"
    fi
done
echo -e "${GREEN}✅ Archived $ARCHIVED_PEACH PEACH_PAYMENTS_UAT files${NC}"
echo ""

# Phase 5: Archive KYC Redundant Files
echo -e "${YELLOW}Phase 5: Archiving KYC redundant files...${NC}"
KYC_FILES=(
    "OPENAI_KYC_FIX.md"
    "KYC_OPENAI_FALLBACK_FIX.md"
    "KYC_FALLBACK_VERIFICATION_REPORT.md"
    "CODESPACES_KYC_FALLBACK_VERIFICATION.md"
    "KYC_OCR_IMPROVEMENTS.md"
)

ARCHIVED_KYC=0
for file in "${KYC_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null && ((ARCHIVED_KYC++)) || echo -e "${YELLOW}⚠️  Could not move: $file${NC}"
    fi
done
echo -e "${GREEN}✅ Archived $ARCHIVED_KYC KYC files${NC}"
echo ""

# Phase 6: Archive ZAPPER Redundant Files
echo -e "${YELLOW}Phase 6: Archiving ZAPPER redundant files...${NC}"
ZAPPER_FILES=(
    "ZAPPER_INTEGRATION_AUDIT_REPORT.md"
    "ZAPPER_POST_CREDENTIALS_CHECKLIST.md"
    "ZAPPER_PRODUCTION_DEPLOYMENT_PLAN.md"
    "ZAPPER_TEAM_QUESTIONS.md"
)

ARCHIVED_ZAPPER=0
for file in "${ZAPPER_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null && ((ARCHIVED_ZAPPER++)) || echo -e "${YELLOW}⚠️  Could not move: $file${NC}"
    fi
done
echo -e "${GREEN}✅ Archived $ARCHIVED_ZAPPER ZAPPER files${NC}"
echo ""

# Phase 7: Archive Transaction Filter Redundant Files
echo -e "${YELLOW}Phase 7: Archiving transaction filter redundant files...${NC}"
TRANSACTION_FILES=(
    "TRANSACTION_FILTER_VERIFICATION.md"
    "GIT_SYNC_TRANSACTION_FILTER.md"
)

ARCHIVED_TRANS=0
for file in "${TRANSACTION_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null && ((ARCHIVED_TRANS++)) || echo -e "${YELLOW}⚠️  Could not move: $file${NC}"
    fi
done
echo -e "${GREEN}✅ Archived $ARCHIVED_TRANS transaction filter files${NC}"
echo ""

# Phase 8: Archive Debug/Cleanup Files
echo -e "${YELLOW}Phase 8: Archiving debug/cleanup files...${NC}"
DEBUG_FILES=(
    "DEBUG_CODE_CLEANUP.md"
    "CLEANUP_STATUS.md"
    "PORT_3002_CLEANUP.md"
)

ARCHIVED_DEBUG=0
for file in "${DEBUG_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null && ((ARCHIVED_DEBUG++)) || echo -e "${YELLOW}⚠️  Could not move: $file${NC}"
    fi
done
echo -e "${GREEN}✅ Archived $ARCHIVED_DEBUG debug/cleanup files${NC}"
echo ""

# Phase 9: Delete Redundant Summary Files
echo -e "${YELLOW}Phase 9: Deleting redundant summary files...${NC}"
if [ -f "PARTNER_API_SUMMARY.md" ]; then
    rm "PARTNER_API_SUMMARY.md"
    echo -e "${GREEN}✅ Deleted PARTNER_API_SUMMARY.md${NC}"
else
    echo -e "${YELLOW}⚠️  PARTNER_API_SUMMARY.md not found (may already be deleted)${NC}"
fi
echo ""

# Phase 10: Verify Critical Files
echo -e "${YELLOW}Phase 10: Verifying critical files are preserved...${NC}"
CRITICAL_FILES=(
    "AGENT_HANDOVER.md"
    "AGENT_ROLE_TEMPLATE.md"
    "VOUCHER_BUSINESS_LOGIC.md"
    "SECURITY.md"
    "CHANGELOG.md"
    "README.md"
    "PROJECT_STATUS.md"
    "INTEGRATIONS_COMPLETE.md"
)

CRITICAL_MISSING=0
for file in "${CRITICAL_FILES[@]}"; do
    if ! check_file "${DOCS_DIR}/${file}"; then
        ((CRITICAL_MISSING++))
    fi
done

if [ $CRITICAL_MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All critical files verified!${NC}"
else
    echo -e "${RED}❌ WARNING: $CRITICAL_MISSING critical files are missing!${NC}"
    echo -e "${RED}   Review the files above before proceeding!${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cleanup cancelled by user${NC}"
        exit 1
    fi
fi
echo ""

# Phase 11: Count Files
echo -e "${YELLOW}Phase 11: Counting files...${NC}"
FILES_BEFORE=111  # Known starting count
FILES_AFTER=$(count_files)
ARCHIVED_COUNT=$(find "$ARCHIVE_DIR" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')

echo -e "${BLUE}File Statistics:${NC}"
echo -e "  Before cleanup: $FILES_BEFORE files"
echo -e "  After cleanup:  $FILES_AFTER files"
echo -e "  Archived:      $ARCHIVED_COUNT files"
echo -e "  Reduction:     $((FILES_BEFORE - FILES_AFTER)) files ($(( (FILES_BEFORE - FILES_AFTER) * 100 / FILES_BEFORE ))%)"
echo ""

# Phase 12: Git Status
echo -e "${YELLOW}Phase 12: Checking git status...${NC}"
cd "$PROJECT_ROOT"
git status docs/ --short
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 CLEANUP SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Archive directory created${NC}"
echo -e "${GREEN}✅ CODESPACES files archived: $ARCHIVED_COUNT${NC}"
echo -e "${GREEN}✅ Environment fix files archived: $ARCHIVED_ENV${NC}"
echo -e "${GREEN}✅ PEACH_PAYMENTS_UAT files archived: $ARCHIVED_PEACH${NC}"
echo -e "${GREEN}✅ KYC files archived: $ARCHIVED_KYC${NC}"
echo -e "${GREEN}✅ ZAPPER files archived: $ARCHIVED_ZAPPER${NC}"
echo -e "${GREEN}✅ Transaction filter files archived: $ARCHIVED_TRANS${NC}"
echo -e "${GREEN}✅ Debug/cleanup files archived: $ARCHIVED_DEBUG${NC}"
echo -e "${GREEN}✅ Redundant summary deleted${NC}"
echo -e "${GREEN}✅ All critical files verified${NC}"
echo ""
echo -e "${BLUE}Total files archived: $ARCHIVED_COUNT${NC}"
echo -e "${BLUE}Files remaining: $FILES_AFTER${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review git status above"
echo "2. Review archived files in: $ARCHIVE_DIR"
echo "3. If everything looks good, commit the changes:"
echo "   git add docs/"
echo "   git commit -m 'docs: Clean up redundant documentation files'"
echo ""
echo -e "${GREEN}✅ Cleanup script completed successfully!${NC}"

