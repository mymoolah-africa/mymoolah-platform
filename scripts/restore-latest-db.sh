#!/usr/bin/env bash
# Restore the SQLite database from the most recent backup in backups/
# Usage: bash scripts/restore-latest-db.sh

set -euo pipefail

# Always run from repo root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${SCRIPT_DIR%/scripts}"
cd "$REPO_ROOT"

BACKUP_DIR="backups"
DB_DIR="data"
DB_FILE="$DB_DIR/mymoolah.db"

# Find newest backup that matches our naming scheme
LATEST_BACKUP=$(ls -1t "$BACKUP_DIR"/mymoolah-db-*.sqlite 2>/dev/null | head -n 1 || true)

if [[ -z "${LATEST_BACKUP}" ]]; then
  echo "❌ No backups found in $BACKUP_DIR (expected files like mymoolah-db-YYYYmmdd-HHMMSS.sqlite)" >&2
  exit 1
fi

mkdir -p "$DB_DIR"

# Safety: backup current DB before restoring
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
if [[ -f "$DB_FILE" ]]; then
  cp "$DB_FILE" "$BACKUP_DIR/mymoolah-db-before-restore-$TIMESTAMP.sqlite"
  echo "🛟 Current DB backed up to $BACKUP_DIR/mymoolah-db-before-restore-$TIMESTAMP.sqlite"
fi

cp -f "$LATEST_BACKUP" "$DB_FILE"
echo "✅ Restored: $LATEST_BACKUP → $DB_FILE"

echo "ℹ️  If your backend server is running, restart it to pick up the restored DB."

