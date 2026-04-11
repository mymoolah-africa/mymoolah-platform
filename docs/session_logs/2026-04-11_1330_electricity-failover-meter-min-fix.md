# Session Log - 2026-04-11 - Electricity Purchase Failover & METER_MIN_AMOUNT Fix

**Session Date**: 2026-04-11 13:30  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~45 minutes

---

## Session Summary
Investigated production electricity purchase failures for user 0720213994 (The Jade 91, meter 04285639987). Root cause: MobileMart prevend returns `minimumPurchaseAmount` of R339.26 (meter has outstanding debt/arrears set by City of Cape Town). Failover to Flash never triggered because no Flash electricity ProductVariant exists in the DB. Additionally, error messages were swallowed by a frontend apiClient bug affecting ALL overlays. Fixed all three issues.

---

## Tasks Completed
- [x] Diagnosed production electricity purchase failures via Cloud Run logs + DB queries
- [x] Identified root cause: METER_MIN_AMOUNT (R339.26 minimum) + no Flash fallback + swallowed error messages
- [x] Fixed apiClient.ts to match axios-style `err.response.data` convention (affects all overlays)
- [x] Added METER_MIN_AMOUNT-specific error handling in ElectricityOverlay
- [x] Added synthetic Flash candidate injection for env-var fallback electricity purchases
- [x] Extended `executeWithFailover` to accept `additionalCandidates` parameter
- [x] Built frontend, verified zero linter errors, committed and pushed

---

## Key Decisions
- **Fix at apiClient level, not per-overlay**: The `err.response = data` (line 52) was changed to `err.response = { data, status, statusText }` to match axios convention. This fixes error message display across ALL overlays (electricity, airtime, data, bills, beneficiary modals) in one change.
- **Synthetic candidate injection over DB seeding**: Rather than requiring a Flash electricity ProductVariant in the DB (which would need catalog sync support), synthetic candidates are injected into the failover engine when both suppliers are enabled but no DB variant exists. This is the same pattern as the existing env-var fallback.

---

## Files Modified
- `mymoolah-wallet-frontend/services/apiClient.ts` — Fixed err.response to wrap body in {data, status, statusText} for axios-style compatibility
- `mymoolah-wallet-frontend/components/overlays/ElectricityOverlay.tsx` — Added METER_MIN_AMOUNT error handling with "Minimum Amount Required" title
- `routes/overlayServices.js` — Added synthetic Flash candidate when no ProductVariant and both suppliers enabled
- `services/supplierFailoverService.js` — Extended executeWithFailover to accept additionalCandidates parameter

---

## Code Changes Summary
- **apiClient.ts**: `(error as any).response = data` → `(error as any).response = { data, status, statusText }` — fixes ALL error handlers across the app that use `err.response?.data?.message`
- **ElectricityOverlay.tsx**: New `isMeterMin` branch shows "Minimum Amount Required" with the actual meter minimum from MobileMart prevend
- **overlayServices.js**: When `!productVariant && useMobileMartAPI && useFlashAPI`, builds synthetic Flash variant with `id: -1` and adds to `additionalCandidates`
- **supplierFailoverService.js**: `executeWithFailover` accepts `additionalCandidates = []`, appends them after DB alternatives with dedup + circuit check

---

## Issues Encountered
- **ECONNRESET on production proxy**: Stale Cloud SQL Auth Proxies — fixed with standard `kill + ensure-proxies-running.sh`
- **Table name mismatch**: `product_availability_issues` doesn't exist; actual table is `product_availability_logs` with camelCase columns
- **Column name mismatches**: Several queries needed schema discovery before correct queries

---

## Testing Performed
- [x] Frontend build succeeds (npm run build)
- [x] Linter check — zero errors
- [ ] Production testing after deploy — pending (André to deploy and test)

---

## Next Steps
- [ ] Deploy to production (Cloud Run) and verify the fix works for user 0720213994
- [ ] User 0720213994 should be informed the meter has a R339.26 minimum (likely outstanding debt)
- [ ] Consider adding a Flash electricity ProductVariant to the DB for proper failover via catalog
- [ ] Monitor `product_availability_logs` after deploy to verify Flash failover attempts

---

## Important Context for Next Agent
- **The meter minimum (R339.26) is a municipality-imposed constraint** — MyMoolah cannot override it. The user needs to either pay the minimum or contact City of Cape Town about meter debt.
- **Only ONE electricity ProductVariant exists in production** (MobileMart id=2652). No Flash electricity variant. The synthetic candidate injection is a stopgap — proper fix is adding Flash electricity to the catalog.
- **The apiClient fix is critical** — `err.response.data` was broken for ALL overlays. This single-line change fixes error message display everywhere. Previously, users always saw generic fallback messages instead of actionable error details.
- **`beneficiary.metadata` is null for all electricity beneficiaries** — the electricity handler uses `beneficiary.identifier` for meter number and defaults `meterType` to 'ESKOM' for Flash. The `BeneficiaryServiceAccount` has the correct `meterType` ('City of Cape Town') but the purchase handler doesn't read it.

---

## Questions/Unresolved Items
- Should we add a Flash electricity ProductVariant to the catalog via migration?
- Should the electricity purchase handler read `BeneficiaryServiceAccount.serviceData.meterType` instead of relying on null `beneficiary.metadata.meterType`?
- For this specific user: is the R339.26 minimum a permanent change or temporary meter debt?

---

## Related Documentation
- `docs/AGENT_HANDOVER.md` — updated with this session
- `services/supplierFailoverService.js` — failover engine with additionalCandidates
- `services/vasSupplierExecutor.js` — MobileMart + Flash electricity handlers
