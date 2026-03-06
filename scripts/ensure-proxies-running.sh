#!/bin/bash

##############################################################################
# Ensure Cloud SQL Auth Proxies Are Running
# 
# Usage: ./scripts/ensure-proxies-running.sh [uat|staging|production]
#   No argument = start all three proxies
#   With argument = start only the specified environment's proxy
##############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TARGET_ENV="${1:-all}"

echo "🔍 Checking Cloud SQL Auth Proxies..."
echo ""

# Determine repository root (Codespaces vs local Mac)
if [ -d "/workspaces/mymoolah-platform" ]; then
  REPO_ROOT="/workspaces/mymoolah-platform"
else
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

# Find cloud-sql-proxy binary: PATH first, then project root
PROXY_BIN=""
if command -v cloud-sql-proxy >/dev/null 2>&1; then
  PROXY_BIN="$(command -v cloud-sql-proxy)"
elif [ -x "${REPO_ROOT}/cloud-sql-proxy" ]; then
  PROXY_BIN="${REPO_ROOT}/cloud-sql-proxy"
elif command -v cloud_sql_proxy >/dev/null 2>&1; then
  PROXY_BIN="$(command -v cloud_sql_proxy)"
else
  echo -e "${RED}❌ cloud-sql-proxy binary not found${NC}"
  echo "   Install via: brew install cloud-sql-proxy"
  echo "   Or download: https://cloud.google.com/sql/docs/mysql/sql-proxy#install"
  exit 1
fi
echo "🔧 Using proxy: ${PROXY_BIN}"

# Get access token: try user credentials, then ADC
ACCESS_TOKEN=""
if command -v gcloud >/dev/null 2>&1; then
  ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null || true)
  if [ -z "$ACCESS_TOKEN" ]; then
    ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || true)
    [ -n "$ACCESS_TOKEN" ] && echo "🔑 Using gcloud application-default credentials (ADC)"
  else
    echo "🔑 Using gcloud user credentials (access token)"
  fi
fi

if [ -n "$ACCESS_TOKEN" ]; then
  TOKEN_FLAG="--token ${ACCESS_TOKEN}"
else
  if [ -f "${HOME}/.config/gcloud/application_default_credentials.json" ] || [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
    echo "⚠️  No gcloud token - starting proxy with ADC (file or env)"
    TOKEN_FLAG=""
  else
    echo -e "${RED}❌ No Cloud SQL credentials. Run: gcloud auth login${NC}"
    echo "   Or: gcloud auth application-default login"
    exit 1
  fi
fi

start_proxy() {
  local env_name="$1"
  local port="$2"
  local instance="$3"

  local RUNNING=$(lsof -ti:${port} 2>/dev/null || echo "")
  if [ -z "$RUNNING" ]; then
    echo -e "${YELLOW}⚠️  ${env_name} proxy NOT running on port ${port}${NC}"
    echo "   Starting ${env_name} proxy..."
    nohup "${PROXY_BIN}" "mymoolah-db:africa-south1:${instance}" \
      --port "${port}" \
      --structured-logs \
      ${TOKEN_FLAG} \
      > "/tmp/${env_name,,}-proxy-${port}.log" 2>&1 &
    sleep 3
    if lsof -ti:${port} >/dev/null 2>&1; then
      echo -e "${GREEN}✅ ${env_name} proxy started on port ${port}${NC}"
    else
      echo -e "${RED}❌ ${env_name} proxy failed to start${NC}"
      echo "   Check logs: cat /tmp/${env_name,,}-proxy-${port}.log"
      return 1
    fi
  else
    echo -e "${GREEN}✅ ${env_name} proxy running on port ${port} (PID: $RUNNING)${NC}"
  fi
}

FAILED=0

if [ "$TARGET_ENV" = "all" ] || [ "$TARGET_ENV" = "uat" ]; then
  start_proxy "UAT" 6543 "mmtp-pg" || FAILED=1
fi

if [ "$TARGET_ENV" = "all" ] || [ "$TARGET_ENV" = "staging" ]; then
  start_proxy "Staging" 6544 "mmtp-pg-staging" || FAILED=1
fi

if [ "$TARGET_ENV" = "all" ] || [ "$TARGET_ENV" = "production" ]; then
  start_proxy "Production" 6545 "mmtp-pg-production" || FAILED=1
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ Required proxies are running!${NC}"
else
  echo -e "${RED}❌ Some proxies failed to start${NC}"
  exit 1
fi
echo ""
