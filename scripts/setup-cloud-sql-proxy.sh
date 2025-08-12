#!/usr/bin/env bash
set -euo pipefail

# Config
INSTANCE_CONN_NAME="mymoolah-db:africa-south1:mmtp-pg"
BIN_DIR="$(cd "$(dirname "$0")/.." && pwd)/bin"
mkdir -p "$BIN_DIR"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64|amd64) ARCH=amd64;;
  arm64|aarch64) ARCH=arm64;;
esac

URL="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.3/cloud-sql-proxy.$OS.$ARCH"
DEST="$BIN_DIR/cloud-sql-proxy"

echo "Downloading Cloud SQL Auth Proxy from $URL ..."
curl -fsSL "$URL" -o "$DEST"
chmod +x "$DEST"

echo "Cloud SQL Auth Proxy installed at $DEST"
echo "To run it on port 5433 with IAM auth disabled and TLS verified, use:"
cat <<CMD
$DEST \
  --address 127.0.0.1 \
  --port 5433 \
  --verbose \
  $INSTANCE_CONN_NAME
CMD


