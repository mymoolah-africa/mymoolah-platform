#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# Use staging-specific settings
export PROXY_PORT="${STAGING_PROXY_PORT:-5434}"
export INSTANCE_CONN_NAME="mymoolah-db:africa-south1:mmtp-pg-staging"
export ENV_FILE="${ENV_FILE:-.env.staging}"

echo "[start-staging] Using Cloud SQL instance: ${INSTANCE_CONN_NAME}"
echo "[start-staging] Proxy port: ${PROXY_PORT}"
echo "[start-staging] Environment file: ${ENV_FILE}"

exec "${SCRIPT_DIR}/start-codespace-with-proxy.sh"


