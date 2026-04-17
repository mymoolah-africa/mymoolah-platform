# SBSA H2H SFTP Hardening — Phases 0-5a (v2.98.0)

**Date:** 2026-04-17
**Agent:** Claude (Opus 4.6 via Cursor)
**Scope:** Fix latent Pain.001 upload bug, wire up two previously-unstarted pollers, and add three OIDC-authenticated Cloud Scheduler endpoints. All work completed in a single session.

---

## Summary

The H2H SFTP integration was reviewed end-to-end and five independent issues were corrected:

1. `disbursementService.approveRun` attempted `new SbsaSftpClientService()` — the service exports plain functions, not a class. This was a latent crash in the automated Pain.001 upload path; the manual CLI upload was what actually worked during SBSA testing. The catch block silently wrote to `/tmp` on any failure, masking the bug.
2. `pain002PollerService` had a working `startPolling()` function but was never imported from `server.js`.
3. `SFTPWatcherService` had a working `start()` method but no caller.
4. The SBSA statement poller used a boolean `SBSA_STATEMENT_POLLER_ENABLED` flag with no Cloud Scheduler path, so `min-instances=0` on Cloud Run would kill the in-process timer.
5. No Cloud Scheduler jobs existed for any of the above.

All five are now fixed. Every new feature defaults to `off` in production until UAT validation.

---

## Phase-by-phase

### Phase 0 — Baseline
Confirmed `scripts/deploy-backend.sh` did not set any SBSA SFTP flags → all defaults applied. No in-flight `DisbursementRun`s at risk (tests mocked). `tests/standardbank/`, `tests/routes/`, `tests/reconciliation/` did not exist — safe to create.

### Phase 1 — Fix `disbursementService.approveRun`
Replaced the class instantiation + `/outbox/payments` + silent `/tmp` fallback with a direct `uploadPain001File(xml, filename)` call. Upload failures now throw a structured `SBSA_UPLOAD_FAILED` error.

File: `services/standardbank/disbursementService.js` (lines ~370-390)

Tests: `tests/disbursement/disbursementService.pain001Upload.test.js` (4/4 passing, 143/143 full suite).

### Phase 2 — `sbsaSftpClientService` unit tests
Validated input rules, `/tmp` fallback mode, GCS upload, retry with backoff, retry exhaustion, per-environment outbox paths.

File: `tests/standardbank/sbsaSftpClientService.test.js` (9/9 passing).

### Phase 3 — Wire up `pain002PollerService`
Added a gated startup block in `server.js` after the statement poller block. Mode values: `cron` | `scheduler` | `off` (default `off`). Legacy `SBSA_PAIN002_POLLER_ENABLED=true` maps to `cron`. SIGTERM handler calls `stopPolling()`.

File: `server.js`

Tests: `tests/standardbank/pain002PollerService.test.js` (6/6 passing).

### Phase 4 — Wire up `SFTPWatcherService`
Added a gated startup block in `server.js`. `RECON_SFTP_WATCHER_MODE` (default `off`). Watcher exposed on `global.__sftpWatcher` so SIGTERM can stop it.

File: `server.js`

Tests: `tests/reconciliation/SFTPWatcherService.test.js` (6/6 passing).

### Phase 5a — Cloud Scheduler endpoints
Extended existing files rather than creating new ones (per project rule — no duplicate infrastructure):

- `routes/standardbank.js` — added `/scheduled-statement-poll` and `/scheduled-pain002-poll`.
- `routes/reconciliation.js` — added `/scheduled-sftp-sweep` (distinct from existing `/scheduled-recon` which is the internal wallet/ledger audit).
- `scripts/setup-cloud-scheduler.sh` — extended with three new `create_http_job` calls.

All endpoints gated by existing `verifyCloudSchedulerToken` middleware (OIDC).

Also aligned the SBSA statement poller with the same `*_MODE` pattern (`SBSA_STATEMENT_POLLER_MODE`). Legacy `SBSA_STATEMENT_POLLER_ENABLED=false` still maps to `off`.

Tests: `tests/routes/sbsa-scheduled.test.js` (4/4 passing).

### Phase 6 — Documentation, deploy script, tech debt
- `docs/CHANGELOG.md` — v2.98.0 entry.
- `docs/SBSA_H2H_SETUP_GUIDE.md` — new env-var map section at top.
- `.cursor/rules/tech-debt.mdc` — added three new items (Chai/Jest inconsistency, statement poller mode transition, hardcoded STANDARDBANK_ENVIRONMENT).
- `scripts/deploy-backend.sh` — registered four new env vars (all default safe).

---

## Files modified

| File | Change |
|---|---|
| `services/standardbank/disbursementService.js` | Replaced broken Pain.001 upload block |
| `server.js` | Three new gated blocks (statement MODE, Pain.002 MODE, watcher MODE) + SIGTERM additions |
| `routes/standardbank.js` | +2 Cloud Scheduler endpoints |
| `routes/reconciliation.js` | +1 Cloud Scheduler endpoint |
| `scripts/setup-cloud-scheduler.sh` | +3 job definitions |
| `scripts/deploy-backend.sh` | +4 env vars (all default off) |
| `docs/CHANGELOG.md` | v2.98.0 entry |
| `docs/SBSA_H2H_SETUP_GUIDE.md` | Env-var map section |
| `.cursor/rules/tech-debt.mdc` | 3 new items |
| `tests/disbursement/disbursementService.pain001Upload.test.js` | NEW (4 tests) |
| `tests/standardbank/sbsaSftpClientService.test.js` | NEW (9 tests) |
| `tests/standardbank/pain002PollerService.test.js` | NEW (6 tests) |
| `tests/reconciliation/SFTPWatcherService.test.js` | NEW (6 tests) |
| `tests/routes/sbsa-scheduled.test.js` | NEW (4 tests) |

**Total new tests:** 29. **Full disbursement suite:** 143/143 passing.

---

## Per-phase sweep outputs (Step 0 gate)

| Phase | Existing infrastructure found? | Created new? |
|---|---|---|
| 0 | Deploy scripts have no SBSA_* flags | No |
| 1 | `uploadPain001File()` exists in sbsaSftpClientService | No — used existing function |
| 2 | `tests/standardbank/` did not exist | Yes — legitimate new directory |
| 3 | `pain002PollerService.startPolling()` already implemented | No — just wired existing function |
| 4 | `SFTPWatcherService.start()` already implemented | No — just wired existing class |
| 5a | `routes/standardbank.js`, `routes/reconciliation.js`, `scripts/setup-cloud-scheduler.sh`, `middleware/cloudSchedulerAuth.js` all existed | No — extended all four |

---

## What the next agent needs to know

1. **Nothing is live yet.** All `*_MODE` env vars default to `off` in production. The disbursement fix is active (it was a bug fix, not a feature) but the upload remains gated by `SBSA_SFTP_UPLOAD_ENABLED=false` so Pain.001 files still go to `/tmp` until SBSA confirms test portal is open.
2. **Cloud Scheduler jobs are defined but not created yet.** Run `./scripts/setup-cloud-scheduler.sh --staging` when ready to test the scheduler path on staging.
3. **SBSA test SFTP access is still blocked** (permission denied on RSA key, email sent to Colette 2026-04-17 morning asking SBSA IT to reload the key). This session made no changes to SFTP credentials — it only hardened the integration layer.
4. **Chai/Jest test-framework inconsistency** — flagged in tech debt. The old `tests/reconciliation.test.js` uses Chai and requires a DB. It was not touched.

---

## Exact test commands

```bash
npx jest tests/disbursement/disbursementService.pain001Upload.test.js --runInBand
npx jest tests/standardbank/sbsaSftpClientService.test.js --runInBand
npx jest tests/standardbank/pain002PollerService.test.js --runInBand
npx jest tests/reconciliation/SFTPWatcherService.test.js --runInBand
npx jest tests/routes/sbsa-scheduled.test.js --runInBand
```

All pass on macOS, Node 20, jest@30.

---

## Restart required?

No — the disbursement code fix is active immediately on deploy but the path is still gated by `SBSA_SFTP_UPLOAD_ENABLED=false`. All new pollers default to `off`. This is a code-only release.

Codespaces testing when ready:

```bash
git pull origin main
./scripts/one-click-restart-and-start.sh
```

To exercise the new Cloud Scheduler endpoint in UAT/Codespaces, send an authenticated POST:
```bash
curl -X POST http://localhost:3001/api/v1/standardbank/scheduled-statement-poll \
  -H "Authorization: Bearer $OIDC_TOKEN"
```
(401 without a valid Google-signed OIDC token — by design.)
