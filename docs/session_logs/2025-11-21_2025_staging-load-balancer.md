# Session Log - 2025-11-21 - Staging Custom Domains & HTTPS LB

**Session Date**: 2025-11-21 20:25 SAST  
**Agent**: GPT-5 Codex (Cursor)  
**User**: André  
**Duration**: ~2h

---

## Summary
- Implemented global HTTPS load balancer in front of Cloud Run staging services to enable `staging.mymoolah.africa` and `stagingwallet.mymoolah.africa`.
- Reserved static IP `34.8.79.152`, created serverless NEGs, backend services, URL map, HTTPS proxy, and forwarding rule.
- Updated Afrihost DNS (A records) and refreshed all key docs (`GCP_STAGING_DEPLOYMENT.md`, `README`, `CHANGELOG`, `AGENT_HANDOVER`).

---

## Tasks Completed
- [x] Authenticated both Codespaces and local environments with `gcloud`.
- [x] Reserved global static IP and attached staging domains via load balancer.
- [x] Created serverless NEGs (`moolah-backend-staging-neg`, `neg-staging-wallet`) and backend services (`be-staging-backend`, `be-staging-wallet`).
- [x] Provisioned managed certificate `cert-staging` (status: provisioning).
- [x] Configured URL map, HTTPS proxy, and global forwarding rule `fr-staging`.
- [x] Updated DNS to `A` records pointing to `34.8.79.152`.
- [x] Documented full process across README, changelog, staging deployment guide, and agent handover.

---

## Key Decisions
- Use Google Cloud HTTPS load balancer for TLS termination because Cloud Run in `africa-south1` does not support direct domain mappings.
- Keep services in `africa-south1` to maintain Mozaloop-compliant latency while leveraging global edge security.
- Document runbook as Step 8 in `docs/GCP_STAGING_DEPLOYMENT.md` for repeatability and future production rollout.

---

## Files Modified
- `docs/GCP_STAGING_DEPLOYMENT.md`
- `docs/changelog.md`
- `docs/readme.md`
- `docs/agent_handover.md`

---

## Testing
- DNS resolution verified (`staging.mymoolah.africa`, `stagingwallet.mymoolah.africa` → `34.8.79.152`).
- SSL cert currently provisioning; HTTPS endpoint test pending once status becomes `ACTIVE`.

---

## Risks / Blockers
- Managed certificate still provisioning; HTTPS access will show a 404 from Cloud Run until certificate becomes active (usually < 15 minutes).
- Need to replicate process for production once services and secrets are ready.

---

## Next Steps
- Monitor `cert-staging` status (`gcloud compute ssl-certificates describe cert-staging --format='value(managed.status)'`) until `ACTIVE`.
- Test both staging domains over HTTPS and capture results.
- Repeat same load-balancer setup for production (`api.mymoolah.africa`, `wallet.mymoolah.africa`) when production deploy is ready.
- Continue runtime-secret migration (pull secrets from Secret Manager at deploy time).

