# Session Log: Voucher Overlay Overhaul

**Date**: 2026-03-31 23:59 → 2026-04-01 00:40
**Duration**: ~2 hours
**Agent**: Claude 4.6 Opus (Thinking)

---

## Summary

Full audit and overhaul of the digital voucher overlay system — the last overlay to fix before production user launch. Four commits covering: (1) backend catalog route with commission-based dedup, (2) brand-level product grouping to eliminate raw supplier names, (3) recipient/send-to-self removal from purchase modal, (4) real PNG brand logos for 1Voucher, Betway, Hollywood Bets, and OTT Voucher. Also identified and registered inline purchase logic in airtime/electricity/biller overlays as architectural tech debt (~1,200 lines, ~9-13 hours to refactor).

---

## Tasks Completed

### 1. Backend — Voucher Catalog Route (overlayServices.js)
- Added `GET /api/v1/overlay/vouchers/catalog` route
- Initial version used name-based dedup (commit 1), then replaced with `VOUCHER_BRAND_TABLE` — a 40-entry brand recognition table that maps raw supplier names to canonical brands (commit 2)
- "100 diamonds", "1080 diamonds", "530 diamonds" all map to "Free Fire" (one card)
- "60 UC", "300 + 25 UC", "1500 + 300 UC" all map to "PUBG Mobile" (one card)
- "$10 Credit", "$30 Credit" map to "Apple Credit" (one card)
- Unrecognised products excluded from catalog (no more garbage names)
- Per-brand: picks the supplier with highest commission (Flash tiebreak), then collapses that supplier's variants into one card
- Variable-value products show free-text input; fixed-denomination show picker buttons
- Supports `?q=` search and `?category=` filter
- Returns `{ vouchers, categories, total }`

### 2. Sync Script — --vouchers-only Flag (sync-mobilemart-products.js)
- Added `--vouchers-only` flag alongside existing `--billers-only`
- Updated CLI help text and argument parsing

### 3. Daily Cron Audit
- Verified `catalogSynchronizationService.js` already includes `'voucher'` in VAS_TYPES
- Verified `deactivateStaleProducts()` runs after each sweep
- No changes needed

### 4. Frontend — apiService.ts Simplification
- Replaced 220-line `getVouchers()` with 15-line version calling new overlay route
- Removed dead helper methods: `mapCategory()`, `getVoucherIcon()`, `generateVoucherDenominations()`
- Net reduction: ~300 lines

### 5. Frontend — All 4 Overlay Components Rebuilt
- **DigitalVouchersOverlay.tsx**: 398 → ~185 lines. Fixed favorites/featured conflation. Stale favorites pruned on load.
- **ProductDetailModal.tsx**: 863 → ~250 lines. Removed recipient/send-to-self entirely. Shows real backend errors. Added brand logo support.
- **VoucherCard.tsx**: Rebuilt with brand logo support (PNG logos for 1Voucher, Betway, Hollywood Bets, OTT; emoji fallback). Price range display.
- **VoucherSearch.tsx**: 106 → 45 lines. Removed "Popular:" suggestions (bad UX). Fixed dual-state bug.

### 6. Recipient / Send-to-Self Removed
- Entire recipient section removed from purchase modal
- User receives voucher code on success, copies it, and can WhatsApp to anyone
- Matches UX pattern of other purchase modals
- Removed ~140 lines including phone validation, MMWallet verification, recipient state

### 7. Real Brand Logos
- Added PNG brand assets: `1voucher-logo.png`, `betway-logo.png`, `hollywood-logo.png`, `ott-logo.png`
- Imported via Vite modules (same pattern as Vodacom in NetworkIcons.tsx)
- VoucherCard: 36px height, 72px max width, 6px border radius
- ProductDetailModal: 44px height, 120px max width, 8px border radius
- `object-fit: contain` ensures logos aren't distorted regardless of source aspect ratio

### 8. Legacy Cleanup + Tech Debt
- Deleted 4 files from `components/digital-vouchers/` (legacy duplicate)
- Registered "Airtime/Electricity/Biller purchase logic inline in route handler (~1,200 lines)" as tech debt
- Documented architectural decision: voucher overlay uses `productPurchaseService` (banking-grade pattern)

---

## Commits (4)

| Commit | Description |
|--------|------------|
| `09db622d` | feat: voucher overlay overhaul — backend catalog route, frontend rebuild, commission dedup |
| `c2536c80` | fix: voucher catalog — brand-level grouping, remove popular suggestions, fix stale favorites |
| `a18f25dd` | fix: remove recipient/send-to-self from voucher purchase modal |
| `92c82fb9` | feat: add real brand logos for 1Voucher, Betway, Hollywood Bets, OTT Voucher |

---

## Key Decisions

| Decision | Reason |
|----------|--------|
| Keep purchase on `productPurchaseService.js` | Banking-grade: ACID transactions, idempotency, circuit breaker. Inline pattern in other overlays is tech debt. |
| Brand recognition table (not name dedup) | Raw supplier names like "100 diamonds" can't be deduped by cleaned name — need pattern matching to canonical brand |
| Remove recipient/send-to-self | User copies voucher code and WhatsApp/shares manually. Simpler UX, matches other modals. |
| Real PNG logos via Vite imports | Emoji icons are generic; real brand logos are professional. Same pattern as Vodacom logo. |
| Exclude unrecognised products | Products not matching any brand pattern are garbage data — better to exclude than show raw names |

---

## Files Modified

| File | Action |
|------|--------|
| `routes/overlayServices.js` | Added voucher catalog route + VOUCHER_BRAND_TABLE |
| `scripts/sync-mobilemart-products.js` | Added --vouchers-only flag |
| `mymoolah-wallet-frontend/services/apiService.ts` | Replaced getVouchers(), removed ~300 lines dead code |
| `mymoolah-wallet-frontend/components/overlays/digital-vouchers/DigitalVouchersOverlay.tsx` | Full rewrite |
| `mymoolah-wallet-frontend/components/overlays/digital-vouchers/ProductDetailModal.tsx` | Full rewrite, removed recipient |
| `mymoolah-wallet-frontend/components/overlays/digital-vouchers/VoucherCard.tsx` | Full rewrite, brand logos |
| `mymoolah-wallet-frontend/components/overlays/digital-vouchers/VoucherSearch.tsx` | Full rewrite, no suggestions |
| `mymoolah-wallet-frontend/assets/1voucher-logo.png` | New brand logo |
| `mymoolah-wallet-frontend/assets/betway-logo.png` | New brand logo |
| `mymoolah-wallet-frontend/assets/hollywood-logo.png` | New brand logo |
| `mymoolah-wallet-frontend/assets/ott-logo.png` | New brand logo |
| `mymoolah-wallet-frontend/components/digital-vouchers/*` | Deleted (legacy duplicate, 4 files) |
| `.cursor/rules/tech-debt.mdc` | Added overlay tech debt + architectural decision |
| `scripts/sync-flash-products.js` | New — manual Flash product sync script |

---

## Next Steps for Next Agent

1. **Sync MobileMart vouchers to staging**: `node scripts/sync-mobilemart-products.js --vouchers-only --staging`
2. **Sync Flash vouchers to staging**: `node scripts/sync-flash-products.js --vouchers-only --staging`
3. **Sync to production**: Same commands with `--production`
4. **Deploy**: `./scripts/build-push-deploy-staging.sh` then `./scripts/build-push-deploy-production.sh`
5. **Add more brand logos**: As André sources them — Steam, Netflix, Google Play, Roblox, etc.
6. **Future refactor (tech debt)**: Extract airtime/electricity/biller purchase logic from overlayServices.js into service classes (~9-13 hours)

---

## Context for Next Agent

The voucher overlay architecture:
- **Catalog**: `GET /api/v1/overlay/vouchers/catalog` in `overlayServices.js` — `VOUCHER_BRAND_TABLE` maps raw names to brands, picks best supplier per brand, collapses variants into one card
- **Purchase**: `POST /api/v1/products/purchase` via `productPurchaseService.js` (banking-grade)
- **Sync (MobileMart)**: Daily 02:00 cron + manual `node scripts/sync-mobilemart-products.js --vouchers-only`
- **Sync (Flash)**: Daily 02:00 cron + manual `node scripts/sync-flash-products.js --vouchers-only`
- **Frontend**: `DigitalVouchersOverlay.tsx` → `apiService.getVouchers()` → sorted, deduped cards with brand logos
- **Brand logos**: Vite-imported PNGs from `assets/` folder, mapped by brand name in `BRAND_LOGO_MAP`
