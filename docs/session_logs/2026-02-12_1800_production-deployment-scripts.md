# Session Log - 2026-02-12 - Production Deployment Scripts

**Session Date**: 2026-02-12 18:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~30 min

---

## Session Summary
Created complete production deployment scripts and runbook for MyMoolah at `api.mymoolah.africa` and `wallet.mymoolah.africa`. All scripts mirror staging equivalents with production-specific configuration. Production database was already migrated; remaining work is Cloud Run deployment, load balancer, and DNS.

---

## Tasks Completed
- [x] Create `scripts/setup-secrets-production.sh` - JWT/session generation, EasyPay/OpenAI/VALR optional, verifies db password
- [x] Create `scripts/build-push-deploy-production.sh` - Backend build + deploy with optional secrets (only includes if exist)
- [x] Create `scripts/build-and-push-wallet-production.sh` - Wallet build with VITE_API_BASE_URL=https://api.mymoolah.africa
- [x] Create `scripts/deploy-wallet-production.sh` - Wallet Cloud Run deploy
- [x] Create `scripts/setup-production-load-balancer.sh` - Global LB, static IP, NEGs, backend services, SSL cert, URL map, forwarding rule
- [x] Create `scripts/create-cloud-run-service-account-production.sh` - mymoolah-production-sa with IAM roles
- [x] Create `docs/GCP_PRODUCTION_DEPLOYMENT.md` - Full runbook with steps 0–8

---

## Key Decisions
- **Optional secrets**: build-push-deploy-production.sh dynamically includes EasyPay/OpenAI/VALR only if they exist in Secret Manager (avoids deploy failure when optional)
- **Shared prod credentials**: Zapper and MobileMart prod credentials (zapper-prod-*, mobilemart-prod-*) reused from staging setup; no separate production copies
- **Load balancer idempotency**: setup-production-load-balancer.sh checks for existing resources before create; backend NEG attachment uses describe to avoid duplicate add-backend
- **Production service account**: Separate script (create-cloud-run-service-account-production.sh) mirrors staging SA creation for mymoolah-production-sa

---

## Files Modified
- `scripts/setup-secrets-production.sh` - New
- `scripts/build-push-deploy-production.sh` - New
- `scripts/build-and-push-wallet-production.sh` - New
- `scripts/deploy-wallet-production.sh` - New
- `scripts/setup-production-load-balancer.sh` - New
- `scripts/create-cloud-run-service-account-production.sh` - New
- `docs/GCP_PRODUCTION_DEPLOYMENT.md` - New

---

## Code Changes Summary
- 7 new scripts for production deployment
- setup-secrets-production: generates JWT/session if not provided; stores EasyPay/OpenAI/VALR when env vars set; verifies db-mmtp-pg-production-password exists
- build-push-deploy-production: build_secrets_args() checks gcloud secrets describe for optional secrets before including in --set-secrets
- setup-production-load-balancer: idempotent create for IP, NEGs, backend services, cert, URL map, proxy, forwarding rule; prints static IP for DNS

---

## Issues Encountered
- None. Staging scripts and GCP_STAGING_DEPLOYMENT.md provided clear reference.

---

## Testing Performed
- [ ] Scripts not yet executed (user will run)
- [x] Scripts made executable (chmod +x)
- [x] Cross-referenced staging scripts for consistency

---

## Next Steps
- [ ] User: Run `./scripts/create-cloud-run-service-account-production.sh`
- [ ] User: Run `./scripts/setup-secrets-production.sh` (with EASYPAY_API_KEY etc. if needed)
- [ ] User: Run `./scripts/build-push-deploy-production.sh`
- [ ] User: Run `./scripts/build-and-push-wallet-production.sh`
- [ ] User: Run `./scripts/deploy-wallet-production.sh`
- [ ] User: Run `./scripts/setup-production-load-balancer.sh`
- [ ] User: Configure DNS (api.mymoolah.africa, wallet.mymoolah.africa → static IP)
- [ ] User: Wait for cert ACTIVE, then smoke test

---

## Important Context for Next Agent
- Production deployment order: SA → secrets → backend deploy → wallet build → wallet deploy → load balancer → DNS
- Load balancer must run AFTER backend and wallet Cloud Run services exist (NEGs reference them)
- Certificate can take 15–60 min to reach ACTIVE; DNS must point to static IP first
- db-mmtp-pg-production-password must exist; use reset-production-password.sh if needed

---

## Related Documentation
- `docs/GCP_PRODUCTION_DEPLOYMENT.md` - Full runbook
- `docs/GCP_STAGING_DEPLOYMENT.md` - Staging reference
- `docs/session_logs/2026-02-12_1700_production-migration-complete.md` - DB migration context
