# Session Log — SBSA H2H PROD Penny Test #1 (Live Run)

- **Date**: 2026-04-23 (Thursday)
- **Time**: 10:15–11:32 SAST
- **Operator**: André Botes
- **Agent**: Claude Opus 4.7 (Cursor)
- **Session type**: Live PROD penny execution (real money, R1.00)
- **Predecessor session**: `2026-04-23_1023_sbsa-h2h-prod-penny.md` (preparation of plan, parser fixes, runbook, tooling)
- **Outcome**: **INCONCLUSIVE** — Pain.001 uploaded cleanly to SBSA PROD /Outbox at 10:55:37 SAST, but ZERO pain.002 responses received in 30-minute poll window. Escalation email sent to Colette & Melanie. Extended 4-hour monitor running.

---

## Summary

Today executed the very first live Pain.001 upload against SBSA PROD (196.8.86.53:5022) after yesterday's PROD Penny readiness work (v2.99.6) and this morning's backend + production deploys (SBSA_H2H_GO_LIVE gate CLOSED). The upload itself succeeded (sftp exit 0, MD5 integrity verified across laptop/VM/SBSA, file visible in /Outbox with correct ownership 200:100). However, no pain.002 response file (ACK, NACK, INTAUD, FINAUD, UNP_DATA, or VET_DATA) arrived in /Inbox within the 30-minute runbook window. The inbound pipe is demonstrably healthy — PROVSTMT files continued landing on normal 15-min cadence throughout (observed 11:05 SAST, 11:20 SAST). Our Pain.001 is still sitting in /Outbox at T+30min with mtime 10:55 unchanged, which means SBSA's payments processor has not fetched it. Per runbook rule ("if FINAUD not received within 20 min, STOP, do NOT re-upload"), we paused, archived evidence, and sent an escalation email to Colette+Melanie. Awaiting their response.

## Tasks completed

1. **Deploy-backend.sh bug fix** — `log()` helper was defined AFTER the SBSA H2H gate block, so macOS was falling through to /usr/bin/log (unified logging CLI). Moved helpers above the gate block. Both `--staging` and `--production` deploys then succeeded (confirmed by user). Commit `449da4d1`.

2. **Runbook fix** — `gcloud compute scp` needs `--scp-flag="-P 2222"` because sftp-1-vm's SSH daemon runs on port 2222, not 22. Without it, IAP tunnel tries port 22 and errors with `Failed to connect to port 22`. Updated Step 3 (both scp commands) and Step 8 (response scp back). Commit `3e1a9ecf`.

3. **Step A — XML generation** — Ran `node scripts/test-sbsa-penny-prod.js --confirm-prod`. Produced `/tmp/sbsa-prod-penny/MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_20260423104522947.xml` (2344 bytes, MD5 `e5f0cefb86fd09d9e130d3b6011d14ef`). xmllint clean. All fields matched UAT RM7 shape.

4. **Step B — pre-stage poll helper** — scp'd `scripts/sbsa-prod-penny-poll.sh` to `sftp-1-vm:/tmp/`. Verified `~/.ssh/sbsa_sftp_key` present on VM.

5. **Live run — Option 2 (execute without pre-check with SBSA)** — André approved. Sequence:
   - **T-3min**: Started poller on VM in background (PID 220699). Poll #1 already proved SBSA SFTP connectivity (login ok, /Inbox listable, empty of PRD responses as expected).
   - **T0 (10:55:37.317 SAST)**: `sftp -b` batch PUT to SBSA PROD /Outbox. Exit code 0. File visible on SBSA side at 10:55 mtime, correct ownership (200:100).
   - **T+6min**: File STILL in /Outbox, no /Inbox responses. /Inbox alive (PROVSTMT flowing).
   - **T+12min**: Unchanged. Fresh PROVSTMT at 11:05 SAST proves inbound pipe health.
   - **T+20min**: Unchanged. Escalation decision made per runbook rule.
   - **T+30min (11:22:51 SAST)**: Poller exited naturally after 30 polls, all empty. Our file still in /Outbox untouched.

6. **Evidence preservation** — Full poll log copied back to `docs/test/sbsa-prod-penny-responses-2026-04-23/poll-log-T0-to-T30.log` (110 lines). Report written at `docs/test/sbsa-sftp-prod-penny-report-2026-04-23.txt` with verdict INCONCLUSIVE and complete timeline.

7. **Colette email — rewritten as escalation** — Original success-case template at `docs/test/COLETTE_REPLY_2026-04-23_prod-penny.md` replaced with an honest "we need your help" email that:
   - States exact upload timestamp (10:55:37 SAST), file metadata (MsgId, size, MD5, EndToEndId).
   - Explains the null-response condition with evidence that /Inbox is healthy.
   - Asks three concrete questions (has the file been picked up, does MsgId appear in SBSA logs, is there a manual release step).
   - Commits to NOT re-uploading until SBSA confirms disposition.
   - Provided to André in chat as copy-paste ready text.

8. **Email sent** — André sent the email to Colette and Melanie.

9. **Extended monitoring started** — Restarted poll script on VM with 4-hour max runtime and 2-min interval (PID 221588). Writes to same `/tmp/sbsa-prod-penny-responses/` directory. Will catch any late pain.002 response.

## Key decisions

- **Aborted the re-upload temptation.** Runbook rule is firm: no FINAUD in 20 min → STOP. No re-upload without SBSA acknowledgement. Prevents duplicate processing / zombie files.
- **Extended monitor chosen over one-shot polling.** SBSA may process the file hours later; we want to capture that evidence automatically rather than miss it.
- **Email rewritten, not patched.** The original success-case template was discarded entirely because sending a sign-off email with blank fields would look unprofessional and confuse Colette.
- **User explicitly authorised `git push`** for this commit (normally deferred to user per Rule 1). Will push on completion.

## Files created / modified

- `docs/test/COLETTE_REPLY_2026-04-23_prod-penny.md` — **rewritten** as escalation email.
- `docs/test/sbsa-sftp-prod-penny-report-2026-04-23.txt` — **new** formal report.
- `docs/test/sbsa-prod-penny-responses-2026-04-23/poll-log-T0-to-T30.log` — **new** evidence.
- `docs/test/SBSA_PROD_PENNY_RUNBOOK.md` — added `--scp-flag="-P 2222"` to scp commands.
- `scripts/deploy-backend.sh` — moved log() / err() helper definitions above SBSA H2H gate block.

## Issues encountered

1. **deploy-backend.sh regression from v2.99.6** — helper ordering caused macOS to invoke `/usr/bin/log`. Fixed in this session (commit `449da4d1`).
2. **gcloud scp hit wrong SSH port** — needed `--scp-flag="-P 2222"` (capital P for scp; ssh uses `-p`). Fixed in runbook.
3. **sftp-1-vm /tmp is mounted noexec** — `nohup /tmp/<script>.sh` fails with Permission denied. Workaround: use `bash /tmp/<script>.sh` (read + interpret, no exec needed). Documented in this session log; runbook Step 5 should be updated in a future session to mention this.
4. **No SBSA pain.002 response for 30 minutes** — root cause unknown; awaiting SBSA investigation.

## Next steps (for next agent or when Colette replies)

1. **Wait for Colette/Melanie's reply.** User will paste the reply into chat.
2. **Based on their reply, choose a branch:**
   - *"File is queued / being processed"* → wait, monitor, write success version of Colette email + update report.
   - *"File was rejected — here's what's wrong"* → fix Pain.001 or profile settings, regenerate XML (new MsgId, fresh timestamps), re-run from Step 3.
   - *"Manual release required — we'll push it through"* → wait for the push, monitor, update report.
   - *"Can't find your MsgId"* → investigate SBSA SFTP delivery (did file actually reach their processor?), possibly re-upload with SBSA operator on the phone.
3. **Extended poller is still running** — if it catches a pain.002 before Colette replies, pull it back with `gcloud compute scp --recurse sftp-1-vm:/tmp/sbsa-prod-penny-responses docs/test/sbsa-prod-penny-responses-2026-04-23/_vm-capture --project=mymoolah-db --zone=africa-south1-a --tunnel-through-iap --scp-flag="-P 2222"`.
4. **Kill the extended poller when done.** PID is in `sftp-1-vm:/tmp/sbsa-prod-penny-poll-extended.pid`. Will also auto-stop at T+4hrs or on FINAUD.

## Important context for next agent

- **The PROD environment is deployed with SBSA_H2H_GO_LIVE=false** — SBSA_SFTP_UPLOAD_ENABLED=false, all 3 *_MODE=off. The manual upload bypassed all those gates. Nothing in Cloud Run is polling, uploading, or reconciling against this file. Safe.
- **UAT RM7 from 2026-04-17 remains the proven-good reference.** Identical file shape, identical creditor, different profile (TST vs PRD).
- **This is not a regression on our side.** Our Pain.001 parser/poller/service fixes (v2.99.6) are all correct and unit-tested; they just haven't run against a real PROD response yet because we have no PROD response.
- **Do NOT flip SBSA_H2H_GO_LIVE=true until the first PROD penny has completed round-trip successfully.**
- **Do NOT run `./scripts/setup-cloud-scheduler.sh --production`** for the same reason.
- **Commits ahead of origin/main pushed in this session:** `3d39510a`, `e8005f90`, `449da4d1`, `3e1a9ecf`, plus today's documentation commits below.

## Git

Commits planned for this session (session log + handover first, then artefacts):

```
docs: session log 2026-04-23_1132 + handover for PROD penny run
docs(sbsa-penny): rewrite Colette email as escalation + formal report + evidence log
```

User explicitly authorised `git push origin main` for this session.
