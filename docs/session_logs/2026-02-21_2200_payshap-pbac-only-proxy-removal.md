# Session Log: PayShap PBAC-Only — Proxy Removal

**Date**: 2026-02-21  
**Time**: 22:00  
**Agent**: Claude Sonnet 4.5  
**Session Type**: Refactor / Simplification  

---

## Summary

Removed all proxy (PBPX / mobile number) dependencies from the Standard Bank PayShap integration. Both RPP (outbound) and RTP (request to pay) now exclusively use PBAC (Pay-By-Account) — i.e., direct bank account number + branch code. This eliminates the R1.25 proxy validation fee, removes mobile number normalisation edge cases, and avoids SBSA EPDNF/EDRIL errors caused by unregistered or incorrectly formatted proxy identifiers.

---

## Why This Was Done

During UAT testing, RTP with proxies (mobile numbers) produced:
- `EPDNF` — Proxy domain not part of organisation (SBSA test data not provisioned)
- `EDRIL` — Debtor Reference incorrect length (mobile number format mismatch)

Additionally, the pricing model charges an extra R1.25 (VAT incl) per proxy lookup. Since MMTP always has the payer's bank account number available, using PBAC is simpler, cheaper, and more reliable.

---

## Tasks Completed

- [x] `pain001Builder.js` — removed PBPX branch entirely; hardcoded `paymentType = 'PBAC'`; `creditorAccountNumber` now required (throws if missing)
- [x] `pain013Builder.js` — removed all proxy/mobile normalisation logic; `DbtrAcct` now uses direct account `Id` (no `Prxy` block); `payerAccountNumber` required
- [x] `integrations/standardbank/client.js` — removed `PROXY_GET` scope and `proxy` base URL from `getBaseUrls()`
- [x] `services/standardbankRppService.js` — removed `creditorProxy` param; added `creditorBankBranchCode`; guard on missing `creditorAccountNumber`
- [x] `services/standardbankRtpService.js` — removed `payerMobileNumber`/`payerProxy` params; guard on missing `payerAccountNumber`; removed debug console.log statements
- [x] `routes/standardbank.js` — removed `creditorPhone` and `payerMobileNumber` fields; both RPP and RTP now require account number
- [x] `controllers/standardbankController.js` — removed `creditorPhone`/`payerMobileNumber` extraction; removed proxy fallback logic

---

## Files Modified

| File | Change |
|------|--------|
| `integrations/standardbank/builders/pain001Builder.js` | PBAC only, no PBPX branch |
| `integrations/standardbank/builders/pain013Builder.js` | Direct account DbtrAcct, no Prxy block |
| `integrations/standardbank/client.js` | Removed PROXY_GET scope and proxy URL |
| `services/standardbankRppService.js` | Removed creditorProxy, added creditorBankBranchCode |
| `services/standardbankRtpService.js` | Removed payerMobileNumber/payerProxy |
| `routes/standardbank.js` | Account number required for both RPP and RTP |
| `controllers/standardbankController.js` | Removed proxy fallback logic |

---

## API Contract (After This Change)

### RPP — POST /api/v1/standardbank/payshap/rpp
```json
{
  "amount": 10.00,
  "currency": "ZAR",
  "creditorAccountNumber": "000602739172",
  "creditorBankBranchCode": "051001",
  "creditorName": "John Doe",
  "description": "Payment for services"
}
```

### RTP — POST /api/v1/standardbank/payshap/rtp
```json
{
  "amount": 10.00,
  "currency": "ZAR",
  "payerName": "John Doe",
  "payerAccountNumber": "000602739172",
  "payerBankCode": "051001",
  "payerBankName": "Standard Bank",
  "description": "Request for payment"
}
```

---

## Key Decisions

1. **No proxy at all** — MMTP will always use bank account + branch code. No proxy lookup, no mobile number.
2. **DbtrAgt still uses 'bankc' in UAT** — SBSA sandbox requires this placeholder for the debtor agent. In production, use the actual branch code.
3. **`calculateProxyValidationFee()` left in payshapFeeService.js** — exported but never called. Harmless; can be removed in a future cleanup pass.
4. **`proxyResolutionClient.js` left in place** — not imported anywhere in the active flow; can be deleted in a future cleanup pass.

---

## Test Commands (Codespaces)

### RPP (after git pull + server restart):
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "0825571055", "password": "Andre123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") \
&& curl -s -X POST http://localhost:3001/api/v1/standardbank/payshap/rpp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1,
    "currency": "ZAR",
    "creditorAccountNumber": "000602739172",
    "creditorBankBranchCode": "051001",
    "creditorName": "Test Beneficiary",
    "description": "UAT RPP test PBAC"
  }' | python3 -m json.tool
```

### RTP (after git pull + server restart):
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "0825571055", "password": "Andre123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") \
&& curl -s -X POST http://localhost:3001/api/v1/standardbank/payshap/rtp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "currency": "ZAR",
    "payerName": "Test Payer",
    "payerAccountNumber": "000602739173",
    "payerBankCode": "051001",
    "payerBankName": "Standard Bank",
    "description": "UAT RTP test PBAC"
  }' | python3 -m json.tool
```

---

## Known Issues / Next Steps

- **RTP EPRBA** (`Bank account does not support payment requests`): SBSA sandbox accounts `000602739172-000602739178` are provisioned as MMTP creditor accounts, not as RTP debtor accounts. SBSA needs to provision a valid RTP debtor account for UAT testing. Contact SBSA support with reference to `EPRBA` error.
- **`proxyResolutionClient.js`** can be deleted in a future cleanup.
- **`calculateProxyValidationFee()`** in `payshapFeeService.js` can be removed in a future cleanup.

---

## Commit

`ff3e35e7` — `feat(payshap): remove proxy entirely — PBAC (bank account) only for RPP and RTP`
