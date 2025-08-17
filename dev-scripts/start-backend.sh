#!/bin/zsh
set -euo pipefail

cd /Users/andremacbookpro/mymoolah

# Free port 3001 if occupied
lsof -ti tcp:3001 | xargs kill -15 2>/dev/null || true
sleep 1
lsof -ti tcp:3001 | xargs kill -9 2>/dev/null || true

echo "Starting backend on http://localhost:3001 ..."
npm start | cat


