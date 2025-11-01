#!/usr/bin/env bash
set -euo pipefail

# Secure Cloud SQL Auth Proxy bootstrap for Codespaces
# Requirements (provided via environment or Codespaces secrets):
#  - GCP_SQL_INSTANCE: <PROJECT>:<REGION>:<INSTANCE>
#  - GCP_SA_KEY_JSON: service account JSON (base64 or raw JSON)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN_PATH="$ROOT_DIR/cloud-sql-proxy"
SA_PATH="$ROOT_DIR/.gcp-sa.json"

if [[ -z "${GCP_SQL_INSTANCE:-}" ]]; then
  echo "ERROR: GCP_SQL_INSTANCE is not set (expected <PROJECT>:<REGION>:<INSTANCE>)." >&2
  exit 1
fi

if [[ -z "${GCP_SA_KEY_JSON:-}" ]]; then
  echo "ERROR: GCP_SA_KEY_JSON is not set (service account json)." >&2
  exit 1
fi

# Write SA JSON (supports base64 or raw)
if echo "$GCP_SA_KEY_JSON" | grep -q "^{\""; then
  printf '%s' "$GCP_SA_KEY_JSON" > "$SA_PATH"
else
  echo "$GCP_SA_KEY_JSON" | base64 --decode > "$SA_PATH"
fi
chmod 600 "$SA_PATH"

# Fetch proxy if missing
if [[ ! -x "$BIN_PATH" ]]; then
  curl -sSL -o "$BIN_PATH" https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.3/cloud-sql-proxy.linux.amd64
  chmod +x "$BIN_PATH"
fi

# Kill any existing proxy on 5433
if lsof -i :5433 >/dev/null 2>&1; then
  lsof -ti :5433 | xargs -r kill -9 || true
fi

"$BIN_PATH" --address 127.0.0.1 --port 5433 "$GCP_SQL_INSTANCE" \
  --credentials-file "$SA_PATH" \
  >/tmp/cloudsql.log 2>&1 &

# Simple readiness check
for i in {1..20}; do
  sleep 0.5
  nc -z 127.0.0.1 5433 && { echo "Cloud SQL proxy is up on 127.0.0.1:5433"; exit 0; }
done

echo "ERROR: Cloud SQL proxy did not become ready on 127.0.0.1:5433" >&2
exit 1


