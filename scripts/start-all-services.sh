#!/usr/bin/env bash

##############################################################################
# Start All MyMoolah Services (Codespaces)
#
# Starts in order:
#   1. Cloud SQL Auth Proxies (UAT 6543, Staging 6544, Production 6545)
#   2. Main backend server (port 3001)
#   3. Wallet frontend dev server (port 3000)
#   4. Portal backend server (port 3002)
#   5. Portal frontend dev server (port 3003)
#
# Sets all forwarded ports to Public visibility.
#
# Usage: ./scripts/start-all-services.sh
##############################################################################

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

LOG_DIR="/tmp/mymoolah-logs"
mkdir -p "${LOG_DIR}"

log()  { printf "${CYAN}[all-services]${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}[all-services] ✅ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}[all-services] ⚠️  %s${NC}\n" "$*" >&2; }
err()  { printf "${RED}[all-services] ❌ %s${NC}\n" "$*" >&2; }

BACKEND_PORT=3001
WALLET_FE_PORT=3000
PORTAL_BE_PORT=3002
PORTAL_FE_PORT=3003

wait_for_port() {
  local port="$1"
  local name="$2"
  local retries="${3:-60}"
  local delay="${4:-1}"

  log "Waiting for ${name} on port ${port}..."
  for i in $(seq 1 "${retries}"); do
    if nc -z 127.0.0.1 "${port}" >/dev/null 2>&1 || (exec 3<>/dev/tcp/127.0.0.1/"${port}") 2>/dev/null; then
      ok "${name} is ready on port ${port}"
      return 0
    fi
    sleep "${delay}"
  done
  err "${name} did not start on port ${port} after ${retries}s"
  return 1
}

kill_port() {
  local port="$1"
  local name="$2"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti:"${port}" 2>/dev/null || true)
    if [ -n "${pids}" ]; then
      log "Stopping ${name} on port ${port} (PID: ${pids})"
      echo "${pids}" | xargs kill 2>/dev/null || true
      sleep 1
    fi
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
  fi
}

# ──────────────────────────────────────────────────────────────
# STEP 0: Clean up any running services
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  MyMoolah — Starting All Services${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

log "Cleaning up existing processes..."
kill_port "${BACKEND_PORT}" "Main backend"
kill_port "${WALLET_FE_PORT}" "Wallet frontend"
kill_port "${PORTAL_BE_PORT}" "Portal backend"
kill_port "${PORTAL_FE_PORT}" "Portal frontend"

# Kill any stale node processes from previous server runs (be selective)
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node scripts/start-cs-ip.js" 2>/dev/null || true
sleep 1

# ──────────────────────────────────────────────────────────────
# STEP 1: Start Redis (if Docker available)
# ──────────────────────────────────────────────────────────────
log "Step 1/6: Starting Redis..."
if command -v docker >/dev/null 2>&1; then
  docker rm -f redis 2>/dev/null || true
  docker run -d --name redis -p 6379:6379 redis:7 >/dev/null 2>&1 || true
  if nc -z 127.0.0.1 6379 >/dev/null 2>&1; then
    ok "Redis running on port 6379"
  else
    sleep 2
    if nc -z 127.0.0.1 6379 >/dev/null 2>&1; then
      ok "Redis running on port 6379"
    else
      warn "Redis did not start — continuing without it"
    fi
  fi
else
  warn "Docker not available — skipping Redis"
fi

# ──────────────────────────────────────────────────────────────
# STEP 2: Start Cloud SQL Auth Proxies
# ──────────────────────────────────────────────────────────────
log "Step 2/6: Starting Cloud SQL Auth Proxies..."
if [ -f "${ROOT_DIR}/scripts/ensure-proxies-running.sh" ]; then
  bash "${ROOT_DIR}/scripts/ensure-proxies-running.sh" || {
    err "Failed to start proxies. Check gcloud auth."
    exit 1
  }
else
  err "ensure-proxies-running.sh not found"
  exit 1
fi

# ──────────────────────────────────────────────────────────────
# STEP 3: Build DATABASE_URL and start main backend
# ──────────────────────────────────────────────────────────────
log "Step 3/6: Starting main backend (port ${BACKEND_PORT})..."

ENV_FILE="${ROOT_DIR}/.env"
PROXY_PORT=6543

if [ -f "${ENV_FILE}" ]; then
  DATABASE_URL=$(node -e "
    require('dotenv').config({ path: '${ENV_FILE}' });
    const port = '${PROXY_PORT}';
    let url;
    if (process.env.DATABASE_URL) {
      const u = new URL(process.env.DATABASE_URL);
      u.hostname = '127.0.0.1';
      u.port = port;
      u.searchParams.set('sslmode', 'disable');
      url = u.toString();
    } else if (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
      const enc = encodeURIComponent(process.env.DB_PASSWORD);
      url = 'postgres://' + process.env.DB_USER + ':' + enc + '@127.0.0.1:' + port + '/' + process.env.DB_NAME + '?sslmode=disable';
    }
    if (url) console.log(url);
    else process.exit(1);
  " 2>/dev/null) || {
    warn "Could not build DATABASE_URL from .env — using UAT default"
    DATABASE_URL="postgres://mymoolah_app:$(node -e "console.log(encodeURIComponent('B0t3s@Mymoolah'))")@127.0.0.1:${PROXY_PORT}/mymoolah?sslmode=disable"
  }
else
  warn ".env file not found — using UAT default DATABASE_URL"
  DATABASE_URL="postgres://mymoolah_app:$(node -e "console.log(encodeURIComponent('B0t3s@Mymoolah'))")@127.0.0.1:${PROXY_PORT}/mymoolah?sslmode=disable"
fi
export DATABASE_URL

# Load JWT_SECRET from .env or gcloud
if [ -z "${JWT_SECRET:-}" ]; then
  if [ -f "${ENV_FILE}" ]; then
    JWT_SECRET=$(grep -E '^JWT_SECRET=' "${ENV_FILE}" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' || true)
  fi
  if [ -z "${JWT_SECRET:-}" ] && command -v gcloud >/dev/null 2>&1; then
    JWT_SECRET=$(gcloud secrets versions access latest --secret="jwt-secret" --project=mymoolah-db 2>/dev/null || true)
  fi
  if [ -z "${JWT_SECRET:-}" ]; then
    JWT_SECRET="codespaces-dev-jwt-secret-32-chars-minimum"
    warn "Using development JWT_SECRET"
  fi
  export JWT_SECRET
fi

export NODE_ENV="${NODE_ENV:-development}"
export PORT="${BACKEND_PORT}"
export TLS_ENABLED="${TLS_ENABLED:-false}"

# Export OPENAI_API_KEY if in .env
if [ -f "${ENV_FILE}" ]; then
  OPENAI_KEY=$(grep -E '^OPENAI_API_KEY=' "${ENV_FILE}" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' || true)
  if [ -n "${OPENAI_KEY}" ]; then
    export OPENAI_API_KEY="${OPENAI_KEY}"
  fi
fi

nohup node scripts/start-cs-ip.js > "${LOG_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!
log "Main backend starting (PID: ${BACKEND_PID}, log: ${LOG_DIR}/backend.log)"

wait_for_port "${BACKEND_PORT}" "Main backend" 30 1 || {
  err "Main backend failed to start. Check: tail -30 ${LOG_DIR}/backend.log"
  tail -15 "${LOG_DIR}/backend.log" 2>/dev/null || true
  exit 1
}

# ──────────────────────────────────────────────────────────────
# STEP 4: Start wallet frontend dev server
# ──────────────────────────────────────────────────────────────
log "Step 4/6: Starting wallet frontend (port ${WALLET_FE_PORT})..."

cd "${ROOT_DIR}/mymoolah-wallet-frontend"
if [ ! -d "node_modules" ]; then
  warn "node_modules missing in wallet frontend — running npm install..."
  npm install --silent 2>/dev/null
fi
nohup npx vite --host 0.0.0.0 --port ${WALLET_FE_PORT} > "${LOG_DIR}/wallet-frontend.log" 2>&1 &
WALLET_FE_PID=$!
cd "${ROOT_DIR}"
log "Wallet frontend starting (PID: ${WALLET_FE_PID}, log: ${LOG_DIR}/wallet-frontend.log)"

# ──────────────────────────────────────────────────────────────
# STEP 5: Start portal backend
# ──────────────────────────────────────────────────────────────
log "Step 5/6: Starting portal backend (port ${PORTAL_BE_PORT})..."

cd "${ROOT_DIR}/portal/backend"
if [ ! -d "node_modules" ]; then
  warn "node_modules missing in portal backend — running npm install..."
  npm install --silent 2>/dev/null
fi
export PORTAL_BACKEND_HOST="0.0.0.0"
nohup node server.js > "${LOG_DIR}/portal-backend.log" 2>&1 &
PORTAL_BE_PID=$!
cd "${ROOT_DIR}"
log "Portal backend starting (PID: ${PORTAL_BE_PID}, log: ${LOG_DIR}/portal-backend.log)"

wait_for_port "${PORTAL_BE_PORT}" "Portal backend" 20 1 || {
  err "Portal backend failed to start. Check: tail -30 ${LOG_DIR}/portal-backend.log"
  tail -15 "${LOG_DIR}/portal-backend.log" 2>/dev/null || true
}

# ──────────────────────────────────────────────────────────────
# STEP 6: Start portal frontend dev server
# ──────────────────────────────────────────────────────────────
log "Step 6/6: Starting portal frontend (port ${PORTAL_FE_PORT})..."

cd "${ROOT_DIR}/portal/admin/frontend"
if [ ! -d "node_modules" ]; then
  warn "node_modules missing in portal frontend — running npm install..."
  npm install --silent 2>/dev/null
fi
nohup npx vite --host 0.0.0.0 --port ${PORTAL_FE_PORT} > "${LOG_DIR}/portal-frontend.log" 2>&1 &
PORTAL_FE_PID=$!
cd "${ROOT_DIR}"
log "Portal frontend starting (PID: ${PORTAL_FE_PID}, log: ${LOG_DIR}/portal-frontend.log)"

# Wait for frontend dev servers (they take a moment)
wait_for_port "${WALLET_FE_PORT}" "Wallet frontend" 30 1 || warn "Wallet frontend may still be starting..."
wait_for_port "${PORTAL_FE_PORT}" "Portal frontend" 30 1 || warn "Portal frontend may still be starting..."

# ──────────────────────────────────────────────────────────────
# SET PORTS TO PUBLIC
# ──────────────────────────────────────────────────────────────
echo ""
log "Setting port visibility to Public..."

set_port_public() {
  local port="$1"
  local name="$2"
  local max_attempts=3
  for attempt in $(seq 1 ${max_attempts}); do
    if gh codespace ports visibility "${port}:public" -c "${CODESPACE_NAME}" 2>/dev/null; then
      ok "${name} (port ${port}) set to Public"
      return 0
    fi
    if [ "${attempt}" -lt "${max_attempts}" ]; then
      sleep 3
    fi
  done
  warn "Could not set ${name} (port ${port}) to Public — set manually in Ports tab"
  return 1
}

if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
  sleep 5
  set_port_public "${WALLET_FE_PORT}" "Wallet frontend"
  set_port_public "${BACKEND_PORT}" "Main backend"
  set_port_public "${PORTAL_BE_PORT}" "Portal backend"
  set_port_public "${PORTAL_FE_PORT}" "Portal frontend"
elif [ -n "${CODESPACE_NAME:-}" ]; then
  warn "gh CLI not found — please set ports to Public manually in the Ports tab"
else
  log "Not running in Codespaces — port visibility setting skipped"
fi

# ──────────────────────────────────────────────────────────────
# BUILD URLS AND PRINT SUMMARY
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  All Services Started Successfully${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  BASE="https://${CODESPACE_NAME}"
  DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

  echo -e "  ${GREEN}Wallet Frontend${NC}    : ${BASE}-${WALLET_FE_PORT}.${DOMAIN}"
  echo -e "  ${GREEN}Main Backend API${NC}   : ${BASE}-${BACKEND_PORT}.${DOMAIN}"
  echo -e "  ${GREEN}Portal Backend API${NC} : ${BASE}-${PORTAL_BE_PORT}.${DOMAIN}"
  echo -e "  ${GREEN}Portal Frontend${NC}    : ${BASE}-${PORTAL_FE_PORT}.${DOMAIN}/admin/login"
  echo ""
  echo -e "  ${CYAN}Cloud SQL Proxies${NC}  : UAT :6543 | Staging :6544 | Production :6545"
  echo -e "  ${CYAN}Redis${NC}              : :6379"
else
  echo -e "  ${GREEN}Wallet Frontend${NC}    : http://localhost:${WALLET_FE_PORT}"
  echo -e "  ${GREEN}Main Backend API${NC}   : http://localhost:${BACKEND_PORT}"
  echo -e "  ${GREEN}Portal Backend API${NC} : http://localhost:${PORTAL_BE_PORT}"
  echo -e "  ${GREEN}Portal Frontend${NC}    : http://localhost:${PORTAL_FE_PORT}/admin/login"
  echo ""
  echo -e "  ${CYAN}Cloud SQL Proxies${NC}  : UAT :6543 | Staging :6544 | Production :6545"
  echo -e "  ${CYAN}Redis${NC}              : :6379"
fi

echo ""
echo -e "  ${BOLD}Logs:${NC}"
echo -e "    Backend        : tail -f ${LOG_DIR}/backend.log"
echo -e "    Wallet FE      : tail -f ${LOG_DIR}/wallet-frontend.log"
echo -e "    Portal Backend : tail -f ${LOG_DIR}/portal-backend.log"
echo -e "    Portal FE      : tail -f ${LOG_DIR}/portal-frontend.log"
echo ""
echo -e "  ${BOLD}Stop all:${NC} kill ${BACKEND_PID} ${WALLET_FE_PID} ${PORTAL_BE_PID} ${PORTAL_FE_PID}"
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
