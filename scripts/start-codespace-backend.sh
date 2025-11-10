#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/workspaces/mymoolah-platform"
PROJECT_NAME="MyMoolah Treasury Platform"
REDIS_CONTAINER_NAME="redis"
REDIS_IMAGE="redis:7"
REDIS_PORT="6379"
REDIS_URL_VALUE="${REDIS_URL:-redis://127.0.0.1:${REDIS_PORT}}"

log() {
  printf '[startup] %s\n' "$*"
}

error() {
  printf '[startup][error] %s\n' "$*" >&2
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local retries="${3:-20}"
  local delay="${4:-0.5}"

  for _ in $(seq 1 "${retries}"); do
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay}"
  done

  return 1
}

ensure_in_project_root() {
  if [ ! -d "${ROOT_DIR}" ]; then
    error "Expected project directory at ${ROOT_DIR} not found."
    exit 1
  fi
  cd "${ROOT_DIR}"
}

start_redis_with_docker() {
  if docker ps -a --format '{{.Names}}' | grep -qx "${REDIS_CONTAINER_NAME}"; then
    log "Removing existing Redis container (${REDIS_CONTAINER_NAME})"
    docker rm -f "${REDIS_CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi

  log "Starting fresh Redis container (${REDIS_IMAGE})"
  docker run -d \
    --name "${REDIS_CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${REDIS_PORT}:${REDIS_PORT}" \
    "${REDIS_IMAGE}" >/dev/null

  log "Waiting for Redis container to accept connections..."
  if ! docker exec "${REDIS_CONTAINER_NAME}" redis-cli ping >/dev/null 2>&1; then
    # give the container a moment to start
    sleep 1
  fi

  if ! docker exec "${REDIS_CONTAINER_NAME}" redis-cli ping >/dev/null 2>&1; then
    error "Redis container did not respond to ping. Check docker logs ${REDIS_CONTAINER_NAME}."
    exit 1
  fi
}

start_redis_locally() {
  if command -v redis-server >/dev/null 2>&1; then
    if nc -z 127.0.0.1 "${REDIS_PORT}" >/dev/null 2>&1; then
      log "Redis already running on port ${REDIS_PORT}"
      return 0
    fi

    log "Starting local redis-server"
    redis-server --bind 127.0.0.1 --port "${REDIS_PORT}" --daemonize yes

    log "Waiting for local Redis to accept connections..."
    if ! wait_for_port 127.0.0.1 "${REDIS_PORT}" 20 0.5; then
      error "Local Redis failed to start on port ${REDIS_PORT}"
      exit 1
    fi
  else
    error "Neither Docker nor redis-server found. Please install one of them."
    exit 1
  fi
}

ensure_redis() {
  if command -v docker >/dev/null 2>&1; then
    start_redis_with_docker
  else
    log "Docker not available; falling back to local redis-server."
    start_redis_locally
  fi
}

launch_backend() {
  export REDIS_URL="${REDIS_URL_VALUE}"
  log "Using REDIS_URL=${REDIS_URL}"

  log "Starting ${PROJECT_NAME} backend..."
  exec npm run start:cs-ip
}

main() {
  log "Initialising ${PROJECT_NAME} backend environment"
  ensure_in_project_root
  ensure_redis
  launch_backend
}

main "$@"

