# Session Log — SBSA H2H SFTP Connectivity Confirmed (TEST + PROD)

**Date:** 2026-04-17 13:10 SAST
**Agent:** Claude 4.5 Opus
**Version:** v2.98.0 (no version bump — test/docs only)

---

## Summary

Resolved the SBSA H2H SFTP authentication failures that were reported on 2026-04-16 and 2026-04-17 morning. Root cause: the agent (and subsequent review rounds) used `MYMOOLAH` — the filename prefix and ISO-20022 party identifier — as the SFTP login username, instead of `mymoolahuser` as documented in `docs/SBSA_H2H_SETUP_GUIDE.md` Section 1 (confirmed by Colette 2026-03-26).

With the correct username, authentication now **passes on both TEST and PROD**. PROD was a first-ever successful authentication since SBSA imported our public key earlier today.

Outbound Pain.001 upload to TEST `/Outbox/` was confirmed end-to-end: file accepted (4,226 bytes), picked up by SBSA within 45 seconds. The ACK/NACK/INTAUDTST responses in `/BAS/` are still pending — SBSA processing queue, no action required from us.

---

## Tasks Completed

- Re-ran SSH public-key auth test on SBSA TEST (`196.8.85.62:5022`) with `mymoolahuser@` — **PASS**
- Re-ran SSH public-key auth test on SBSA PROD (`196.8.86.53:5022`) with `mymoolahuser@` — **PASS** (first successful auth ever)
- Listed remote folders on both TEST (`/Outbox`, `/Inbox`, `/BAS`) and PROD (`/Outbox`, `/Inbox`)
- Uploaded `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417110153RM1.xml` (4,226 bytes) to TEST `/Outbox/`
- Confirmed SBSA collected the file: `/Outbox/` drained within 45 seconds
- Captured clean test report: `docs/test/sbsa-sftp-test-report-2026-04-17-SUCCESS.txt`
- Drafted reply email to Colette: `docs/test/COLETTE_REPLY_2026-04-17_success.md`
- Added new high-risk entry to `.cursor/rules/tech-debt.mdc`: agents must always cross-reference the relevant setup/integration doc before running partner-facing test commands

---

## Key Decisions

1. **Root cause is operational, not technical.** SBSA's PROD key import worked. Our gateway VM and key were fine throughout. The failure chain was: initial command used the wrong username → mismatch buried inside `USERAUTH_FAILURE` logs → follow-up rounds mirrored the same wrong username instead of re-opening the setup guide.

2. **No blame shifted to the prior AI agent.** The agent running this session owns the mistake. The tech-debt item has been broadened so follow-up agents of any generation have a mandatory cross-reference step before touching partner systems.

3. **Not re-polling indefinitely for today's ACK.** SBSA TEST processing queue sometimes delays responses. We have enough evidence (auth + upload + pickup) to close the connectivity question. Response will be picked up automatically by the pain002 poller once Cloud Scheduler is flipped on.

4. **No code changes.** This session was purely test re-execution and documentation correction. Existing v2.98.0 SFTP hardening code is unchanged.

---

## Files Modified

| File | Change |
|------|--------|
| `docs/test/sbsa-sftp-test-report-2026-04-17-SUCCESS.txt` | Created — clean test report with auth PASS on TEST + PROD and successful Pain.001 upload |
| `docs/test/COLETTE_REPLY_2026-04-17_success.md` | Created — copy-paste reply to Colette confirming success |
| `.cursor/rules/tech-debt.mdc` | Added high-risk entry: agents must cross-reference setup docs before running partner-facing tests |
| `docs/session_logs/2026-04-17_1310_sbsa-sftp-connectivity-confirmed.md` | This log |

Raw logs captured on the VM and copied locally:
- `/tmp/sbsa-fixed-logs/sbsa-correct-user-20260417_110020Z.txt`
- `/tmp/sbsa-fixed-logs/sbsa-folders-20260417_110045Z.txt`
- `/tmp/sbsa-fixed-logs/sbsa-upload-20260417_110153Z.txt`
- `/tmp/sbsa-fixed-logs/sbsa-response-20260417_110428Z.txt`

---

## Issues Encountered

- None during this session. The lesson from today's earlier mistake is captured in the tech-debt register and must be treated as a first-class rule by future agents.

---

## Next Steps

1. André to send the reply in `docs/test/COLETTE_REPLY_2026-04-17_success.md` to Colette (CC Mark, Charles, Marius, Bronwyn, Liezel, Suzie).
2. Monitor `/BAS/` on TEST for the ACK/NACK/INTAUDTST response to today's `RM1` upload (expected within SBSA's normal processing window).
3. Once TEST round-trip closes, schedule a PROD smoke upload (Pain.001 with a small-value test disbursement) in coordination with Colette.
4. After PROD smoke test passes, flip `SBSA_STATEMENT_POLLER_MODE=scheduler` and `SBSA_PAIN002_POLLER_MODE=scheduler` in staging + production (the Cloud Scheduler endpoints are already live from v2.98.0).
5. Run `./scripts/setup-cloud-scheduler.sh staging` then `production` to create the three new jobs (statement, pain002, recon sweep).

---

## Important Context for Next Agent

- **SFTP login username is `mymoolahuser`** — documented in `docs/SBSA_H2H_SETUP_GUIDE.md` Section 1. The string `MYMOOLAH` is the filename prefix and the ISO-20022 party identifier; it is NOT a login user anywhere.
- **Key fingerprint**: `SHA256:Lf5DQHTMC5Fn+ieSiJ+/cBEWcyme4SduIxuknBDa0X0`. Both SBSA TEST and PROD now accept this.
- **Gateway path to SBSA**: agent laptop → `gcloud compute ssh sftp-1-vm --tunnel-through-iap --ssh-flag="-p 2222"` → VM at `34.35.137.166` → SBSA at `196.8.85.62` (TEST) or `196.8.86.53` (PROD) on port `5022`. Do NOT try to SFTP directly from the laptop — SBSA only whitelists our VM's public IP.
- **Folder semantics on SBSA side**: `/Outbox/` is where MyMoolah drops outbound Pain.001 files. `/BAS/` is where SBSA places response files (ACK, NACK, INTAUDTST, FINAUDTST). `/Inbox/` is reserved for statement files (MT940, MT942) — poll this for incoming bank statements.
- **Read the v2.98.0 SFTP hardening session log** (`docs/session_logs/2026-04-17_1054_sbsa-h2h-sftp-hardening.md`) for the feature-flag + Cloud Scheduler architecture.
- **Always follow the new tech-debt rule** before running any partner-facing live test: open the setup doc, quote the credential line, then run the command.

---
