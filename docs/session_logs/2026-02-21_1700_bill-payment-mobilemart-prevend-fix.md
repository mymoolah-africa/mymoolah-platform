# Session Log - 2026-02-21 - Bill Payment MobileMart Prevend Fix

**Session Date**: 2026-02-21 17:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~30 min

---

## Session Summary
Fixed "MobileMart prevend did not return transactionId" error when paying bills. Root cause: v2 API endpoints were constructed with wrong base URL (resulting in .../v1/v2/... path), causing Fulcrum SPA HTML to be returned instead of JSON. Also fixed product matching bug where PEP beneficiary was incorrectly matched to Ekurhuleni West College (products[0] fallback).

---

## Tasks Completed
- [x] Fix MobileMart v2 URL construction in mobilemartAuthService.js
- [x] Improve bill product matching - avoid wrong product fallback (products[0])
- [x] Add HTML response detection for clearer error messages

---

## Key Decisions
- **v2 URL**: Use baseUrl (not apiUrl) for endpoints starting with /v2. apiUrl = baseUrl/v1, so /v2/bill-payment/prevend was incorrectly becoming .../v1/v2/bill-payment/prevend.
- **Product matching**: Never use products[0] as fallback - causes wrong biller (e.g. Ekurhuleni for PEP). Added fuzzy match (first word, short name) and throw clear error when no match.
- **Flash vs MobileMart**: PEP may be a Flash biller; if MobileMart has no matching product, error now suggests "check if this biller is supported by Flash instead".

---

## Files Modified
- `services/mobilemartAuthService.js` - v2 endpoint URL construction (use baseUrl for /v2 paths)
- `routes/overlayServices.js` - Bill product matching logic, HTML response detection

---

## Code Changes Summary
- mobilemartAuthService: `makeAuthenticatedRequest` now uses `baseUrl` when endpoint starts with `/v2`, otherwise `apiUrl` (v1/v2 have different base paths).
- overlayServices: `matchProduct` helper with fuzzy match (first word, short name); no products[0] fallback; throw descriptive error when no match; detect HTML response from prevend.

---

## Issues Encountered
- **Prevend returned HTML**: Wrong URL was returning Fulcrum SPA HTML instead of JSON. Fixed by URL construction.
- **Product mismatch**: PEP beneficiary (1234567890) was matched to Ekurhuleni West College (products[0]) because "Pepkor Trading (Pty) Ltd" didn't exactly match any product. Fixed by fuzzy match and removing fallback.

---

## Testing Performed
- [ ] Unit tests written/updated
- [ ] Integration tests run
- [ ] Manual testing: User to retry bill payment in Codespaces after pull
- [ ] Test results: Pending user verification

---

## Next Steps
- [ ] User retry bill payment (DSTV, Pay@, or PEP) in Codespaces after git pull
- [ ] If PEP still fails, verify ProductVariant for Pepkor - may be Flash-only biller
- [ ] Consider adding Flash bill payment path when MobileMart has no match

---

## Important Context for Next Agent
- MobileMart bill payment: Products at /v1/bill-payment/products, prevend at /v2/bill-payment/prevend, pay at /v2/bill-payment/pay. v2 uses baseUrl, v1 uses apiUrl.
- UAT test billers: DSTV (135609708, 135520754), Pay@ Oudtshoorn (11347901450000300), PEP (1234567890 placeholder).
- Ekurhuleni West College is a MobileMart product (education); not PEP. PEP is retail.

---

## Questions/Unresolved Items
- Is PEP (Pepkor) a Flash-only biller? If so, routing may need to prefer Flash when ProductVariant indicates Flash.

---

## Related Documentation
- integrations/mobilemart/MOBILEMART_UAT_TEST_NUMBERS.md
- integrations/mobilemart/MOBILEMART_UAT_STATUS.md
- integrations/mobilemart/MOBILEMART_ENDPOINT_PATHS_FINAL.md
