# Session Log: PayShap RTP EAMTI Fix — Both RPP and RTP Passing UAT

**Date**: 2026-02-24  
**Time**: 11:00  
**Agent**: Claude Sonnet 4.5  
**Session Type**: Bug Fix / UAT Testing  

---

## Summary

Both PayShap RPP (outbound payment) and RTP (request to pay) are now fully passing end-to-end against Standard Bank's UAT environment. This session resolved a persistent `EAMTI: Invalid amount` error on RTP that required iterative debugging of the Pain.013 payload structure.

---

## Final Working API Shape

### RPP — POST /api/v1/standardbank/payshap/rpp
```json
{
  "amount": 1,
  "currency": "ZAR",
  "creditorAccountNumber": "000602739172",
  "creditorBankBranchCode": "051001",
  "creditorName": "Test Beneficiary",
  "description": "Payment description"
}
```
Response: `{ "success": true, "data": { "status": "initiated", "amount": 1, "fee": 6.75, "totalDebit": 7.75 } }`

### RTP — POST /api/v1/standardbank/payshap/rtp
```json
{
  "amount": 10,
  "currency": "ZAR",
  "payerName": "Sample",
  "payerMobileNumber": "+27585125485",
  "payerBankName": "Standard Bank",
  "description": "Request description"
}
```
Response: `{ "success": true, "data": { "status": "initiated", "amount": 10, "fee": 5.75, "netCredit": 4.25 } }`

---

## Key Findings (Pain.013 RTP Payload)

1. **DbtrAcct.Id.Item.Id = "Proxy" is mandatory** — SBSA schema enforces `Item` as required discriminator. Cannot use `Othr.Id` directly.
2. **SBSA RTP only supports MOBILE_NUMBER proxy for debtors** — no PBAC (direct account) for RTP debtors. RPP creditors use PBAC.
3. **Amt.Item.Value must be a string** — `"10.00"` not `10`. No `Ccy` inside `Item`.
4. **DuePyblAmt must be less than Amt** — SBSA validates `DuePyblAmt < Amt`. Sending equal values causes `EAMTI`. DuePyblAmt = principal - SBSA fee (net credit to wallet).
5. **SplmtryData is required** at top level of Pain.013.
6. **DbtrAgt.FinInstnId.Othr.Id = "bankc"** in UAT (SBSA sandbox placeholder for debtor bank).

---

## Bugs Fixed This Session

| Error | Cause | Fix |
|-------|-------|-----|
| `EAMTI` (first) | `DuePyblAmt == Amt` (equal values) | Pass `netCredit` (principal - fee) as `DuePyblAmt` |
| `EAMTI` (second) | `Ccy` field inside `Amt.Item` wrapper | Remove `Ccy` — `Item` only accepts `Value` |
| `EAMTI` (third) | Used `InstdAmt` instead of `Item` | Revert to `Amt.Item.Value` per Postman sample |
| `400 Item required` | Used `Othr.Id` for `DbtrAcct` | Must use `Id.Item.Id = "Proxy"` |
| `500 empty body` | `ACCOUNT_NUMBER` proxy scheme unknown to SBSA | Use `MOBILE_NUMBER` scheme only |
| `EPRBA` | Used sandbox account as RTP debtor | SBSA accounts are creditor-only; use mobile proxy |
| `EPDNF` | Generic mobile not in SBSA proxy directory | Use SBSA-provided test mobile `+27585125485` |

---

## Final Pain.013 DbtrAcct Structure
```json
"DbtrAcct": {
  "Id": { "Item": { "Id": "Proxy" } },
  "Nm": "Sample",
  "Prxy": {
    "Tp": { "Item": "MOBILE_NUMBER" },
    "Id": "+27-585125485"
  }
}
```

## Final Pain.013 Amt Structure
```json
"Amt": {
  "Item": { "Value": "10.00" }
}
```

## Final Pain.013 DuePyblAmt Structure
```json
"DuePyblAmt": { "Value": "4.25" }
```
(= principal R10 - SBSA fee R5.75 = net credit R4.25)

---

## Files Modified This Session

| File | Change |
|------|--------|
| `integrations/standardbank/builders/pain013Builder.js` | Multiple fixes: DbtrAcct structure, Amt.Item.Value, DuePyblAmt = netAmount, mobile normalisation restored |
| `services/standardbankRtpService.js` | Pass `netCredit` as `netAmount` to builder; restored `payerMobileNumber` param |
| `routes/standardbank.js` | RTP requires `payerMobileNumber` (not `payerAccountNumber`) |
| `controllers/standardbankController.js` | RTP uses `payerMobileNumber` |

---

## UAT Test Results

| Test | Result | Notes |
|------|--------|-------|
| RPP (send R1 to account 000602739172) | ✅ PASS | `status: initiated`, 202, ~7s |
| RTP (request R10 from +27585125485) | ✅ PASS | `status: initiated`, 202, ~3s |

---

## Next Steps

- Monitor for RTP callbacks (ACSP = paid) — wallet credit on callback not yet tested in UAT
- Consider requesting SBSA to provision additional test mobile numbers for RTP
- Production readiness: replace `bankc` DbtrAgt with real bank branch codes
- Remove `proxyResolutionClient.js` (unused) in cleanup pass

---

## Commits This Session

- `61fb5fe9` — RTP Amt.Item.Value number not string
- `3027df1d` — Add Ccy + debug logging
- `dd0cad2d` — DbtrAcct Othr.Id attempt
- `4db97438` — DbtrAcct Item.Id=Proxy + ACCOUNT_NUMBER
- `4189c806` — Restore mobile number, MOBILE_NUMBER scheme
- `5bb36713` — Amt InstdAmt attempt
- `1d3e5a70` — Amt.Item.Value string, no Ccy
- `0bb75a90` — DuePyblAmt = netCredit (FINAL FIX)
