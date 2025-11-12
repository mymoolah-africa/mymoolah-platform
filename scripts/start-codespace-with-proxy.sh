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
  local retries="${2:-40}"
  local delay="${3:-0.25}"

  log "Waiting for proxy to listen on port ${port}..."
  
  # Give proxy a moment to start writing logs
  sleep 0.5
  
  for i in $(seq 1 "${retries}"); do
    # Primary check: detect readiness from proxy logs (most reliable)
    if [ -f "${PROXY_LOG}" ] && grep -q "The proxy has started successfully and is ready for new connections" "${PROXY_LOG}" 2>/dev/null; then
      log "✅ Proxy is ready (detected from logs)"
      # Verify port is actually listening
      sleep 0.2
      if command -v nc >/dev/null 2>&1; then
        if nc -z 127.0.0.1 "${port}" >/dev/null 2>&1; then
          return 0
        fi
      elif (exec 3<>/dev/tcp/127.0.0.1/"${port}") 2>/dev/null; then
        exec 3>&-
        return 0
      else
        # Log says ready, trust it even if port check fails
        log "⚠️  Log indicates ready, proceeding (port check inconclusive)"
        return 0
      fi
    fi
    
    # Secondary check: try port directly
    if command -v nc >/dev/null 2>&1; then
      if nc -z 127.0.0.1 "${port}" >/dev/null 2>&1; then
        log "✅ Proxy is listening on port ${port}"
        return 0
      fi
    elif (exec 3<>/dev/tcp/127.0.0.1/"${port}") 2>/dev/null; then
      exec 3>&-
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

ensure_adc_valid() {
  log "Checking Application Default Credentials (ADC)..."
  
  # Check if ADC exist
  if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
    log "⚠️  ADC not found"
    return 1
  fi
  
  # Test if ADC work by trying to access Cloud SQL API (more specific test)
  # This will fail if ADC are expired or invalid
  local test_output
  test_output=$(gcloud sql instances describe mmtp-pg --project=mymoolah-db --format="value(name)" 2>&1)
  local test_exit=$?
  
  if [ $test_exit -eq 0 ] && [ -n "$test_output" ]; then
    log "✅ ADC are valid"
    return 0
  fi
  
  # Check for specific expired token error
  if echo "$test_output" | grep -q "invalid_grant\|invalid_rapt\|reauth"; then
    log "⚠️  ADC expired (invalid_grant/reauth error detected)"
  else
    log "⚠️  ADC may be invalid or expired"
  fi
  
  # Check if we're in an interactive terminal
  if [ -t 0 ] && [ -t 1 ]; then
    log "Refreshing credentials (interactive mode)..."
    log "You will need to authenticate via device code..."
    log ""
    
    if gcloud auth application-default login --no-launch-browser; then
      log "✅ ADC refreshed successfully"
      # Verify the refresh worked
      if gcloud sql instances describe mmtp-pg --project=mymoolah-db --format="value(name)" >/dev/null 2>&1; then
        log "✅ ADC verification successful"
        return 0
      else
        error "❌ ADC refresh completed but verification failed"
        return 1
      fi
    else
      error "❌ Failed to refresh ADC"
      return 1
    fi
  else
    # Non-interactive mode - provide instructions
    error "❌ ADC expired or invalid (non-interactive mode)"
    error "Please run this command to refresh ADC:"
    error "   gcloud auth application-default login --no-launch-browser"
    error ""
    error "Then restart the backend server."
    return 1
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
  if wait_for_port "${PROXY_PORT}" 40 0.25; then
    log "✅ Proxy is ready"
    # Show last few log lines
    tail -5 "${PROXY_LOG}" 2>/dev/null || true
  else
    # One last chance: if logs show ready, continue
    if [ -f "${PROXY_LOG}" ] && grep -q "Listening on 127.0.0.1:${PROXY_PORT}" "${PROXY_LOG}" 2>/dev/null; then
      log "✅ Proxy reported listening in logs; proceeding"
      tail -5 "${PROXY_LOG}" 2>/dev/null || true
    else
      error "Proxy failed to start. Check logs: ${PROXY_LOG}"
      tail -20 "${PROXY_LOG}" 2>/dev/null || true
      exit 1
    fi
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
  ensure_adc_valid || exit 1
  stop_existing_proxy
  ensure_proxy_binary
  start_proxy
  build_local_db_url
  start_backend
}

main "$@"

