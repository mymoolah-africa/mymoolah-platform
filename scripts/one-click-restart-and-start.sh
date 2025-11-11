#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/workspaces/mymoolah-platform"
PROXY_NAME="cloud-sql-proxy"
REDIS_CONTAINER_NAME="redis"

log() { printf '[one-click] %s\n' "$*"; }
warn() { printf '[one-click][warn] %s\n' "$*" >&2; }

ensure_in_project_root() {
  if [ ! -d "${ROOT_DIR}" ]; then
    warn "Expected project directory at ${ROOT_DIR} not found."
    exit 1
  fi
  cd "${ROOT_DIR}"
}

kill_if_running() {
  local pattern="$1"
  if pgrep -f "$pattern" >/dev/null 2>&1; then
    log "Stopping processes matching: $pattern"
    pkill -f "$pattern" || true
    sleep 1
  fi
}

stop_redis_container_if_any() {
  if command -v docker >/dev/null 2>&1; then
    if docker ps -a --format '{{.Names}}' | grep -qx "${REDIS_CONTAINER_NAME}"; then
      log "Removing existing Redis container (${REDIS_CONTAINER_NAME})"
      docker rm -f "${REDIS_CONTAINER_NAME}" >/dev/null 2>&1 || true
    fi
  fi
}

main() {
  ensure_in_project_root

  log "Killing running jobs (backend and proxy)..."
  kill_if_running "${PROXY_NAME}"
  kill_if_running "node scripts/start-cs-ip.js"
  kill_if_running "node server.js"
  kill_if_running "node .*server.js"

  stop_redis_container_if_any

  log "Starting proxy and backend..."
  exec ./scripts/start-codespace-with-proxy.sh
}

main "$@"


