# Product Catalog Governance

## Purpose
Product Catalog Governance controls which supplier SKUs can appear in customer-facing catalog endpoints. Raw supplier products remain ingestible for audit and reconciliation, but wallet catalog publication requires a reviewed, approved, and published governance mapping.

## Data Model
- `product_catalog_mappings` stores one governed mapping per supplier SKU and product type.
- `product_catalog_audit_events` stores immutable events for detection, draft edits, submission, approval, rejection, suspension, and retirement.
- Existing `products` and `product_variants` remain the raw supplier ingestion source.

## States
- `draft`: detected or editable supplier SKU that is not customer-facing.
- `pending_approval`: maker submitted the mapping for checker approval.
- `approved`: checker approved the canonical mapping.
- `rejected`: checker rejected the mapping; it can be edited and resubmitted.
- `suspended`: previously approved mapping removed from publication pending review.
- `retired`: permanently removed from publication.

Publish status is separate:
- `unpublished`: never returned by wallet governance enforcement.
- `published`: eligible for wallet catalog responses when governance enforcement is enabled.

## Maker-Checker Controls
- Maker edits canonical name, brand, category, description, icon/logo key, and risk tier.
- Maker submits only complete mappings.
- Checker approval publishes the mapping.
- Maker self-approval is blocked by comparing portal user IDs.
- Every transition writes an audit event with actor, prior state, target state, reason, and metadata.

## Wallet Enforcement
`PRODUCT_CATALOG_GOVERNANCE_ENABLED=false` was the rollout default while mappings were being backfilled. Production now runs with `PRODUCT_CATALOG_GOVERNANCE_ENABLED=true` for wallet retail vouchers.

When enabled, `/api/v1/overlay/vouchers/catalog` filters voucher cards against approved and published governance mappings. Pending, rejected, suspended, retired, and unmapped supplier SKUs are excluded from wallet responses.

## Production Voucher Enforcement - 2026-05-11
André approved moving Production retail vouchers to governance enforcement while preserving the currently working wallet catalog and adding selected blocked brands.

Production apply used `scripts/approve-production-voucher-governance.js --production --confirm-production --apply` after dry-run review. The script:
- Uses `scripts/db-connection-helper.js`.
- Preserves the retail voucher cards already live in the wallet.
- Publishes the real purchase SKUs behind those cards so grouped fixed denominations submit the correct product/variant.
- Keeps fallback/unknown rows blocked.
- Writes `product_catalog_audit_events` for approvals.

Selected additions approved/published:
- `OTT Voucher`: MobileMart `OTT Variable Voucher` only, supplier SKU `5BOioLwx80GvyiwTch2U`, range R5-R5,000.
- `NetFlorist`: MobileMart fixed SKUs R100, R250, R500, and R1,000.
- `EasyBet`: Flash SKU `1967`, range R10-R4,000.
- `GBets`: Flash SKU `1970`, range R10-R4,000.
- `Gold Rush`: Flash SKU `1969`, range R10-R4,000.

Rows intentionally still blocked pending separate review include `Wallet Code`, generic Flash `Gift Card` rows, `EasyLoad Voucher`, and `World Bucks`.

## OTT Authorised Product Sync - 2026-05-11
Staging now uses Jaco Snyders' active-provider spreadsheet/email list as the customer-facing OTT source of truth. The synchronisation tooling is:

```bash
node scripts/sync-ott-authorized-products.js --staging
node scripts/sync-ott-authorized-products.js --staging --apply
node scripts/stage-ott-catalog-governance.js --staging
node scripts/stage-ott-catalog-governance.js --staging --apply
```

`scripts/sync-ott-authorized-products.js` is dry-run by default and requires an explicit environment flag. Production use requires `--production --confirm-production`. It parses `~/Downloads/Payout Provider List.xlsx` when present, overlays the ABSA CashSend `67` correction from Jaco's email, compares against OTT API discovery plus DB state, and only performs non-destructive hides/unpublishes in `--apply` mode.

Staging apply on 2026-05-11:
- Hid 21 unsupported OTT commercial terms from customer-facing exposure.
- Deactivated 21 unsupported OTT products/variants, including the API-only gift-card brands that Jaco said are not supported for merchant checkout.
- Unpublished 2 unsupported OTT governance mappings.
- Kept/published the spreadsheet-authorised voucher rows `OTT-68`, `OTT-69`, and `OTT-20`.

Production use remains approval-gated. Run the dry-run report first and apply only after André explicitly approves the production rollout scope.

## OTT Production Catalog Readiness - 2026-05-07
Read-only staging and production audits confirmed that OTT commercial terms exist but no OTT `products`, `product_variants`, or OTT governance mappings are currently imported in staging or production. Use `scripts/audit-ott-production-catalog.js` before any rollout to verify the current state without writing to the database.

Current candidate rows for governance review after an approved import:
- `OTT-68` - Pick n Pay voucher (`provider_code = 68`)
- `OTT-69` - Shoprite / Checkers voucher (`provider_code = 69`)
- Portal-active OTT gift-card brands from André's 2026-05-07 screenshots, including RocoMamas, Wimpy, Steers, Starbucks, Spur, Panarottis, Nando's, Mugg & Bean, KFC, John Dory's, Hungry Lion, Fishaways, Dis-Chem, Debonairs Pizza, Burger King, Boxer, Ackermans, Ticketmaster, and NetcarePlus.

Current hold/exclusion rules:
- `OTT-141` Amazon Gift Card remains on hold because UAT returned provider-side failures.
- `OTT-127` PayShap Account must not be published or wired to wallet catalog/front-end surfaces in this phase.
- Standard Bank Instant Money must remain hidden until Standard Bank approves the service for MyMoolah.
- Nedbank Cardless Withdrawal is contractually allowed and active in the OTT portal, but quote/submit must remain unavailable until finance-approved commercial terms are configured; do not infer terms from ABSA.
- Any generic OTT voucher or gift-card row must be reviewed against the raw snapshot before publication.

Customer-facing grouping:
- Show `Pick n Pay` as its own card.
- Show `Shoprite / Checkers` as one clear grocery voucher card unless OTT supplies separate confirmed Checkers-only SKUs later.
- Show fast-food gift cards as brand-specific cards, for example `Nando's`, `KFC`, `Steers`, `Wimpy`, `Debonairs`, `Spur`, `McDonald's`, or `Burger King`, only after raw OTT provider names confirm those brands.

## Pending Production Review - Uber / Eats
Production verification on 2026-05-05 confirmed that MobileMart Uber and Uber Eats voucher variants exist in `product_catalog_mappings`, but remain hidden because their governance mappings are still `review_status = draft` and `publish_status = unpublished`.

Known MobileMart mappings to review together:
- `545` - `Uber Eats R200`
- `551` - `Uber R50`
- `562` - `Uber Eats R50`
- `570` - `Uber R100`
- `611` - `Uber Eats R100`
- `626` - `Uber R200`

Customer-facing decision: implement one grouped card named `Uber / Eats`, not separate Uber and Uber Eats cards. The recognizer should treat Uber and Uber Eats as one canonical retail voucher brand, with a stable key such as `uber-eats`, and all approved MobileMart denominations should appear under that single card.

Do not approve the generic Flash rows returned by the same search (`R20 - R200 Gift Card`) until their raw snapshot confirms the real brand. Generic raw names are not sufficient for wallet publication.

## Admin Procedure
1. Open Admin Portal -> Catalog Governance.
2. Run `Backfill Queue` after migration to create draft mappings from active supplier variants.
3. Filter by supplier, product type, review status, publish status, risk tier, or search text.
4. Select a mapping, compare raw supplier snapshot against canonical fields, and save changes.
5. Submit for approval as maker.
6. A different admin/manager approves, rejects, suspends, or retires the mapping.

## Rollout
1. Run migrations with `./scripts/run-migrations-master.sh uat`.
2. Start services with `./scripts/start-all-services.sh uat`.
3. In the Admin Portal, run `Backfill Queue` for vouchers.
4. Review and approve known-good voucher mappings.
5. Enable `PRODUCT_CATALOG_GOVERNANCE_ENABLED=true` in UAT only.
6. Verify wallet voucher catalog contains approved brands only.
7. Stage and production rollout require André approval after UAT verification.

## Validation
- Backend syntax checks for migration, models, service, route, server, and wallet route.
- Unit tests cover required canonical fields, maker self-approval block, approval publication, and audit event creation.
- Portal type-check reaches only pre-existing unrelated type issues after the new Catalog Governance screen fix.
