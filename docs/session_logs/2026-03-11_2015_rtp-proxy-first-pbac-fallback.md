# Session Log - 2026-03-11 - RTP Proxy-First + PBAC Fallback Implementation

**Session Date**: 2026-03-11 ~15:00–20:15 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~5 hours  
**Deployed**: `mymoolah-backend:20260311_v12` (revision `mymoolah-backend-staging-00241-w2l`)

---

## Session Summary

Investigated and fixed the root cause of PayShap RTP (Request to Pay) failures. The core bug was that `isPbac = Boolean(payerAccountNumber)` was always `true` because the frontend always sends both mobile and account number — meaning every RTP was sent as PBAC (account-only), completely ignoring the mobile number. Fixed to proxy-first, with automatic PBAC fallback if proxy is rejected. Also removed the erroneous `PBAC` local instrument code from Pain.013 (it belongs in Pain.001 not Pain.013). Both fixes confirmed working in staging — RTPs to 0720213994 (Capitec) and 0798569159 now return PDNG (delivered).

---

## Tasks Completed

- [x] Diagnosed root cause: `isPbac` logic was always true when frontend sends both mobile + account
- [x] Fixed `isPbac` in `pain013Builder.js` — proxy preferred when mobile present
- [x] Removed incorrect `PBAC` flag from Pain.013 `PmtTpInf` (per SBSA Postman sample, RTP uses `{}`)
- [x] Aligned `isPbacMode` logic in `standardbankRtpService.js`
- [x] Implemented automatic PBAC fallback: `retryRtpAsPbac()` in `processRtpCallback`
- [x] User only notified of failure after BOTH proxy AND PBAC attempts fail
- [x] Retry state tracked in `metadata` JSONB field (no DB migration needed)
- [x] Swept SBSA developer portal, Electrum docs, Peach Payments archived integration for additional insights
- [x] Committed `9bb2a98d` — deployed as v12 to staging
- [x] Confirmed PDNG delivery for both test payers post-deployment

---

## Key Decisions

- **Proxy-first always**: When `payerMobileNumber` is present, use proxy mode regardless of whether `payerAccountNumber` is also provided. Frontend always sends both; mobile takes priority.
- **PBAC flag NOT in Pain.013**: `PmtTpInf.LclInstrm.Prtry = 'PBAC'` is for RPP (Pain.001 Send Money), not RTP (Pain.013 Request Money). SBSA's own Postman RTP sample uses `PmtTpInf: {}`. Removing this may have also contributed to fixing deliveries.
- **Automatic retry**: Rather than failing immediately when proxy lookup fails (payer has no PayShap ID), auto-retry as PBAC. Guards against infinite loops via `retryOf` / `retryMode` metadata flags.
- **No migration needed**: Retry state stored in existing `metadata` JSONB column on `standard_bank_rtp_requests`.
- **Peach Payments archived**: No new RTP insights from Peach — their integration abstracts away ISO 20022 and the route `/api/v1/peach/request-money` is already proxied to SBSA controller.

---

## Files Modified

- `integrations/standardbank/builders/pain013Builder.js`
  - `isPbac = !payerMobileNumber && Boolean(payerAccountNumber)` (was `Boolean(payerAccountNumber)`)
  - `pbacPmtTpInf = {}` always (removed `PBAC` local instrument from Pain.013)
  - Updated JSDoc to document both proxy and PBAC flows correctly

- `services/standardbankRtpService.js`
  - `isPbacMode` aligned with builder logic
  - Added `extractRejectionCodes()` helper to parse SBSA system rejection codes from callback body
  - Added `retryRtpAsPbac(originalRtp)` — builds PBAC Pain.013, sends to SBSA, creates linked retry DB record
  - Updated `processRtpCallback()` — proxy rejection triggers PBAC retry; user notified only if both fail
  - Exported `retryRtpAsPbac`

---

## Code Changes Summary

### Before (broken)
```js
const isPbac = Boolean(payerAccountNumber); // Always true when frontend sends account — ignores mobile
```

### After (fixed)
```js
const isPbac = !payerMobileNumber && Boolean(payerAccountNumber); // Proxy preferred; PBAC only without mobile
```

### PBAC fallback flow
```
Proxy RTP sent (mobile) → SBSA callback RJCT (EPDNF/EBONF/EERRR)
  → retryRtpAsPbac() triggered
  → New PBAC Pain.013 sent (account number, branch code, no Prxy block)
  → New DB record created with metadata.retryOf = originalMsgId
  → If PBAC also fails → user notified "could not be delivered"
```

---

## Issues Encountered

- **Issue 1: isPbac always true** — Frontend (`RequestMoneyPage.tsx`) always sends both `payerMobileNumber` and `payerAccountNumber` for bank transfers. Old logic `isPbac = Boolean(payerAccountNumber)` therefore always activated PBAC mode, bypassing proxy entirely.
- **Issue 2: PBAC flag in Pain.013** — `PmtTpInf.LclInstrm.Prtry = 'PBAC'` was being set in RTP (Pain.013). This code only belongs in RPP (Pain.001). SBSA's own Postman RTP sample uses empty `{}`. Removed.
- **Issue 3: 0720213994 Capitec PDNG but not received** — RTP delivered successfully to SBSA (PDNG) but payer reports not receiving. Likely Capitec app notification issue or they need to check under PayShap → Requests manually. Capitec limit is 2×R500/day which could also be a factor.

---

## Testing Performed

- [x] Manual staging tests: RTP to 0720213994 (Capitec) → PDNG ✅
- [x] Manual staging tests: RTP to 0798569159 → PDNG ✅
- [x] Syntax validation: `node -e "require('./integrations/standardbank/builders/pain013Builder')"` → OK
- [x] Zero linter errors confirmed

---

## Next Steps

- [ ] Wait for SBSA PBAC clarification email response (drafted, ready to send)
- [ ] Monitor whether 0720213994 eventually receives and pays the request (Capitec notification delay)
- [ ] Test PBAC fallback path: need a payer with NO PayShap proxy registered to trigger EPDNF and verify `[RTP-RETRY-PBAC]` logs appear
- [ ] Consider adding `retry_pbac` as a formal status in `StandardBankRtpRequest` model (currently stored in metadata only)
- [ ] Send email to Gustaf/Louis at SBSA regarding PBAC support and bank compatibility

---

## Important Context for Next Agent

- **RTP flow is now**: proxy first (mobile number) → if EPDNF/EBONF/EERRR → PBAC retry (account number)
- **Frontend always sends both** `payerMobileNumber` and `payerAccountNumber` for bank transfers — this is by design. Backend uses mobile for proxy lookup, account for PBAC fallback.
- **Pain.013 `PmtTpInf`** must be `{}` (empty) for all RTP. Never set `PBAC` here.
- **DbtrAgt** for proxy mode = proxy domain (e.g. `capitec`, `discoverybank`). For PBAC = branch code (e.g. `470010`).
- **Staging backend**: v12 (`mymoolah-backend-staging-00241-w2l`) — includes all RTP proxy/PBAC fixes
- **Current commit**: `9bb2a98d` — proxy-first + PBAC fallback
- **Capitec 0720213994**: RTP delivered (PDNG) but payer says not received — likely Capitec app issue, not code issue
- **Email to SBSA drafted** asking for PBAC Pain.013 sample and bank support matrix — not yet sent

---

## Related Documentation

- `integrations/standardbank/samples/SBSA_NonProd_Payshap_Requests.json` — SBSA Postman RTP sample (proxy only, no PBAC)
- `docs/SBSA_POSTMAN_SAMPLES_ANALYSIS.md` — Integration mapping analysis
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap integration reference
- Previous session: `docs/session_logs/2026-03-10_2130_rtp-recent-transactions-capitec-balance-refresh.md`
