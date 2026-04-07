#!/usr/bin/env bash
set -euo pipefail

# Build and Deploy MyMoolah Admin Portal to Cloud Run
# Single service: Express backend serves API + frontend static files
# Uses Google Cloud Build (no local Docker required)
# Usage: ./scripts/deploy-portal.sh [--staging | --production] [optional-image-tag]

ENVIRONMENT=""
IMAGE_TAG="$(date +%Y%m%d-%H%M)"

for arg in "$@"; do
  case $arg in
    --staging)
      ENVIRONMENT="staging"
      ;;
    --production)
      ENVIRONMENT="production"
      ;;
    *)
      if [[ -z "$ENVIRONMENT" && "$arg" != -* ]]; then
          ENVIRONMENT="$arg"
      else
          IMAGE_TAG="$arg"
      fi
      ;;
  esac
done

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: Please specify environment with --staging or --production" >&2
  exit 1
fi

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-portal-${ENVIRONMENT}"
SERVICE_ACCOUNT="mymoolah-${ENVIRONMENT}-sa@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-${ENVIRONMENT}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-portal:${IMAGE_TAG}"

log() { echo "[$((SECONDS))s] $*"; }
err() { echo "Error: $*" >&2; exit 1; }

ENV_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
log "Build and Deploy Portal -> ${ENV_UPPER}"
log "Project: ${PROJECT_ID}"
log "Image:   ${IMAGE_NAME}"
echo ""

command -v gcloud >/dev/null || err "gcloud not found"

# Authenticate with Google Cloud
ensure_gcloud_auth() {
  local active_account
  active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)

  if [ -n "$active_account" ]; then
    log "Authenticated as: ${active_account}"
  else
    log "No active gcloud authentication found"
    if [ -t 0 ] && [ -t 1 ]; then
      log "Starting interactive login..."
      if gcloud auth login; then
        log "Authentication successful"
      else
        err "gcloud auth login failed. Please run manually: gcloud auth login"
      fi
    else
      err "No active gcloud auth (non-interactive). Run: gcloud auth login"
    fi
  fi

  local current_project
  current_project=$(gcloud config get-value project 2>/dev/null || true)
  if [ "$current_project" != "${PROJECT_ID}" ]; then
    log "Setting project to ${PROJECT_ID}..."
    gcloud config set project "${PROJECT_ID}" >/dev/null 2>&1 || err "Failed to set project"
  fi
  log "Project: ${PROJECT_ID}"

  if ! gcloud auth print-access-token >/dev/null 2>&1; then
    log "Auth token expired — re-authenticating..."
    gcloud auth revoke --all --quiet 2>/dev/null || true
    if [ -t 0 ] && [ -t 1 ]; then
      gcloud auth login || err "Re-authentication failed"
      log "Re-authenticated successfully"
    else
      err "Auth token expired. Run: gcloud auth revoke --all && gcloud auth login"
    fi
  fi
}

ensure_gcloud_auth

# Step 1: Build with Google Cloud Build
# The portal Dockerfile expects scripts/db-connection-helper.js in the build context.
# Cloud Build step copies it before docker build.
log "Building portal image with Google Cloud Build for ${ENVIRONMENT}..."

CLOUDBUILD_FILE=$(mktemp)
cat > "${CLOUDBUILD_FILE}" <<YAML
steps:
  # Copy db-connection-helper into portal build context (relative path compat)
  - name: 'bash'
    args:
      - '-c'
      - 'mkdir -p portal/scripts && cp scripts/db-connection-helper.js portal/scripts/'
  # Build portal Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${IMAGE_NAME}'
      - 'portal/'
images:
  - '${IMAGE_NAME}'
timeout: '1200s'
YAML

gcloud builds submit \
  --config "${CLOUDBUILD_FILE}" \
  --project "${PROJECT_ID}" \
  --quiet \
  . || { rm -f "${CLOUDBUILD_FILE}"; err "Cloud Build failed"; }

rm -f "${CLOUDBUILD_FILE}"
log "Portal image built and pushed: ${IMAGE_NAME}"
echo ""

# Step 2: Build secrets string
build_secrets_args() {
  local secrets=""
  if [ "$ENVIRONMENT" == "production" ]; then
    secrets="DB_PASSWORD=db-mmtp-pg-production-password:latest,JWT_SECRET=jwt-secret-production:latest"
  else
    secrets="DB_PASSWORD=db-mmtp-pg-staging-password:latest,JWT_SECRET=jwt-secret-staging:latest"
  fi
  echo "${secrets}"
}

# Step 3: Deploy to Cloud Run
SECRETS_STR=$(build_secrets_args)
log "Deploying to Cloud Run (${ENVIRONMENT})..."

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --add-cloudsql-instances "${CLOUD_SQL_INSTANCE}" \
  --set-env-vars "NODE_ENV=production,MM_DEPLOYMENT_ENV=${ENVIRONMENT},PORTAL_ENV=${ENVIRONMENT},CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE},DB_SSL=false,DB_NAME=mymoolah_${ENVIRONMENT},DB_USER=mymoolah_app" \
  --set-secrets "${SECRETS_STR}" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 300 \
  --concurrency 80 \
  --allow-unauthenticated \
  --port 8080 || err "Cloud Run deployment failed"

echo ""
log "${ENV_UPPER} portal deployed successfully!"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format='value(status.url)')
log "Service URL: ${SERVICE_URL}"
log ""
log "Verify:"
log "  Health:   curl ${SERVICE_URL}/health"
log "  API:      curl ${SERVICE_URL}/api/v1/admin/health"
log "  Frontend: Open ${SERVICE_URL} in browser"
