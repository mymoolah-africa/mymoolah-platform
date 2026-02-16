#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROXY_PORT="${PROXY_PORT:-6543}"
PROXY_LOG="/tmp/cloud-sql-proxy.log"
INSTANCE_CONN_NAME="${INSTANCE_CONN_NAME:-mymoolah-db:africa-south1:mmtp-pg}"
ENV_FILE="${ENV_FILE:-.env}"

log() {
  printf '[proxy-startup] %s\n' "$*"
}

error() {
  printf '[proxy-startup][error] %s\n' "$*" >&2
}

# Warning helper (non-fatal)
warn() {
  printf '[proxy-startup][warn] %s\n' "$*" >&2
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
  log "Checking for existing proxy instances..."
  
  # Method 1: Find by port (most reliable)
  local port_pid
  if command -v lsof >/dev/null 2>&1; then
    port_pid=$(lsof -ti:${PROXY_PORT} 2>/dev/null || true)
    if [ -n "${port_pid}" ]; then
      log "Found proxy using port ${PROXY_PORT} (PID: ${port_pid})"
      kill "${port_pid}" 2>/dev/null || true
      sleep 1
    fi
  fi
  
  # Method 2: Find by process name pattern (catch all variations)
  local proxy_pids
  proxy_pids=$(pgrep -f "cloud-sql-proxy" 2>/dev/null || true)
  if [ -n "${proxy_pids}" ]; then
    for pid in ${proxy_pids}; do
      # Check if this process is actually using our port
      if lsof -p "${pid}" 2>/dev/null | grep -q ":${PROXY_PORT}" || [ -z "${port_pid}" ]; then
        log "Stopping existing proxy process (PID: ${pid})"
        kill "${pid}" 2>/dev/null || true
      fi
    done
    sleep 1
  fi
  
  # Method 3: Kill any process listening on the port (fallback)
  if command -v fuser >/dev/null 2>&1; then
    fuser -k ${PROXY_PORT}/tcp 2>/dev/null || true
    sleep 1
  fi
  
  # Verify port is free
  if command -v lsof >/dev/null 2>&1; then
    if lsof -ti:${PROXY_PORT} >/dev/null 2>&1; then
      warn "Port ${PROXY_PORT} still in use after cleanup attempt"
    else
      log "✅ Port ${PROXY_PORT} is free"
    fi
  fi
}

ensure_gcloud_loaded() {
  # First check if gcloud is already in PATH (e.g., pre-installed in Codespaces or system)
  if command -v gcloud >/dev/null 2>&1; then
    log "✅ gcloud found in PATH"
    # Set project
    gcloud config set project mymoolah-db >/dev/null 2>&1 || true
    return 0
  fi

  # If not in PATH, try to source SDK initialization scripts
  if [ -f "$HOME/google-cloud-sdk/path.bash.inc" ]; then
    source "$HOME/google-cloud-sdk/path.bash.inc"
    log "✅ Sourced gcloud from ~/google-cloud-sdk/path.bash.inc"
  elif [ -f "$HOME/google-cloud-sdk/path.zsh.inc" ]; then
    source "$HOME/google-cloud-sdk/path.zsh.inc"
    log "✅ Sourced gcloud from ~/google-cloud-sdk/path.zsh.inc"
  fi

  # Verify gcloud is now available
  if command -v gcloud >/dev/null 2>&1; then
    log "✅ gcloud loaded successfully"
    # Set project
    gcloud config set project mymoolah-db >/dev/null 2>&1 || true
    return 0
  fi

  # gcloud not found, but that's OK if ADC are available via other means
  # (e.g., Codespaces service account, environment variables)
  log "⚠️  gcloud CLI not found, but continuing (ADC may be available via other means)"
  return 0
}

PROXY_CMD=""

ensure_proxy_binary() {
  # Prefer cloud-sql-proxy from PATH (e.g. brew install cloud-sql-proxy)
  if command -v cloud-sql-proxy >/dev/null 2>&1; then
    PROXY_CMD="cloud-sql-proxy"
    log "✅ Using cloud-sql-proxy from PATH"
    return 0
  fi

  # If local binary exists, verify it runs (may be wrong arch from Codespaces/Linux)
  if [ -f "./cloud-sql-proxy" ]; then
    if ./cloud-sql-proxy --version >/dev/null 2>&1; then
      PROXY_CMD="./cloud-sql-proxy"
      return 0
    fi
    log "Removing incompatible cloud-sql-proxy binary (wrong architecture)"
    rm -f ./cloud-sql-proxy
  fi

  local os arch proxy_url
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "${os}" in
    linux)
      case "${arch}" in
        x86_64|amd64)
          proxy_url="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.3/cloud-sql-proxy.linux.amd64"
          ;;
        arm64|aarch64)
          proxy_url="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.3/cloud-sql-proxy.linux.arm64"
          ;;
        *)
          error "Unsupported Linux architecture '${arch}' for Cloud SQL Proxy"
          ;;
      esac
      ;;
    darwin)
      case "${arch}" in
        x86_64|amd64)
          proxy_url="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.3/cloud-sql-proxy.darwin.amd64"
          ;;
        arm64|aarch64)
          proxy_url="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.3/cloud-sql-proxy.darwin.arm64"
          ;;
        *)
          error "Unsupported macOS architecture '${arch}' for Cloud SQL Proxy"
          ;;
      esac
      ;;
    *)
      error "Unsupported operating system '${os}' for Cloud SQL Proxy download"
      ;;
  esac

  log "Downloading Cloud SQL Auth Proxy for ${os}/${arch}..."
  curl -sSL -o cloud-sql-proxy "${proxy_url}"
  chmod +x ./cloud-sql-proxy
  PROXY_CMD="./cloud-sql-proxy"
  log "✅ Proxy binary ready"
}

ensure_adc_valid() {
  log "Checking Application Default Credentials (ADC)..."
  
  # If gcloud is not available, check if ADC exist via other means
  if ! command -v gcloud >/dev/null 2>&1; then
    # Check for ADC file or environment variable
    local adc_file="${HOME}/.config/gcloud/application_default_credentials.json"
    if [ -f "$adc_file" ] || [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
      log "✅ ADC available via file or environment variable (gcloud CLI not required)"
      return 0
    else
      warn "⚠️  gcloud CLI not found and no ADC detected"
      warn "The proxy may still work if Codespaces provides ADC automatically"
      return 0  # Don't fail, let the proxy try
    fi
  fi
  
  # Ensure gcloud is authenticated first
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    log "⚠️  No active gcloud authentication found"
    if [ -t 0 ] && [ -t 1 ]; then
      log "Attempting to authenticate gcloud (interactive mode)..."
      log "You will need to authenticate via device code..."
      log ""
      if gcloud auth login --no-launch-browser; then
        log "✅ gcloud authentication successful"
      else
        error "❌ Failed to authenticate gcloud"
        error "Please run: gcloud auth login --no-launch-browser"
        return 1
      fi
    else
      error "❌ No active gcloud authentication (non-interactive mode)"
      error "Please run: gcloud auth login --no-launch-browser"
      return 1
    fi
  fi
  
  # Ensure project is set
  local current_project
  current_project=$(gcloud config get-value project 2>/dev/null || echo "")
  if [ -z "$current_project" ] || [ "$current_project" != "mymoolah-db" ]; then
    log "Setting gcloud project to mymoolah-db..."
    gcloud config set project mymoolah-db >/dev/null 2>&1
    log "✅ Project set to mymoolah-db"
  fi
  
  # First, check if ADC file exists
  local adc_file="${HOME}/.config/gcloud/application_default_credentials.json"
  local adc_file_exists=false
  if [ -f "$adc_file" ]; then
    adc_file_exists=true
  fi
  
  # Test if ADC can generate access tokens (simpler, more reliable test)
  # This works even if user doesn't have Cloud SQL API permissions
  if gcloud auth application-default print-access-token >/dev/null 2>&1; then
    log "✅ ADC are valid (can generate access tokens)"
    return 0
  fi
  
  # ADC either don't exist or are expired
  if [ "$adc_file_exists" = false ]; then
    log "⚠️  ADC not found"
  else
    # File exists but can't generate token - likely expired
    log "⚠️  ADC file exists but cannot generate tokens (likely expired)"
  fi
  
  # ADC not available - just return failure
  # The proxy can use user credentials from 'gcloud auth login' as fallback
  # Don't attempt interactive ADC refresh - it may be blocked by org policy
  warn "⚠️  ADC not available or expired"
  warn "Proxy will attempt to use user credentials from 'gcloud auth login' instead"
  return 1
}

start_proxy() {
  log "Starting Cloud SQL Auth Proxy on port ${PROXY_PORT}..."
  
  # Get access token: try (1) gcloud user credentials, (2) ADC, (3) interactive login
  local access_token=""
  
  # Try user token first
  if command -v gcloud >/dev/null 2>&1; then
    access_token=$(gcloud auth print-access-token 2>/dev/null || true)
    if [ -z "$access_token" ]; then
      access_token=$(gcloud auth application-default print-access-token 2>/dev/null || true)
    fi
  fi
  
  # If no token and terminal is interactive, run gcloud auth login
  # Check stdin only (not stdout, as it may be redirected)
  if [ -z "$access_token" ] && [ -t 0 ] && command -v gcloud >/dev/null 2>&1; then
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "🔐 No gcloud credentials found. Starting interactive login..."
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log ""
    log "📋 Follow these steps:"
    log "1. Click the URL that appears below"
    log "2. Sign in to your Google account"
    log "3. Copy the verification code"
    log "4. Paste the code when prompted"
    log ""
    if gcloud auth login --no-launch-browser; then
      log ""
      log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      log "✅ gcloud login successful! Obtaining access token..."
      log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      # Get token after successful login
      access_token=$(gcloud auth print-access-token 2>/dev/null || true)
    else
      log ""
      log "⚠️  gcloud auth login failed or was cancelled"
      log "The script will now exit. Run it again to retry."
    fi
  fi
  
  if [ -n "$access_token" ]; then
    log "Token obtained successfully (${#access_token} chars)"
    export GOOGLE_OAUTH_ACCESS_TOKEN="$access_token"
    nohup ${PROXY_CMD} "${INSTANCE_CONN_NAME}" \
      --port "${PROXY_PORT}" \
      --structured-logs \
      --token "${access_token}" \
      > "${PROXY_LOG}" 2>&1 &
  else
    # No token: only start proxy without --token if ADC file or env is present
    local adc_ok=false
    if [ -f "${HOME}/.config/gcloud/application_default_credentials.json" ]; then
      adc_ok=true
    fi
    if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]; then
      adc_ok=true
    fi
    if [ "$adc_ok" = true ]; then
      log "No gcloud token; starting proxy with ADC (file or GOOGLE_APPLICATION_CREDENTIALS)"
      nohup ${PROXY_CMD} "${INSTANCE_CONN_NAME}" \
        --port "${PROXY_PORT}" \
        --structured-logs \
        > "${PROXY_LOG}" 2>&1 &
    else
      error "No Cloud SQL credentials available."
      error "  - gcloud auth print-access-token returned nothing (run: gcloud auth login)"
      error "  - ADC not found (run: gcloud auth application-default login)"
      error "  - Google Workspaces / browser login does NOT provide gcloud credentials."
      error ""
      error "In Codespaces, run in a terminal:"
      error "  gcloud auth login --no-launch-browser"
      error "  (or) gcloud auth application-default login"
      error ""
      error "Then run this script again."
      exit 1
    fi
  fi

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
      if grep -q "could not find default credentials" "${PROXY_LOG}" 2>/dev/null; then
        error ""
        error "Credentials missing. In Codespaces run:"
        error "  gcloud auth login --no-launch-browser"
        error "  (or) gcloud auth application-default login"
      fi
      exit 1
    fi
  fi
}

build_local_db_url() {
  if [ ! -f "${ENV_FILE}" ]; then
    error "Environment file '${ENV_FILE}' not found"
    exit 1
  fi

  # Load env file and build local proxy URL
  export NODE_ENV_FILE="${ENV_FILE}"
  export PROXY_PORT="${PROXY_PORT}"
  if DATABASE_URL=$(node - <<'NODE'
const path = process.env.NODE_ENV_FILE || '.env';
require('dotenv').config({ path });
const port = process.env.PROXY_PORT || '6543';
let url;
if (process.env.DATABASE_URL) {
  const u = new URL(process.env.DATABASE_URL);
  u.hostname = '127.0.0.1';
  u.port = port;
  u.searchParams.set('sslmode', 'disable');
  url = u.toString();
} else if (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
  const enc = encodeURIComponent(process.env.DB_PASSWORD);
  url = `postgres://${process.env.DB_USER}:${enc}@127.0.0.1:${port}/${process.env.DB_NAME}?sslmode=disable`;
} else {
  process.exit(1);
}
console.log(url);
NODE
  ) 2>/dev/null; then
    export DATABASE_URL
    log "✅ DATABASE_URL configured from ${ENV_FILE} via proxy: postgres://...@127.0.0.1:${PROXY_PORT}/..."
  else
    # Fallback: UAT database uses a known password (see DATABASE_CONNECTION_GUIDE.md)
    # UAT password: B0t3s@Mymoolah (@ must be URL-encoded as %40)
    log "Building DATABASE_URL for UAT database..."
    local enc_pass
    enc_pass=$(node -e "console.log(encodeURIComponent('B0t3s@Mymoolah'))")
    export DATABASE_URL="postgres://mymoolah_app:${enc_pass}@127.0.0.1:${PROXY_PORT}/mymoolah?sslmode=disable"
    log "✅ DATABASE_URL configured for UAT via proxy"
  fi
}

start_backend() {
  log "Starting backend server..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Backend will connect via Cloud SQL Auth Proxy on port ${PROXY_PORT}"
  log "To stop: Press Ctrl+C, then run: pkill -f cloud-sql-proxy"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Export required environment variables for Codespaces (config/security.js validates these)
  # These defaults are safe for development/UAT in Codespaces
  export NODE_ENV="${NODE_ENV:-development}"
  export PORT="${PORT:-3001}"
  export TLS_ENABLED="${TLS_ENABLED:-false}"
  
  # JWT_SECRET: Load from .env or gcloud secret, fallback to dev secret for local testing
  if [ -z "${JWT_SECRET:-}" ]; then
    if [ -f "${ENV_FILE}" ]; then
      JWT_SECRET=$(grep -E '^JWT_SECRET=' "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)
    fi
    if [ -z "${JWT_SECRET:-}" ]; then
      # Try to get from gcloud secret (UAT/Staging)
      JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt-secret" --project=mymoolah-db 2>/dev/null || true)
    fi
    if [ -z "${JWT_SECRET:-}" ]; then
      # Development fallback (only for local Codespaces testing)
      JWT_SECRET="codespaces-dev-jwt-secret-32-chars-minimum"
      warn "Using development JWT_SECRET - do NOT use in production"
    fi
    export JWT_SECRET
  fi
  
  log "Environment: NODE_ENV=${NODE_ENV}, PORT=${PORT}, TLS_ENABLED=${TLS_ENABLED}"
  
  # Start backend (this will block) - pass DATABASE_URL explicitly so npm inherits it
  DATABASE_URL="${DATABASE_URL}" npm run start:cs-ip
}

# Cleanup on exit
cleanup() {
  log "Shutting down..."
  local pid
  pid=$(pgrep -f "cloud-sql-proxy.*${PROXY_PORT}" 2>/dev/null || pgrep -f "cloud-sql-proxy" 2>/dev/null || true)
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
  
  # Try to ensure ADC, but don't fail if it doesn't work
  # The proxy can use user credentials from 'gcloud auth login' as fallback
  if ! ensure_adc_valid; then
    warn "⚠️  ADC not available, but proxy will attempt to use user credentials from 'gcloud auth login'"
    warn "This is fine if you're already authenticated with: gcloud auth login"
  fi
  
  stop_existing_proxy
  ensure_proxy_binary
  start_proxy
  build_local_db_url
  start_backend
}

main "$@"

