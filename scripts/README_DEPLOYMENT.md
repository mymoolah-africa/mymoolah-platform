# Deployment Scripts - Quick Reference

## Staging Deployment Scripts

All scripts are in the `scripts/` directory and are executable.

### 1. Database Setup
```bash
./scripts/setup-staging-database.sh
```
Creates database, user, and stores password in Secret Manager.

### 2. Secrets Setup
```bash
./scripts/setup-secrets-staging.sh
```
Stores all Zapper and application secrets in Secret Manager.

### 3. Service Account Setup
```bash
./scripts/create-cloud-run-service-account.sh
```
Creates service account with necessary IAM permissions.

### 4. Docker Build & Push
```bash
./scripts/build-and-push-docker.sh [tag]
```
Builds and pushes Docker image to GCR (default tag: latest).

### 5. Cloud Run Deployment
```bash
./scripts/deploy-cloud-run-staging.sh
```
Deploys Cloud Run service with all configuration.

### 6. Database Migrations
```bash
./scripts/run-migrations-staging.sh
```
Runs Sequelize migrations on staging database.

### 7. Service Testing
```bash
./scripts/test-staging-service.sh
```
Tests deployed service endpoints.

---

## Full Deployment Sequence

Run scripts in this order:

```bash
# 1. Database setup
./scripts/setup-staging-database.sh

# 2. Secrets setup
./scripts/setup-secrets-staging.sh

# 3. Service account
./scripts/create-cloud-run-service-account.sh

# 4. Build and push Docker
./scripts/build-and-push-docker.sh

# 5. Deploy to Cloud Run
./scripts/deploy-cloud-run-staging.sh

# 6. Run migrations
./scripts/run-migrations-staging.sh

# 7. Test service
./scripts/test-staging-service.sh
```

---

## Prerequisites

Before running scripts:
1. `gcloud auth login`
2. `gcloud config set project mymoolah-db`
3. Docker installed and running
4. Node.js 18+ installed
5. PostgreSQL client (psql) installed

---

## Troubleshooting

### Authentication Issues
```bash
gcloud auth login
gcloud auth application-default login
```

### Permission Issues
```bash
# Verify project
gcloud config get-value project

# Verify authentication
gcloud auth list
```

### Docker Issues
```bash
# Configure Docker for GCR
gcloud auth configure-docker gcr.io
```

---

For detailed documentation, see `docs/GCP_STAGING_DEPLOYMENT.md`

