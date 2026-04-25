# Session Log - 2026-04-25 - Wallet-to-Bank EFT H2H Activation

**Session Date**: 2026-04-25 11:21 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~30 minutes  
**Commit**: `f288790f feat(wallet-bank): activate EFT H2H payments`

---

## Session Summary
Implemented the approved wallet-to-bank payment activation plan. Bank payments now default to SBSA H2H EFT, with an optional Instant Payment toggle that uses existing PayShap RPP rails and shows fee/receipt-time messaging before submission.

The work stayed scoped to EFT H2H activation and the Send Money payment flow. It added database-backed effective-dated fee policies for future MMAP configuration, a wallet-bank payment tracking table, a quote/submit API, EFT receipt estimation using the 15:00 SAST cutoff, and Pain.002-driven reversal/refund handling.

---

## Tasks Completed
- [x] Added effective-dated customer transaction fee policy model and migration.
- [x] Seeded UAT launch EFT fee policy: `WALLET_BANK_EFT_UAT_FLAT_R2` (`R2.00` flat fee).
- [x] Added wallet-bank payment tracking model/table for EFT and PayShap wallet-to-bank payments.
- [x] Added `transactionFeeService` for database-backed EFT fee quoting plus reuse of existing PayShap RPP fee logic.
- [x] Added `eftSettlementEstimator` with `15:00 SAST` cutoff, Saturday intake support, weekend handling, and SA public-holiday roll-forward.
- [x] Added wallet-bank quote/submit endpoints at `/api/v1/wallet-bank-payments`.
- [x] Wired wallet-bank payment endpoints into financial rate limiting in `server.js`.
- [x] Reused existing SBSA H2H Pain.001 bulk builder and GCS/SFTP upload service for EFT submissions.
- [x] Reused existing PayShap RPP service for Instant Payment submissions.
- [x] Wired Pain.002 poller to also process wallet-bank EFT statuses and reverse/refund rejected EFTs.
- [x] Updated `SendMoneyPage.tsx`: bank payments default to EFT, Instant Payment toggle switches to PayShap, quote messaging displays fees and receipt estimates.
- [x] Added frontend API service methods for wallet-bank quote and submit.
- [x] Added targeted settlement estimator tests.
- [x] Committed and pushed implementation to `main`.

---

## Key Decisions
- **Single bank-payment modal**: Bank payments use one modal. EFT is the default rail; Instant Payment is a toggle that switches to PayShap RPP.
- **UAT fee policy**: EFT fee is `R2.00` flat via database policy. PayShap Instant Payment keeps existing tiered RPP fee logic.
- **Future MMAP readiness**: Fee policy uses effective-dated DB records rather than hardcoded fee logic, so MMAP can manage fees later without reworking the payment flow.
- **Receipt estimate**: EFT uses `15:00 SAST` cutoff for launch. Saturday before 15:00 is treated as a processing intake day, with receiver availability rolled to the next SA business day.
- **Reversal model**: H2H EFT is asynchronous. Wallet debit occurs on submission; rejected/NACK/failed EFTs are reversed and refunded via wallet credit and refund transaction.
- **Production gating**: Wallet-bank EFT defaults to enabled outside production unless explicitly disabled. Production should keep `WALLET_BANK_EFT_ENABLED=false` until Penny #2 FINAUD and inbound R10 validation are complete.

---

## Files Modified
- `migrations/20260425110000_create_wallet_bank_payments_and_fee_policies.js` - Creates fee policies and wallet-bank payment tracking; seeds R2 EFT UAT policy.
- `models/TransactionFeePolicy.js` - Sequelize model for effective-dated transaction fee policies.
- `models/WalletBankPayment.js` - Sequelize model for customer wallet-to-bank payment lifecycle tracking.
- `services/transactionFeeService.js` - Quotes EFT fees from DB policies and PayShap fees from existing RPP logic.
- `utils/eftSettlementEstimator.js` - Calculates EFT processing intake and receiver availability.
- `services/walletBankPaymentService.js` - Orchestrates quote, EFT submit, PayShap submit, wallet debit, upload, reversal/refund, and Pain.002 processing.
- `routes/walletBankPayments.js` - Adds authenticated, KYC-gated quote and submit APIs.
- `server.js` - Mounts wallet-bank routes and applies financial rate limiter.
- `services/standardbank/pain002PollerService.js` - Delegates parsed Pain.002 responses to wallet-bank payment processing.
- `mymoolah-wallet-frontend/services/apiService.ts` - Adds typed quote/submit client methods.
- `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` - Bank payment UI defaults to EFT with Instant Payment toggle and fee/receipt messaging.
- `tests/eft-settlement-estimator.test.js` - Tests cutoff, Saturday intake, and public-holiday/weekend-aware receiver date logic.

---

## Code Changes Summary
- **Backend API**: New `/api/v1/wallet-bank-payments/quote` and `/api/v1/wallet-bank-payments/submit` endpoints.
- **Fee engine**: New customer-facing transaction fee policy table supports future MMAP management and immutable fee snapshots per payment.
- **EFT submission**: Consumer single-payment EFT reuses existing SBSA H2H Pain.001 bulk builder and SFTP/GCS upload path.
- **Instant payment**: PayShap RPP path reuses existing `standardbankRppService`.
- **Asynchronous safety**: Pain.002 NACK/rejection handling reverses wallet-bank EFT payments and credits the user back.
- **Frontend UX**: Bank payment modal shows EFT as the default, optional Instant Payment switch, fee estimate, total debit, and receipt estimate.

---

## Issues Encountered
- **No new infrastructure recreated**: Existing Pain.001 builder, GCS/SFTP upload service, PayShap RPP service, idempotency middleware, beneficiary model, and SA public-holiday utility were reused.
- **Frontend duplicate SendMoneyPage**: Only the routed `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` was changed. The duplicate component file was not touched.
- **Jest config warning**: Targeted test run passes but Jest still prints an existing config warning for unknown option `setupFilesAfterSetup`; not introduced by this session.
- **Docs were stale**: Several top-level docs still referenced April 16/20 work as latest. This follow-up docs pass updates those canonical docs to reflect v3.0.0.

---

## Testing Performed
- [x] Unit tests written/updated: `tests/eft-settlement-estimator.test.js`
- [x] Targeted test run:
  - `npm test -- --runTestsByPath tests/eft-settlement-estimator.test.js`
  - Result: 3/3 tests passing.
- [x] Backend syntax checks:
  - `node --check utils/eftSettlementEstimator.js`
  - `node --check services/transactionFeeService.js`
  - `node --check services/walletBankPaymentService.js`
  - `node --check routes/walletBankPayments.js`
  - `node --check migrations/20260425110000_create_wallet_bank_payments_and_fee_policies.js`
- [x] Frontend type-check:
  - `npx tsc --noEmit` in `mymoolah-wallet-frontend`
- [x] Cursor lints:
  - No linter errors on edited files.
- [ ] Codespaces UAT E2E test still pending after pull, migration, and restart.

---

## Next Steps
- [ ] In Codespaces, pull latest `main`.
- [ ] Run migration `20260425110000_create_wallet_bank_payments_and_fee_policies.js` against UAT using the master migration script.
- [ ] Restart backend and wallet frontend so the new model, route, and Send Money UI load.
- [ ] Confirm `WALLET_BANK_EFT_ENABLED=true` for UAT only.
- [ ] Confirm production remains gated until Penny #2 FINAUD and R10 inbound validation complete.
- [ ] Test saved bank beneficiary EFT payment before 15:00 SAST and confirm fee/receipt estimate.
- [ ] Test Instant Payment toggle and confirm PayShap RPP fee disclosure and submission path.
- [ ] Test insufficient-balance and idempotency paths for wallet-bank submit endpoint.
- [ ] After UAT evidence, decide whether to add MMAP fee-management UI for `transaction_fee_policies`.

---

## Important Context for Next Agent
- The implementation commit is `f288790f`.
- EFT fee is currently database-seeded as R2.00 for all wallet-bank EFT payments.
- PayShap Instant Payment uses existing RPP fee service and existing RPP submission logic.
- New routes are KYC-gated and financial-rate-limited.
- Production should not be enabled until explicit business approval after SBSA Penny #2 final audit and inbound R10 validation.
- Pain.002 processing now has two consumers: existing disbursements and wallet-bank EFTs.
- The duplicate `mymoolah-wallet-frontend/components/SendMoneyPage.tsx` remains untouched and should not be treated as routed unless routing changes later.

---

## Questions/Unresolved Items
- Should MMAP fee policy management be prioritised immediately after UAT, or deferred until after production EFT enablement?
- Should the EFT receipt estimate text use "by next business day" wording or a precise date only?
- Should wallet-bank EFT completion update the customer-facing transaction from `processing` to `completed` when FINAUD accepts, in addition to updating `wallet_bank_payments` and `standard_bank_transactions`?

---

## Related Documentation
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/API_DOCUMENTATION.md`
- `docs/CODESPACES_TESTING_REQUIREMENT.md`
- `docs/DATABASE_CONNECTION_GUIDE.md`
- `docs/BANKING_GRADE_ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/PERFORMANCE.md`
