#!/usr/bin/env bash

# Create Session Log Script
# Creates a new session log file with template content
# Usage: ./scripts/create-session-log.sh "brief description"

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

SESSION_LOGS_DIR="$REPO_DIR/docs/session_logs"
TEMPLATE_FILE="$REPO_DIR/docs/session_logs/TEMPLATE.md"

if [ ! -d "$SESSION_LOGS_DIR" ]; then
  echo "Creating session logs directory..."
  mkdir -p "$SESSION_LOGS_DIR"
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ Template file not found: $TEMPLATE_FILE"
  exit 1
fi

# Get description from command line or prompt
if [ $# -eq 0 ]; then
  echo "Enter a brief description for this session:"
  read -r DESCRIPTION
else
  DESCRIPTION="$1"
fi

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
# Sanitize description for filename
FILENAME_DESC=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
FILENAME="${TIMESTAMP}_${FILENAME_DESC}.md"
FILEPATH="$SESSION_LOGS_DIR/$FILENAME"

# Get current date/time for template
CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_TIME=$(date +"%H:%M")

# Copy template and replace placeholders
cp "$TEMPLATE_FILE" "$FILEPATH"

# Replace placeholders in the file
sed -i.bak "s/\[Date\]/$CURRENT_DATE/g" "$FILEPATH"
sed -i.bak "s/\[Brief Description\]/$DESCRIPTION/g" "$FILEPATH"
sed -i.bak "s/YYYY-MM-DD HH:MM/$CURRENT_DATE $CURRENT_TIME/g" "$FILEPATH"
rm -f "${FILEPATH}.bak"

echo "✅ Session log created: $FILEPATH"
echo ""
echo "📝 Edit the file to fill in session details:"
echo "   open $FILEPATH"
echo ""
echo "💡 After editing, commit it:"
echo "   git add $FILEPATH"
echo "   git commit -m \"docs: add session log for $DESCRIPTION\""

