# Deployment Scripts - Quick Reference

## Core Deployment Scripts

### Backend: `deploy-backend.sh`
```bash
./scripts/deploy-backend.sh --staging              # Deploy to staging
./scripts/deploy-backend.sh --production           # Deploy to production
./scripts/deploy-backend.sh --staging 20260304-1200 # Custom image tag
```
Builds (no cache), pushes to GCR, deploys to Cloud Run. Handles all secrets dynamically.

### Wallet Frontend: `deploy-wallet.sh`
```bash
./scripts/deploy-wallet.sh --staging               # Deploy to staging
./scripts/deploy-wallet.sh --production            # Deploy to production
```
Builds wallet frontend, pushes to GCR, deploys to Cloud Run.

### Database Migrations: `run-migrations-master.sh`
```bash
./scripts/run-migrations-master.sh uat             # All pending UAT migrations
./scripts/run-migrations-master.sh staging         # All pending Staging migrations
./scripts/run-migrations-master.sh production      # All pending Production migrations
./scripts/run-migrations-master.sh uat 20251203_01 # Specific migration
```
Auto-starts Cloud SQL Auth Proxy if needed. Uses `db-connection-helper.js`.

---

## Legacy Deployment Scripts (Still Working)

These are the older environment-specific scripts. They work but `deploy-backend.sh` and `deploy-wallet.sh` consolidate them.

```bash
./scripts/build-push-deploy-staging.sh [tag]       # Staging backend (build+push+deploy)
./scripts/build-push-deploy-production.sh [tag]    # Production backend (build+push+deploy)
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

1. `gcloud auth login`
2. `gcloud config set project mymoolah-db`
3. Docker installed and running
4. Node.js 18+ installed

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
docker info                         # Should show Docker running
```
