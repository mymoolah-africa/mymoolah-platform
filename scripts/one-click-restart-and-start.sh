#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/workspaces/mymoolah-platform"
PROXY_NAME="cloud-sql-proxy"
REDIS_CONTAINER_NAME="redis"
REDIS_PORT="6379"

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

wait_for_tcp() {
  local host="$1"
  local port="$2"
  local retries="${3:-30}"
  local delay="${4:-0.5}"

  for _ in $(seq 1 "${retries}"); do
    if command -v nc >/dev/null 2>&1; then
      if nc -z "$host" "$port" >/dev/null 2>&1; then
        return 0
      fi
    else
      if (exec 3<>/dev/tcp/"$host"/"$port") 2>/dev/null; then
        exec 3>&-
        return 0
      fi
    fi
    sleep "${delay}"
  done
  return 1
}

start_redis_if_possible() {
  if command -v docker >/dev/null 2>&1; then
    log "Starting Redis container on ${REDIS_PORT}..."
    docker run -d --name "${REDIS_CONTAINER_NAME}" -p ${REDIS_PORT}:${REDIS_PORT} redis:7 >/dev/null 2>&1 || true
    if wait_for_tcp "127.0.0.1" "${REDIS_PORT}" 30 0.5; then
      log "Redis is up on 127.0.0.1:${REDIS_PORT}"
    else
      warn "Redis did not become ready on 127.0.0.1:${REDIS_PORT}; continuing without Redis"
    fi
  else
    warn "Docker not available; skipping Redis startup"
  fi
}

main() {
  ensure_in_project_root

  log "Killing running jobs (backend and proxy)..."
  # Kill proxy by name pattern (catches all variations)
  kill_if_running "cloud-sql-proxy"
  kill_if_running "${PROXY_NAME}"
  # Kill any process using port 6543 (proxy port)
  if command -v lsof >/dev/null 2>&1; then
    local port_pid=$(lsof -ti:6543 2>/dev/null || true)
    if [ -n "${port_pid}" ]; then
      log "Killing process using port 6543 (PID: ${port_pid})"
      kill "${port_pid}" 2>/dev/null || true
      sleep 1
    fi
  fi
  kill_if_running "node scripts/start-cs-ip.js"
  kill_if_running "node server.js"
  kill_if_running "node .*server.js"

  stop_redis_container_if_any
  start_redis_if_possible

  log "Starting proxy and backend..."
  exec ./scripts/start-codespace-with-proxy.sh
}

main "$@"


