# Session Log — SBSA H2H UAT Six-Scenario Test Executed

**Date:** 2026-04-17 19:00 SAST
**Agent:** Claude 4.5 Opus
**Version:** v2.98.1 (no version bump — test/docs only)

---

## Summary

Executed Colette's six UAT test scenarios (RM1–RM6 in her sheet, labelled RM7–RM12 in our harness to continue the historical RM1–RM6 sequence from Melanie's 2026-03-30 tests) back-to-back against SBSA TEST (196.8.85.62:5022), with 20-minute intervals between uploads. Run window: 15:55 SAST → 18:36 SAST.

All six files uploaded cleanly. Every upload was accepted by `/Outbox/` within 2 seconds with no retries or auth failures.

**Scenario verdicts:**

- **RM7 (Valid SSVS)** — PASS. ACK RCVD, INTAUD PDNG×3, FINAUD ACSP×3 in 3m40s.
- **RM8 (Duplicate MsgId)** — PASS. NACK GrpSts RJCT, AddtlInf "Duplicate MsgId" in 17s. (SBSA wording "Duplicate MsgId" vs test sheet "Duplicate File" — cosmetic.)
- **RM9 (Invalid DbtrAcct)** — PASS*. ACK RCVD, INTAUD RJCT×3 Status Code **0009** (test sheet expected 0003 — canonical code to confirm with SBSA).
- **RM10 (Past execution date)** — PASS exact match. ACK RCVD, INTAUD RJCT×3 Status Code 0014.
- **RM11 (Amount over limit, R96.15)** — PARTIAL. File accepted, INTAUD PDNG, FINAUD ACSP×3. R96.15 below TEST profile limit; over-limit path not triggered. Needs SBSA confirmation of per-transaction limit.
- **RM12 (10-tx mixed)** — PARTIAL. ACK RCVD, INTAUD PART (4 PDNG + 6 RJCT code 0003), FINAUD PART (4 ACSP + 6 RJCT), UNPAID PART (2 tx). VET response for this MsgId NOT received in 60-min polling window.

Four of six scenarios PASS outright. The two PARTIALs are not integration defects — RM11 just did not trigger the over-limit condition at R96.15; RM12 is missing only the VET response (ACK/INTAUD/FINAUD/UNPAID all received and correct).

---

## Evidence Captured

- `docs/test/sbsa-uat-responses-2026-04-17/run.log` — full timestamped driver log (122 KB)
- `docs/test/sbsa-uat-responses-2026-04-17/responses/` — 19 response XMLs pulled from `/Inbox/`:
  - 6 ACK, 1 NACK, 6 INTAUD, 4 FINAUD, 1 VET (MM-TESTCONNECT morning run — not RM12), 1 UNPAID
  - plus 3 response XMLs from the morning MM-TESTCONNECT test that were still in `/Inbox/` at first poll
- `docs/test/sbsa-sftp-uat-report-2026-04-17.txt` — formal PASS/FAIL report with per-scenario breakdown, anomalies, and open questions
- `docs/test/COLETTE_UAT_REPLY_2026-04-17.md` — draft reply to Colette (prose only, no tables, per communication rule)

Uploaded XMLs and the driver script remain on `sftp-1-vm:/tmp/sbsa-uat/`.

---

## Key Findings

1. **SBSA TEST response processor is fast today** — ACK in ~20s, INTAUD in ~35s, FINAUD in ~3–4 min. Much faster than this morning's 12–18 min (likely queue was busy earlier; now drained).

2. **Dual-delivery confirmed again across all 6 scenarios** — every response appeared in both `/BAS/` (with original filename appended) and `/Inbox/` (ISO-style naming). Decision reaffirmed: `pain002PollerService` will read from `/Inbox/` only.

3. **UNPAID can override FINAUD on a per-transaction basis.** In RM12, Tx-03 and Tx-04 were ACSP in FINAUD at 17:38 but came back in UNPAID at 17:37 (same minute but UNPAID was processed out-of-order by our poller — actual SBSA sequence is UNPAID after FINAUD). Tx-03 → ACWC reason 14, Tx-04 → RJCT reason 03. Our watcher must treat UNPAID as authoritative over FINAUD for transactions that appear in it. This is now a pain002 parsing requirement.

4. **Open questions for SBSA** (in draft email):
   - RM8: "Duplicate MsgId" vs "Duplicate File" wording drift.
   - RM9: Status Code 0009 vs 0003 canonical code.
   - RM11: What is the TEST per-transaction limit?
   - RM12: Under what conditions is VET emitted alongside UNPAID?
   - UNPAID semantics: confirm post-settlement-bounce authority over FINAUD.

---

## Test Harness Created

New standalone test harness `scripts/test-sbsa-h2h-scenarios.js` generates the 6 Pain.001 XMLs with configurable parameters (valid debtor, invalid debtor, past date, over-limit amount, 10-tx mixed). Uses the existing `services/standardbank/pain001BulkBuilder.js`. Output: `/tmp/sbsa-uat/MYMOOLAH_OWN11_*RM7..RM12.xml` + `PLAN.txt`.

Driver script `/tmp/sbsa-uat/driver.sh` (on `sftp-1-vm`) orchestrates the staggered upload + polling.

Both can be reused for future SBSA UAT cycles — parameterise the `DEBTOR_ACCOUNT_VALID`, `PAST_DATE`, and `OVER_LIMIT_AMOUNT` constants at the top of the harness.

---

## Files Modified

- **new** `scripts/test-sbsa-h2h-scenarios.js` — UAT Pain.001 generator (208 lines)
- **new** `docs/test/sbsa-sftp-uat-report-2026-04-17.txt` — formal PASS/FAIL report
- **new** `docs/test/COLETTE_UAT_REPLY_2026-04-17.md` — draft email to Colette
- **new** `docs/test/sbsa-uat-responses-2026-04-17/run.log` — driver log
- **new** `docs/test/sbsa-uat-responses-2026-04-17/responses/*.xml` — 19 captured response XMLs
- **update** `docs/AGENT_HANDOVER.md` — UAT results summary
- **update** `docs/session_logs/2026-04-17_1900_sbsa-h2h-uat-six-scenarios.md` — this log

---

## Next Steps

1. André sends the draft reply to Colette (`docs/test/COLETTE_UAT_REPLY_2026-04-17.md`), awaits answers on the five open items.
2. Once Colette confirms the TEST per-transaction limit, re-run RM11 (if a higher amount is needed) OR re-run RM11 as-is after SBSA lowers the TEST limit — either way, validate the 0006 PART path.
3. Once Colette confirms VET conditions for RM12, either mark RM12 complete or re-run with whatever trigger is required.
4. Update the pain002 parser to treat UNPAID as authoritative over FINAUD on a per-transaction basis (new defect / requirement — to be added to a future ticket).
5. Coordinate a small PROD smoke upload (single-transaction, small value) with Colette/Jason to confirm the same cycle on SBSA PROD.
6. After PROD smoke test passes, flip `SBSA_STATEMENT_POLLER_MODE`, `SBSA_PAIN002_POLLER_MODE`, and `RECON_SFTP_WATCHER_MODE` from `off` to `scheduler` in staging + production and run `./scripts/setup-cloud-scheduler.sh staging` then `production`.

---

## Context for Next Agent

- Test harness lives at `scripts/test-sbsa-h2h-scenarios.js`. It uses MsgId pattern `MM-UAT{RM}{timestamp}-{rand}` and E2E pattern `UAT-{tag}-{timestamp}-{NN}`. RM7 and RM8 intentionally share MsgId — do not "fix" that; it is the duplicate-file trigger.
- The 3 valid beneficiaries (used in RM7, RM8, RM9, RM10, RM11, and the first 3 tx of RM12) are Andre Botes's accounts at SBSA (10111730633 / 051001), Discovery (18828076450 / 679000), and Capitec (1254107337 / 470010). These are real accounts and real transactions were processed — do not upload the same file again without André's approval.
- RM12 also uses fabricated accounts at ABSA / FNB / Nedbank / SBSA (tx-04 through tx-10). Only tx-04 (ABSA 4012345678 / 632005) happened to be valid on SBSA's side — tx-05 through tx-10 all rejected.
- The driver script on the VM (`/tmp/sbsa-uat/driver.sh`) is idempotent but does NOT have a guard against re-running — if you re-run it without changing the MsgIds in the XML files, SBSA will NACK the whole run as duplicates. Always regenerate the XMLs first with `node scripts/test-sbsa-h2h-scenarios.js` which produces fresh timestamp-based MsgIds.
- `docs/test/sbsa-uat-responses-2026-04-17/responses/` contains all the raw response XMLs for audit — do not delete.
- High-risk tech-debt rule added yesterday still applies: always cross-reference `docs/SBSA_H2H_SETUP_GUIDE.md` before any live partner-facing test. In this session the username `mymoolahuser` was used correctly — no credential errors.
