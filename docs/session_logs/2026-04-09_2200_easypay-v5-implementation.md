# Session Log - 2026-04-09 - EasyPay V5 BillPayment Receiver Implementation

**Session Date**: 2026-04-09 22:00  
**Agent**: Cursor AI Agent (Claude 4.6 Opus)  
**User**: Andre  

---

## Session Summary

Planned and implemented Phase 1 of the EasyPay Cash-In integration using the official BillPayment Receiver V5 protocol. Identified that the existing "Model A" (PIN/voucher + settlement callback) was built on internal assumptions, not EasyPay's official spec. Confirmed V5 as the correct integration path with 14-digit PIN format. Implemented 10 of 12 tasks: migration, auth middleware, deposit service with 2-JE pattern, paymentNotification wallet credit, authorisationRequest V5 compliance, fee structure, CoA rewrite, TPPP documentation updates, and supplier commission config.

---

## Tasks Completed

- [x] Task 1: Add `userId` column to `bills` table (migration + model)
- [x] Task 2: Wire `easypayAuthMiddleware` to V5 routes (security fix)
- [x] Task 3: Fix `issueEasyPayVoucher` to create Bill record for V5 lookup
- [x] Task 4: Create `easyPayDepositService.js` with 2-JE pattern
- [x] Task 5: Fix `paymentNotification` — wallet credit, fee debit, 2 Transaction records, JEs
- [x] Task 6: Fix `authorisationRequest` response — add Amount, expiryDate per V5 spec
- [x] Task 7: Fix fee structure — zero MM margin, R5.50 + handling% + VAT env vars
- [x] Task 8: Add EasyPay to `supplier-commissions.json`
- [x] Task 9: Rewrite CoA Section 3.1 with correct 2-JE pattern + T+2 settlement
- [x] Task 10: Update TPPP certification across 4 documentation files
- [x] Task 13: USSD "Top-up at Retail" flow (More menu option 8, PIN generation, SMS delivery)
- [x] Task 14: Success SMS on wallet credit in paymentNotification handler

---

## Key Decisions

- **V5 is the correct integration**: The BillPayment Receiver V5 protocol (`EasypayReceiverV5.yaml`) is EasyPay's official spec. The previous "Model A" settlement callback was built on MMTP assumptions, not EasyPay documentation.
- **14-digit PIN confirmed**: Format `9` + `5063` (receiver ID) + 8-digit account + Luhn check digit. MMTP generates the PIN when user requests a top-up.
- **2-JE model (no ringfencing)**: JE1 gross deposit (DR Float / CR Client), JE2 fee deduction (DR Client / CR Float). No ringfencing — EasyPay deposits are unrestricted (unlike Flash vouchers).
- **EasyPay deducts fee at source**: MMTP receives net amount in T+2 settlement. Full cost passed to user, MMTP earns zero margin.
- **JEs posted after DB commit**: Wallet credit/debit + Transaction records in ACID transaction; JEs posted outside transaction (reconcilable on failure). Same pattern as Flash voucher deposits.
- **PaymentResponse is `{ EchoData }` only**: V5 spec says receiver cannot decline; response only echoes back EchoData (not ResponseCode).

---

## Files Modified

- `migrations/20260409_01_add_userId_to_bills.js` — NEW: adds `userId` FK to `bills` table with index
- `models/Bill.js` — Added `userId` field, uncommented `Bill.belongsTo(User)` association
- `routes/easypay.js` — Wired `easypayAuthMiddleware` to 3 V5 endpoints (ping stays public)
- `controllers/easyPayController.js` — Rewrote `paymentNotification` (wallet credit, JEs, Transactions, success SMS), fixed all `authorisationRequest` responses with Amount/expiryDate
- `controllers/voucherController.js` — `issueEasyPayVoucher` now creates Bill record alongside Voucher for V5 lookup
- `services/easyPayDepositService.js` — NEW: `calculateEasyPayFee()` + `postEasyPayDeposit()` 2-JE pattern
- `services/ussdMenuService.js` — NEW: "Top-up at Retail" flow (option 8 in More menu, 3 state handlers, SMS PIN delivery)
- `utils/easyPayUtils.js` — Added `generateEasyPayNumber()` for shared use (USSD + future channels)
- `env.template` — Added fee env vars, set MM margin to 0
- `config/supplier-commissions.json` — Added EASYPAY entry (zero commission, pass-through)
- `docs/CHART_OF_ACCOUNTS.md` — Section 3.1 rewritten with correct 2-JE pattern + T+2
- `docs/STANDARD_BANK_TPPP_APPLICATION_CHECKLIST_RESPONSE_FORMAL.txt` — TPPP: Pending -> Received 12 March 2026
- `docs/CHANGELOG.md` — Added TPPP receipt note
- `docs/archive/agent_handover_history.md` — Added TPPP receipt note
- `docs/integrations/EasyPay_API_Integration_Guide.md` — Updated TPPP status in Section 1.4

---

## Issues Encountered

- **Model A vs Model B confusion**: Previous agents built a settlement callback integration (Model A) that is NOT in EasyPay's official documentation. The official V5 BillPayment Receiver spec (Model B) was already in the repo (`integrations/easypay/EasypayReceiverV5.yaml`) but was not the basis for the settlement code.
- **Missing Bill record**: `issueEasyPayVoucher` created a Voucher but NOT a Bill. V5 `infoRequest` looks up Bills, so it would have returned "InvalidAccount" for every top-up. Fixed by adding `Bill.create()` in the voucher issuance flow.
- **Amount units mismatch**: Bill model stores cents, voucherController works in Rands. Fixed with `amount * 100` conversion in Bill.create.

---

## Testing Performed

- [x] Zero linter errors across all modified files
- [ ] Migration not yet run (needs Codespaces)
- [ ] End-to-end testing requires EasyPay UAT SessionToken
- [ ] Unit tests need to be written for `easyPayDepositService.js`

---

## Next Steps (Placeholders to Update After EasyPay Meeting)

- [ ] **Run migration**: `./scripts/run-migrations-master.sh uat` in Codespaces (adds `userId` to bills)
- [ ] **EasyPay meeting**: Confirm 7 remaining questions (cash handling %, settlement ref format, min/max amounts, SessionToken, production key, timeouts, settlement report)
- [ ] **Update placeholders after meeting**:
  - `EASYPAY_TOPUP_CASH_HANDLING_PCT` in env.template (currently 0.003 placeholder)
  - Fee display in frontend overlays
  - Settlement reference matching logic
  - Min/max deposit amounts
- [ ] Task 11: Settlement reconciliation with confirmed reference format
- [ ] Task 12: Frontend — remove "Coming Soon" fog, update fee display
- [ ] Re-seed test Bill data with `userId` column populated
- [ ] Write unit tests for `easyPayDepositService.js`
- [ ] UAT end-to-end testing with EasyPay's SessionToken

---

## Important Context for Next Agent

- **V5 is confirmed**: Do NOT revert to Model A (settlement callback). V5 BillPayment Receiver is the official EasyPay integration.
- **14-digit PIN format**: `9` + `5063` + 8-digit account + Luhn. Generated by `generateEasyPayNumber()` in `voucherController.js`.
- **EasyPay deducts fee at source**: Settlement amount = gross - fee. MMTP earns zero.
- **Placeholders**: `EASYPAY_TOPUP_CASH_HANDLING_PCT=0.003` is a placeholder. Exact rate TBC with EasyPay.
- **Migration**: `20260409_01_add_userId_to_bills.js` has NOT been run yet. Run in Codespaces.
- **CoA Section 3.1**: Rewritten with placeholder fee amounts (R5.80 excl VAT example). Update after EP confirms handling %.
- **Plan file**: Full implementation plan at `.cursor/plans/v5_easypay_implementation_b1f44180.plan.md`.

---

## Questions/Unresolved Items (for EasyPay Meeting)

1. Cash handling fee %: exact rate for cash deposits (range 0.20%-0.50%)? Is fee in V5 payload?
2. Settlement reference format for auto-reconciliation of `1200-10-02`
3. Min/max deposit amounts (currently R50-R4000)
4. UAT SessionToken: was one shared with Theodore/Razeen already?
5. Production SessionToken: when issued?
6. API response timeout for each V5 call
7. Daily settlement report (CSV/SFTP/API) alongside T+2 bank transfer?

---

## Related Documentation

- Plan: `.cursor/plans/v5_easypay_implementation_b1f44180.plan.md`
- EasyPay V5 Spec: `integrations/easypay/EasypayReceiverV5.yaml`
- CoA: `docs/CHART_OF_ACCOUNTS.md` Section 3.1
- Flash voucher pattern (reference): `services/restrictedFundsService.js`
