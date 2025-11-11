#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/workspaces/mymoolah-platform"
PROXY_PORT="6543"
PROXY_LOG="/tmp/cloud-sql-proxy.log"
INSTANCE_CONN_NAME="mymoolah-db:africa-south1:mmtp-pg"

log() {
  printf '[proxy-startup] %s\n' "$*"
}

error() {
  printf '[proxy-startup][error] %s\n' "$*" >&2
}

ensure_in_project_root() {
  if [ ! -d "${ROOT_DIR}" ]; then
    error "Expected project directory at ${ROOT_DIR} not found."
    exit 1
  fi
  cd "${ROOT_DIR}"
}

wait_for_port() {
  local port="$1"
  local retries="${2:-20}"
  local delay="${3:-0.5}"

  log "Waiting for proxy to listen on port ${port}..."
  for i in $(seq 1 "${retries}"); do
    if nc -z 127.0.0.1 "${port}" >/dev/null 2>&1; then
      log "✅ Proxy is listening on port ${port}"
      return 0
    fi
    sleep "${delay}"
  done

  error "❌ Proxy failed to start on port ${port} after ${retries} attempts"
  return 1
}

stop_existing_proxy() {
  local pid
  pid=$(pgrep -f "cloud-sql-proxy.*${PROXY_PORT}" || true)
  if [ -n "${pid}" ]; then
    log "Stopping existing proxy (PID: ${pid})"
    kill "${pid}" 2>/dev/null || true
    sleep 1
  fi
}

ensure_gcloud_loaded() {
  if [ -f "$HOME/google-cloud-sdk/path.bash.inc" ]; then
    source "$HOME/google-cloud-sdk/path.bash.inc"
  elif [ -f "$HOME/google-cloud-sdk/path.zsh.inc" ]; then
    source "$HOME/google-cloud-sdk/path.zsh.inc"
  else
    error "gcloud SDK not found. Please install it first."
    exit 1
  fi

  # Set project
  gcloud config set project mymoolah-db >/dev/null 2>&1 || true
}

ensure_proxy_binary() {
  if [ ! -f "./cloud-sql-proxy" ]; then
    log "Downloading Cloud SQL Auth Proxy..."
    curl -sLo cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.3/cloud-sql-proxy.linux.amd64
    chmod +x ./cloud-sql-proxy
    log "✅ Proxy binary ready"
  fi
}

start_proxy() {
  log "Starting Cloud SQL Auth Proxy on port ${PROXY_PORT}..."
  nohup ./cloud-sql-proxy "${INSTANCE_CONN_NAME}" \
    --auto-iam-authn \
    --port "${PROXY_PORT}" \
    --structured-logs \
    > "${PROXY_LOG}" 2>&1 &

  local proxy_pid=$!
  log "Proxy started (PID: ${proxy_pid})"

  # Wait for proxy to be ready
  if wait_for_port "${PROXY_PORT}" 20 0.5; then
    log "✅ Proxy is ready"
    # Show last few log lines
    tail -5 "${PROXY_LOG}" 2>/dev/null || true
  else
    error "Proxy failed to start. Check logs: ${PROXY_LOG}"
    tail -20 "${PROXY_LOG}" 2>/dev/null || true
    exit 1
  fi
}

build_local_db_url() {
  if [ ! -f .env ]; then
    error ".env file not found"
    exit 1
  fi

  # Load .env and build local proxy URL
  export DATABASE_URL=$(node -e "
    require('dotenv').config();
    const u = new URL(process.env.DATABASE_URL);
    u.hostname = '127.0.0.1';
    u.port = '${PROXY_PORT}';
    u.searchParams.set('sslmode', 'disable');
    console.log(u.toString());
  ")

  log "✅ DATABASE_URL configured for proxy: postgres://...@127.0.0.1:${PROXY_PORT}/..."
}

start_backend() {
  log "Starting backend server..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Backend will connect via Cloud SQL Auth Proxy on port ${PROXY_PORT}"
  log "To stop: Press Ctrl+C, then run: pkill -f cloud-sql-proxy"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Start backend (this will block)
  npm run start:cs-ip
}

# Cleanup on exit
cleanup() {
  log "Shutting down..."
  local pid
  pid=$(pgrep -f "cloud-sql-proxy.*${PROXY_PORT}" || true)
  if [ -n "${pid}" ]; then
    log "Stopping proxy (PID: ${pid})"
    kill "${pid}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

# Main execution
main() {
  ensure_in_project_root
  ensure_gcloud_loaded
  stop_existing_proxy
  ensure_proxy_binary
  start_proxy
  build_local_db_url
  start_backend
}

main "$@"

