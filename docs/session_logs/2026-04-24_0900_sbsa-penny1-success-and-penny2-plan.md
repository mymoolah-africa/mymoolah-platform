# Session Log — SBSA H2H PROD Penny #1 RESOLVED + Penny #2 Plan

- **Date**: 2026-04-24 (Friday)
- **Time**: 09:00 SAST → in progress
- **Operator**: André Botes
- **Agent**: Claude Opus 4.7 (Cursor)
- **Session type**: Resolve Penny #1 outcome, execute Penny #2 invited by SBSA
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

## Tasks pending (this session)

- Update `docs/AGENT_HANDOVER.md` top section — Penny #1 SUCCESS.
- Draft `docs/test/COLETTE_REPLY_2026-04-24_prod-penny-success.md` — success + Penny #2 proposal.
- Commit + push (two commits: session-log/handover, then artefacts/email/code).
- Generate Penny #2 Pain.001 with `--exec-date 2026-04-27`.
- Pre-stage Penny #2 on sftp-1-vm.
- Operator checkpoint.
- Execute Penny #2 upload.
- Monitor ACK/INTAUD in near-realtime (expect <5 min now).
- Capture responses + formal Penny #2 report next.

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
