# Deployment Scripts - Quick Reference

## Where to Run What

| Script | Run From | Why |
|--------|----------|-----|
| `deploy-backend.sh` | **Local Mac** | Uses Google Cloud Build — gcloud CLI only, no Docker needed |
| `deploy-wallet.sh` | **Local Mac** | Uses Google Cloud Build — gcloud CLI only, no Docker needed |
| `run-migrations-master.sh` | **Codespaces** | Cloud SQL Auth Proxy already running |

---

## Core Deployment Scripts

### Backend: `deploy-backend.sh` (Run from Local Mac)
```bash
./scripts/deploy-backend.sh --staging              # Deploy to staging
./scripts/deploy-backend.sh --production           # Deploy to production
./scripts/deploy-backend.sh --staging 20260304-1200 # Custom image tag
```
Builds (no cache), pushes to GCR, deploys to Cloud Run. Handles all secrets dynamically.

### Wallet Frontend: `deploy-wallet.sh` (Run from Local Mac)
```bash
./scripts/deploy-wallet.sh --staging               # Deploy to staging
./scripts/deploy-wallet.sh --production            # Deploy to production
```
Uses `gcloud builds submit` — builds wallet on Google's servers, pushes to GCR, deploys to Cloud Run. No Docker Desktop required.

### Database Migrations: `run-migrations-master.sh` (Run from Codespaces)
```bash
./scripts/run-migrations-master.sh uat             # All pending UAT migrations
./scripts/run-migrations-master.sh staging         # All pending Staging migrations
./scripts/run-migrations-master.sh production      # All pending Production migrations
./scripts/run-migrations-master.sh uat 20251203_01 # Specific migration
```
Requires Cloud SQL Auth Proxy running (auto-starts if needed). Uses `db-connection-helper.js`.

---

## Legacy Deployment Scripts (Still Working)

These are the older environment-specific scripts. They work but `deploy-backend.sh` and `deploy-wallet.sh` consolidate them.

```bash
./scripts/build-push-deploy-staging.sh [tag]       # Staging backend (build+push+deploy)
./scripts/build-push-deploy-production.sh [tag]    # Production backend (build+push+deploy)
```

---

## Typical Deployment Workflow

```
1. Make code changes locally
2. git add . && git commit -m "description"
3. git push origin main                              # Push to GitHub
4. In Codespaces: git pull origin main               # Pull latest
5. In Codespaces: ./scripts/run-migrations-master.sh staging    # If DB changes
6. On Local Mac: ./scripts/deploy-backend.sh --staging          # Deploy backend
7. On Local Mac: ./scripts/deploy-wallet.sh --staging           # Deploy frontend
8. Test staging
9. Repeat steps 5-7 with "production" for production release
```

---

## First-Time Setup (Run Once)

```bash
# 1. Database setup
./scripts/setup-staging-database.sh
./scripts/setup-staging-production-databases.sh

# 2. Secrets setup
./scripts/setup-secrets-staging.sh
./scripts/setup-secrets-production.sh

# 3. Service accounts
./scripts/create-cloud-run-service-account.sh          # Staging
./scripts/create-cloud-run-service-account-production.sh # Production
```

---

## Prerequisites

### Local Mac (for deployments)
1. `gcloud auth login`
2. `gcloud config set project mymoolah-db`
3. No Docker Desktop required — builds use Google Cloud Build

### Codespaces (for migrations)
1. Cloud SQL Auth Proxy running (use `./scripts/ensure-proxies-running.sh`)
2. Node.js 18+ installed
3. `gcloud auth login --no-launch-browser`

---

## Troubleshooting

### Authentication Issues
```bash
gcloud auth login
gcloud auth application-default login
gcloud auth configure-docker gcr.io
```

### Verify Setup
```bash
gcloud config get-value project     # Should show: mymoolah-db
gcloud auth list                    # Should show active account
```
