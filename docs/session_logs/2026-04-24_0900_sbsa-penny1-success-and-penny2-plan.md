# Session Log — SBSA H2H PROD Penny #1 RESOLVED + Penny #2 Plan

- **Date**: 2026-04-24 (Friday)
- **Time**: 09:00 SAST → 10:30 SAST
- **Operator**: André Botes
- **Agent**: Claude Opus 4.7 (Cursor)
- **Session type**: Resolve Penny #1 outcome, execute Penny #2 invited by SBSA
- **Outcome**: Penny #1 RESOLVED ✅ SUCCESS (root cause on SBSA side). Penny #2 uploaded and ACK+INTAUD captured in 22 s (huge SLA outperformance) ✅. FINAUD expected Wed 2026-04-29 (Freedom Day holiday-roll). Combined success email drafted for operator dispatch. Documentation fully updated.
- **Predecessor sessions**:
  - `2026-04-23_1023_sbsa-h2h-prod-penny.md` (v2.99.6 prep — parser fixes, deploy gate, runbook, tooling)
  - `2026-04-23_1132_sbsa-h2h-prod-penny-run.md` (Penny #1 manual run — INCONCLUSIVE verdict at T+30min)

---

## Summary

Opened the session with Melanie Block's reply (2026-04-23 18:45 SAST): SBSA's developer confirmed the end-to-end process is fully automated, and that our Penny #1 file landed at 10:55 SAST but was only picked up by their automated processor at 11:55 SAST because a **processing rule was missing on their side**. They **corrected the rule at 11:54 SAST** and invited a second penny test to validate the fix.

First action: pulled the extended poller output from `sftp-1-vm` (PID 221588, ran from 11:32:06 SAST to 15:33:50 SAST on 2026-04-23). The poller had already silently captured:

- **ACK PRD** at 2026-04-23 11:56:47 SAST — GrpSts `RCVD`, MsgId matched
- **INTAUD PRD** at 2026-04-23 11:56:51 SAST — GrpSts `PDNG` / TxSts `PDNG`, Status Code `0000` "NO ERROR FOUND — PROCESSED SUCCESSFULLY"

Then reconnected to SBSA SFTP and observed:

- **/Outbox is empty** — our Pain.001 fully consumed by SBSA
- **FINAUD PRD** overnight at 2026-04-24 05:56:06 SAST — GrpSts `ACSP` / TxSts `ACSP`, Status Code `0000` "NO ERROR FOUND-PROCESSED SUCCESSFULLY"

Downloaded the FINAUD to `sftp-1-vm:/tmp/sbsa-prod-penny-responses/` and then scp'd all three response XMLs + the extended poll log back to `docs/test/sbsa-prod-penny-responses-2026-04-23/received-post-fix/`.

**André confirmed both statement sides**: R1.00 debited from `272406481` (MyMoolah PROD), R1.00 credited to `10111730633` (André's personal SBSA). Full round-trip with real money.

**Penny Test #1 verdict revised from INCONCLUSIVE → SUCCESS.** Same shape as UAT RM7 from 2026-04-17, only delayed by 60 minutes due to SBSA's processing-rule bug (now fixed).

Plan for Penny #2 (authorised by André):
- Same setup: manual sftp-1-vm path, R1.00, creditor `10111730633`
- New MsgId (timestamp-fresh), new Pain.001 filename
- **ReqdExctnDt `2026-04-27` (Monday)** — weekend-safe, so BOL will settle Monday night, FINAUD Tuesday morning
- Expected timelines now that rule is in place: pickup within 1 min, ACK within 1 min, INTAUD within 5 min, FINAUD overnight on ReqdExctnDt
- Script fix: added `--exec-date YYYY-MM-DD` CLI override to `scripts/test-sbsa-penny-prod.js` (defaults unchanged) to avoid weekend ReqdExctnDt

## Tasks completed (so far)

1. Read mandatory rules (`docs/CURSOR_2.0_RULES_FINAL.md`) and acknowledged.
2. Pulled extended poller state + captured files from VM (ACK+INTAUD found).
3. Pulled current SBSA /Outbox + /Inbox listings — /Outbox empty, /Inbox contains FINAUD.
4. Downloaded FINAUD and all response XMLs + extended log to laptop.
5. Parsed all three response XMLs — confirmed `0000` / RCVD → PDNG → ACSP round-trip.
6. Updated `docs/test/sbsa-sftp-prod-penny-report-2026-04-23.txt` with full RESOLUTION section (root cause, captured files, BOL settlement, verdict revised).
7. Asked André for direction; confirmed: statements verified, send success email, Penny #2 today, docs now.
8. Added `--exec-date` override to `scripts/test-sbsa-penny-prod.js` (no behaviour change without flag).
9. This session log authored.

## Tasks pending (this session) — completed below

- [x] Update `docs/AGENT_HANDOVER.md` top section — Penny #1 SUCCESS.
- [x] Draft `docs/test/COLETTE_REPLY_2026-04-24_prod-penny-success.md` (initial draft, superseded later by combined email in chat).
- [x] Commit + push batch 1 (session-log/handover, artefacts/email/code).
- [x] Add `--exec-date` override to `scripts/test-sbsa-penny-prod.js`.
- [x] Generate Penny #2 Pain.001 with `--exec-date 2026-04-27`.
- [x] Pre-stage Penny #2 XML + poll script on sftp-1-vm (MD5 verified).
- [x] Operator checkpoint (André approved "GO silent").
- [x] Execute Penny #2 upload via `sftp -b` — **T0 = 2026-04-24 09:30:40 SAST**, exit 0.
- [x] Baseline-diff poller (novel this session) — excluded Penny #1 residuals.
- [x] **Captured Penny #2 responses**:
  - ACK at 2026-04-24 09:30:58 SAST (T+18 s) — GrpSts `RCVD`
  - INTAUD at 2026-04-24 09:31:02 SAST (T+22 s) — GrpSts `PDNG` / TxSts `PDNG` / Code `0000`
- [x] Formal Penny #2 interim report at `docs/test/sbsa-sftp-prod-penny2-report-2026-04-24.txt`.
- [x] Combined success email delivered to André as copy-paste text in chat.

## Penny #2 outcome (this session)

**Result**: ✅ SUCCESS (interim — awaiting overnight FINAUD on Wed 2026-04-29).

- **MsgId**: `MM-PRODPENNY1777015029717-MOCKV8BA`
- **EndToEndId**: `PROD-PENNY-1777015029717-01`
- **Upload T0**: 2026-04-24 09:30:40 SAST (UTC 07:30:40.490Z), `sftp -b` exit 0, MD5 `71b795e738680cd0079060f2d292d008` verified end-to-end.
- **ACK T+18 s**: GrpSts `RCVD`, file `MYMOOLAH_OWN11_ACK_PRD_20260424093059092_241909820.xml`.
- **INTAUD T+22 s**: GrpSts `PDNG` / TxSts `PDNG` / Status Code `0000` "NO ERROR FOUND-PROCESSED SUCCESSFULLY", file `MYMOOLAH_OWN11_INTAUD_PRD_20260424093102699_241909850.xml`.
- **/Outbox**: empty within 20 s of upload (file consumed by SBSA processor).
- **SBSA SLAs**: all outperformed by wide margin. SBSA stated ACK ≤ 1 min, INTAUD ≤ 5 min, pickup ≤ 1 min; actuals were 18 s, 22 s, <20 s respectively.
- **FINAUD ETA**: Wed 2026-04-29 early hours (SBSA rolled ReqdExctnDt from our 2026-04-27 to 2026-04-28 due to Freedom Day; BOL overnight settlement on Tue yields FINAUD Wed morning).
- **Settlement ETA**: Wed 2026-04-29.

## ⚠ Freedom Day observation

Our Pain.001 had `ReqdExctnDt = 2026-04-27`; SBSA INTAUD echoes `ReqdExctnDt = 2026-04-28`. **Reason**: 27 April is Freedom Day (SA public holiday), BOL does not settle. SBSA's processor gracefully rolled forward to the next business day. This is correct behaviour on SBSA's side.

**Decision by André**: do not add SA-holiday-aware date logic to our Pain.001 generator in this session (operator's "C" choice). Observation documented in the Penny #2 report as a fact; no code change made. May be revisited when app-level integration is built out (multiple banks, higher volumes).

## Novel technique introduced this session — baseline-diff poller

The original `scripts/sbsa-prod-penny-poll.sh` exits as soon as it sees `FINAUD=1` in its local output directory. On Penny #2's launch, this was a problem: Penny #1's FINAUD was still sitting in SBSA `/Inbox` (SBSA does not auto-archive), so the poller downloaded it immediately on Poll #1 and exited, missing Penny #2's eventual responses.

**Fix**: inline baseline-diff poller on the VM:
1. Before upload: snapshot `/Inbox` PRD file list → `/tmp/penny2-work/baseline.txt`.
2. On each poll: list `/Inbox`, `comm -23` against baseline → only NEW filenames.
3. Download new files; track ACK/INTAUD/FINAUD counts; exit on (ACK ≥ 1 AND INTAUD ≥ 1) or timeout.

This correctly ignored Penny #1 residuals and captured exactly Penny #2's two new responses. Pattern is worth generalising into the persistent poll script for future pennies (tech-debt candidate, not actioned here).

## Files created / modified (Penny #2 phase, this session)

### Modified (Penny #2 phase)
- `docs/session_logs/2026-04-24_0900_sbsa-penny1-success-and-penny2-plan.md` — this file.
- `docs/AGENT_HANDOVER.md` — second top-of-file update (Penny #2 outcome).

### Created (Penny #2 phase)
- `docs/test/sbsa-sftp-prod-penny2-report-2026-04-24.txt` — interim Penny #2 report.
- `docs/test/sbsa-prod-penny2-responses-2026-04-24/MYMOOLAH_OWN11_ACK_PRD_20260424093059092_241909820.xml`
- `docs/test/sbsa-prod-penny2-responses-2026-04-24/MYMOOLAH_OWN11_INTAUD_PRD_20260424093102699_241909850.xml`
- `docs/test/sbsa-prod-penny2-responses-2026-04-24/poll.log`
- `docs/test/sbsa-prod-penny2-responses-2026-04-24/baseline.txt`

## Consolidated email to Melanie + Colette

Delivered to André as chat copy-paste text. Not committed as a separate file (supersedes the earlier `COLETTE_REPLY_2026-04-24_prod-penny-success.md` which was drafted pre-Penny-#2). Covers:
- Penny #1 full round-trip confirmation + thank-you to dev team
- Penny #2 upload + ACK + INTAUD
- Freedom Day holiday-roll observation (informative, not requesting action)
- Expected FINAUD/settlement Wed 2026-04-29
- Next phases post-Penny-#2 (scheduler flip → app-level Penny #3)

## Pending inbound validation — R10 deposit reference 0825571055 (2026-04-23)

During this session André noted that yesterday (Thu 2026-04-23) he EFT'd **R10.00** into MyMoolah treasury account `272406481` using reference `0825571055` (his own MSISDN, User ID 1). The R10 is visible on the SBSA bank statement but User ID 1's wallet has NOT been credited.

### Root cause

This is **expected behaviour given the current gate state**. The SBSA_H2H_GO_LIVE gate is still `false` in production, which means:

- `RECON_SFTP_WATCHER_MODE=off` → our sftp-1-vm gateway is NOT syncing /Inbox → GCS for statement files.
- `SBSA_STATEMENT_POLLER_MODE=off` → even if files were in GCS, no poller reads them.
- `setup-cloud-scheduler.sh --production` has not been run → no `sbsa-statement-poll-production` Cloud Scheduler job exists.

Consequence: the MT940 file SBSA delivered overnight with the R10 credit is sitting in SBSA `/Inbox` untouched. `sbsaStatementService.pollAndProcess()` has never run against it. `processDepositNotification()` has never been called for this deposit. No wallet credit, no suspense entry, nothing.

### Expected behaviour after gate flip

On Wed 2026-04-29 when Penny #2 closes cleanly and we flip `SBSA_H2H_GO_LIVE=true`:

1. Gateway resumes /Inbox → GCS syncing for statements.
2. Scheduler job `sbsa-statement-poll-production` runs every 2 min.
3. Poller discovers backlog of MT940 FINSTMT files accumulated since go-live.
4. Each is processed exactly once (MD5-hash idempotency via `SBSAStatementRun.fileHash`).
5. Every credit in every statement runs through `processDepositNotification()`:
   - MSISDN-matched credits → wallet credited atomically (DB tx with `LOCK.UPDATE` on Wallet, `Wallet.credit()`, `StandardBankTransaction` row, user-facing `Transaction` row, ledger journal).
   - Unknown references → parked in suspense account `2600-01-01`; ops alert email fired.
6. André's R10 lands in User ID 1's wallet. Reference `0825571055` normalises cleanly to `+27825571055` via Phase 1 exact match (no fuzzy logic needed).

### Operational advice for the gate-flip moment (André to have ready)

- Tail Cloud Run production logs live during the flip-and-deploy.
- Open the admin portal "Unallocated Deposits" screen in another tab.
- Expect a short burst of activity — first pass processes the entire backlog of MT940 files SBSA has delivered since the H2H connection went live.
- Some unknown-reference entries (bank-internal cross-entries, interbranch movements) may park in suspense. That is correct behaviour.
- The R10 with reference `0825571055` should be the most recent matched credit.

### Audit test cases to verify after gate flip

- [ ] User ID 1 wallet balance increases by exactly R10.00 after first MT940 poll.
- [ ] `StandardBankTransaction` row exists with `type='deposit'`, `direction='credit'`, `amount=10.00`, `referenceNumber='0825571055'`, `accountType='wallet'`, `userId=1`, `status='completed'`.
- [ ] `Transaction` row exists with matching `TXN-SBSA-DEP-...` id, `userId=1`, `type='deposit'`, `status='completed'`, amount 10.00.
- [ ] Ledger journal entry `SBSA-DEP-STMT-*` posted: debit `1100-02-01` (SBSA Main Bank Account), credit `2100-01-01` (Client Float).
- [ ] `SBSAStatementRun` row with `status='completed'`, non-zero `totalCredits`.
- [ ] Closing balance on MT940 matches our ledger balance for account `1100-02-01` (reconciliation check).

No code change is required. This is purely a gate-flip validation.

## Next steps when Penny #2 FINAUD lands (Wed 2026-04-29)

1. Pull FINAUD from SBSA /Inbox, verify GrpSts/TxSts = ACSP, Status Code 0000.
2. Confirm R1.00 debit on 272406481 + R1.00 credit on 10111730633 on statements.
3. Append a "Resolution" section to `docs/test/sbsa-sftp-prod-penny2-report-2026-04-24.txt` marking final SUCCESS.
4. If Penny #2 fully clean: flip `SBSA_H2H_GO_LIVE=true` in `scripts/deploy-backend.sh`, deploy to production, and run `./scripts/setup-cloud-scheduler.sh --production` to enable scheduler-driven pollers.
5. **Immediately after gate-flip deploy**: observe the inbound R10 deposit test case above. This is an excellent first-real-transaction validation of the full MT940 → wallet-credit pipeline on production.
6. After scheduler is verified catching a real response and R10 credits correctly, plan Penny #3 via the app-level GCS-gateway path (`scripts/test-sbsa-penny-prod-app.js`).
7. Update `AGENT_HANDOVER.md` at each milestone.

## Quick reference — where to find what

- Penny #1 report + resolution:       `docs/test/sbsa-sftp-prod-penny-report-2026-04-23.txt`
- Penny #1 captured XMLs:              `docs/test/sbsa-prod-penny-responses-2026-04-23/received-post-fix/`
- Penny #2 report (interim):           `docs/test/sbsa-sftp-prod-penny2-report-2026-04-24.txt`
- Penny #2 captured XMLs + poll log:   `docs/test/sbsa-prod-penny2-responses-2026-04-24/`
- Melanie's root-cause email:          (not in repo; see user session chat history 2026-04-23 18:45 SAST)
- Generator script:                    `scripts/test-sbsa-penny-prod.js` (now supports `--exec-date`)
- VM-side scripts on sftp-1-vm:        `/tmp/MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_20260424091709718.xml`, `/tmp/sbsa-prod-penny-poll.sh`, `/tmp/penny2-poll-diff.sh`, `/tmp/penny2-work/*`

## Key findings / decisions

- **Root cause of the 30-min silence on Penny #1 was entirely on SBSA's side.** No change needed on our file, profile, gateway, or code. Our Pain.002 parser/poller v2.99.6 changes are still valid and untouched.
- **Our extended 4-hour poller saved this test.** If we had only had the 30-min poller, we would not have captured the ACK and INTAUD that arrived 34 minutes after upload. Lesson for future first-time tests: always start with a ≥4-hour window, not 30 minutes.
- **FINAUD timing is day+1 overnight, not minutes after INTAUD.** On PROD (unlike UAT) the FINAUD comes after BOL's overnight settlement, not within 5 minutes. Our session log and report now reflect that correctly.
- **Weekend ReqdExctnDt is unsafe.** Running the penny script on a Friday without the `--exec-date` override would produce `ReqdExctnDt = Saturday`. Added the override flag rather than implementing business-day skip logic (simpler, explicit, no silent behaviour).
- **Do NOT re-upload without operator GO.** Checkpoint retained before Penny #2 even though it's a "repeat" — real money is real money.
- **SBSA gate remains CLOSED** (`SBSA_H2H_GO_LIVE=false`) in PROD. Do NOT flip until Penny #2 also round-trips cleanly.

## Files created / modified this session

### Modified
- `docs/test/sbsa-sftp-prod-penny-report-2026-04-23.txt` — added FINAL STATUS banner at top and full RESOLUTION section at bottom. Verdict INCONCLUSIVE → SUCCESS.
- `scripts/test-sbsa-penny-prod.js` — added `--exec-date YYYY-MM-DD` CLI override, header comment updated.
- `docs/AGENT_HANDOVER.md` — top-of-file Latest Feature updated (see commit).

### Created
- `docs/session_logs/2026-04-24_0900_sbsa-penny1-success-and-penny2-plan.md` — this file.
- `docs/test/sbsa-prod-penny-responses-2026-04-23/received-post-fix/MYMOOLAH_OWN11_ACK_PRD_20260423115647713_241773561.xml`
- `docs/test/sbsa-prod-penny-responses-2026-04-23/received-post-fix/MYMOOLAH_OWN11_INTAUD_PRD_20260423115651264_241772495.xml`
- `docs/test/sbsa-prod-penny-responses-2026-04-23/received-post-fix/MYMOOLAH_OWN11_FINAUD_PRD_20260424055606710_241875663.xml`
- `docs/test/sbsa-prod-penny-responses-2026-04-23/received-post-fix/sbsa-prod-penny-poll-extended.log`
- `docs/test/COLETTE_REPLY_2026-04-24_prod-penny-success.md` — success email + Penny #2 proposal.

## Penny #1 — full final timeline

| Time (SAST) | Event |
|---|---|
| 2026-04-23 10:45:22 | Pain.001 generated on operator laptop |
| 2026-04-23 10:55:37 | sftp batch PUT to SBSA /Outbox, exit 0, MD5 verified |
| 2026-04-23 10:52–11:22 | 30-min poller, nothing received (SBSA rule missing) |
| 2026-04-23 11:32:06 | Extended 4-hr poller restarted on VM (PID 221588) |
| 2026-04-23 11:31 | Escalation email sent to Colette + Melanie |
| 2026-04-23 11:54 | **SBSA fixes missing processing rule** |
| 2026-04-23 11:55 | SBSA processor picks up our Pain.001 |
| 2026-04-23 11:56:47 | ACK RCVD generated by SBSA (captured at ~11:58 by poller) |
| 2026-04-23 11:56:51 | INTAUD PDNG 0000 generated (captured at ~11:58 by poller) |
| 2026-04-23 15:33:50 | Extended poller reaches 4-hr limit, exits. ACK=1 INTAUD=1 FINAUD=0 |
| 2026-04-23 18:45 | Melanie's reply with root cause |
| 2026-04-24 05:56:06 | FINAUD ACSP 0000 generated overnight by BOL |
| 2026-04-24 09:01 | Operator observes /Outbox empty, FINAUD in /Inbox |
| 2026-04-24 — | Both statements: R1.00 debit + R1.00 credit confirmed by operator |

## Next steps when this session ends

1. If Penny #2 succeeds today: draft follow-up success confirmation (both pennies round-tripped cleanly, propose next operational step).
2. If Penny #2 fails or is slow: investigate on our side first (MsgId uniqueness, exec date, profile), then escalate.
3. **Before flipping `SBSA_H2H_GO_LIVE=true`**: at least 1 clean Penny #2 + operator agreement + documented go-live checklist.
4. **Before running `./scripts/setup-cloud-scheduler.sh --production`**: gate flip must be in PROD and verified for ≥24 hours.
5. **Before app-level penny** (`scripts/test-sbsa-penny-prod-app.js`): scheduler-based pollers verified catching a real PROD response.
