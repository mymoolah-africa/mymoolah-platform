#!/bin/zsh
set -euo pipefail

# Cloud SQL instance connection name
INSTANCE="mymoolah-db:africa-south1:mmtp-pg"
PORT=5433

# Free port
lsof -ti tcp:${PORT} | xargs kill -15 2>/dev/null || true
sleep 1
lsof -ti tcp:${PORT} | xargs kill -9 2>/dev/null || true

echo "Starting Cloud SQL Proxy for ${INSTANCE} on 127.0.0.1:${PORT} ..."
cloud-sql-proxy ${INSTANCE} --address 127.0.0.1 --port ${PORT}


