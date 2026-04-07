#!/bin/sh
set -e

echo "Portal container starting..." >&2
echo "PORT: ${PORT:-8080}" >&2
echo "PORTAL_ENV: ${PORTAL_ENV:-not set}" >&2
echo "MM_DEPLOYMENT_ENV: ${MM_DEPLOYMENT_ENV:-not set}" >&2

# Construct DATABASE_URL from Cloud Run env vars if not already set
if [ -z "${DATABASE_URL}" ] && [ -n "${DB_PASSWORD}" ] && [ -n "${CLOUD_SQL_INSTANCE}" ] && [ -n "${DB_NAME}" ]; then
  echo "Constructing DATABASE_URL from env vars..." >&2
  ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent(process.argv[1]));" "${DB_PASSWORD}")
  DB_USER="${DB_USER:-mymoolah_app}"
  export DATABASE_URL="postgres://${DB_USER}:${ENCODED_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_INSTANCE}&sslmode=disable"
  echo "DATABASE_URL constructed for database: ${DB_NAME}" >&2
elif [ -n "${DATABASE_URL}" ]; then
  echo "Using pre-set DATABASE_URL" >&2
else
  echo "WARNING: DATABASE_URL not set and missing required env vars (DB_PASSWORD, CLOUD_SQL_INSTANCE, DB_NAME)" >&2
fi

echo "Starting portal backend..." >&2
exec node /app/portal/backend/server.js
