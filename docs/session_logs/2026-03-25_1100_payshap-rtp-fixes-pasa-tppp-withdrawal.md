# Session Log - 2026-03-25 - PayShap RTP Fixes + PASA TPPP Withdrawal Response

**Session Date**: 2026-03-25 11:00–14:00 SAST  
**Agent**: Cursor AI Agent (Claude Opus)  
**User**: André  
**Session Duration**: ~3 hours

---

## Session Summary

Major PayShap RTP debugging session fixing multiple SBSA Pain.013 issues (EDRIL rejection, amount range, Ustrd rejection, decline notifications), followed by resolving the creditor name display problem. Also drafted PASA TPPP withdrawal functionality response with supporting flow diagrams for Shree.

---

## Tasks Completed

- [x] Fixed EDRIL rejection — `CdtrRefInf.Ref` exceeded 35-char ISO 20022 limit (`a5133c49`)
- [x] Fixed amount range display — removed `DuePyblAmt` then reverted to net amount after SBSA rejected equal Amt/DuePyblAmt (`4d55e213`, `b3ca459e`)
- [x] Fixed Ustrd rejection — removed `RmtInf.Ustrd` from Pain.013 as SBSA only accepts `Strd` (`71d72951`)
- [x] Fixed PADCL decline notification — payer-initiated decline now takes priority over EBONF in notification logic (`6a1a8f30`)
- [x] Fixed per-bank account number normalization — leading zeros stripped when exceeding bank max length (`62e13b11`)
- [x] Fixed per-bank account number validation with digit count hints in frontend (`043f9111`)
- [x] Fixed SequelizeMeta permission for Cloud SQL migrations (`5a6d88c0`, `68259eb0`)
- [x] Resolved creditor name visibility — wallet holder name now in `CdtrRefInf.Ref` so payer sees "Andre Botes: description" (`7450cced`)
- [x] Drafted PASA TPPP withdrawal reply email for Shree (`docs/drafts/2026-03-25_shree-pasa-tppp-withdrawal-reply.md`)
- [x] Created PASA TPPP flow diagrams document (MD, HTML, PDF) (`docs/drafts/2026-03-25_pasa-tppp-withdrawal-flow-diagrams.*`)

---

## Key Decisions

- **Creditor name in CdtrRefInf.Ref**: SBSA's PayShap directory overrides `Cdtr.Nm` with the registered entity name ("MYMOOLAH (PTY) LTD"). The `CdtrRefInf.Ref` field (payment reference) passes through untouched to the payer's banking app. Solution: prepend the wallet holder's resolved name to the reference, e.g. "Andre Botes: MyMoolah RTP Test" (max 35 chars).
- **Ustrd not supported by SBSA**: SBSA Postman samples only include `Strd` in `RmtInf`, not `Ustrd`. Removed entirely.
- **DuePyblAmt must differ from Amt**: SBSA rejects when `DuePyblAmt == Amt`. Must remain as net amount (amount - fee).
- **PADCL priority over EBONF**: User-initiated decline (PADCL) was being masked by EBONF (batch failure) notification. Fixed notification priority.
- **PASA withdrawal clarification**: Cash-out is Flash eeziCash voucher resale (VAS), not a banking withdrawal. No additional Standard Bank sponsorship required.

---

## Files Modified

### PayShap RTP Fixes
- `services/standardbankRtpService.js` — Creditor name prepended to `remittanceInfo` for both initial RTP and PBAC retry; removed `unstructuredInfo` parameter
- `integrations/standardbank/builders/pain013Builder.js` — Removed `Ustrd` from `RmtInf`; removed `unstructuredInfo` parameter from JSDoc and destructure
- `controllers/standardbankController.js` — Per-bank account number normalization function; PADCL notification priority fix

### Account Normalization
- `controllers/standardbankController.js` — `normalizeAccountNumber()` with per-bank max-length rules (ABSA/Capitec: 10, SBSA/FNB: 11)
- `mymoolah-wallet-frontend/pages/RequestMoneyPage.tsx` — Frontend validation + API payload normalization

### Migrations
- `scripts/run-migrations-master.sh` — SequelizeMeta ownership auto-fix before running migrations

### PASA TPPP Withdrawal (Documentation)
- `docs/drafts/2026-03-25_shree-pasa-tppp-withdrawal-reply.md` — Draft email to Shree
- `docs/drafts/2026-03-25_pasa-tppp-withdrawal-flow-diagrams.md` — Detailed flow diagrams (Flash eeziCash, EasyPay, MobileMart)
- `docs/drafts/2026-03-25_pasa-tppp-withdrawal-flow-diagrams.html` — HTML version with visual diagrams
- `docs/drafts/2026-03-25_pasa-tppp-withdrawal-flow-diagrams.pdf` — PDF version for PASA submission

---

## Issues Encountered

- **EDRIL rejection**: `CdtrRefInf.Ref` was receiving full `remittanceInfo` without truncation to 35 chars. Fixed by applying `.substring(0, 35)` in builder.
- **SBSA rejects equal Amt/DuePyblAmt**: Initial fix removed `DuePyblAmt` entirely (so only `Amt` shown), but SBSA requires `DuePyblAmt < Amt`. Reverted to net amount.
- **Ustrd rejection**: SBSA's Pain.013 schema only accepts `Strd` in `RmtInf`. Adding `Ustrd` caused rejection.
- **Creditor name investigation**: Extensive investigation confirmed that `Cdtr.Nm` IS correctly set to wallet holder name, but SBSA/PayShap directory always overrides with registered entity name. Previous "confirmation" of fix was from wallet app screenshot, not payer's banking app. Resolved by putting name in `CdtrRefInf.Ref`.
- **Capitec notification delay**: After submitting RTP, Capitec notification took ~3 minutes to arrive (vs immediate on previous tests). Not a code issue — Capitec-side delay.

---

## Testing Performed

- [x] Staging test with production credentials — RTP accepted (HTTP 202)
- [x] SBSA callbacks received — PDNG status confirmed
- [x] Capitec banking app confirmed — Payment reference shows "Andre Botes: MyMoolah RTP Test"
- [x] Capitec transaction history confirmed — Shows "Andre Botes: MyMoolah RTP T..." (truncated but name visible)
- [x] Previous test comparison — March 21 showed generic "MyMoolah RTP Test" without name; today shows "Andre Botes: MyMoolah RTP Test"
- [x] PADCL decline notification — verified working (payer decline creates wallet notification)

---

## Next Steps

- [ ] **Production deployment required** — All RTP fixes + account normalization + SOAP handler need production deploy
- [ ] **Send Shree email** — André to review and send `docs/drafts/2026-03-25_shree-pasa-tppp-withdrawal-reply.md` with attached flow diagrams PDF
- [ ] **SBSA H2H**: Awaiting test traffic from Colette before freeze (Thu Mar 27 → Apr 8)
- [ ] **SBSA hash spec**: Ask SBSA for x-GroupHeader-Hash algorithm (still soft-fail on all callbacks)

---

## Important Context for Next Agent

- **Creditor name on payer's bank**: `Cdtr.Nm` in Pain.013 is correctly set to wallet holder name, but SBSA PayShap directory ALWAYS overrides with "MYMOOLAH (PTY) LTD". The fix is to include the name in `CdtrRefInf.Ref` (payment reference), which passes through untouched to the payer's banking app.
- **Ustrd is NOT supported** by SBSA in Pain.013. Do NOT add `RmtInf.Ustrd` — it will be rejected.
- **DuePyblAmt must be less than Amt** — SBSA rejects when they're equal. Always use net amount (amount - fee).
- **Per-bank account normalization**: Leading zeros are only stripped when the number exceeds the bank's max valid length. ABSA/Capitec max 10 digits; SBSA/FNB max 11.
- **PASA TPPP withdrawal**: Shree queried PASA about withdrawal functionality. Response clarifies cash-out = Flash eeziCash voucher resale (VAS), not banking withdrawal. Supporting flow diagrams in `docs/drafts/`.
- **Peach Payments is DECOMMISSIONED** — do NOT reactivate without André's explicit approval.

---

## Related Documentation

- `docs/drafts/2026-03-25_shree-pasa-tppp-withdrawal-reply.md` — Shree PASA email
- `docs/drafts/2026-03-25_pasa-tppp-withdrawal-flow-diagrams.md` — Flow diagrams (MD)
- `docs/drafts/2026-03-25_pasa-tppp-withdrawal-flow-diagrams.pdf` — Flow diagrams (PDF for PASA)
- `docs/session_logs/2026-03-24_1530_easypay-tppp-legal-response-draft.md` — EasyPay legal (related TPPP context)
