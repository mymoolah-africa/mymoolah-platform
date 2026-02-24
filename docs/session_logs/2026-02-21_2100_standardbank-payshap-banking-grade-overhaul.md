# Session Log: Standard Bank PayShap Banking-Grade Overhaul
**Date**: 2026-02-21 21:00  
**Agent**: Claude (Cursor)  
**Session Duration**: ~45 minutes  
**Status**: ✅ Completed

---

## Session Summary
Performed a full banking-grade overhaul of the Standard Bank PayShap integration. Removed the Peach proxy workaround, aligned both ISO 20022 builders (Pain.001 and Pain.013) exactly with SBSA Postman samples, fixed ACID transaction ordering in services, added proper input validation, and created the Proxy Resolution client.

---

## Tasks Completed

- [x] **Removed Peach proxy workaround** — frontend `RequestMoneyPage.tsx` (components) now calls `/api/v1/standardbank/payshap/rtp` directly
- [x] **Removed Peach proxy from server.js** — no more `app.post('/api/v1/peach/request-money', ...)` routing to Standard Bank controller
- [x] **Fixed Pain.001 builder** — aligned with SBSA Postman sample:
  - Top-level `grpHdr` + `pmtInf[]` (no `cstmrCdtTrfInitn` wrapper)
  - `pmntInfId` (not `pmtInfId`)
  - `reqdExctnDt: { dtTm: "..." }` (not plain string)
  - `initgPty.id.orgId.othr[{ id, issr: 'CIPC' }]` (company registration)
  - `dbtr` has both `id.othr.id` and `nm`
  - `lclInstrm.prtry` (not `cd`)
  - `amt.instdAmt.value` (no `ccy` field)
  - `cdtrAgt.finInstnId.pstlAdr.ctry + brnchId.id`
  - `rmtInf.strd[{ cdtrRefInf: { ref } }]` (not `ustrd`)
  - `splmtryData[]` with `BatchReference` and `DbtStmNarr`
- [x] **Fixed Pain.013 builder** — aligned with SBSA Postman sample:
  - PascalCase throughout (`GrpHdr`, `PmtInf`, `CdtTrfTx`, etc.)
  - `DbtrAcct.Id.Item.Id` + `Prxy.Tp.Item` + `Prxy.Id` structure
  - `DbtrAgt.FinInstnId.Othr.Id` (bank branch code, not BICFI)
  - `CdtrAgt.FinInstnId.Othr.Id` (branch code, not BICFI)
  - `CdtrAcct.Id.Item.Id` (not `othr`)
  - `Amt.Item.Value` (not `instdAmt`)
  - `PmtCond` with `AmtModAllwd`, `EarlyPmtAllwd`, `GrntedPmtReqd`
  - `RmtInf.Strd[{ RfrdDocAmt.DuePyblAmt.Value, CdtrRefInf.Ref }]`
  - `ReqdExctnDt.DtTm` and `XpryDt.DtTm` (datetime objects)
  - UETR added to `PmtId`
- [x] **Fixed client.js**:
  - RTP calls now use `rtp-callback` / `rtp-realtime-callback` URLs (RPP was using wrong paths)
  - `callbackType` option distinguishes RPP vs RTP callback URL paths
  - Structured axios error wrapping with `sbsaStatus` and `sbsaBody` properties
  - Proxy Resolution base URL added to `getBaseUrls()`
- [x] **Created proxyResolutionClient.js** — PBPX proxy resolution (mobile → bank account) using `rpp.proxyResolution.get` scope
- [x] **Fixed pingAuthService.js** — token cache now keyed by scope (`Map<scope, {accessToken, tokenExpiry}>`) to prevent cross-scope contamination (RPP/RTP/Proxy each get their own cached token)
- [x] **Fixed standardbankRppService.js** — ACID ordering:
  - Wallet lock happens inside DB transaction (not before)
  - SBSA API call happens while holding the lock (prevents double-spend)
  - Safe rollback pattern (`try { rollback } catch {}`)
- [x] **Fixed standardbankRtpService.js** — same ACID fixes; `payerBankCode` now passed to Pain.013 builder; safe rollback in `creditWalletOnPaid`
- [x] **Added express-validator input validation** to routes/standardbank.js:
  - RPP: amount (positive float), currency (ZAR only), creditorAccountNumber (alphanumeric 6-20), creditorPhone (SA mobile regex), name/description/reference length limits
  - RTP: same + payerName required, expiryMinutes (5-1440)
  - Returns 422 with structured `errors[]` array on validation failure

---

## Files Modified

| File | Change |
|------|--------|
| `mymoolah-wallet-frontend/components/RequestMoneyPage.tsx` | Replaced Peach URL with `/api/v1/standardbank/payshap/rtp` |
| `integrations/standardbank/builders/pain001Builder.js` | Full rewrite - SBSA spec alignment |
| `integrations/standardbank/builders/pain013Builder.js` | Full rewrite - PascalCase, correct structures |
| `integrations/standardbank/client.js` | RTP callback URLs, error wrapping, proxy URL |
| `integrations/standardbank/pingAuthService.js` | Scope-keyed token cache (Map) |
| `integrations/standardbank/proxyResolutionClient.js` | **NEW** - PBPX proxy resolution |
| `routes/standardbank.js` | express-validator validation rules |
| `services/standardbankRppService.js` | ACID transaction ordering fix |
| `services/standardbankRtpService.js` | ACID fix, payerBankCode, safe rollback |
| `server.js` | Removed Peach proxy route |

---

## Key Decisions

1. **No Peach proxy** — direct Standard Bank endpoint only, as per banking-grade architecture requirements
2. **Pain.001 top-level structure** — SBSA does NOT use `cstmrCdtTrfInitn` wrapper; raw `grpHdr` + `pmtInf[]` at root
3. **Pain.013 PascalCase** — SBSA RTP API uses PascalCase (different from RPP which uses camelCase)
4. **Token cache per scope** — critical for correctness when RPP, RTP, and Proxy Resolution use different OAuth scopes
5. **ACID lock-before-call** — wallet row locked inside DB transaction before SBSA call to prevent double-spend race conditions
6. **Proxy Resolution client** — created as separate module for pre-validation of PBPX payments (mobile → bank account)

---

## Issues Encountered

- None — clean implementation

---

## Security Notes

- All callback endpoints validate HMAC-SHA256 with timing-safe compare (existing, unchanged)
- Input validation added at route level (express-validator)
- Wallet lock held during SBSA API call prevents concurrent double-spend
- No sensitive data in error responses

---

## Next Steps for Next Agent

1. **UAT Testing** — set `STANDARDBANK_PAYSHAP_ENABLED=true` in `.env`, use `.env.codespaces` credentials, test RPP and RTP with the 7 UAT test accounts
2. **Proxy Resolution integration** — wire `proxyResolutionClient.resolveProxy()` into `standardbankRppService` for PBPX payments (pre-validate mobile before sending)
3. **Test accounts** — seed the 7 SBSA UAT test accounts as recent payers in the frontend for easy RTP testing
4. **Pain.001/013 UAT validation** — confirm payload structure is accepted by SBSA sandbox (may need minor field adjustments based on actual API responses)

---

## Git

- **Commit**: `feat(standardbank): banking-grade PayShap integration overhaul`
- **Hash**: `4d032627`
- **Branch**: `main`
- **Status**: Ready to push (user will run `git push origin main`)
