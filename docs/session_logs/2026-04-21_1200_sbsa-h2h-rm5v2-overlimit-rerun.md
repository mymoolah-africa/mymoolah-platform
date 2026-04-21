# Session Log - 2026-04-21 - SBSA H2H RM5v2 Over-Limit Re-run

**Session Date**: 2026-04-21 10:00–12:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~2 hours

---

## Session Summary
Re-ran SBSA H2H Scenario 5 (over-limit) on the TEST SFTP gateway with a R500,001 transaction — R1 above the confirmed Cr Transaction Limit. SBSA returned ACK (RCVD) + INTAUDTST (RJCT, code 0009 "RUN EXCEEDS LIMIT") for all 3 transactions. No FINAUDTST was emitted. The per-transaction code 0006 is unreachable on the current TEST profile because both limits are R500,000. Drafted email to Colette with findings, profile analysis, and PROD smoke test proposal. Updated AGENT_HANDOVER.md, CHANGELOG.md, SBSA_H2H_SETUP_GUIDE.md with results and a new Pain.002 Status Code Reference table. Also assisted André with a professional rewrite of an email to Nthabiseng (SBSA TPPP team) regarding H2H/PayShap status and cash-withdrawal ringfencing.

---

## Tasks Completed
- [x] Generated Pain.001 for RM5v2 scenario (R500,001 + R1 + R1) via `scripts/test-sbsa-rm5-rerun.js`
- [x] SCP'd file to `sftp-1-vm`, uploaded to SBSA TEST `/Outbox/` at 10:47 SAST
- [x] Collected ACK + INTAUDTST responses via poller script on VM
- [x] SCP'd response XMLs to local for analysis
- [x] Analysed INTAUDTST: GrpSts RJCT, code 0009 "RUN EXCEEDS LIMIT", all 3 txns RJCT
- [x] Confirmed no FINAUDTST emitted (polled 45 min)
- [x] Created formal test report: `docs/test/sbsa-sftp-uat-rm5v2-report-2026-04-20.txt`
- [x] Drafted email to Colette: `docs/test/COLETTE_REPLY_2026-04-20_rm5-rerun.md`
- [x] Rewrote email to Nthabiseng re H2H/PayShap status + cash-withdrawal service
- [x] Updated AGENT_HANDOVER.md with RM5v2 findings
- [x] Updated CHANGELOG.md with v2.99.2 entry
- [x] Updated SBSA_H2H_SETUP_GUIDE.md with Colette UAT matrix + Pain.002 Status Code Reference

---

## Key Decisions
- **Status Code 0009 is dual-purpose**: Used for both "invalid ordering account" (RM9) and "RUN EXCEEDS LIMIT" (RM5v2). The `AddtlInf` Status Description is the authoritative differentiator — pain002PollerService must parse description, not just numeric code.
- **INTAUD RJCT is terminal**: SBSA does not issue FINAUDTST after INTAUD RJCT. Confirmed across RM9 (invalid account), RM10 (past date), and RM5v2 (batch over-limit). Poller should treat INTAUD RJCT as final.
- **0006 path untestable on current profile**: With Cr Transaction Limit == Sub Batch Limit (both R500,000), any file exceeding per-tx also exceeds batch. Proposed to Colette: Option A (lower per-tx limit) or Option B (accept 0009 as operational reality).

---

## Files Modified
- `scripts/test-sbsa-rm5-rerun.js` — NEW: Pain.001 generator for RM5v2 scenario
- `docs/test/sbsa-uat-rm5v2-responses-2026-04-20/` — NEW: 3 XML artefacts (Pain.001, ACK, INTAUDTST)
- `docs/test/sbsa-sftp-uat-rm5v2-report-2026-04-20.txt` — NEW: formal test report
- `docs/test/COLETTE_REPLY_2026-04-20_rm5-rerun.md` — NEW: email draft to Colette
- `docs/AGENT_HANDOVER.md` — Updated Latest Feature, Document Version, session log references, H2H status line
- `docs/CHANGELOG.md` — Added v2.99.2 entry for RM5v2 results
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Added Colette UAT matrix (RM7–RM12), RM5v2 results, Pain.002 Status Code Reference table, poller implementation notes

---

## Issues Encountered
- **Wrong SFTP port in driver script**: Initial driver used port 22 instead of 5022, causing `Connection refused`. Fixed by adding `-P 5022` to all sftp commands.
- **VM /tmp noexec mount**: `sudo /tmp/sbsa-rm5-driver.sh` failed with "Permission denied" because /tmp is mounted `noexec`. Fixed by running `sudo nohup bash /tmp/sbsa-rm5-driver.sh`.
- **gcloud auth expired**: Initial `gcloud compute instances list` failed with reauthentication error. Resolved via `gcloud auth login`.
- **SCP permission issues**: Files in `/tmp/sbsa-uat-rm5-out/responses/` were owned by root with 600 perms. Staged to `/tmp/rm5v2-pull/` with `chmod 644` before SCP.

---

## Testing Performed
- [x] Pain.001 XML validated (NbOfTxs=3, CtrlSum=500003.00, amounts correct)
- [x] SFTP upload to SBSA TEST confirmed (file visible in /Outbox/ listing)
- [x] ACK received and parsed (GrpSts RCVD, correct MsgId back-reference)
- [x] INTAUDTST received and parsed (GrpSts RJCT, 0009 "RUN EXCEEDS LIMIT", all 3 txns)
- [x] 45-min poll confirmed no FINAUDTST emitted
- [x] Test results: PASS (SBSA behaviour is internally consistent; 0006 not reachable is a profile issue, not a code defect)

---

## Next Steps
- [ ] Await Colette's reply on Option A (lower per-tx limit) vs Option B (accept 0009)
- [ ] Await Colette's scheduling of PROD smoke test (single R1.00 tx)
- [ ] Update `pain002PollerService` to disambiguate 0009 by `AddtlInf` description
- [ ] Update `pain002PollerService` to treat INTAUD RJCT as terminal (no FINAUD expected)
- [ ] Remove /BAS/ watcher path from production config (TEST-only)
- [ ] After PROD smoke test: flip `*_MODE` env vars to `scheduler` and run `./scripts/setup-cloud-scheduler.sh`

---

## Important Context for Next Agent
- SBSA TEST SFTP: `mymoolahuser@196.8.85.62:5022` — SSH key at `/root/.ssh/sbsa_sftp_key` on `sftp-1-vm`
- SBSA TEST profile: OWN11 / account 272406481. Cr Transaction Limit = R500,000, Sub Batch Limit = R500,000
- Status Code 0009 is overloaded — always check `AddtlInf` description
- FINAUD is NEVER sent after INTAUD RJCT — this is terminal
- UNPAID can override FINAUD per-transaction (discovered in RM12)
- `/BAS/` directory on TEST mirrors `/Inbox/` with appended filenames — TEST-only, not production
- The Nthabiseng email (cash-withdrawal / ringfencing) was drafted in chat, not saved to a file — André copied it directly

---

## Related Documentation
- `docs/test/sbsa-sftp-uat-rm5v2-report-2026-04-20.txt` — formal test report
- `docs/test/COLETTE_REPLY_2026-04-20_rm5-rerun.md` — email to Colette
- `docs/test/sbsa-sftp-uat-report-2026-04-17.txt` — original 6-scenario UAT report
- `docs/SBSA_H2H_SETUP_GUIDE.md` — now contains full status code reference
- `docs/test/COLETTE_UAT_REPLY_2026-04-17.md` — original UAT email
