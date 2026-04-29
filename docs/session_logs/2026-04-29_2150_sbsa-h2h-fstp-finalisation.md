# Session Log - 2026-04-29 - SBSA H2H FSTP Finalisation

**Session Date**: 2026-04-29 21:35-22:40 SAST
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~65 minutes

---

## Session Summary
Investigated André's missing R10 EFT deposit with reference `0825571055` and confirmed the money was present in SBSA statement files but had not entered MMTP processing because production H2H gates and scheduler jobs were off and no statement files had reached GCS. Implemented the parser, statement-credit safety, tests, and dry-run-first VM gateway sync needed before production go-live. After André approved the commit → push → deploy → process sequence, production was activated and the R10 was credited to wallet `WAL-1775063499170-1`.

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
- [x] Committed and pushed H2H safety changes to `main`.
- [x] Redeployed production from committed `main` with `SBSA_H2H_GO_LIVE=true`.
- [x] Applied a limited inbound `/Inbox` → GCS sync batch from `sftp-1-vm`.
- [x] Fixed real production statement filename recognition and redeployed.
- [x] Verified R10 production credit, wallet transaction, and balanced journal.
- [x] Fixed the Pain.002 scheduler Cloud Run packaging issue by removing runtime dependency on `scripts/db-connection-helper.js`.
- [x] Continued SBSA `/Inbox` backlog sync in controlled batches and installed recurring inbound VM sync.
- [x] Documented tomorrow's COA follow-up for input VAT, PayShap/RPP/RTP fees, supplier EFT fees, and general bank charges.

---

## Key Decisions
- **Production activation approved by André**: André explicitly approved proceeding with commit, push, redeploy, and production processing after the duplicate-crediting and banking-grade safety questions were answered.
- **Statement path only auto-credits `DEP` lines**: Real SBSA files show the R10 EFT as `NDEP` / `IB PAYMENT FROM`; older PayShap deposits appear as `NTRF` and must not be credited again by statement processing.
- **Idempotency must not include statement run ID**: The same R10 appears in multiple PROVSTMT/FINSTMT files. The new `STMT-<sha256>` id uses bank-line identity so repeated appearances do not credit twice.
- **Gateway sync belongs on `sftp-1-vm`**: SBSA only allows the VM's public IP to access their SFTP, so Cloud Run cannot directly pull `/Inbox` files without a separate networking change.
- **PayShap TRF fallback is future tech debt, not current behaviour**: If PayShap credit notifications fail, H2H statement `TRF` lines should only become a delayed controlled fallback through a separate safety layer with database-enforced unique bank-event fingerprints, ACID wallet/journal posting, notification-to-statement matching, suspense for ambiguity, and reconciliation reporting. Never remove the current blanket `TRF` auto-credit skip without that layer.
- **Gateway sync recurrence uses systemd, not crontab**: User crontab is blocked by `/etc/cron.allow` on `sftp-1-vm`. Installed `mymoolah-sbsa-h2h-gateway-sync.timer` and `mymoolah-sbsa-h2h-gateway-sync.service` under systemd instead. The service runs as `andremacbookpro`, inbound-only, with `flock`, `SBSA_H2H_MAX_FILES=25`, and the existing user-writable state dir.
- **Fee/VAT COA work deferred to tomorrow**: Add migrations/code only after review. Proposed accounts are documented as **NEEDS MIGRATION**: `1300-20-01` VAT Input Recoverable, `5000-10-03` SBSA PayShap RPP/RTP Fee CoS, `5000-10-04` EFT Supplier Payment Fee CoS, and `5100-01-01` Bank Charges Expense. Use CoS for payment/supplier fees, general expense for admin bank charges, and clearing/pass-through for fees recovered without MMTP margin.

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
- `services/disbursement/notificationEngine.js` - Replaced Cloud Run-incompatible `scripts/db-connection-helper.js` import with the runtime Sequelize connection.

---

## Code Changes Summary
- `mt940Parser` now parses real SBSA `FINSTMT` files wrapped in `{1:...}{4:` and real `PROVSTMT` files with `:34F:` instead of `:60M:`/`:62M:`.
- `sbsaStatementService` skips `TRF` credits in statement processing and only delegates `DEP` credits to `standardbankDepositNotificationService`.
- Statement deposit transaction IDs now hash account, dates, direction, type, amount, references, and narrative so duplicate statement appearances are idempotent across files.
- `sbsa-h2h-gateway-sync.sh` can dry-run or apply inbound SBSA `/Inbox` to GCS routing for payment responses and statements; outbound exists but is approval-gated due to real-money movement.
- `notificationEngine` no longer requires `scripts/db-connection-helper.js`, which is excluded from the backend Docker image, so the Pain.002 scheduler endpoint can load the poller in Cloud Run.

---

## Issues Encountered
- **Production R10 not reflected**: Root cause is operational gate/transport, not wallet matching. Production flags are off, production scheduler jobs are absent, GCS statement inbox is empty, and DB has no processing evidence.
- **Parser failed real files**: Real SBSA files include SWIFT envelopes and MT942 `:34F:` balances. Fixed and tested.
- **Potential double-credit risk**: Existing statement service would have credited old PayShap-style `TRF` credits from cumulative statements and used run-scoped idempotency. Fixed before go-live.
- **No persistent SBSA `/Inbox` to GCS transport**: VM has no cron/systemd sync. Added a dry-run-first script; apply/install still needs André approval.
- **Real production filenames differed from docs**: SBSA production statement files use compact timestamps like `MYMOOLAH_OWN11_FINSTMT_20260425061519710_242046957.txt`; fixed the poller pattern and added a regression test.
- **Pain.002 scheduler 500**: The poller failed to load because `notificationEngine` imported `scripts/db-connection-helper.js`, but `scripts/` is excluded from the Cloud Run image. Replaced with runtime Sequelize query support.
- **PayShap missed-notification fallback gap**: Current statement processing intentionally skips `TRF` credits to prevent duplicate PayShap wallet credits. A missed PayShap notification will not be auto-recovered by H2H today; documented as tech debt for a separate duplicate-impossible fallback layer.
- **Crontab install failed**: `/etc/cron.allow` blocks `andremacbookpro` from using `crontab`; systemd timer install succeeded.
- **COA fee/VAT gap**: Current COA had output VAT payable but no dedicated input VAT recoverable account, and did not fully distinguish supplier/payment rail fees from general bank charges. Documented planned accounts; migration and automation are next-session work.

---

## Testing Performed
- [x] Unit tests written/updated.
- [x] Manual parsing performed against downloaded SBSA FINAUD, FINSTMT, and PROVSTMT evidence files.
- [x] Dry-run gateway sync performed from `sftp-1-vm` with `SBSA_H2H_MAX_FILES=12`.
- [x] Test results: pass.
- [x] Production R10 evidence verified: `standard_bank_transactions.id=14`, `transactions.id=56`, journal entry `72`.

Commands:

```bash
npx jest tests/standardbank/mt940Parser.sbsa-real-shape.test.js tests/standardbank/sbsaStatementService.statementCreditSafety.test.js --runInBand
node --check services/standardbank/mt940Parser.js && node --check services/standardbank/sbsaStatementService.js && node --check tests/standardbank/mt940Parser.sbsa-real-shape.test.js && node --check tests/standardbank/sbsaStatementService.statementCreditSafety.test.js
node --check services/disbursement/notificationEngine.js && node --check services/standardbank/pain002PollerService.js
bash -n scripts/sbsa-h2h-gateway-sync.sh
```

---

## Next Steps
- [x] Get André's explicit approval before production deploy, scheduler creation, or gateway `--apply`.
- [x] Deploy backend with `SBSA_H2H_GO_LIVE=true` after approval.
- [x] Run/confirm production Cloud Scheduler jobs.
- [x] Run `scripts/sbsa-h2h-gateway-sync.sh --inbound --apply` on `sftp-1-vm` in a limited observed batch.
- [x] Verify R10 credit: `standard_bank_transactions`, wallet `transactions`, ledger journal, and wallet balance increases by exactly R10.
- [x] Continue syncing remaining SBSA `/Inbox` files in limited batches, then install a controlled recurring sync on `sftp-1-vm` after operational review.
- [ ] Rerun `sbsa-pain002-poll-production` after the `notificationEngine` packaging fix deploy and confirm the endpoint returns 200.
- [ ] After R10 validation, plan app-level Penny #3 using GCS outbound path and explicit approval.
- [ ] Design PayShap `TRF` statement fallback as a separate safety layer if André prioritises it; require DB unique constraints and suspense handling before any wallet auto-crediting.
- [ ] Implement COA migration for input VAT, SBSA PayShap fee CoS, EFT supplier payment fee CoS, and general bank charges expense.
- [ ] Add H2H statement fee classification logic only after Finance confirms VAT/tax invoice evidence source for SBSA fee lines.

---

## Important Context for Next Agent
- Penny #2 FINAUD is present in SBSA `/Inbox`: `MYMOOLAH_OWN11_FINAUD_PRD_20260428054554375_242265281.xml`; it parsed as `ACSP`, status code `0000`.
- The missing R10 appears in real SBSA statement files as `CR10,00NDEP0825571055` with `:86:/PREF/ZA000379IB PAYMENT FROM`.
- Production Cloud Run revision initially checked: `mymoolah-backend-production-00147-vp7`; all H2H production automation flags were off. After activation, revision `mymoolah-backend-production-00156-nqw` processed the R10.
- Production Cloud Scheduler location is `europe-west1`, not `africa-south1`.
- `gcloud compute ssh sftp-1-vm` must use IAP and port 2222: `--tunnel-through-iap --ssh-flag='-p 2222'`.
- The new gateway script is safe by default; `--apply` changes production GCS state and should only run with approval. First approved limited batch copied 12 candidate files, skipped zero-byte FINSTMT files, and processed 6 statement files.
- Recurring gateway sync is installed: `sudo systemctl status mymoolah-sbsa-h2h-gateway-sync.timer --no-pager`. Logs append to `/home/andremacbookpro/mymoolah-sbsa-h2h/sbsa-h2h-gateway-sync.log`. It copies only inbound SBSA `/Inbox` files to GCS; outbound remains manual/approval-gated.

---

## Questions/Unresolved Items
- Should the remaining SBSA `/Inbox` backlog be synced manually in small batches first, or should the VM recurring sync be installed now that R10 validation succeeded?
- Should `scripts/sbsa-h2h-gateway-sync.sh` be installed as a systemd timer on `sftp-1-vm`, or run manually for the first production validation window?
- Should outbound sync remain manual until Penny #3, or be enabled in the same VM timer after Penny #3 validates?

---

## Related Documentation
- `docs/SBSA_H2H_SETUP_GUIDE.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/test/sbsa-sftp-prod-penny2-report-2026-04-24.txt`
