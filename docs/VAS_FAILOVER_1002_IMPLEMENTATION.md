# VAS Error 1002 Exhaustive Failover

**Date**: 2026-02-12  
**Status**: ✅ Implemented  
**Banking-Grade**: Audit trail, attempt cap, receipt accuracy

---

## Overview

When the highest-commission supplier returns **Error 1002** ("Cannot source product"), the system automatically tries all alternative suppliers in commission order. The user only sees "unavailable" when **every** supplier has failed with 1002.

### Environment Control

| Environment | Config | Behavior |
|-------------|--------|----------|
| **UAT** | `VAS_FAILOVER_ENABLED=false` in `.env.codespaces` | Bypass failover; fail on first 1002 (for testing) |
| **Staging / Production** | `VAS_FAILOVER_ENABLED` from GCS Secret Manager (default: true) | Exhaustive failover enabled |

---

## Flow

1. User selects product (highest commission from bestDeals).
2. Primary supplier (e.g. MobileMart) returns 1002.
3. **If** `VAS_FAILOVER_ENABLED !== 'false'`:
   - Fetch alternatives from `SupplierComparisonService.compareProducts()` (commission order).
   - Try each alternative (Flash, MobileMart) up to **3 attempts**.
   - On first success: continue to transaction creation with actual supplier.
   - On all 1002: return `PRODUCT_UNAVAILABLE_ALL_SUPPLIERS`.
4. **If** `VAS_FAILOVER_ENABLED=false`: return error immediately (no failover).

---

## Safeguards

| Requirement | Implementation |
|-------------|----------------|
| **Attempt cap** | `MAX_FAILOVER_ATTEMPTS = 3` |
| **Audit trail** | `productAvailabilityLogger.logAvailabilityIssue()` for each attempt |
| **Receipt accuracy** | VasTransaction metadata stores `flashResponse` or `mobilemartResponse` (actual supplier) |
| **Idempotency** | Same idempotency key used across all attempts |
| **Rollback** | Transaction only rolled back when returning error; preserved when failover succeeds |

---

## Files

- `routes/overlayServices.js` – Failover logic in MobileMart catch block
- `.env.codespaces` – `VAS_FAILOVER_ENABLED=false` (UAT mask)
- GCS Secret Manager (Staging/Production) – `VAS_FAILOVER_ENABLED=true`

---

## GCS Secret (Staging/Production)

**Secret name**: `vas-failover-enabled`  
**Value**: `true`

Created by `scripts/setup-secrets-staging.sh` or manually:

```bash
echo -n "true" | gcloud secrets create vas-failover-enabled \
  --project=mymoolah-db --data-file=- --replication-policy="automatic"
```

**Deploy scripts** (already configured):
- `scripts/deploy-cloud-run-staging.sh` — includes `VAS_FAILOVER_ENABLED=vas-failover-enabled:latest`
- `scripts/build-push-deploy-production.sh` — includes `VAS_FAILOVER_ENABLED=vas-failover-enabled:latest`
