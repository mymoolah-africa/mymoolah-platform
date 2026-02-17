# VAS Best Offers - Pre-Computed Catalog Implementation

**Date**: 2026-02-18  
**Status**: ✅ Implemented  
**Banking-Grade**: Atomic refresh, audit trail, catalog versioning

---

## Overview

Pre-computed best-offer table that stores **ONE product per (vasType, provider, denomination)** — the variant with **highest commission**. Simplifies backend processing and UX.

### Benefits

- **Backend**: Single table read, no runtime comparison logic
- **UX**: One product per denomination (no supplier choice)
- **Performance**: Fast lookups, easy caching
- **Requirement**: Only highest-commission product offered when duplicates exist

---

## Tables

### `vas_best_offers`

| Column | Type | Description |
|--------|------|-------------|
| vas_type | VARCHAR(32) | airtime, data, voucher |
| provider | VARCHAR(100) | Vodacom, MTN, CellC, Telkom, Global |
| denomination_cents | INT | Amount in cents |
| product_variant_id | INT | FK to product_variants (the winner) |
| supplier_code | VARCHAR(50) | FLASH, MOBILEMART |
| product_name | VARCHAR(255) | Denormalized for fast reads |
| commission | DECIMAL(5,2) | Denormalized |
| catalog_version | BIGINT | For cache invalidation |

**Unique constraint**: (vas_type, provider, denomination_cents)

### `catalog_refresh_audit`

| Column | Type | Description |
|--------|------|-------------|
| refreshed_at | TIMESTAMP | When refresh ran |
| refreshed_by | VARCHAR(64) | Job/service name |
| rows_affected | INT | Rows inserted |
| catalog_version | BIGINT | Version after refresh |

---

## Migration

```bash
npx sequelize-cli db:migrate
```

Migration file: `migrations/20260218_create_vas_best_offers.js`

---

## Refresh Script

**Manual run** (after catalog sync):

```bash
node scripts/refresh-vas-best-offers.js
```

**Automatic**: Runs after daily catalog sweep (2:00 AM SAST).

**API** (admin only):

```bash
POST /api/v1/catalog-sync/refresh-best-offers
Authorization: Bearer <admin_jwt>
```

---

## API Behavior

`GET /api/v1/suppliers/compare/:vasType` (and `/best-deals/:vasType`):

### UAT (NODE_ENV=development)

- **bestDeals**: ALL products from all suppliers (MobileMart, Flash, etc.)
- No highest-commission filter — full catalog for testing
- Uses UAT API credentials; all test products visible

### Staging / Production (NODE_ENV=production or STAGING=true)

1. **If** `vas_best_offers` has data for vasType → returns products from pre-computed table (one per denomination, highest commission)
2. **Else** → falls back to runtime comparison with `findBestDeals` (best only)

Response shape unchanged: `bestDeals` array. Frontend requires no changes.

---

## Workflow

```
[Flash/MobileMart Sync] → product_variants
         ↓
[Refresh Job] → vas_best_offers (TRUNCATE + INSERT, atomic)
         ↓
[API Request] → BestOfferService.getBestOffers()
         ↓
[Response] → bestDeals (one per denomination)
```

---

## Restart Requirements

- **Backend**: Restart after migration to load new tables
- **No frontend changes**: AirtimeDataOverlay already uses bestDeals only

---

## Verification

1. Run migration
2. Run refresh: `node scripts/refresh-vas-best-offers.js`
3. Call `GET /api/v1/suppliers/compare/airtime` — should return bestDeals from vas_best_offers
4. Check `catalog_refresh_audit` for audit trail
