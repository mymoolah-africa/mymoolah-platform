# Session Log - 2026-04-29 - SBSA H2H FSTP Finalisation

**Session Date**: 2026-04-29 21:35-21:50 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~15 minutes

---

## Session Summary
Investigated André's missing R10 EFT deposit with reference `0825571055` and confirmed the money is present in SBSA statement files but has not entered MMTP processing because production H2H gates and scheduler jobs are still off and no statement files have reached GCS. Implemented the parser, statement-credit safety, tests, and dry-run-first VM gateway sync needed before production go-live.

---

## Tasks Completed
- [x] Verified production Cloud Run H2H flags are still off.
- [x] Verified production DB has no R10 SBSA deposit, wallet transaction, suspense row, or SBSA statement run since 2026-04-20.
- [x] Listed SBSA production `/Inbox` from `sftp-1-vm` and confirmed Penny #2 FINAUD plus statement backlog.
- [x] Downloaded selected SBSA evidence files to `/tmp` and parsed them locally.
- [x] Fixed parser support for real SBSA MT940/MT942 statement shapes.
- [x] Hardened statement auto-crediting to avoid double-crediting realtime PayShap/RPP rails.
- [x] Added a dry-run-first SBSA gateway sync script for `/Inbox` to GCS transport.
- [x] Added focused Jest tests and updated H2H docs, changelog, and handover.

---

## Key Decisions
- **Do not production-deploy or run gateway `--apply` yet**: This would move production files and can credit wallets. André must explicitly approve the production write sequence.
- **Statement path only auto-credits `DEP` lines**: Real SBSA files show the R10 EFT as `NDEP` / `IB PAYMENT FROM`; older PayShap deposits appear as `NTRF` and must not be credited again by statement processing.
- **Idempotency must not include statement run ID**: The same R10 appears in multiple PROVSTMT/FINSTMT files. The new `STMT-<sha256>` id uses bank-line identity so repeated appearances do not credit twice.
- **Gateway sync belongs on `sftp-1-vm`**: SBSA only allows the VM's public IP to access their SFTP, so Cloud Run cannot directly pull `/Inbox` files without a separate networking change.

---

## Files Modified
- `services/standardbank/mt940Parser.js` - Added SWIFT-envelope trimming and MT942 `:34F:` intraday balance support.
- `services/standardbank/sbsaStatementService.js` - Limited statement auto-crediting to `DEP` credits and added stable bank-line idempotency.
- `scripts/sbsa-h2h-gateway-sync.sh` - New dry-run-first VM script for SBSA external `/Inbox` to GCS sync, with zero-byte inbound skip and gated outbound support.
- `tests/standardbank/mt940Parser.sbsa-real-shape.test.js` - New tests for real SBSA MT940/MT942 shapes.
- `tests/standardbank/sbsaStatementService.statementCreditSafety.test.js` - New tests for non-DEP skip and stable idempotency.
- `docs/SBSA_H2H_SETUP_GUIDE.md` - Updated statement processing and gateway sync documentation.
- `docs/CHANGELOG.md` - Added SBSA H2H FSTP parser/gateway hardening entry.
- `docs/AGENT_HANDOVER.md` - Updated current status and next-agent warning.

---

## Code Changes Summary
- `mt940Parser` now parses real SBSA `FINSTMT` files wrapped in `{1:...}{4:` and real `PROVSTMT` files with `:34F:` instead of `:60M:`/`:62M:`.
- `sbsaStatementService` skips `TRF` credits in statement processing and only delegates `DEP` credits to `standardbankDepositNotificationService`.
- Statement deposit transaction IDs now hash account, dates, direction, type, amount, references, and narrative so duplicate statement appearances are idempotent across files.
- `sbsa-h2h-gateway-sync.sh` can dry-run or apply inbound SBSA `/Inbox` to GCS routing for payment responses and statements; outbound exists but is approval-gated due to real-money movement.

---

## Issues Encountered
- **Production R10 not reflected**: Root cause is operational gate/transport, not wallet matching. Production flags are off, production scheduler jobs are absent, GCS statement inbox is empty, and DB has no processing evidence.
- **Parser failed real files**: Real SBSA files include SWIFT envelopes and MT942 `:34F:` balances. Fixed and tested.
- **Potential double-credit risk**: Existing statement service would have credited old PayShap-style `TRF` credits from cumulative statements and used run-scoped idempotency. Fixed before go-live.
- **No persistent SBSA `/Inbox` to GCS transport**: VM has no cron/systemd sync. Added a dry-run-first script; apply/install still needs André approval.

---

## Testing Performed
- [x] Unit tests written/updated.
- [x] Manual parsing performed against downloaded SBSA FINAUD, FINSTMT, and PROVSTMT evidence files.
- [x] Dry-run gateway sync performed from `sftp-1-vm` with `SBSA_H2H_MAX_FILES=12`.
- [x] Test results: pass.

Commands:

```bash
npx jest tests/standardbank/mt940Parser.sbsa-real-shape.test.js tests/standardbank/sbsaStatementService.statementCreditSafety.test.js --runInBand
node --check services/standardbank/mt940Parser.js && node --check services/standardbank/sbsaStatementService.js && node --check tests/standardbank/mt940Parser.sbsa-real-shape.test.js && node --check tests/standardbank/sbsaStatementService.statementCreditSafety.test.js
bash -n scripts/sbsa-h2h-gateway-sync.sh
```

---

## Next Steps
- [ ] Get André's explicit approval before production deploy, scheduler creation, or gateway `--apply`.
- [ ] Deploy backend with `SBSA_H2H_GO_LIVE=true` only after approval.
- [ ] Run `./scripts/setup-cloud-scheduler.sh --production` only after approval.
- [ ] Install/run `scripts/sbsa-h2h-gateway-sync.sh --inbound --apply` on `sftp-1-vm` in limited observed batches.
- [ ] Verify R10 credit: `standard_bank_transactions`, wallet `transactions`, ledger journal, and wallet balance increases by exactly R10.
- [ ] After R10 validation, plan app-level Penny #3 using GCS outbound path and explicit approval.

---

## Important Context for Next Agent
- Penny #2 FINAUD is present in SBSA `/Inbox`: `MYMOOLAH_OWN11_FINAUD_PRD_20260428054554375_242265281.xml`; it parsed as `ACSP`, status code `0000`.
- The missing R10 appears in real SBSA statement files as `CR10,00NDEP0825571055` with `:86:/PREF/ZA000379IB PAYMENT FROM`.
- Production Cloud Run revision checked: `mymoolah-backend-production-00147-vp7`; all H2H production automation flags were off.
- Production Cloud Scheduler location is `europe-west1`, not `africa-south1`.
- `gcloud compute ssh sftp-1-vm` must use IAP and port 2222: `--tunnel-through-iap --ssh-flag='-p 2222'`.
- The new gateway script is safe by default; `--apply` changes production GCS state and should only run with approval.

---

## Questions/Unresolved Items
- Should André approve the production write sequence tonight: deploy, scheduler setup, and limited inbound gateway apply?
- Should `scripts/sbsa-h2h-gateway-sync.sh` be installed as a systemd timer on `sftp-1-vm`, or run manually for the first production validation window?
- Should outbound sync remain manual until Penny #3, or be enabled in the same VM timer after Penny #3 validates?

---

## Related Documentation
- `docs/SBSA_H2H_SETUP_GUIDE.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/test/sbsa-sftp-prod-penny2-report-2026-04-24.txt`
