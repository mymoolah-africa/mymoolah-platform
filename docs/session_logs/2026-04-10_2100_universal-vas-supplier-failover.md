# Session Log - 2026-04-10 - Universal VAS Supplier Failover

**Session Date**: 2026-04-10 21:00  
**Agent**: Cursor AI Agent (Opus 4.6)  
**User**: André  
**Continuation of**: [EasyPay V5 finalisation](a31f2d51-d5ad-4748-8134-b45f4338ab62) — this session pivoted from EasyPay to investigating a production electricity failure and implementing universal supplier failover.

---

## Session Summary

Investigated why a R20 and R50 electricity purchase failed for user `0720213994` in production. The R20 was correctly blocked by MMTP's MobileMart minimum (R30). The R50 failed with MobileMart `fulcrumErrorCode: 1001` (AmountInvalid) — an upstream utility provider rejection, not an MMTP issue. Critically, Flash was never tried as a failover because the electricity handler used a mutually exclusive `if (MOBILEMART) {} else if (FLASH) {}` pattern with no post-failure crossover. This led to a comprehensive implementation of universal supplier failover across ALL VAS purchase handlers (electricity, bills, airtime/data) and ALL current/future suppliers.

---

## Tasks Completed

- [x] **Production log analysis** — diagnosed R20 (MMTP validation `AMOUNT_TOO_LOW`) and R50 (MobileMart `fulcrumErrorCode: 1001` upstream rejection) failures
- [x] **Root cause identification** — discovered electricity handler had zero post-failure failover; bills handler had single-supplier (MobileMart only); airtime handler only triggered failover on Error 1002
- [x] **Created `services/vasSupplierExecutor.js`** — registry-based dispatcher mapping `(supplierCode, vasType)` to supplier-specific API handlers. Registered: MobileMart electricity, Flash electricity, MobileMart bill payment, MobileMart airtime/data
- [x] **Rewrote electricity handler** — replaced mutually exclusive if/else with `executeWithFailover()`. If MobileMart fails for ANY reason, Flash is tried automatically (and vice versa)
- [x] **Rewrote bills handler** — wired through `executeWithFailover()` instead of single-supplier try/catch
- [x] **Enhanced airtime/data handler** — broadened failover from Error 1002 only to ALL non-terminal errors; Flash failover now checks all enabled suppliers (not just MobileMart)
- [x] **Added circuit breaker recording** — `recordSuccess`/`recordFailure` calls added to airtime handler (were completely missing before — CB state was never updating from overlay routes)
- [x] **Removed early min-amount block** — supplier-specific R30 minimum was preventing failover to Flash (R10 min) for R20 amounts; global R10 minimum now applies, failover handles the rest
- [x] **Enhanced `supplierFailoverService.js`** — now checks `_LIVE_INTEGRATION` env vars before including suppliers as failover candidates

---

## Key Decisions

- **Registry pattern over inline code**: Created `vasSupplierExecutor.js` with `executor.register(supplierCode, vasType, handler)`. Adding a new supplier (e.g., "SUPPLIER_X" for electricity) requires one function registration — zero route changes. Future-proof.
- **All errors trigger failover (except terminal)**: Only Error 1013 (invalid mobile number) is considered terminal for airtime. All other errors — including 1001 (AmountInvalid), 1002 (CannotSourceProduct), timeouts, 5xx — trigger failover to alternative suppliers. Rationale: the same product/amount may succeed with a different supplier's upstream provider.
- **Removed supplier-specific min-amount early return**: The R30 MobileMart minimum was validated *before* the failover engine ran, meaning R20 amounts could never reach Flash (R10 min). Now the global R10 floor is the only early guard. If MobileMart rejects R20, the failover engine tries Flash.
- **Circuit breaker recording added to overlay routes**: The overlay routes were calling supplier APIs but never recording success/failure with the circuit breaker singleton. This meant the CB state was effectively dead — always CLOSED. Now both airtime MobileMart and Flash paths record outcomes.
- **Airtime handler not fully rewritten**: The airtime handler is ~1,200 lines with complex inline logic (international airtime, eeziToken, pinless paths, mobile number normalization). Full rewrite to `executeWithFailover()` was assessed as too risky for a single session. Instead, the existing inline failover was enhanced to cover all error codes and all suppliers. Tech debt: refactor airtime to use `vasSupplierExecutor` like electricity/bills.

---

## Files Modified

- `services/vasSupplierExecutor.js` — **NEW** — Registry-based VAS purchase dispatcher. Handlers for: MOBILEMART/electricity, FLASH/electricity, MOBILEMART/bill_payment, MOBILEMART/airtime, MOBILEMART/data
- `routes/overlayServices.js` — **MAJOR** — Electricity handler rewritten to use `executeWithFailover()` via `vasSupplierExecutor`; Bills handler rewritten similarly; Airtime handler enhanced with all-error failover + CB recording; removed supplier-specific min-amount early return for electricity
- `services/supplierFailoverService.js` — Enhanced `executeWithFailover()` to check `_LIVE_INTEGRATION` env vars before including suppliers as candidates

---

## Code Changes Summary

### Architecture: Before vs After

| VAS Type | Before | After |
|----------|--------|-------|
| **Electricity** | Mutually exclusive `if (MM) {} else if (FLASH) {}` — zero post-failure failover | `executeWithFailover()` via `vasSupplierExecutor` — tries all enabled suppliers |
| **Bills** | Single-supplier (MobileMart only) — immediate error return | `executeWithFailover()` via `vasSupplierExecutor` — tries all enabled suppliers |
| **Airtime/data** | Failover only on Error 1002; Flash→MM only if `productVariant` exists | Failover on ALL non-terminal errors; checks all enabled suppliers |
| **Circuit breaker** | Never recorded from overlay routes | `recordSuccess`/`recordFailure` on every API call |

### `vasSupplierExecutor.js` — Adding a new supplier

```javascript
const executor = require('./vasSupplierExecutor');
executor.register('NEW_SUPPLIER', 'electricity', async (variant, opts) => {
  // Call NEW_SUPPLIER API with opts.meterNumber, opts.amount
  return { token, supplierTransactionId, supplierResponse, supplier: 'NEW_SUPPLIER' };
});
// Set NEW_SUPPLIER_LIVE_INTEGRATION=true in env
// Done — failover engine will automatically include it
```

---

## Issues Encountered

- **R50 electricity `fulcrumErrorCode: 1001`**: Not an MMTP bug. The specific meter's upstream utility provider (via MobileMart's Fulcrum gateway) rejected R50 as an invalid amount. Common causes: municipality-specific denominations, debt recovery deductions, tariff restrictions. Flash may succeed for the same meter/amount via a different upstream route.
- **Circuit breaker was never updating**: The `supplierCircuitBreaker` singleton was imported and checked (`isOpen`) in overlay routes, but `recordSuccess`/`recordFailure` were never called. The CB was always in CLOSED state regardless of actual API outcomes. Fixed.
- **Supplier min-amount blocked failover**: MobileMart R30 minimum was validated as an early return *before* the failover engine. R20 amounts were rejected without ever trying Flash (R10 min). Fixed by removing the early return and letting the failover engine handle it.

---

## Testing Performed

- [x] JavaScript syntax validation — all 3 files pass `node -c`
- [x] Zero linter errors
- [ ] Codespaces integration test — pending André's test run
- [ ] Production validation — pending

---

## Next Steps

- [ ] André: test in Codespaces (`git pull && ./scripts/one-click-restart-and-start.sh`)
- [ ] André: test electricity R50, R20, R30 purchases to verify failover behaviour
- [ ] André: test airtime purchase with known-failing MobileMart products
- [ ] Future: refactor airtime handler to use `vasSupplierExecutor` + `executeWithFailover()` (tech debt — currently enhanced inline)
- [ ] Future: register Flash airtime/data handlers in `vasSupplierExecutor` (currently only MobileMart registered for airtime)

---

## Important Context for Next Agent

1. **`vasSupplierExecutor.js` is the new canonical way to add supplier integrations.** Register a handler for `(supplierCode, vasType)` and the failover engine picks it up automatically. The electricity and bills handlers already use it. Airtime still uses inline logic (tech debt).

2. **`supplierFailoverService.executeWithFailover()`** is the failover engine. It takes a `purchaseFn`, builds a candidate list from the DB (ProductVariant + Supplier), checks circuit breaker state and env vars, and tries candidates in commission-descending order.

3. **Circuit breaker now works end-to-end** for all VAS types. Transient errors (5xx, timeout, ECONNRESET) count toward the failure threshold. Business errors (4xx) do NOT trip the circuit but DO trigger failover to the next supplier.

4. **The airtime handler's inline failover was broadened, not rewritten.** It still has the 1002-specific `SupplierComparisonService.compareProducts` path plus the Flash→MobileMart path. Both now trigger on all non-terminal errors. Full refactor to `vasSupplierExecutor` is recommended for a future session.

5. **No migrations needed** — this is pure code logic.

---

## Related Documentation

- `services/vasSupplierExecutor.js` — new service
- `services/supplierFailoverService.js` — enhanced
- `services/supplierCircuitBreaker.js` — unchanged (existing singleton)
- `docs/DEVELOPMENT_GUIDE.md` — MobileMart error codes reference
- `docs/session_logs/2026-04-05_1800_electricity-supplier-comparison.md` — previous electricity failover work
- Tech debt: `.cursor/rules/tech-debt.mdc` — airtime handler inline failover noted
