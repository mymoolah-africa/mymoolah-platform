#!/bin/zsh
set -euo pipefail

APP_DIR=/Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend
cd "$APP_DIR"

# Ensure deps
if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies..."
  npm install --no-audit --no-fund
fi

# Free port 3002 (our preferred dev port)
lsof -ti tcp:3002 | xargs kill -15 2>/dev/null || true
sleep 1
lsof -ti tcp:3002 | xargs kill -9 2>/dev/null || true

echo "Starting frontend (Vite) on http://localhost:3002 ..."
npx vite --port 3002 --host 0.0.0.0 | cat


