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
`PRODUCT_CATALOG_GOVERNANCE_ENABLED=false` is the rollout default. With the flag off, the wallet keeps using the existing curated retail voucher allowlist.

When enabled, `/api/v1/overlay/vouchers/catalog` filters voucher cards against approved and published governance mappings. Pending, rejected, suspended, retired, and unmapped supplier SKUs are excluded from wallet responses.

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
