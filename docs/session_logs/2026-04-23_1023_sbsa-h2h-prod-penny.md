# Session Log — SBSA H2H PROD Penny readiness

**Date**: 2026-04-23
**Start**: ~09:00 SAST
**End**: ~10:23 SAST
**Operator**: André Botes (human)
**Agent**: Claude Opus 4.7 (Cursor 2.0)
**Version shipped**: v2.99.6 (CHANGELOG updated)
**Branch**: main (local)
**Git**: commits staged locally — DO NOT push from agent per user rule

---

## Session goal

Implement the full PROD Penny test plan documented in
`.cursor/plans/sbsa_h2h_prod_penny_test_a6da126c.plan.md`:

1. Ship four outstanding pain002 parser/poller correctness fixes (AddtlInf
   capture, INTAUD-terminal, UNPAID-authoritative, filename filter widening),
   gated off in production.
2. Add unit tests covering the new rules.
3. Build a guarded R1.00 Pain.001 PRD generator and a manual-upload runbook
   for the first penny via sftp-1-vm.
4. Prepare a response capture directory, polling helper for the VM, and a
   report template.
5. Draft the Colette reply email and set up the env-gate flip for Phase 5.
6. Build the app-level (GCS-gateway) Penny #2 script.
7. Update setup guide, changelog, handover, and create this session log.

## Constraint

Phases 3 (upload), 5 (deploy), and 6 (second upload) are operator steps —
they move real money or deploy production. The agent prepared all code and
documents; André executes when ready.

---

## What was shipped

### Parser + poller correctness (Phase 1)

**`services/standardbank/pain002Parser.js`** (rewrite)
- New `classifyResponseType(filename)` export maps SBSA response filenames
  to `ACK|NACK|INTAUD|FINAUD|UNPAID|VET|null`.
- `parsePain002(xml, { filename })` now returns `responseType`, group-level
  `addtlInf`, per-tx `txStatus`, `rejectionReasonDetail`, and
  `unpaidReasonCode`.
- Code 0009 disambiguation: `rejectionReason` now prefers `<AddtlInf>` text
  over the generic `REJECTION_MESSAGES` dictionary (so RM9 "INVALID ACCOUNT"
  and RM5v2 "RUN EXCEEDS LIMIT" come out distinguishable despite sharing
  code 0009).
- `ACWC` is treated as **rejected** under UNPAID only; elsewhere it remains
  accepted (backward compatible).

**`services/standardbank/pain002PollerService.js`** (surgical edits)
- Filename filter widened from `/pain002/i` to
  `/(MYMOOLAH_[A-Z0-9]+_(ACK|NACK|INTAUD|FINAUD|UNP_DATA|VET_DATA)_(TST|PRD)_|pain002)/i`.
  UNP_DATA and VET_DATA files are no longer silently skipped.
- `parsePain002` now called with `{ filename }` so classifier can fire.
- Log lines include `responseType` and `addtlInf` for observability.

**`services/standardbank/disbursementService.processPain002Response`** (rewrite)
- Branches by `responseType`:
  - **ACK / VET** → informational; no DB writes.
  - **NACK** → mark all pending payments `rejected` with group `AddtlInf`;
    set run `status='failed'`, `pending_count=0`, `completed_at=now()`.
  - **INTAUD** with `GrpSts=RJCT` → terminal; force-close residual pending.
  - **INTAUD** with per-tx `RJCT` inside PART/PDNG → reject that tx; leave
    PDNG rows untouched.
  - **FINAUD** → authoritative, BUT skip any payment where
    `metadata.pre_unpaid_status` is set (UNPAID already took priority).
  - **UNPAID** → always applies per-tx regardless of prior state;
    preserves `pre_unpaid_status`, `unpaid_reason_code`, `unpaid_tx_status`,
    `unpaid_applied_at` in `payment.metadata`.
- `responseType` and `terminal` fields added to the return object.

### Unit tests

- `tests/standardbank/pain002Parser.test.js` — new, 9 tests.
- `tests/standardbank/pain002PollerService.test.js` — 2 new cases + 1 updated
  signature.
- `tests/disbursement/disbursementService.processPain002Response.test.js` —
  new, 6 cases.
- Full suites: **149/149 disbursement**, **26/26 standardbank** — all green.

### Penny test tooling (Phases 2 + 6)

- `scripts/test-sbsa-penny-prod.js` — guarded R1.00 Pain.001 PRD generator.
  Refuses without `--confirm-prod`. Forces `SBSA_FILE_ENV=PRD`. Writes to
  `/tmp/sbsa-prod-penny/`. Prints XML for review. Does NOT upload.
  Verified: generates `MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_*.xml`, 2344 bytes,
  correct debtor/creditor/amount/reference.
- `scripts/test-sbsa-penny-prod-app.js` — app-level Penny #2 via
  `sbsaSftpClientService.uploadPain001File()`. Guarded. Warns when env
  implies dry-run. Dry-run verified end-to-end (service wrote to
  `/tmp/sbsa-outbox/`).
- `scripts/sbsa-prod-penny-poll.sh` — bash helper for sftp-1-vm. Polls
  `/Inbox` every 60s for up to 30 min; downloads all `*_PRD_*.xml`
  responses; stops on FINAUD.

### Runbook + templates (Phase 3 prep)

- `docs/test/SBSA_PROD_PENNY_RUNBOOK.md` — 11-step operator runbook with
  review checklist, scp/ssh/sftp commands, rollback paths.
- `docs/test/sbsa-sftp-prod-penny-report-TEMPLATE.txt` — audit template.
- `docs/test/sbsa-prod-penny-responses-2026-04-23/README.md` — response
  directory README with expected timings and `/BAS/`-is-TEST-only note.

### Email draft (Phase 4)

- `docs/test/COLETTE_REPLY_2026-04-23_prod-penny.md` — plain prose,
  no tables, placeholders for the real timestamps. Reports file-level
  round-trip + settlement, requests formal PROD go-live sign-off.

### Deploy gate (Phase 5)

- `scripts/deploy-backend.sh` — added `SBSA_H2H_GO_LIVE` gate (default
  `false`). When `ENVIRONMENT=production && SBSA_H2H_GO_LIVE=true`, the
  four SBSA env vars (`SBSA_SFTP_UPLOAD_ENABLED`, `SBSA_STATEMENT_POLLER_MODE`,
  `SBSA_PAIN002_POLLER_MODE`, `RECON_SFTP_WATCHER_MODE`) flip in lockstep.
  Defaults remain OFF/off so re-deploying at any time is a no-op — gate
  flips by either editing the default in the script or running
  `SBSA_H2H_GO_LIVE=true ./scripts/deploy-backend.sh --production`.
- `scripts/setup-cloud-scheduler.sh --production` already supports the
  three SBSA jobs; runbook instructs operator to run it post-penny.

### Documentation updates (final phase)

- `docs/SBSA_H2H_SETUP_GUIDE.md` — added a PROD Penny Test block to the
  UAT matrix, plus a "Parser/poller changes shipped 2026-04-23" note
  listing every dormant code path.
- `docs/CHANGELOG.md` — new v2.99.6 entry with full detail.
- `docs/agent_handover.md` line 835 — flipped the status line from
  "PROD smoke test pending" to reflect the shipped correctness fixes
  (gated off) and the operator-pending penny.
- `docs/session_logs/2026-04-23_1023_sbsa-h2h-prod-penny.md` — this file.

---

## Key decisions

1. **Ship parser fixes OFF in production.** The plan explicitly asked for
   this. All new code paths are reached only when the poller runs, which
   requires `SBSA_PAIN002_POLLER_MODE=scheduler` — still `off` by default.
2. **Single `SBSA_H2H_GO_LIVE` toggle** instead of four independent env
   vars. Simpler mental model, atomic rollback, less risk of flipping
   three out of four and leaving the stack half-live.
3. **ACWC under UNPAID = rejected.** Confirmed by RM12 on 2026-04-17: Tx-03
   showed ACSP in FINAUD and then ACWC in UNP_DATA with
   `Unpaid Reason Code 14` — SBSA behaviour is "accepted with change"
   meaning a post-settlement amendment. We treat this as rejected on the
   app side and preserve the original FINAUD status in
   `metadata.pre_unpaid_status` for audit.
4. **INTAUD RJCT is terminal.** Triple-confirmed (RM9, RM10, RM5v2).
   Our service now actively forces any remaining pending payments to
   `rejected` in that case so the run can't hang.
5. **Manual sftp-1-vm upload before app-level upload.** Same pattern as
   UAT RM7 — lowest risk, zero changes to the deployed backend, proves the
   bank side first. Only flip the env gate after settlement confirmed.

## Issues encountered

- Jest mock-hoisting rule: initial `const txnStub = ...` outside the
  `jest.mock` factory triggered "Invalid variable access: txnStub".
  Renamed to `mockTxnStub` (Jest allows `mock*` prefixed locals inside
  mock factories). Fixed, all tests green.
- One existing poller test asserted the old single-argument call to
  `parsePain002`; updated to expect the new `(xml, { filename })` signature.

## Files modified

| File | Change |
|------|--------|
| `services/standardbank/pain002Parser.js` | full rewrite |
| `services/standardbank/pain002PollerService.js` | filter + parser wiring |
| `services/standardbank/disbursementService.js` | processPain002Response rewrite |
| `scripts/deploy-backend.sh` | SBSA_H2H_GO_LIVE gate |
| `tests/standardbank/pain002PollerService.test.js` | +2 cases, 1 updated |
| `docs/SBSA_H2H_SETUP_GUIDE.md` | PROD penny block + changes notes |
| `docs/CHANGELOG.md` | v2.99.6 entry |
| `docs/agent_handover.md` | line 835 status flip |

## Files added

| File | Purpose |
|------|---------|
| `scripts/test-sbsa-penny-prod.js` | R1.00 PRD Pain.001 generator |
| `scripts/test-sbsa-penny-prod-app.js` | App-level Penny #2 via GCS gateway |
| `scripts/sbsa-prod-penny-poll.sh` | sftp-1-vm /Inbox polling helper |
| `tests/standardbank/pain002Parser.test.js` | 9 parser unit tests |
| `tests/disbursement/disbursementService.processPain002Response.test.js` | 6 service unit tests |
| `docs/test/SBSA_PROD_PENNY_RUNBOOK.md` | 11-step operator runbook |
| `docs/test/sbsa-sftp-prod-penny-report-TEMPLATE.txt` | Audit report template |
| `docs/test/sbsa-prod-penny-responses-2026-04-23/README.md` | Response capture README |
| `docs/test/COLETTE_REPLY_2026-04-23_prod-penny.md` | Email draft to SBSA |
| `docs/session_logs/2026-04-23_1023_sbsa-h2h-prod-penny.md` | This session log |

---

## Next steps for the next agent / operator

**If André is ready to execute the PROD penny:**

1. From the repo root on the laptop:
   `node scripts/test-sbsa-penny-prod.js --confirm-prod`
2. Review the generated XML against the checklist in
   `docs/test/SBSA_PROD_PENNY_RUNBOOK.md` → Step 1.
3. (Recommended) Email the XML to Colette + Melanie for a 5-min sanity
   check.
4. Follow the runbook Steps 3–8: scp onto sftp-1-vm, ssh in, start the
   poller in one session, sftp-upload the Pain.001 in another.
5. Fill in `docs/test/sbsa-sftp-prod-penny-report-2026-04-23.txt` from the
   template as responses arrive.
6. Confirm R1.00 debit on account 272406481 on next business day statement.
7. Send `docs/test/COLETTE_REPLY_2026-04-23_prod-penny.md` (after filling
   placeholders) to Colette + Melanie.

**After Penny #1 passes:**

8. Flip `SBSA_H2H_GO_LIVE=true` in `scripts/deploy-backend.sh` (or pass
   via env for a one-shot).
9. Run `./scripts/deploy-backend.sh --production`.
10. Run `./scripts/setup-cloud-scheduler.sh --production`.
11. Run `STANDARDBANK_ENVIRONMENT=production SBSA_SFTP_UPLOAD_ENABLED=true
    node scripts/test-sbsa-penny-prod-app.js --confirm-prod` for Penny #2.
12. Watch Cloud Run logs for the Cloud Scheduler pain002 poller picking
    up the PROD responses and updating DisbursementPayment rows.

**Git**
- Code changes are committed locally (agent will do the commits now).
- **DO NOT push** — André will push when ready. User will run
  `git push origin main`.

**Restart**
- Backend restart required on the next deploy because
  `disbursementService.js` is imported at boot. No data migration.
- The parser/poller code is dormant in production until the
  `SBSA_H2H_GO_LIVE` gate is flipped — safe to ship right now.
