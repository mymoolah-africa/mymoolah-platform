# Session Log - 2026-04-07 - Portal Cloud Run Staging Deployment

**Session Date**: 2026-04-07 14:00–15:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~1 hour  
**Previous Session**: [Portal Auth CORS Dropdown Fix](2026-04-07_1250_portal-auth-cors-dropdown-fix.md)

---

## Session Summary

Deployed the MMTP Admin Portal to GCP Cloud Run (staging) as a single-service architecture (Express backend serves API + frontend static files from one origin). Created Dockerfile, deploy script, start.sh entry point, and .dockerignore. Fixed CORS issue with Vite `crossorigin` script tags. Updated `seed-portal-admin.js` to accept environment argument for seeding admin users into staging/production databases. Portal verified live and operational at https://mymoolah-portal-staging-4ekgjiko5a-bq.a.run.app.

---

## Tasks Completed
- [x] Created `portal/Dockerfile` — multi-stage build (frontend builder + Node.js backend)
- [x] Created `portal/start.sh` — constructs DATABASE_URL from Cloud Run injected env vars
- [x] Created `portal/.dockerignore` — excludes dev files from build context
- [x] Modified `portal/backend/server.js` — support PORT env var, bind 0.0.0.0
- [x] Modified `portal/backend/app.js` — serve frontend static files, SPA fallback, CSP update, CORS fix for `.run.app` origins
- [x] Modified `portal/backend/helpers/getDbClient.js` — DATABASE_URL support with db-connection-helper fallback
- [x] Modified `portal/backend/models/index.js` — DATABASE_URL support with db-connection-helper fallback
- [x] Created `scripts/deploy-portal.sh` — Cloud Build + Cloud Run deploy script with `--no-cache`
- [x] Updated `docs/DEPLOYMENT_GUIDE.md` — portal deployment section
- [x] Updated `scripts/seed-portal-admin.js` — accepts `uat|staging|production` argument
- [x] Deployed to staging — Cloud Build SUCCESS (3m46s), Cloud Run revision `00002-qlq`
- [x] Seeded admin user into staging database (André ran in Codespaces)
- [x] Verified: health endpoint, API health, database connection, frontend login + dashboard

---

## Key Decisions
- **Single Cloud Run service**: Express backend serves both API and frontend static files from one origin. Banking-grade: no CORS between services, simpler CSP, reduced attack surface. Industry standard for admin portals.
- **`--no-cache` on Docker builds**: André had issues with cached deployments in the past. Deploy script forces fresh builds every time.
- **DATABASE_URL for Cloud Run, db-connection-helper for Codespaces**: Cloud Run connects via Unix socket (no Cloud SQL Auth Proxy needed). Codespaces uses db-connection-helper via TCP proxy. Both paths coexist via conditional logic.
- **Vite `crossorigin` CORS fix**: Vite generates `<script type="module" crossorigin>` which causes browsers to send Origin header even for same-origin requests. CORS middleware updated to allow `.run.app` origins.

---

## Files Modified
- `portal/Dockerfile` (NEW) — Multi-stage Docker build for Cloud Run
- `portal/start.sh` (NEW) — Entry point: constructs DATABASE_URL from Cloud Run env vars
- `portal/.dockerignore` (NEW) — Excludes dev artifacts from Docker context
- `portal/backend/server.js` — PORT env var + 0.0.0.0 host binding
- `portal/backend/app.js` — Static file serving, SPA fallback, CSP update, CORS `.run.app` allow
- `portal/backend/helpers/getDbClient.js` — DATABASE_URL pool for Cloud Run, db-connection-helper fallback
- `portal/backend/models/index.js` — Sequelize DATABASE_URL support
- `scripts/deploy-portal.sh` (NEW) — Cloud Build + Cloud Run deployment script
- `scripts/seed-portal-admin.js` — Accepts environment argument (uat|staging|production)
- `docs/DEPLOYMENT_GUIDE.md` — Added portal deployment section

---

## Code Changes Summary
- **Dockerfile**: 2-stage build — Stage 1 builds React/Vite frontend, Stage 2 runs Node.js backend with built frontend in `/portal/admin/frontend/dist`
- **start.sh**: Constructs `DATABASE_URL` from `DB_PASSWORD`, `CLOUD_SQL_INSTANCE`, `DB_NAME`, `DB_USER` env vars (injected by Cloud Run via secrets)
- **deploy-portal.sh**: Uses Cloud Build YAML with `--no-cache`, deploys to `mymoolah-portal-{env}` Cloud Run service, injects secrets from Secret Manager
- **DB connectivity**: Conditional — if `DATABASE_URL` exists (Cloud Run), use pg Pool directly; otherwise fall back to `db-connection-helper.js` (Codespaces/local)
- **CORS**: Added `origin.endsWith('.run.app')` to allowed origins list

---

## Issues Encountered
- **Issue 1: `package-lock.json` missing** — `npm ci` requires lockfile. Changed to `npm install --ignore-scripts` (frontend) and `npm install --omit=dev` (backend).
- **Issue 2: `db-connection-helper.js` incompatible with Cloud Run** — Uses `gcloud` CLI and `lsof` (not available in container). Implemented conditional DATABASE_URL path.
- **Issue 3: Frontend JS assets returning 400** — Vite's `crossorigin` attribute causes Origin header on same-origin requests. CORS middleware rejected the Cloud Run origin. Fixed by allowing `.run.app` origins.
- **Issue 4: No admin user in staging DB** — Admin was only seeded in UAT. Updated `seed-portal-admin.js` to accept environment argument. André seeded staging from Codespaces.
- **Issue 5: Docker cache issues** — André requested `--no-cache` flag on all builds to avoid stale deployments.

---

## Testing Performed
- [x] Health endpoint: `curl /health` — `{"success":true,"version":"2.0.0"}`
- [x] API health: `curl /api/v1/admin/health` — `{"status":"healthy","database":"connected","totalPortalUsers":0}`
- [x] Frontend load: Login page renders with MyMoolah branding, TLS 1.3 badge
- [x] Admin login: André logged in with seeded credentials — dashboard loads with real staging data
- [x] Browser screenshot verification: Dashboard shows KPI cards, settlements, alerts
- [x] Test results: PASS — all endpoints and UI verified

---

## Next Steps
- [ ] Work on portal layouts and screen styling (André's next session priority)
- [ ] Convert inline styles to CSS variables in 4 disbursement/unallocated overlays
- [ ] Build Float Management screen (real data from `supplier_floats`)
- [ ] Build Security/Audit Log screen
- [ ] Deploy portal to production when ready (custom URL planned)
- [ ] Seed admin user in production when deploying there

---

## Important Context for Next Agent
- Portal is live on staging: https://mymoolah-portal-staging-4ekgjiko5a-bq.a.run.app
- Cloud Run service name: `mymoolah-portal-staging`
- Deploy command: `./scripts/deploy-portal.sh --staging` (runs from local, NOT Codespaces)
- `--no-cache` is mandatory — André had issues with cached deployments
- DB connection in Cloud Run uses DATABASE_URL (Unix socket), NOT db-connection-helper.js
- DB connection in Codespaces uses db-connection-helper.js (TCP proxy)
- To seed admin users: `PORTAL_ADMIN_PASSWORD='xxx' node scripts/seed-portal-admin.js staging` (run in Codespaces)
- CORS allows `.run.app` origins (for Vite `crossorigin` script tags)
- Production deployment will need a custom URL (André's preference)
- André wants to work on **portal layouts** in the next session — read `docs/PORTAL_DEVELOPMENT_GUIDE.md` and `.agents/skills/admin-portal-builder/SKILL.md`

---

## Questions/Unresolved Items
- Custom URL for production portal (André to decide on domain)
- Production admin user seeding (when production deployment happens)

---

## Related Documentation
- `docs/DEPLOYMENT_GUIDE.md` — Updated with portal deployment section
- `docs/PORTAL_DEVELOPMENT_GUIDE.md` — Portal design system and build guide
- `.agents/skills/admin-portal-builder/SKILL.md` — 15-screen priority list
- Previous session: `docs/session_logs/2026-04-07_1250_portal-auth-cors-dropdown-fix.md`
