# Session Log - 2026-04-16 - SBSA H2H SFTP Connectivity Confirmed

**Session Date**: 2026-04-16 10:40  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Session Duration**: ~45 minutes

---

## Session Summary
Confirmed SFTP connectivity to SBSA TEST server (196.8.85.62:5022) is now fully working after Colette reported the firewall freeze was cleared. Performed comprehensive end-to-end testing from the GCP SFTP Gateway VM (34.35.137.166): TCP connect, SSH key auth, SFTP session, directory listing, and Pain.001 file upload all PASS. Discovered 11 SBSA response files from Melanie's Mar 30 internal testing in the /BAS/ folder. SBSA PROD server (196.8.86.53:5022) is TCP reachable but our key is not loaded yet. Enhanced Pain.001 builder with `ChrgBr` and `CdtrAcct/Tp/Cd` fields per Melanie's annotated spec. Uploaded fresh Pain.001 test file.

---

## Tasks Completed
- [x] Thorough codebase sweep of all SBSA H2H SFTP-related files (15+ services, scripts, configs)
- [x] SFTP connectivity test to SBSA TEST (196.8.85.62:5022) — PASS (from GCP VM)
- [x] SFTP connectivity test to SBSA PROD (196.8.86.53:5022) — TCP PASS, Auth FAIL (key not on PROD)
- [x] Our SFTP Gateway VM health check — RUNNING, port 5022 listening
- [x] SOAP credit notification endpoint test — PASS (HTTP 200, Ack OK, 168ms)
- [x] Full SFTP session: auth, ls, cd, pwd — all PASS on SBSA TEST
- [x] Downloaded 7 SBSA response files from /BAS/ folder (ACK, NACK, INTAUD, FINAUD)
- [x] Analysed SBSA response files — RM3 and RM6 confirmed all transactions processed successfully
- [x] Pain.001 v3 format validation against Melanie's annotated spec — 29/29 PASS, 2 warnings fixed
- [x] Enhanced pain001BulkBuilder.js: added `<ChrgBr>CRED</ChrgBr>` and `<CdtrAcct><Tp><Cd>CACC</Cd></Tp>`
- [x] Generated and uploaded fresh Pain.001 test file to SBSA TEST /Outbox/
- [x] MT940/MT942 parser review — production-ready (576 lines)
- [x] Statement processing pipeline review — ready (poller + GCS + environment isolation)
- [x] Updated SBSA H2H Setup Guide with latest test results
- [x] Created comprehensive test report (docs/test/sbsa-sftp-test-report-2026-04-16.txt)

---

## Key Decisions
- **ChrgBr added**: `<ChrgBr>CRED</ChrgBr>` added to each CdtTrfTxInf in the Pain.001 builder. SBSA previously validated without it, but Melanie's annotated spec includes it and it's standard for SA EFT.
- **CdtrAcct/Tp/Cd added**: Optional account type field (`CACC` default) added. Supports savings accounts via `accountType` parameter override.
- **GCP VM access via IAP port 2222**: Standard SSH (port 22) is not open on the SFTP VM. Admin access requires `gcloud compute ssh --tunnel-through-iap --ssh-flag="-p 2222"`.
- **SSH key must be on VM**: The SBSA SSH key (`sbsa_sftp_key`) is not persisted on the VM across sessions. Must be transferred via base64 encoding before SFTP tests.

---

## Files Modified
- `services/standardbank/pain001BulkBuilder.js` — Added `<ChrgBr>CRED</ChrgBr>` and `<CdtrAcct><Tp><Cd>` fields; added `accountType` parameter to payment objects
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Updated status header with Apr 16 connectivity results; rewrote Section 5 with test results table, folder structure, SBSA response files table, and VM access instructions
- `docs/test/sbsa-sftp-test-report-2026-04-16.txt` — NEW: Comprehensive test report with all results
- `docs/samples/MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416105757707.xml` — NEW: Latest Pain.001 sample with ChrgBr and CdtrAcct/Tp

---

## Code Changes Summary
- `pain001BulkBuilder.js`: Added `<ChrgBr>CRED</ChrgBr>` after `<Amt>` block in each CdtTrfTxInf. Added `<Tp><Cd>CACC</Cd></Tp>` inside `<CdtrAcct>`. New optional `accountType` parameter defaults to `'CACC'`.
- No other backend/frontend code changes.

---

## Issues Encountered
- **GCP auth expired**: `gcloud auth login` needed interactive browser. Worked around by discovering auth was cached and `gcloud compute ssh` via IAP still worked.
- **No SSH port 22 on VM**: SFTP Gateway VM only exposes 5022 (SFTP) and 2222 (admin). Used `--ssh-flag="-p 2222"` with IAP tunnel.
- **No `nc` on VM**: Used bash `/dev/tcp` built-in for TCP port tests instead.
- **SBSA PROD key not loaded**: PROD server (196.8.86.53) TCP reachable but rejects our key. Need Colette to import key.
- **Local machine (105.245.229.8) not whitelisted**: All SFTP tests must be from GCP VM (34.35.137.166).

---

## Testing Performed
- [x] TCP connectivity to SBSA TEST (196.8.85.62:5022) — PASS
- [x] TCP connectivity to SBSA PROD (196.8.86.53:5022) — PASS
- [x] SSH key authentication to SBSA TEST — PASS
- [x] SSH key authentication to SBSA PROD — FAIL (key not loaded)
- [x] Full SFTP session on SBSA TEST — PASS (ls, cd, pwd, put, get)
- [x] Pain.001 file upload to SBSA TEST — PASS (4,226 bytes)
- [x] SBSA response file download — PASS (7 files)
- [x] SOAP endpoint POST test — PASS (HTTP 200)
- [x] Pain.001 XML format validation — PASS (29/29 elements)
- [x] MT940/MT942 parser code review — PASS (production-ready)

---

## Next Steps
- [ ] Ask Melanie to process the uploaded Pain.001 file (MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416105757707.xml)
- [ ] Ask Colette to load our SSH public key on SBSA PROD server (196.8.86.53)
- [ ] Monitor /BAS/ folder for ACK/NACK response to the new upload
- [ ] Once Melanie confirms, test downloading response files and parsing with pain002Parser.js
- [ ] Test statement (MT940/MT942) delivery once production channel is activated
- [ ] SOAP credit notification: awaiting SBSA to send test traffic (Roshan Rama assigned)
- [ ] Consider automating SFTP-to-SBSA push via the GCS outbox → gateway path for production

---

## Important Context for Next Agent
- **GCP VM access**: `gcloud compute ssh sftp-1-vm --project=mymoolah-db --zone=africa-south1-a --tunnel-through-iap --ssh-flag="-p 2222"` — port 2222 is the admin SSH port, port 22 is blocked.
- **SSH key not persistent on VM**: The `~/.ssh/sbsa_sftp_key` must be transferred each session. Use base64 method: `base64 < key | gcloud compute ssh ... --command="echo 'B64' | base64 -d > key && chmod 600 key"`
- **SBSA TEST has response files from Mar 30**: 11 files in /BAS/ folder. Downloaded copies on VM at /tmp/sbsa-response-files/.
- **SBSA PROD key issue**: TCP works but auth fails. Colette needs to import our public key on the PROD server.
- **Pain.001 builder now generates ChrgBr + CdtrAcct/Tp**: This is compatible with SBSA SSVS (they validated without it, so with it should also pass).
- **Debtor branch code**: Our profile account 272406481 uses branch `002154`, not the builder default `051001`. Set `SBSA_DEBTOR_BRANCH=002154` in env vars.

---

## Related Documentation
- `docs/test/sbsa-sftp-test-report-2026-04-16.txt` — Full test report
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Updated with Apr 16 results
- `docs/samples/MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416105757707.xml` — Latest Pain.001 sample
- `services/standardbank/pain001BulkBuilder.js` — Pain.001 builder (enhanced)
- `services/standardbank/mt940Parser.js` — MT940/MT942 parser
- `services/standardbank/sbsaStatementService.js` — Statement processing service
- `services/standardbank/sbsaSoapParser.js` — SOAP notification parser
