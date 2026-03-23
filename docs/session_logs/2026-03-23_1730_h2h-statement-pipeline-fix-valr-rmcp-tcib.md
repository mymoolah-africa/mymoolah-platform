# Session Log - 2026-03-23 - H2H Statement Pipeline Fix, VALR RMCP, TCIB Draft

**Session Date**: 2026-03-23 17:30  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Session Duration**: ~3 hours

---

## Session Summary

Large multi-topic session covering three areas: (1) Drafted VALR corporate account onboarding documents including a full AML/CTF RMCP and company letterhead letter, (2) Drafted TCIB pre-reading email for PayInc, (3) Reviewed and completed SBSA H2H info sheet answers for Colette, and fixed critical bugs in the MT940/MT942 statement-to-wallet crediting pipeline so the system is ready to test once SBSA provides connectivity.

---

## Tasks Completed
- [x] Drafted AML/CTF RMCP document (17 chapters, FICA Section 42 compliant)
- [x] Drafted VALR corporate account response with company letterhead letter
- [x] Drafted TCIB pre-reading email reply to Meera (PayInc)
- [x] Reviewed SBSA H2H info sheet and provided answers for all yellow fields
- [x] Fixed critical bug: statement service was passing wrong payload to deposit notification service (missing transactionId, amount in cents instead of rands)
- [x] Updated SFTP poller from 5-min to 2-min cycle for fastest wallet crediting
- [x] Added SBSA filename pattern recognition (MYMOOLAH_OWN11_FINSTMT/PROVSTMT)
- [x] Added SBSA_STATEMENT_POLLER_ENABLED guard to server.js
- [x] Updated H2H setup guide with all confirmed info sheet details (filename patterns, delivery schedule, payment file types)

---

## Key Decisions
- **MT942 frequency: every 15 minutes** — Best banking practice for high-volume; ensures near-real-time deposit detection. Combined with 2-min polling, worst-case wallet credit latency is ~17 minutes.
- **MT940 delivery time: 06:00 Mon-Sat** — Early morning for automated reconciliation before business hours.
- **Polling schedule: every 2 minutes** — Faster than the previous 5-min default; catches files ASAP for quickest wallet crediting (critical for MyMoolah's low-income user base).
- **RMCP based on FICA Section 42 + FATF + Wolfsberg** — Banking-grade compliance programme covering all required areas for VALR corporate account opening.

---

## Files Modified
- `services/standardbank/sbsaStatementService.js` — Fixed deposit notification payload (transactionId + amount rands), added SBSA filename pattern constants, improved polling file detection logging
- `server.js` — Updated poller to 2-min schedule, added SBSA_STATEMENT_POLLER_ENABLED guard, improved startup logging
- `.env.codespaces` — Updated SBSA_STATEMENT_POLLER_ENABLED documentation, added SBSA_STATEMENT_POLL_SCHEDULE comment
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Added confirmed info sheet details: filename patterns, delivery schedule, payment file types, wallet crediting flow diagram
- `docs/drafts/2026-03-22_mymoolah-rmcp-aml-ctf.md` — NEW: Full RMCP document (838 lines)
- `docs/drafts/2026-03-22_valr-corporate-account-response.md` — NEW: VALR corporate account response with letterhead letter (333 lines)
- `docs/drafts/2026-03-22_tcib-meera-reply-draft.md` — NEW: TCIB pre-reading email for PayInc (234 lines)

---

## Code Changes Summary

### Critical Fix: Statement → Wallet Crediting Pipeline
The `_processCreditTransaction` method in `sbsaStatementService.js` was broken:
1. **Missing transactionId** — `processDepositNotification` requires a `transactionId` for idempotency but the statement path didn't provide one. Fixed by generating a synthetic ID: `STMT-{runId}-{seq}-{valueDate}-{amountCents}`
2. **Wrong amount units** — Statement service passed `txn.amountCents` (cents) but deposit service expected rands. Fixed with `amountRands = txn.amountCents / 100`
3. **Wrong field name** — Statement service passed `reference` but deposit service looks for `referenceNumber`. Fixed.

### Performance Optimization
- Poll schedule changed from `*/5 * * * *` to `*/2 * * * *` (every 2 minutes)
- Added `SBSA_STATEMENT_POLLER_ENABLED` env var guard to prevent unnecessary polling in dev environments

---

## Issues Encountered
- **Issue 1**: The statement → deposit crediting pipeline was effectively broken (would return `Missing transactionId` for every credit). Fixed by aligning the payload contract.
- **Issue 2**: `ledgerService.recordBankStatementBalance` function doesn't exist — closing balance audit is log-only. Flagged as tech debt for future implementation.

---

## Testing Performed
- [x] Zero linter errors confirmed
- [ ] End-to-end testing pending (waiting for SBSA to complete their side of H2H setup)
- [ ] Manual testing with sample MT940/MT942 files pending

---

## Next Steps
- [ ] Reply to Colette with completed info sheet (Andre to fill personal details)
- [ ] Wait for SBSA to provide: SFTP username, connectivity confirmation, test files
- [ ] Generate SFTP host key fingerprint for info sheet (run `ssh-keyscan -p 5022 34.35.137.166`)
- [ ] Test end-to-end with SBSA test MT940/MT942 files when available
- [ ] Andre to complete VALR corporate account documents (fill [TO BE FILLED] placeholders, attach IDs, sign letterhead letter)
- [ ] Andre to review and send TCIB pre-reading email to Meera
- [ ] Implement `ledgerService.recordBankStatementBalance` for closing balance audit (tech debt)

---

## Important Context for Next Agent
- The MT940 parser (`services/standardbank/mt940Parser.js`) is production-quality (576 lines, comprehensive). No changes needed.
- The statement service (`services/standardbank/sbsaStatementService.js`) now correctly bridges to the deposit notification service. The critical fix was aligning the payload contract (transactionId, referenceNumber, amount in rands).
- The poller runs every 2 minutes but is **disabled by default** (`SBSA_STATEMENT_POLLER_ENABLED=false` in `.env.codespaces`). Set to `true` in staging/production.
- SBSA's H2H User ID is **OWN11**. Filename patterns are `MYMOOLAH_OWN11_FINSTMT_*` (MT940) and `MYMOOLAH_OWN11_PROVSTMT_*` (MT942).
- Three draft documents are in `docs/drafts/` — RMCP, VALR response, and TCIB email. All need Andre to fill in company-specific details before sending.
- The TCIB email had "BankservAfrica" replaced with "PayInc" per Andre's instruction.
- Pain.001 payment file generation is NOT yet implemented — only statement processing (inbound) is ready.

---

## Questions/Unresolved Items
- SBSA needs to confirm: exact SFTP username for our account on their server
- SBSA needs to confirm: intraday MT942 delivery frequency (we requested every 15 min)
- Our SFTP host key fingerprint needs to be provided to SBSA for their info sheet
- `ledgerService.recordBankStatementBalance` is referenced but not implemented (tech debt)

---

## Related Documentation
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Updated with info sheet details
- `docs/drafts/2026-03-22_mymoolah-rmcp-aml-ctf.md` — VALR RMCP document
- `docs/drafts/2026-03-22_valr-corporate-account-response.md` — VALR corporate account response
- `docs/drafts/2026-03-22_tcib-meera-reply-draft.md` — TCIB email to Meera
