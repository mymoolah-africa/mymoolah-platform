# Session Log - 2026-04-06 - USSD Phase 2 Services Implementation

**Session Date**: 2026-04-06 14:00  
**Agent**: Cursor AI Agent  
**User**: André  

---

## Session Summary
Implemented USSD Phase 2 services for the `*120*5616#` channel: Send Money (P2P), Airtime for Others (eeziAirtime), Buy Electricity (eeziPower), Buy Voucher (6 brands). Wired SMS delivery for all PIN-based purchases with R0.40 incl VAT SMS fee charged to users. Created ledger account `4000-20-03` for SMS Fee Revenue.

---

## Tasks Completed
- [x] Migration created for `4000-20-03` SMS Fee Revenue ledger account
- [x] Send Money (P2P) USSD flow — phone input → amount → confirm → transfer
- [x] Airtime for Others (eeziAirtime) — phone → amount → Flash PIN → SMS delivery
- [x] Buy Electricity (eeziPower) — amount → Flash PIN → SMS delivery
- [x] Buy Voucher — 6 brands (1Voucher, OTT, Blu, Betway, Hollywood Bets, SupaBets) with commission-based supplier selection → PIN → SMS delivery
- [x] SMS fee debit (R0.40 incl VAT) with proper 3-line JE: DR Client Float, CR SMS Fee Revenue (R0.35), CR VAT Control (R0.05)
- [x] Main menu updated: Balance, Send Money, Buy Airtime, Buy Data, Cash Out, More
- [x] More menu updated: Airtime for Others, Buy Electricity, Buy Voucher, Mini Statement, Change PIN, Referral Code, Help
- [x] New SMS templates added: eeziAirtime PIN, eeziPower PIN, Voucher PIN
- [x] Chart of Accounts updated with new account and journal template
- [x] USSD Integration Guide updated with Phase 2 menu tree, capabilities, env vars

---

## Key Decisions
- **SMS fee R0.40 incl VAT**: André confirmed. Breaks down to R0.35 ex-VAT + R0.05 VAT. Configurable via `SMS_FEE_AMOUNT` env var.
- **Send Money free SMS**: P2P transfers send free SMS notifications to both sender and receiver (no SMS fee charged).
- **Voucher brand amounts**: Betting brands (Betway, Hollywood Bets, SupaBets) have R50/R100/R200/R500/R1000 presets. Shopping brands (1Voucher, OTT, Blu) have R10/R25/R50/R100/R200 presets.
- **Voucher supplier selection**: Uses `product_variants` table with commission-based selection (prefers Flash, then MobileMart). Falls back to MobileMart if Flash variant not available.
- **Cash Out stays on Main Menu**: eeziCash is positioned at item 5 on main menu per André's requirement.
- **No bill payments**: Excluded from USSD as per André's directive.

---

## Files Modified
- `services/ussdMenuService.js` — Complete rewrite adding 12 new state handlers, 5 new operations, SMS fee logic, phone normalization, PIN extraction
- `services/smsService.js` — 3 new templates: eeziAirtime PIN, eeziPower PIN, Voucher PIN
- `migrations/20260406_01_create_sms_fee_revenue_ledger_account.js` — New ledger account `4000-20-03`
- `docs/CHART_OF_ACCOUNTS.md` — New account entry, journal template (Section 3.13), env var mapping
- `docs/USSD_INTEGRATION_GUIDE.md` — Updated menu tree, capabilities table, Phase 2 completion, env vars section

---

## Code Changes Summary
- **ussdMenuService.js**: 678 → ~670 lines. Added 12 new state handlers (SEND_MONEY_PHONE/AMOUNT/CONFIRM, AIRTIME_OTHERS_PHONE/AMOUNT/CONFIRM, ELECTRICITY_AMOUNT/CONFIRM, VOUCHER_BRAND/AMOUNT/CONFIRM). Added operations: `sendMoneyToUser()`, `purchaseEeziProduct()`, `purchaseVoucherByBrand()`, `debitSmsFee()`, `sendPinSmsAsync()`, `postVasLedgerEntry()`, `postP2pLedgerEntry()`, `extractPinFromResponse()`, `normalizePhoneNumber()`.
- **smsService.js**: Added `sendUssdEeziAirtimeSms()`, `sendUssdEeziPowerSms()`, `sendUssdVoucherSms()` — all truncated to 160 chars for single-SMS delivery.

---

## Issues Encountered
- None during implementation. Clean linter output on all files.

---

## Testing Performed
- [ ] Unit tests written/updated
- [ ] Integration tests run — migration must be run on UAT before testing
- [x] Linter check — zero errors
- [ ] Manual USSD testing in Codespaces — requires migration + backend restart

---

## Next Steps
- [ ] Run migration on UAT: `./scripts/run-migrations-master.sh uat`
- [ ] Set `SMS_FEE_AMOUNT=0.40` in environment (defaults to 0.40 if not set)
- [ ] Restart backend: `./scripts/one-click-restart-and-start.sh`
- [ ] Test all 4 new flows via USSD simulator or live dial
- [ ] Verify SMS delivery with eeziAirtime/eeziPower/Voucher purchases
- [ ] Verify Send Money P2P between two test users
- [ ] Run migration on staging/production when UAT validated
- [ ] Write unit tests for new USSD state handlers

---

## Important Context for Next Agent
- `SMS_FEE_AMOUNT` defaults to `0.40` (ZAR incl VAT) — configurable via env var
- The SMS fee JE posts asynchronously (non-blocking via `setImmediate`) to avoid slowing the USSD response
- P2P SMS notifications for Send Money are free (no SMS fee debited)
- Voucher purchase uses `product_variants` table with commission-based supplier selection — Flash preferred
- The `extractPinFromResponse()` function is robust, checking multiple response shapes for Flash/MobileMart compatibility
- `purchaseEeziProduct()` resolves productCode dynamically using `flashController._resolveEeziVoucherProductCode()` and `_resolveEeziPowerProductCode()`
- All USSD state handlers use the same `checkBalanceAndLimits()` which checks wallet balance, tier limits, daily/monthly caps

---

## Related Documentation
- `docs/CHART_OF_ACCOUNTS.md` — Section 3.13 (SMS Fee JE template)
- `docs/USSD_INTEGRATION_GUIDE.md` — Phase 2 section
- Previous session: USSD Phase 1 implementation (see prior session logs)
