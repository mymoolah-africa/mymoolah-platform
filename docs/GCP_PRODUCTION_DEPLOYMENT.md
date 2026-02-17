# MyMoolah Treasury Platform - Production Deployment Guide

**Date**: February 16, 2026  
**Status**: ✅ **PRODUCTION LIVE**  
**Architecture**: Banking-Grade, Mojaloop-Compliant, Cost-Optimized

---

## Overview

This guide provides step-by-step instructions for deploying the MyMoolah Treasury Platform (MMTP) to **Production**. Production is live at:
- **API**: `https://api-mm.mymoolah.africa` (Afrihost 5-char subdomain requirement)
- **Wallet**: `https://wallet.mymoolah.africa`

---

## Prerequisites

1. **Google Cloud SDK** installed and configured
2. **Docker** installed and running
3. **gcloud authenticated**: `gcloud auth login`
4. **Project set**: `gcloud config set project mymoolah-db`
5. **Production database** migrated (all migrations applied to `mymoolah_production`)
6. **DNS access** for `api-mm.mymoolah.africa` and `wallet.mymoolah.africa` (e.g. Afrihost; note: Afrihost requires subdomain ≥5 chars for api, hence api-mm)

---

## Deployment Steps (in order)

### Step 0: Production Database (Already Complete)

Production database `mymoolah_production` on Cloud SQL `mmtp-pg-production` has been migrated. Password stored in Secret Manager as `db-mmtp-pg-production-password`.

---

### Step 1: Create Production Service Account

**Script**: `scripts/create-cloud-run-service-account-production.sh`

Creates `mymoolah-production-sa` with IAM roles for Secret Manager, Cloud SQL, Cloud Run, Logging, and Monitoring.

```bash
./scripts/create-cloud-run-service-account-production.sh
```

---

### Step 2: Store Production Secrets in Secret Manager

**Script**: `scripts/setup-secrets-production.sh`

Stores production-specific secrets. Generates JWT and session secrets if not provided. Reuses shared prod credentials (Zapper, MobileMart) from staging setup.

```bash
# Optional: provide custom secrets
export JWT_SECRET='your_64_char_secret'      # or let script generate
export SESSION_SECRET='your_64_char_secret'  # or let script generate
export EASYPAY_API_KEY='...'                  # required for EasyPay settlement
export OPENAI_API_KEY='...'                  # optional, for support engine
export VALR_API_KEY='...'                   # optional, for USDC send
export VALR_API_SECRET='...'                # optional, for USDC send

./scripts/setup-secrets-production.sh
```

**Quick add OpenAI only** (if other secrets already exist):
```bash
export OPENAI_API_KEY='sk-proj-YOUR_KEY_HERE'
./scripts/create-openai-secret-production.sh
```

**Required**: `db-mmtp-pg-production-password` must already exist (from production DB setup).

**Shared prod credentials** (from staging setup, no action needed):
- `zapper-prod-org-id`, `zapper-prod-api-token`, `zapper-prod-x-api-key`, `zapper-prod-api-url`
- `mobilemart-prod-client-id`, `mobilemart-prod-client-secret`, `mobilemart-prod-api-url`, `mobilemart-prod-token-url`

---

### Step 3: Build and Deploy Backend to Cloud Run

**Script**: `scripts/build-push-deploy-production.sh`

Builds Docker image (no cache), pushes to GCR, deploys to `mymoolah-backend-production`.

```bash
./scripts/build-push-deploy-production.sh [optional-image-tag]
```

**Configuration**:
- **Service**: `mymoolah-backend-production`
- **Cloud SQL**: `mymoolah-db:africa-south1:mmtp-pg-production`
- **Database**: `mymoolah_production`
- **CORS**: `https://wallet.mymoolah.africa` (and api-mm if needed)
- **CPU**: 1 vCPU, **Memory**: 1Gi
- **Min Instances**: 0, **Max Instances**: 10

---

### Step 4: Build and Push Wallet Frontend Image

**Script**: `scripts/build-and-push-wallet-production.sh`

Builds wallet frontend with `VITE_API_BASE_URL=https://api-mm.mymoolah.africa` (production API URL), pushes to GCR.

```bash
./scripts/build-and-push-wallet-production.sh
```

---

### Step 5: Deploy Wallet to Cloud Run

**Script**: `scripts/deploy-wallet-production.sh`

Deploys `mymoolah-wallet-production` from the image built in Step 4.

```bash
./scripts/deploy-wallet-production.sh
```

---

### Step 6: Setup Production Load Balancer

**Script**: `scripts/setup-production-load-balancer.sh`

Creates global HTTPS load balancer for custom domains. Cloud Run in `africa-south1` does not support direct domain mapping; the load balancer terminates TLS and routes traffic.

```bash
./scripts/setup-production-load-balancer.sh
```

**Resources created**:
- Static IP: `mymoolah-production-ip`
- NEGs: `moolah-backend-production-neg`, `neg-production-wallet`
- Backend services: `be-production-backend`, `be-production-wallet`
- SSL cert: `cert-production-v4` (api-mm.mymoolah.africa, wallet.mymoolah.africa, www.wallet.mymoolah.africa)
- URL map, HTTPS proxy, forwarding rule

**Output**: Script prints the static IP. Use it for DNS.

---

### Step 7: Configure DNS

Point your domains to the load balancer static IP (34.128.163.17):

| Record | Type | Value |
|--------|------|-------|
| `api-mm.mymoolah.africa` | A | 34.128.163.17 |
| `wallet.mymoolah.africa` | A | 34.128.163.17 |
| `www.wallet.mymoolah.africa` | A | 34.128.163.17 |

**Note**: Afrihost requires subdomain names ≥5 characters; use `api-mm` instead of `api`.

Get the IP:
```bash
gcloud compute addresses describe mymoolah-production-ip --global --format='value(address)'
```

---

### Step 8: Verify Certificate and Test

Managed TLS certificate may take 15–60 minutes to reach `ACTIVE`.

```bash
# Check certificate status
gcloud compute ssl-certificates describe cert-production-v4 --global --format='value(managed.status)'

# Test after DNS propagates
curl -I https://api-mm.mymoolah.africa/health
curl -I https://wallet.mymoolah.africa
```

---

## Quick Reference

| Item | Value |
|------|-------|
| Project ID | `mymoolah-db` |
| Region | `africa-south1` |
| Backend Service | `mymoolah-backend-production` |
| Wallet Service | `mymoolah-wallet-production` |
| Cloud SQL | `mymoolah-db:africa-south1:mmtp-pg-production` |
| Database | `mymoolah_production` |
| API URL | `https://api-mm.mymoolah.africa` |
| Wallet URL | `https://wallet.mymoolah.africa` |
| Static IP | 34.128.163.17 |

---

## Troubleshooting

### Backend deploy fails: "Secret not found"
- Run `./scripts/setup-secrets-production.sh` with required env vars
- Ensure `db-mmtp-pg-production-password` exists
- Ensure `jwt-secret-production` and `session-secret-production` exist (script generates if not provided)

### Backend deploy fails: "Service account not found"
- Run `./scripts/create-cloud-run-service-account-production.sh`

### Load balancer: NEG references non-existent service
- Deploy backend and wallet (Steps 3–5) before running load balancer setup (Step 6)

### Certificate stuck in PROVISIONING
- Ensure DNS A records point to the load balancer static IP
- Wait up to 60 minutes; Google must verify domain control

### Database connection errors
- Verify Cloud SQL instance `mmtp-pg-production` is running
- Verify service account has `roles/cloudsql.client`
- Check `db-mmtp-pg-production-password` in Secret Manager

---

## Security Checklist

- [ ] All secrets in Secret Manager (no hardcoded credentials)
- [ ] Production service account with least-privilege IAM
- [ ] TLS 1.3 enforced (Cloud Run + load balancer)
- [ ] CORS restricted to `https://wallet.mymoolah.africa`
- [ ] `STAGING=false` in production backend env
- [ ] Database: `mymoolah_production` (isolated from staging)

---

## Rollback

To rollback a backend deployment:
```bash
# List revisions
gcloud run revisions list --service mymoolah-backend-production --region africa-south1

# Route traffic to previous revision
gcloud run services update-traffic mymoolah-backend-production \
  --region africa-south1 \
  --to-revisions REVISION_NAME=100
```

---

**Last Updated**: February 16, 2026  
**Version**: 1.2.0
