#!/bin/bash

# MyMoolah Backup Script
# Creates a timestamped .tar.gz backup of the project

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="mymoolah-backup-${TIMESTAMP}.tar.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "🔒 Creating MyMoolah backup..."
echo "📁 Project directory: $PROJECT_DIR"
echo "📦 Backup file: $BACKUP_NAME"

# Create backup excluding unnecessary directories
cd "$PROJECT_DIR"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='uploads' \
    --exclude='data' \
    -czf "$BACKUP_PATH" .

# Calculate file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

echo "✅ Backup created successfully!"
echo "📊 Backup size: $BACKUP_SIZE"
echo "📍 Location: $BACKUP_PATH"

# Create SHA256 checksum
CHECKSUM_FILE="$BACKUP_PATH.sha256"
sha256sum "$BACKUP_PATH" > "$CHECKSUM_FILE"
echo "🔐 Checksum: $CHECKSUM_FILE"

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -la "$BACKUP_DIR"/mymoolah-backup-*.tar.gz | tail -5

echo ""
echo "🎯 Backup complete! You can restore with:"
echo "   tar -xzf $BACKUP_PATH"
