# MyMoolah Treasury Platform - Agent Handover Documentation

**Last Updated**: 2026-05-11 12:09 SAST
**Latest Feature**: **OTT authorised product synchronization — ✅ IMPLEMENTED / STAGING APPLIED / PRODUCTION GATED** — Implemented the attached OTT Product Synchronization Plan without editing the plan file. Confirmed the existing pipeline already had OTT API sync/import, product catalog governance, and wallet exposure filters; added a central spreadsheet/email-based authorisation policy instead of creating a duplicate product service. `config/ott-authorized-providers.json` records Jaco's email baseline with ABSA CashSend provider `67`; `services/ott/ottAuthorizedProviderPolicy.js` parses the workbook when provided and is reused by OTT provider sync, payout route filtering, payout quote/submit approval, and Staging governance publication. Added `scripts/sync-ott-authorized-products.js` as a Staging-only dry-run/apply reconciliation tool using `scripts/db-connection-helper.js`; it parsed `~/Downloads/Payout Provider List.xlsx`, called OTT read-only discovery (16 providers, 1 limits row), compared spreadsheet/email/API/DB/products/governance, then applied non-destructive Staging changes: 21 unsupported terms hidden, 21 unsupported OTT products/variants deactivated, 2 unsupported mappings unpublished, and authorised mappings for `OTT-68`, `OTT-69`, and `OTT-20` published. Focused validation passed: node syntax checks, Cursor lints, and Jest 67/67 (`ott-provider-catalog-service`, `ott-payout-service`, `ott-routes`, `voucherCatalogBrandService`, `productCatalogGovernanceService`). No production writes, wallet debits, payout submissions, voucher purchases, migrations, or Cloud Run deployments were performed. Production rollout remains gated behind André approval after a production dry-run review. Session log: `docs/session_logs/2026-05-11_1209_ott-authorized-product-sync.md`.
**Latest Feature**: **Referral SMS secret binding fix — ✅ IMPLEMENTED / STAGING + PRODUCTION UPDATED** — Investigated André's referral invite failure where the wallet showed `SMS Temporarily Unavailable`. The referral engine itself still maps correctly through `/api/v1/referrals/invite` -> `referralService.sendReferralInvite()` -> `smsService.isConfigured()`. Root cause was deployment configuration drift: recent backend Cloud Run revisions can be deployed through `scripts/deploy-backend.sh` without `MYMOBILEAPI_USERNAME` and `MYMOBILEAPI_PASSWORD`, so `smsService.isConfigured()` returns false and referrals return `SMS_SERVICE_NOT_CONFIGURED`. Updated `scripts/deploy-backend.sh` to bind `MYMOBILEAPI_USERNAME=mymobileapi-client-id:latest` and `MYMOBILEAPI_PASSWORD=mymobileapi-api-secret:latest` on every backend deploy, and documented the SMS env vars in `env.template` without real credentials. André approved live Cloud Run updates for both environments; updated `mymoolah-backend-staging` to revision `mymoolah-backend-staging-00545-rfp` and `mymoolah-backend-production` to revision `mymoolah-backend-production-00206-mxh`, both serving 100% traffic. Cloud Run describe confirmed both services bind `MYMOBILEAPI_USERNAME` to `mymobileapi-client-id` and `MYMOBILEAPI_PASSWORD` to `mymobileapi-api-secret`. Validation passed: `bash -n scripts/deploy-backend.sh`, `node --check services/smsService.js services/referralService.js controllers/referralController.js`, Cursor lints on touched files and referral/SMS paths, and a read-only review subagent confirmed this is the right durable fix for this error. No referral business logic, SMS copy, database schema, ledger, wallet frontend, or production data changed. Next action: controlled wallet referral invite retest to confirm SMS delivery. Session log: `docs/session_logs/2026-05-10_2232_referral-sms-secret-binding.md`.
**Latest Feature**: **Voucher / Gift Card split — ✅ IMPLEMENTED / BUILD PASSED** — Investigated André's screenshots showing overlap between `/vouchers-overlay` and `/gift-cards-overlay`. Confirmed the routes intentionally share `DigitalVouchersOverlay` and the existing voucher catalog/purchase engine, but retail mode was showing the full catalog while gift-card mode showed the `isGiftCard` subset, causing gift-card brands to appear on both pages. Updated `mymoolah-wallet-frontend/components/overlays/digital-vouchers/DigitalVouchersOverlay.tsx` so `Gift Cards` shows only `isGiftCard === true` and `Buy Retail Vouchers` excludes those products with `isGiftCard !== true`. Follow-up hardened the API contract too: `/api/v1/overlay/vouchers/catalog` now accepts `isGiftCard=true|false`, and the wallet sends `true` for Gift Cards and `false` for Buy Retail Vouchers while keeping the defensive client filter. Also fixed the gift-card loading failure copy so it no longer says retail vouchers, tightened local catalog item typing to keep targeted ESLint clean, and added Boxer to the gift-card classification assertion. Validation passed: `node --check routes/overlayServices.js`, `npx jest tests/voucherCatalogBrandService.test.js --runInBand` 40/40, targeted ESLint on `DigitalVouchersOverlay.tsx`, wallet `npm run build`, and Cursor lints on edited files. No purchase execution, database schema, ledger, supplier integration, or production data changed. Session log: `docs/session_logs/2026-05-10_2119_voucher-gift-split.md`.
**Latest Feature**: **Staging OTT gift-card and live transaction parity — ✅ IMPLEMENTED / STAGING DEPLOYED / VERIFIED** — Aligned Staging with André's intended environment model: the same live OTT endpoints, services, products, and transaction capability as Production, isolated by Staging Cloud SQL DB and Staging/test users. Read-only Cloud Run audit confirmed Staging had still been hardcoded to `OTT_LIVE_INTEGRATION=false`, `OTT_TEST_INTEGRATION=true`, and `https://test-payoutapi.ott-mobile.com`, while Production used `https://payoutapi.ott-mobile.com`. Read-only DB comparison showed Staging had only 2 active gift-card brands (`Dis-Chem`, `Nando's`) and Production had 18. Updated `scripts/deploy-backend.sh` so Staging defaults to `OTT_PAYOUT_ENABLED=true`, `OTT_LIVE_INTEGRATION=true`, `OTT_TEST_INTEGRATION=false`, `OTT_API_BASE_URL=https://payoutapi.ott-mobile.com`, and `OTT_PORTAL_URL=https://payout-portal.ott-mobile.com`. Ran Staging-only OTT sync/import using Secret Manager staging OTT credentials against the live OTT API: 23 providers read and 24 catalog products imported. Deployed Staging backend and wallet separately with tag `20260508_v2`, then redeployed Staging backend with tag `20260508_v3` after André clarified Staging must be able to transact live. Final backend revision `mymoolah-backend-staging-00538-n4n` is serving 100% traffic with `OTT_PAYOUT_ENABLED=true`, live OTT API URLs, and DB isolation through `mymoolah_staging`; wallet revision remains `mymoolah-wallet-staging-00128-5cj`. Authenticated catalog API verification returned 18 gift-card brands in Staging and the same 18 in Production. Production was not deployed or changed.
**Latest Feature**: **Gift Cards bottom navigation fix — ✅ IMPLEMENTED / BUILD PASSED** — Fixed the new wallet `Gift Cards` routed page so the bottom sticky navigation appears like other wallet overlay pages. `App.tsx` already included `/gift-cards-overlay` in the top-banner routing list and allowed bottom navigation globally, but `mymoolah-wallet-frontend/components/BottomNavigation.tsx` had its own older route allowlist that omitted `/gift-cards-overlay`, causing the component to return `null` on that page. Added `/gift-cards-overlay` and replaced the two duplicated inline route arrays inside `BottomNavigation.tsx` with one shared `BOTTOM_NAV_VISIBLE_PATHS` constant to reduce future route drift. Validation passed: wallet `npm run build` and Cursor lints on `BottomNavigation.tsx`. This was followed by the separate Staging OTT parity fix documented above.
**Latest Feature**: **OTT live ABSA production smoke — ✅ COMPLETED / RECONCILED / STATUS FIXED** — Completed the controlled live production ABSA CashSend smoke transaction for wallet user `0825571055` using live OTT provider code `67`: R50.00 cash value plus the R13.00 flat customer transaction fee. OTT returned success with payment reference `4802148`; payout `OTT-1778168722483-7f5897b7` is `completed`. Production wallet rows now show separate completed line items: R50.00 withdraw and R13.00 `Transaction fee`. Journal `OTT-PAYOUT-OTT-1778168722483-7f5897b7` balances exactly R63.00 debit / R63.00 credit. OTT float account `1200-10-08` and `supplier_floats.currentBalance` both read R938.55 after the R61.45 principal/provider-fee pass-through movement. VAT evidence exists for MMTP fee revenue: R1.35 base, R0.20 output VAT, R1.55 total. During the live poll, a stale display-status issue was found and fixed in `services/ott/ottPayoutService.js`: when OTT confirms `completed` after the payout ledger was already posted, the wallet withdrawal row is now promoted from `processing` to `completed`. Focused test coverage was added in `tests/ott-payout-service.test.js`; `npx jest tests/ott-payout-service.test.js --runInBand` passed 16/16 and Cursor lints were clean. The single live smoke-test row was corrected in production after reconciliation. No Nedbank production smoke was run.
**Latest Feature**: **OTT gift-card catalog sync fix — ✅ IMPLEMENTED / STAGING + PRODUCTION APPLIED** — Fixed the root cause of the wallet `Gift Cards` card only showing two OTT brands from MMTP's side. `services/ott/ottProviderCatalogService.js` now uses the central `voucherCatalogBrandService` recognizer to classify live OTT gift-card providers, instead of relying on only the pre-seeded Nando's/Dis-Chem terms. New approved live OTT gift-card providers receive the standard OTT VAS commission policy during sync (`grossCommissionPct=1.00`, `serviceFeePct=0.30`, `netCommissionPct=0.70`, `monthlySwitchingFeePct=0.30`), are marked customer-facing, and can be imported into the shared voucher catalog by `scripts/ott-sync-providers.js --import-catalog`. `scripts/stage-ott-catalog-governance.js` no longer duplicates a gift-card name allowlist; it filters staging publication candidates through the same central recognizer. Validation passed: `node --check services/ott/ottProviderCatalogService.js scripts/stage-ott-catalog-governance.js`, `npx jest tests/ott-provider-catalog-service.test.js tests/voucherCatalogBrandService.test.js --runInBand --forceExit` 43/43, and Cursor lints clean. André approved staging-only apply first; `node scripts/ott-sync-providers.js --staging --import-catalog` imported 4 catalog products and staging audit confirmed 4 approved/published governance mappings. André then approved production catalog application; `node scripts/ott-sync-providers.js --production --confirm-production --import-catalog` imported the same 4 products into production (`OTT-156` Nando's, `OTT-157` Dis-Chem, `OTT-68` Pick n Pay, `OTT-69` Shoprite / Checkers). Post-sync production audit confirmed only ABSA CashSend, Nando's, Dis-Chem, Pick n Pay, and Shoprite / Checkers are customer-facing; Standard Bank, PayShap, Amazon, Takealot, OTT Voucher, and AnyTime are hidden. Current provider blocker remains: OTT's active-provider API response still does not expose the other portal screenshot brands such as KFC, Steers, Wimpy, Burger King, etc.; MMTP cannot sell them until OTT activates them for the API account or supplies confirmed provider codes.
**Latest Feature**: **Gift Cards wallet entry point — ✅ IMPLEMENTED / SHARED CATALOG / BUILD + TESTS PASS** — Added a dedicated `Gift Cards` card to the wallet `Buy` section so OTT gift-card brands are discoverable separately from the broader retail voucher catalog. `mymoolah-wallet-frontend/pages/TransactPage.tsx` now shows `Gift Cards` with copy `Food, coffee, entertainment and shopping gifts`, and keeps `Buy Retail Vouchers` for groceries, betting, and retail vouchers. `mymoolah-wallet-frontend/App.tsx` adds `/gift-cards-overlay`, reusing the existing `DigitalVouchersOverlay` and purchase flow in `gift-cards` mode. To avoid duplicated brand logic, gift-card classification is centralized in `services/voucherCatalogBrandService.js`; `/api/v1/overlay/vouchers/catalog` now returns `isGiftCard`, and `DigitalVouchersOverlay.tsx` filters on that shared flag with gift-card-specific search/loading/empty copy. `VoucherSearch.tsx` now accepts contextual placeholder and aria-label text. Validation passed: `node --check services/voucherCatalogBrandService.js routes/overlayServices.js`, `npx jest tests/voucherCatalogBrandService.test.js --runInBand --forceExit` 39/39, wallet `npm run build`, and Cursor lints on touched files. No separate gift-card purchase engine, database schema, ledger, payout, or production data changed.
**Latest Feature**: **Dashboard recent transactions line-item fix — ✅ IMPLEMENTED / DISPLAY-ONLY / TESTS PASS** — Implemented André's final dashboard requirement: Recent Transactions now shows transaction value, transaction fees, and refunds as separate customer-facing rows like Transaction History, instead of combining value + fee into one amount. `controllers/walletController.js` removes dashboard-only combined display rows for OTT payouts, Flash/EasyPay cash-out, voucher top-up, USDC, RPP, and RTP groups; keeps internal accounting rows hidden; and selects up to 10 non-fee/non-linked main rows plus related fee/refund rows by shared metadata/reference keys, so visible dashboard rows can exceed 10 when linked fees/refunds exist. OTT payout descriptions remain safe per line item (`Withdraw Cash - ABSA CashSend`, `Transaction fee`, `Withdraw Cash refund - Nedbank Cardless Withdrawal`) without exposing raw provider errors or combining amounts. Defensive frontend cleanup remains in `mymoolah-wallet-frontend/utils/transactionDisplay.ts`. Focused tests in `tests/wallet-ott-display.test.js` now cover separate ABSA payout/fee rows, safe Nedbank reversal descriptions, and the 10-main-plus-linked-fees dashboard rule. Validation passed: `node --check controllers/walletController.js` and `npx jest tests/wallet-ott-display.test.js --runInBand --forceExit` 3/3 (pre-existing Jest config warnings only). No database migration, ledger correction, payout retry, or production write was performed.
**Latest Feature**: **OTT staging controlled payout validation — ⚠️ PARTIAL PASS / NEDBANK PARTNER ENABLEMENT BLOCKED** — After André approved real staging wallet-debit tests for wallet user `0825571055`, staging user `+278****1055` was found verified but missing `idType`; André approved a staging-only profile correction to `south_african_id` so the route-level verified-recipient guard would not be bypassed. ABSA CashSend provider `112` was submitted for R50.00 cash + R13.00 fee (R63.00 total debit), accepted by OTT staging with payment reference `118386`, polled to `completed`, and posted balanced journal `OTT-PAYOUT-OTT-1778146534980-f2ff7a1e` (R63.00 debit / R63.00 credit). André supplied customer-side SMS evidence confirming the ABSA payout notification and Absa CashSend PIN SMS for `OTT_CashSend_118386`; the PIN is not recorded in docs. Nedbank Cardless Withdrawal provider `10` was submitted for the same R50.00 + R13.00 fee, but OTT staging rejected it with `Provider is not authorised on this account :MyMoolah (Pty) Ltd`; André also received the matching OTT payout-failure email for reference `MM-OTT-1778146545512-0600df80`. MMTP safely marked payout `OTT-1778146545512-0600df80` as `reversed`, reversed the withdraw/fee transactions, and created refund transaction `OTT-REV-OTT-1778146545512-0600df80` for R63.00. Staging wallet `WAL-1` ended at balance R53,357.70 with restricted balance R0.00. Next action: ask OTT to enable Nedbank Cardless Withdrawal for the MyMoolah account before re-running the Nedbank controlled test. No production write was performed.
**Latest Feature**: **OTT production catalog readiness — ✅ IMPLEMENTED / READ-ONLY AUDIT + CONTRACT CORRECTION / NO PRODUCTION WRITES** — Implemented the attached OTT production catalog plan without editing the plan file and without production writes, then corrected the payout policy after André supplied OTT portal screenshots and confirmed the contract scope. Added `scripts/audit-ott-production-catalog.js`, a SELECT-only staging/production audit using `scripts/db-connection-helper.js` to report OTT commercial terms, imported products, governance mappings, and `1200-10-08` float status. Current cash-send rule: only ABSA CashSend and Nedbank Cardless Withdrawal may be customer-facing; Standard Bank Instant Money must remain hidden until Standard Bank approves the service for MyMoolah. Nedbank is portal-active and contractually allowed, but live submit is blocked until OTT enables provider `10` for the MyMoolah account. OTT PayShap `127`, OTT airtime, and Standard Bank are excluded from frontend exposure in this phase; Amazon `141` remains on hold from prior UAT provider failures. Voucher/gift-card recognition now covers the portal-active OTT brands from André's screenshots, including RocoMamas, Wimpy, Steers, Starbucks, Spur, Panarottis, Nando's, Mugg & Bean, KFC, John Dory's, Hungry Lion, Fishaways, Dis-Chem, Debonairs Pizza, Burger King, Boxer, Ackermans, Ticketmaster, NetcarePlus, Pick n Pay, and Shoprite / Checkers. `WithdrawCashOverlay.tsx` now only surfaces ABSA/Nedbank fallback tiles, keeps them unavailable unless live OTT discovery and quote validation pass, and requires `/api/v1/ott/payouts/quote` fee preview before submit. Validation passed after the contract correction: backend syntax checks, focused Jest 39/39, wallet `npm run build`, and Cursor lints on touched files. No production catalog import, production governance publish, production payout enablement, production wallet debit, secret, migration, or production write was performed.
**Latest Feature**: **MobileMart SFTP email handover — ✅ DOCUMENTED / PARTNER IP NEXT** — Swept Jarod Ramos' MobileMart email thread, session logs, integration docs, and recent SFTP/MobileMart commits. Confirmed MyMoolah's side is not waiting on a new dev build: the SFTP endpoint remains `34.35.137.166:5022`, username `mobilemart`, key-only authentication; Jarod's RSA key was previously installed and fingerprint-verified; and the MobileMart reconciliation adapter was rebuilt for Fulcrum Recon Spec v1.1 (`FULCRUM.MERCHANT.<NAME>.RECON.<DATETIME>.txt`, pipe-delimited `H/D/T`, 24 fields, cents amounts). The open blocker is MobileMart choosing an auditable static-egress path and sending one public `/32` IP or tightly scoped MobileMart-owned CIDR for firewall allowlisting. Do not offer the 62 shared Microsoft Power Automate cloud IP ranges as a fallback. Recommended reply path: keep this over email, state that no developer meeting is needed unless they have a specific written blocker, and ask them to choose scheduled WinSCP/lftp upload from the Fulcrum server, Power Automate Desktop inside their network, or a MobileMart-owned Azure relay with NAT/static outbound IP. Next technical step after MobileMart provides the IP: create the port `5022` firewall allow rule, ask Jarod to test SSH/SFTP auth, then proceed to test-file upload and only then enable the watcher/scheduler sequence.
**Latest Feature**: **Uber / Eats voucher governance handover — ✅ DOCUMENTED / IMPLEMENT LATER** — Production read-only verification confirmed MobileMart Uber / Uber Eats voucher mappings exist but are hidden by Product Catalog Governance because they are still `draft` and `unpublished`. Documented the six MobileMart mapping IDs (`545`, `551`, `562`, `570`, `611`, `626`) in `docs/PRODUCT_CATALOG_GOVERNANCE.md` and recorded André's customer-facing decision: show one grouped `Uber / Eats` card, not separate Uber and Uber Eats cards. Future implementation should update `services/voucherCatalogBrandService.js` so Uber and Uber Eats collapse into a single canonical key such as `uber-eats`, then approve/publish only the confirmed MobileMart mappings. Do not publish the generic Flash `R20 - R200 Gift Card` rows until their raw snapshots confirm the actual brand. Also updated `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md` with a morning handover note for OTT production integration: production credentials stay in Secret Manager, use `https://api-mm.mymoolah.africa/api/v1/ott/webhook`, keep `OTT_PAYOUT_ENABLED=false` outside an approved live-test window, and treat MobileMart Uber / Eats governance as separate from OTT production products.
**Latest Feature**: **OTT production float funding COA journals + low-balance monitor — ✅ IMPLEMENTED / PRODUCTION POSTED** — André clarified MyMoolah has two SBSA bank accounts: `1100-01-01` SBSA Treasury Account for Treasury transactions, client-float backing, supplier-float prefunding, and external rails; and `1100-01-02` SBSA Business Operating Account for daily operations such as salaries and operating costs. Updated `docs/CHART_OF_ACCOUNTS.md` to document this two-account control model, the R1,000 OTT funding treatment (`TREASURY-FUND-OTT-20260505` DR `1100-01-01` / CR `1100-01-02`, then `FLOAT-TOPUP-OTT-20260505` DR `1200-10-08` / CR `1100-01-01`), and the earned revenue / commission sweep from Treasury to Business Ops after revenue and VAT recognition. Added `scripts/load-ott-production-float.js`, which defaults to dry-run and requires `--production --apply --confirm-production` before posting JE2 via `ledgerService.postJournalEntry()` and syncing OTT `supplier_floats.currentBalance` plus `minimumBalance=R100.00`. After André approved the dry-run output, production JE2 was posted with reference `FLOAT-TOPUP-OTT-20260505-001`: Treasury `1100-01-01` moved from `R7,170.00` to `R6,170.00`; OTT float `1200-10-08` moved from `R0.00` to `R1,000.00`; OTT `SupplierFloat.currentBalance` is `R1,000.00`; OTT `minimumBalance` is `R100.00`. Updated `services/ott/ottPayoutService.js` so completed OTT payout and reversal ledger postings refresh the OTT supplier-float mirror from ledger balance for existing `FloatBalanceMonitoringService` low-balance warnings. No wallet/client-float movement, revenue, expense, commission, or VAT was created by the R1,000 top-up itself.
**Latest Feature**: **OTT commercial volume forecast — ✅ DOCUMENTED / HTML ARTEFACT / NO RUNTIME CHANGES** — Created `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html`, an official one-page MyMoolah x OTT 36-month transaction volume forecast for OTT commercial rate discussions. The forecast is face-value-only and excludes commissions, fees, rebates, revenue share, VAT, settlement charges, failed transactions, and reversals. It uses market-informed assumptions across sports betting operator disbursements, EWA disbursements, wallet cash withdrawals, PayShap payments, gift cards, PnP/Shoprite grocery vouchers, and OTT vouchers / betting top-ups. André confirmed the target-market betting-wallet top-up line was previously underestimated, so the final forecast reflects stronger repeat-use behaviour from recycled wallet inflows, EWA, wages/salary disbursements, PayShap inflows, OTT voucher spend, and OTT merchant network spend. Amazon Gift Card remains excluded until OTT confirms provider availability. Validation passed: Python HTML parser and Cursor lints on the generated HTML. No runtime code, database schema, migrations, secrets, or production configuration changed.
**Latest Feature**: **Referral SMS outcome modal + safe invite results — ✅ IMPLEMENTED / BUILD PASSED / FRONTEND + BACKEND** — Production logs confirmed referral SMS sending is working again after SMS secrets were rebound to Cloud Run, but the wallet did not show a success popup and generic failures were hard to understand. Updated `/api/v1/referrals/invite` so successful sends return a user-safe `Invite Sent` outcome, duplicate referrals return `REFERRAL_ALREADY_SENT` with HTTP 409, existing wallet users still return `USER_EXISTS`, invalid input returns structured phone errors, and SMS configuration/provider failures return retryable safe messages without exposing supplier internals. `referralService.sendReferralInvite` now only reports success when the SMS send completes and reuses pending unsent referral rows for retry instead of creating duplicate records. `ReferralPage.tsx` now shows a branded result modal for success, duplicate invite, existing wallet user, self-referral, and provider/unavailable failures; the old tiny inline success/error text was removed. Validation passed: `npm run build` in `mymoolah-wallet-frontend`, `npx eslint pages/ReferralPage.tsx --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, `node --check controllers/referralController.js services/referralService.js`, and Cursor lints on touched files. No database schema changes or migrations.
**Latest Feature**: **Send Money Instant Payment UI + toggle/save beneficiary fix — ✅ IMPLEMENTED / BUILD PASSED / FRONTEND + BENEFICIARY CLEANUP** — Upgraded the wallet Send Money payment UI so bank transfers use a clearer method-and-speed pattern. The Pay Now top payment method grid now shows `MyMoolah`, `Bank Transfer`, and disabled `MoolahMove`; the duplicate top `Instant` tile was removed. Saved-bank-beneficiary payments and Pay Now bank payments now use a polished `Transfer Speed` two-card selector for `Standard EFT` versus `Instant Payment`, replacing the old switch card. Follow-up removed fee/cost wording from the form itself, including the grey `Standard EFT fee is calculated before submission` message, and moved Instant Payment fee acceptance to a confirmation popup that quotes the Instant Payment fee and total debit before submission. The shared wallet `Switch` primitive now uses a slim MyMoolah-green toggle with a visible white thumb. Pay Now bank `Save as Beneficiary` now controls persistence: selected recipients stay saved; unselected one-time bank recipients are removed after submit. Send Money bank recipient creation now stores universal branch codes, and `UnifiedBeneficiaryService.removeServiceFromBeneficiary` now deactivates normalized `BeneficiaryPaymentMethod` rows for bank/mymoolah payment accounts. Customer-facing `PayShap` wording was removed from `SendMoneyPage.tsx`; internal `payshap` rail values remain unchanged for backend compatibility. Validation passed: `npm run build` in `mymoolah-wallet-frontend`, `node --check services/UnifiedBeneficiaryService.js`, and Cursor lints on touched files. Focused ESLint on this legacy page still reports pre-existing unrelated lint debt.
**Latest Feature**: **Retail voucher brand logos — ✅ IMPLEMENTED / BUILD PASSED / FRONTEND ONLY** — Wired André's uploaded PNG logos into the Buy Retail Vouchers UI for Blu Voucher, FNB, Pick n Pay, Shoprite, Supabets, and YesPlay. Updated both `VoucherCard.tsx` and `ProductDetailModal.tsx` so the voucher grid and purchase modal use the same brand assets like the existing 1Voucher/OTT pattern. Logo matching now checks canonical `voucher.brand` before `voucher.name` and handles common variants such as Blue/Blu, PnP/Pick n Pay, First National Bank/FNB, Checkers/Shoprite, Supa Bets/Supabets, and Yes Play/YesPlay. Validation passed: `npm run build` in `mymoolah-wallet-frontend` and Cursor lints on touched voucher files. Focused ESLint still reports pre-existing unrelated `any`/unused-variable lint debt in the touched files.
**Latest Feature**: **Branded MyMoolah loading spinner — ✅ IMPLEMENTED / BUILD PASSED / NO BACKEND CHANGES** — Added a reusable `BrandSpinner` in `mymoolah-wallet-frontend/components/common/LoadingSpinner.tsx` using `assets/logo3.svg` as a rotating MyMoolah status mark with visible loading text, `role="status"`, `aria-live="polite"`, and existing reduced-motion support from global CSS. Updated the KYC document upload/AI verification processing overlay so it no longer shows the weak generic ring/white-box state and keeps the existing upload progress bar. Applied the branded loading indicator to prominent wallet processing/loading states: auth loading, Withdraw Cash, Buy Retail Vouchers catalog and purchase modal, EasyPay cash-out/top-up, Flash eeziCash, MMCash retail, top-up voucher redemption, airtime/data catalog loading, USDC recipient/processing steps, and Transaction History initial loading. Compact button-level loaders were intentionally left alone where the logo would be too small. Validation passed: `npm run build` in `mymoolah-wallet-frontend`, `npx eslint components/common/LoadingSpinner.tsx --ext ts,tsx --report-unused-disable-directives --max-warnings 0`, and Cursor lints on touched files. Full `npm run lint` still fails on pre-existing unrelated frontend lint debt.
**Latest Feature**: **OTT webhook and pending-status contract alignment — ✅ IMPLEMENTED / TESTS PASS / PUSHED TO MAIN** — Jaco Snyders from OTT confirmed by email that upstream RTC/PayShap transactions can take up to 50 seconds, timeouts must remain pending, OTT pending statuses are `98` and `99`, success is `100`, failed is `97` and lower, and webhook verification uses `merchantUniqueReference + message + status + transactionId + utctimestamp + apikey`. Updated `services/ott/ottClient.js` default `OTT_API_TIMEOUT_MS` from 15s to 60s, changed the default webhook hash order to Jaco's confirmed preimage, and left request hash overrides configurable through `OTT_HASH_PARAM_ORDER_JSON`. Updated `routes/ott.js` so webhook verification requires the OTT API key and no longer requires a separate `OTT_WEBHOOK_SECRET`; the `secret` field in Jaco's webhook body is documented as not used/constant. Updated `services/ott/ottPayoutService.js` status normalization for `100/98/99/<=97` and ensured payouts held pending after a timeout can post the payout ledger when a later webhook or poll reports completed. Updated `env.template`, `scripts/deploy-backend.sh`, and the OTT integration framework docs. Validation passed: `node --check services/ott/ottClient.js services/ott/ottPayoutService.js routes/ott.js`, `npm test -- --runInBand tests/ott-client.test.js tests/ott-payout-service.test.js` 19/19, and Cursor lints on touched files.
**Latest Feature**: **OTT payout diagnostics for Withdraw Cash — ✅ IMPLEMENTED / BUILD + TESTS PASS / CODESPACES RETEST NEXT** — Investigated André's Codespaces log for the new Withdraw Cash failure on `POST /api/v1/ott/payouts`. The log only showed the route returning HTTP 500 after 838ms and did not include the internal exception because `routes/ott.js` swallowed OTT errors without logging. Added safe backend diagnostics to the shared OTT error handler: method, path, authenticated user id, provider code, amount, internal error code, status, endpoint key, details, and a short 5xx stack preview. All OTT route catch blocks now pass `req` into the handler, including webhook. Updated `WithdrawCashOverlay.tsx` so dev/Codespaces displays the backend `error` code in brackets alongside the safe message, while production keeps the existing safe customer message. Validation passed: `node --check routes/ott.js`, `npm test -- --runInBand tests/ott-payout-service.test.js` 10/10, `npm run build` in `mymoolah-wallet-frontend`, and Cursor lints on touched files. Local read-only UAT diagnostics using `scripts/db-connection-helper.js` could not connect from this Mac session (`read ECONNRESET`), so Codespaces retest is needed after pull/restart to capture the real backend code/stack for the 500.
**Latest Feature**: **Retail voucher purchase identity fix — ✅ IMPLEMENTED / BUILD + TESTS PASS / CODESPACES RETEST PASSED** — Fixed the Pick n Pay retail voucher purchase failure found during Codespaces testing after the card displayed correctly but `/api/v1/products/purchase` returned HTTP 400. The voucher catalog now preserves two separate identities: customer-facing `catalogKey` for stable display/favorites, and explicit `purchaseProductId` plus `variantId` for the backend purchase contract. In `routes/overlayServices.js`, grouped voucher cards now choose a single representative variant and align `productId`, `purchaseProductId`, `variantId`, `supplierProductId`, and amount constraints to that same row, preventing best-offer grouping from sending mismatched product/amount combinations. Follow-up after retest made `/api/v1/products/purchase` accept optional `variantId`, made `ProductPurchaseService` resolve the selected active variant for amount rules, order traceability, and OTT/Flash/MobileMart supplier product/provider code resolution, and made the wallet modal send `variantId` with the purchase. Hotfixes after retests hardened product/supplier response formatting for missing product brands and normalised nullable OTT VAS recipients before building the OTT payload, fixing `Cannot read properties of null (reading 'name')` in both the response and `buildOttVasRecipient` paths. Safe frontend error propagation now reads backend nested messages instead of showing only `HTTP 400`. The interrupted OTT fee wording fix was also completed: new OTT fee transactions and historical wallet display rows show `Transaction fee` instead of `OTT payout fee`, with focused tests updated for generated payout IDs. Validation passed: backend syntax checks, `npx jest tests/ott-product-purchase-service.test.js tests/voucherCatalogBrandService.test.js tests/ott-payout-service.test.js --runInBand --forceExit` 27/27, hotfix reruns `npx jest tests/ott-product-purchase-service.test.js --runInBand --forceExit` 5/5 and 6/6, `npm run build` in `mymoolah-wallet-frontend`, and Cursor lints on touched files. André pulled/restarted in Codespaces and confirmed the flow “looks better”; no further Pick n Pay blocker is open from this session.
**Latest Feature**: **Product Catalog Governance layer — ✅ IMPLEMENTED / TESTS PASS / UAT MIGRATION NEXT** — Built the approved governance MVP without editing the attached plan file. Added migration `20260501_04_create_product_catalog_governance.js` for `product_catalog_mappings` and `product_catalog_audit_events`, plus `ProductCatalogMapping` and `ProductCatalogAuditEvent` Sequelize models. Added `services/productCatalogGovernanceService.js` to own SKU detection, draft edits, submit, approve, reject, suspend, retire, maker self-approval blocking, and immutable audit events. Supplier sync now queues governance mappings after Flash/MobileMart variant upserts without blocking raw ingestion if governance tables are not yet migrated. Wallet voucher catalog enforcement is behind `PRODUCT_CATALOG_GOVERNANCE_ENABLED=true`; with the flag off the current curated allowlist remains the rollout backstop. Added `/api/v1/catalog-governance` admin APIs with portal JWT auth, role checks, validation, pagination, filters, backfill, and transition routes. Added Admin Portal `Catalog Governance` route/screen with filters, paginated review list, detail panel, canonical edits, submit/approve/reject/suspend/retire actions, and audit history. Follow-up corrected the voucher identity model properly: retail voucher recognition now lives in `services/voucherCatalogBrandService.js`, each mapped brand has a backend-owned stable `catalogKey`, `/api/v1/overlay/vouchers/catalog` returns that key, and wallet favorites use the canonical key rather than supplier/product/variant IDs. This prevents catalog refreshes or supplier winner changes from pruning favorites for the same customer-facing brand. Added coverage for supplier naming variants including `PicknPay`, `Pick n Pay`, `Pick and Pay`, `PnP`, Hollywood Bets, Blu Voucher, FNB, Apple, Shoprite, and Checkers. Added `docs/PRODUCT_CATALOG_GOVERNANCE.md` plus focused Jest tests. Validation: `node --check` on changed backend files, `npx jest tests/productCatalogGovernanceService.test.js --runInBand` passed 3/3, `npx jest tests/voucherCatalogBrandService.test.js --runInBand` passed 13/13, `npm run build` in `mymoolah-wallet-frontend` passed, Cursor lints clean on touched files. Portal `npm run type-check` now has no new Catalog Governance errors, but still fails on pre-existing unrelated type errors in `UserManagementOverlay.tsx`, `components/ui/checkbox.tsx`, and `components/ui/dialog.tsx`. UAT next: run `./scripts/run-migrations-master.sh uat`, start services, backfill/review mappings in Admin Portal, then enable `PRODUCT_CATALOG_GOVERNANCE_ENABLED=true` only after approved mappings are populated.
**Latest Feature**: **Retail voucher catalog curation — ✅ IMPLEMENTED / SYNTAX + LINT PASSED** — Fixed the Buy Retail Vouchers catalog after screenshots showed unmapped supplier products leaking into the wallet as vague cards such as `Anytime`, `Easy`, and duration-only labels like `(1 Month)`. `routes/overlayServices.js` now treats voucher brand recognition as the customer-facing allowlist: fallback/unmapped supplier products are still captured in `catalogAudit.fallbackRecognitions`, but they are no longer returned as wallet cards until deliberately mapped. Added explicit mappings for generic Apple products into `Apple Credit` and FNB products into `FNB`, preventing a duplicate generic `Apple` card and improving the FNB display. Validation passed: `node --check routes/overlayServices.js` and Cursor lints on `routes/overlayServices.js`.
**Latest Feature**: **Dashboard OTT Withdraw Cash transaction display — ✅ IMPLEMENTED / SYNTAX + LINT PASSED** — Fixed the dashboard Recent Transactions feed for OTT Withdraw Cash so customer-facing dashboard rows show one total debit row (face value + provider/MMTP fees, e.g. R50.00 + R12.45 = R62.45). The full Transaction History remains intentionally split because dashboard-only grouping runs only for small recent-transaction requests (`limit <= 10`); history requests keep the raw face-value and fee rows for audit clarity. Implementation is in `controllers/walletController.js`, keyed by `metadata.ottPayoutId` and `OTT-PAY-*` / `OTT-FEE-*` transaction IDs. Validation passed: `node --check controllers/walletController.js` and Cursor lints on `controllers/walletController.js`.
**Latest Feature**: **Wallet Withdraw Cash UI cleanup — ✅ IMPLEMENTED / BUILD PASSED / READY FOR CODESPACES TESTING** — Cleaned up frontend issues found after commit `ee97df62`. Dashboard voucher card now says `MyMoolah Vouchers`. Withdraw Cash is now canonical in code and UI: implementation moved to `mymoolah-wallet-frontend/components/overlays/withdraw-cash/WithdrawCashOverlay.tsx`, `/withdraw-cash-overlay` is the primary route, and `/atm-cashsend-overlay` remains only as a compatibility alias for old links/settings. The frontend no longer asks for ID/passport details and no longer shows a separate `Check fees` step; `/api/v1/ott/payouts` now derives OTT recipient identity server-side from the authenticated KYC-verified `User` record before calling `ottPayoutService`. OTT provider discovery now merges active providers with provider limits; follow-up fixed Nedbank Cardless Cash Send to use OTT provider code `10`, made it selectable, and hardened frontend provider parsing for OTT `ProviderCode`/`ProviderName`/`Providers`/`Data` response fields. Follow-up also changed `/api/v1/ott/providers` and `/api/v1/ott/provider-limits` to authenticated read-only calls instead of KYC-gated calls so opening the screen does not produce repeated `KYC verification required` console errors; quote/submit/status endpoints remain KYC-gated. The read-only provider routes now add the OTT-required `requestdate` and `yourUniqueReference` server-side before signing, so wallet loads do not pass empty discovery payloads to OTT. KYC submit enforcement now treats `users.kycStatus = verified` as authoritative, matching the KYC status screen; the legacy `wallets.kycVerified` mirror remains diagnostic and no longer blocks verified users if stale. The visible Verified Profile card was removed for simplicity, while server-side verified identity payload remains in place. Cash amount presets now use cleaner chips across the wallet guardrail range `R50` to `R4,000`, with live OTT provider limits still narrowing the range when returned. The wallet shell resets its internal scroll container on route changes so routed overlays such as Add Money -> Bank Transfer open at the top, shared popup modals are top-aligned instead of centered mid-page, and Withdraw Cash no longer mixes `padding` shorthand with `paddingBottom`. Validation passed: `npm run build` in `mymoolah-wallet-frontend`, `node --check routes/ott.js`, `node --check middleware/kycMiddleware.js`, prior `node --check controllers/settingsController.js`, prior `npx jest tests/ott-payout-service.test.js --runInBand --forceExit` (10/10), and Cursor lints on touched frontend files. No additional wallet-debit UAT transaction was run; André will pull and test in Codespaces.
**Latest Feature**: **OTT Withdraw Cash frontend simplification — ✅ IMPLEMENTED / BUILD PASSED / NO UAT DEBIT TEST RUN** — Simplified wallet frontend information architecture for OTT cash-send and vouchers without changing existing backend product routes. `TransactPage` now groups services by plain user intent: Payments, Add Money, Withdraw Cash, Buy, and Loyalty. A single `Withdraw Cash` entry opens `WithdrawCashOverlay` behind the existing `/atm-cashsend-overlay` route for compatibility; the overlay calls existing OTT provider-limits, payout quote, payout submit, and payout poll endpoints. User-facing copy no longer promises Standard Bank ATM-only redemption; it says provider cash PIN and clearly tells users the PIN arrives by SMS after a successful transaction and that the provider SMS contains usage instructions. Visible supplier catalog copy is now `Buy Retail Vouchers`, while `MyMoolah Vouchers` is reserved for wallet-value vouchers. The retail voucher catalog no longer silently hides active products when a brand is not mapped: mapped brands still get polished labels, while unmapped active voucher products appear with a sanitized retail-voucher name and `catalogAudit` metadata for follow-up. Added Shoprite/Checkers recognition in the voucher catalog so `Shoprite Voucher` receives a polished label. Removed stale unused ATM Cash Send placeholder component. Validation passed: `npm run build` in `mymoolah-wallet-frontend`, `node --check controllers/settingsController.js`, and Cursor lints on changed files. No wallet-debit UAT transaction was run in this frontend checkpoint; future UAT quote/submit testing needs André approval.
**Latest Governance Update**: **Frontend/design skill routing — ✅ OPTIMIZED** — Renamed the newly added `.agents/skills/design` skill to `.agents/skills/design-spec` and rewrote the three frontend-related skills with clear responsibilities: `design-spec` is for pre-build Design.md/product specs and UX flow plans, `frontend-design` is for production React UI implementation in wallet/portal/overlay screens, and `tailwind-design-system` is for shared Tailwind/CSS tokens, semantic colors, CVA variants, primitives, and cross-app consistency. Updated `.agents/skills/find-skills/SKILL.md` and `docs/CURSOR_SKILLS.md`; live inventory now contains 22 skills. Keep these skills separate for better agent routing and context performance.
**Latest Feature**: **OTT payout/catalog UAT readiness + payout/VAS tests — ✅ IMPLEMENTED / UAT MIGRATED / CONTROLLED PAYOUT + VOUCHER + GIFT CARD COMPLETED** — Completed the approved OTT payout/catalog readiness plan through UAT. Added `20260501_01_seed_vat_input_and_fee_accounts.js` for VAT input and fee/expense COA accounts, updated `TaxTransaction` for existing VAT direction columns, added `supplier_commercial_terms` via `20260501_02_create_supplier_commercial_terms.js`, seeded OTT payout/commercial policy data, and added `20260501_03_seed_ott_supplier_float.js` so wallet-backed OTT VAS purchases post face-value journals against `1200-10-08`. Added `SupplierCommercialTerm`, `ottCommercialTermsService`, and `ottProviderCatalogService`; payout quotes now load provider-specific DB terms and snapshot the full fee policy into `ott_payouts.fee_snapshot`. `scripts/ott-sync-providers.js --import-catalog` reads OTT active providers/limits and imports only customer-facing voucher/electricity/gift-card providers with net commission for `v_best_offers` ranking and gross/switching split in pricing JSON. Added OTT support in `ProductPurchaseService`, plus OTT commission fallback from imported product variants. Focused syntax checks and Jest tests pass (`21/21`). UAT migrations completed successfully via `./scripts/run-migrations-master.sh uat`; UAT read-only provider sync read 16 providers and imported 9 catalog products. Quote-only checks passed: Standard Bank Instant Money `2` R100 -> R112.45, ABSA CashSend `112` R100 -> R112.45, PayShap Account `127` R100 -> R103.88. André approved a controlled Standard Bank Instant Money test for UAT user `1` / `0825571055`: R10 amount + R11.45 provider fee + R1.00 MMTP fee = R22.45 total debit. Initial submit timed out after 15s, but `GetPaymentStatus` returned success with OTT payment reference `118268`; UAT payout `OTT-1777629657504-e811bbf7` was recovered to `completed`, wallet net debit verified, and journal `OTT-PAYOUT-OTT-1777629657504-e811bbf7` balances R22.45 debit/credit. Wallet-backed VAS tests also completed: Pick n Pay voucher `OTT-68` R10 succeeded with OTT reference `118269`; Nando's gift card `OTT-156` R10 succeeded with OTT reference `118270`; both produced completed orders, successful supplier transactions, wallet debits, balanced `VAS-FACE-*` journals, and balanced `COMMISSION-*` journals. Amazon Gift Card `OTT-141` is a provider-side UAT follow-up: R10 rejected as below R100 minimum, R100 returned OTT status `97` / `Internal Server Error`, and no wallet debit posted. Timeout handling is now hardened so future unknown submit outcomes stay `processing` for polling instead of auto-refunding. Keep `OTT_PAYOUT_ENABLED=false` outside controlled test commands; additional wallet-debit payout/voucher purchase tests require André approval.
**Latest VAT Fix**: **OTT VAT audit evidence — ✅ FIXED / UAT REPAIRED / VERIFIED** — Fixed future code paths so OTT payout MMTP fee VAT creates a `tax_transactions` row linked to the completed OTT fee `transactions.transactionId`, and OTT VAS commission VAT rows persist `supplier_code = OTT`, `vat_direction = output`, and `is_claimable = false`. Reversed OTT payouts now mark related payout-fee VAT evidence as `refunded`, preventing VAT over-reporting after reversals. UAT repair inserted the missing payout fee VAT evidence for `OTT-CORR-FEE-OTT-1777629657504-e811bbf7` (base R0.87, VAT R0.13, total R1.00) and enriched two controlled VAS VAT rows (`VOUCHER_1777631416565_w6odpx`, `VOUCHER_1777631510127_zz9t5r`) with `supplier_code = OTT`. Added read-only `scripts/audit-ott-vat-evidence.js`; UAT run checked 3 OTT VAT evidence rows with 0 issues. Focused checks pass: `node --check services/commissionVatService.js services/ott/ottPayoutService.js scripts/audit-ott-vat-evidence.js`, `npx jest tests/ott-payout-service.test.js tests/commission-vat-service.test.js --runInBand --forceExit` (11/11), Cursor lints clean, and UAT journal verification confirms the payout journal balances R22.45/R22.45 and the two OTT commission journals balance R0.07/R0.07.
**Previous Feature**: **OTT UAT read-only readiness — ✅ IMPLEMENTED / LOCAL TESTED / READ-ONLY UAT PASSED** — The official password-protected OTT Payout API manual was re-opened and the scaffold was aligned for UAT read-only testing. `services/ott/ottClient.js` now uses confirmed paths (`GetBranchCodes`, `GetActiveProvidersLimits`), `hashcheck`, nested hash parameter resolution, and manual-derived default hash orders. `scripts/ott-readonly-check.js` now sends required `requestdate` and `yourUniqueReference` values. `ottPayoutService` now builds the official `yourUniqueReference` / `provider` / `recipient` payload and validates required recipient fields before any wallet debit. Focused OTT syntax checks and Jest tests pass (`14/14`). After André added the OTT password/API key to local `.env.codespaces`, the first read-only call failed with OTT hash validation because `.env.codespaces` still overrode `OTT_HASH_FIELD_NAME=hash`; corrected the local gitignored value to `hashcheck`. Read-only OTT UAT smoke test then passed for `balance`, `providers`, and `limits` with HTTP 200. Keep `OTT_PAYOUT_ENABLED=false`; do not enable payout submission until André explicitly approves a UAT wallet-debit payout test.
**Latest Feature**: **Discovery RTP primary PBAC routing + bank-deposit display — ✅ IMPLEMENTED / NOT DEPLOYED** — Production test after `20260430_v4` confirmed the previous commit worked as designed but did not solve Discovery's original proxy mandate failure: SBSA returned `RJCT` with `EERRR,EBONF` for `MMRTPMMRTP1777546327002c81puw`, no hidden PBAC retry was created, and DB metadata recorded `pbacAutoRetry: suppressed`. Based on André's context that SBSA RTP accepts both PayShap proxies and bank details, `services/standardbankRtpService.js` now routes Discovery Bank RTPs as PBAC/account-based from initiation when both mobile and account details are supplied. Focused tests confirm Discovery builds `mode=PBAC`, `DbtrAcct` as the Discovery account number, `DbtrAgt=679000`, and `hasProxy=false`; non-Discovery mobile RTPs remain proxy-first. Legacy post-reject auto-PBAC remains disabled unless `STANDARDBANK_RTP_AUTO_PBAC_RETRY_ENABLED=true`; Discovery proxy-first can be restored only with emergency override `STANDARDBANK_RTP_DISCOVERY_PROXY_FIRST=true`. Future bank-origin deposit wording remains `Deposit from <sender>` or `Deposit`, SBSA/bank-origin deposits use the inbound arrow icon, and `mymoolah-wallet-frontend/utils/transactionDisplay.ts` cleans existing raw `/PREF/...PAYSHAP PAYMENT FROM` narratives to display as `Deposit` in transaction lists/detail modals. **Previous Feature**: **PayShap H2H R100 fallback recovery — ✅ FIXED / DEPLOYED / VERIFIED** — Production backend image `gcr.io/mymoolah-db/mymoolah-backend:20260430_v3` is live on Cloud Run revision `mymoolah-backend-production-00168-frn`. The skipped R100 statement fallback for wallet `0825571055` was reprocessed through the signed production notification endpoint after fixing the real production bugs: `standardbankDepositNotificationService.js` now records `inboundCreditEventId: inboundEventId`, and `inboundCreditEventService.js` allows retry of a failed event only when there is no wallet or Standard Bank credit evidence. DB verification confirmed exactly one R100.00 `standard_bank_transactions` row, one R100.00 wallet `transactions` row, and one R100.00 `sbsa_inbound_credit_events` row for `STMT-47927c63bd32557de46bd3e88c19c112`; no double credit occurred. **Previous Feature**: **Duplicate-proof PayShap H2H fallback — ✅ IMPLEMENTED / MIGRATED / DEPLOYED** — Phase 1 covers RPP / PayShapID / plain inbound PayShap credits only. Added `sbsa_inbound_credit_events` and `sbsa_inbound_credit_event_sources` plus `services/standardbank/inboundCreditEventService.js`; inbound PayShap notifications and controlled H2H PayShap-looking `TRF` fallback lines claim the same channel-neutral reconciliation key before any wallet credit. A delayed PayShap source after H2H fallback, or delayed H2H source after PayShap, is recorded as duplicate audit evidence and ignored for wallet credit. André applied migration `20260430_01_create_sbsa_inbound_credit_events.js` successfully in UAT, staging, and production after pulling `main`; backend was deployed afterward. RTP remains out of scope and must be designed separately because of fee/net-credit rules. **Previous Feature**: **COA fee and input VAT classification — ✅ DOCUMENTED / IMPLEMENT TOMORROW** — André confirmed tomorrow's accounting follow-up: distinguish SBSA/payment-rail cost of sales from general bank charges, and add a dedicated input VAT recoverable account rather than mixing input VAT with output VAT payable. `docs/CHART_OF_ACCOUNTS.md` now marks proposed accounts as **NEEDS MIGRATION**: `1300-20-01` VAT Input Recoverable, `5000-10-03` Cost of Sales: SBSA PayShap RPP/RTP Fees, `5000-10-04` Cost of Sales: EFT Supplier Payment Fees, and `5100-01-01` Bank Charges Expense. Rule: use CoS for fees directly tied to PayShap/RPP/RTP, supplier settlement, or supplier-float top-ups; use general bank expense for monthly/admin bank fees; use clearing/pass-through when a customer/client pays the underlying supplier/bank fee without MMTP margin. Use VAT split only when valid supplier/SBSA tax invoice support exists; otherwise post VAT-inclusive and flag Finance review.
**End-of-Day Status (2026-04-30 16:25 SAST)**: Discovery RTP and wallet display commits were pushed to `main` (`f35db188`, `22779fcd`, `3703ebed`). Production redeploy/retest after `3703ebed` was not verified in this wrap; André requested docs updates only and explicitly said not to commit or push these final documentation edits.
**Previous Feature**: **Migration ownership repair tool — ✅ IMPLEMENTED / DRY-RUN FIRST** — Added `scripts/repair-table-ownership.js` so future `must be owner of table` migration failures can be fixed permanently by transferring legacy `public` application objects to `mymoolah_app`, which is the role used by `./scripts/run-migrations-master.sh`. The tool audits tables, partitioned tables, sequences, views, materialized views, and foreign tables not owned by `mymoolah_app`; it uses `db-connection-helper.js` admin clients, is dry-run by default, requires `--apply`, and requires `--confirm-production` for production. Also clarified `scripts/grant-migration-privileges.js` because PostgreSQL grants do not make a role the owner for `ALTER TABLE`.
**Previous Feature**: **EasyPay V5 transaction reference migration hardening — ✅ IMPLEMENTED / UAT MIGRATIONS CONFIRMED / STAGING VERIFY NEXT** — Hardened `migrations/20260429_01_add_reference_to_transactions.js` after UAT failed with `ERROR: must be owner of table transactions`. The migration now checks `information_schema.columns`, `pg_indexes`, current user, and `public.transactions` owner before ownership-sensitive DDL. UAT confirmed `current_user=mymoolah_app`, `table_owner=postgres`, `has_column=false`, so added UAT-only admin repair script `scripts/repair-uat-transactions-reference.js` using `db-connection-helper.js` and explicit `--apply`. André ran the repair in Codespaces with the UAT admin password, then `./scripts/run-migrations-master.sh uat`; both `20260429_01_add_reference_to_transactions.js` and `20260429_02_create_ott_payouts.js` migrated successfully. The `Transaction.reference` field remains required by active EasyPay V5 cash-in `paymentNotification` deposit/fee rows; this is not a legacy cash-out-only artifact. André noted EasyPay changed fundamentally to V5 cash-in only; legacy EasyPay cash-withdrawal reference code remains in `controllers/voucherController.js`/`models/voucherModel.js` and is documented as tech debt for a dedicated cleanup pass.
**Previous Feature**: **OTT Payout implementation scaffold — ✅ IMPLEMENTED / DISABLED BY DEFAULT / PARTNER CONTRACT GATES REMAIN** — Added feature-gated OTT Mobile Payout scaffold: `services/ott/ottClient.js`, `services/ott/ottPayoutService.js`, `routes/ott.js` mounted at `/api/v1/ott`, `models/OttPayout.js`, migration `20260429_02_create_ott_payouts.js`, `services/reconciliation/adapters/OttAdapter.js`, and `scripts/ott-readonly-check.js`. Added local gitignored `.env.codespaces` placeholders with `OTT_API_USERNAME=MYMOOLAHPOT` (password/API key still to be pasted by André), env template placeholders, Secret Manager mapping in `scripts/deploy-backend.sh`, Chart of Accounts entry `1200-10-08`, OTT framework contract gates, and focused tests. **Do not enable `OTT_PAYOUT_ENABLED=true`** until OTT confirms exact endpoint paths, endpoint hash parameter order, provider codes/limits, webhook schema/retry cadence, status/error matrix, settlement/recon format, and Finance-approved fee inputs.
**Previous Feature**: **EasyPay V5 expiry + partner test PIN fix — ✅ IMPLEMENTED / NEEDS STAGING MIGRATION + FULL-FLOW VERIFY** — Standardised EasyPay PIN/voucher expiry to **30 days** and hardened staging partner test data generation. Follow-up audit after Theodore's `paymentNotification` HTTP 500 fixed the callback to write canonical `wallet.walletId`, lock bill/wallet rows during callback processing, validate integer-cent notification amounts, bypass spend limits only for the post-deposit EasyPay fee sweep, and use internal composite EasyPay payment references so reused POS references cannot trip the unique `payments.reference` index. The generator now creates exact-amount cash-in rows (`minAmount=maxAmount=amount`), forces PIN/account XLSX columns to text, and aborts on skipped inserts. Latest staging full-flow showed the deployed code now writes `Transaction.reference`, but staging DB lacked the physical `transactions.reference` column; apply migration `20260429_01_add_reference_to_transactions.js` before retesting. Before asking EasyPay to retest: pull latest, run `./scripts/run-migrations-master.sh staging`, regenerate with `node scripts/generate-easypay-test-pins.js --staging`, run one disposable full-flow check with `EASYPAY_API_KEY='...' node scripts/verify-easypay-test-pins.js --staging --allow-payment-notification --payment-notification-limit=1`, then regenerate a clean final batch and run safe verification.
**Older Feature**: **Weekly Agent Governance Optimizer — ✅ IMPLEMENTED / STAGING-FIRST DRAFT-ONLY** — Added a Cloud Scheduler-ready optimizer that scans `.cursor/rules/`, `.agents/skills/`, and governance docs, validates frontmatter/drift/project-law safety, records idempotent weekly runs in `agent_optimizer_runs`, and can publish draft PRs for André review without auto-merging to `main`. New endpoint: `POST /api/v1/agent-governance/scheduled-skills-rules-optimizer` using existing Cloud Scheduler OIDC auth. Defaults are disabled/dry-run: set `AGENT_GOVERNANCE_OPTIMIZER_ENABLED=true`; keep `AGENT_GOVERNANCE_OPTIMIZER_DRY_RUN=true` for first staging run. Production scheduler creation is gated by `AGENT_GOVERNANCE_CREATE_PRODUCTION_SCHEDULER=true` after staging output is approved.
**Older Feature**: **Wallet-to-bank EFT H2H activation (v3.0.0) — ✅ IMPLEMENTED / UAT MIGRATIONS CONFIRMED** — Bank payments in the routed Send Money page now default to SBSA H2H EFT, with an **Instant Payment** toggle that uses existing PayShap RPP rails. Added `/api/v1/wallet-bank-payments/quote` and `/api/v1/wallet-bank-payments/submit`, `transaction_fee_policies` for effective-dated customer fees, `wallet_bank_payments` for payment lifecycle audit, R2.00 UAT EFT fee seed, 15:00 SAST EFT receipt estimate logic with Saturday intake and SA public holidays, and Pain.002-driven reversal/refund handling. Migration `20260425110000_create_wallet_bank_payments_and_fee_policies.js` was hardened after a partial-run index conflict and André confirmed UAT + staging migration scripts completed successfully in Codespaces. Production remains gated: keep `WALLET_BANK_EFT_ENABLED=false` until Penny #2 FINAUD and inbound R10 validation are complete. Website decision: manage `www.mymoolah.africa` SEO/content/FAQ/AI support in the separate website project/Claude Code; this MMTP repo owns secure APIs, MMAP integration, auth, audit, and wallet/backend services.  
**Even Older**: **SBSA H2H PROD Penny #1 — ✅ SUCCESS (root cause on SBSA side, resolved 2026-04-23 11:54 SAST)** — Full Production H2H round-trip confirmed end-to-end with real money.  
**Document Version**: 3.0.0  
**Session logs**: `docs/session_logs/2026-05-11_1209_ott-authorized-product-sync.md` (latest — OTT authorised provider spreadsheet/email sync, Staging non-destructive hide/unpublish apply, production gated); `docs/session_logs/2026-05-10_2232_referral-sms-secret-binding.md` (referral SMS MyMobileAPI secret bindings restored in backend deploy script; staging and production Cloud Run services updated); `docs/session_logs/2026-05-10_2119_voucher-gift-split.md` (Buy Retail Vouchers and Gift Cards now mutually exclusive in the wallet UI while reusing the shared purchase engine); `docs/session_logs/2026-05-08_0823_staging-ott-gift-card-parity.md` (Staging live OTT endpoint/product/transaction parity, sync/import, backend/wallet staging deploy, and 18-brand verification); `docs/session_logs/2026-05-08_0720_gift-cards-bottom-nav.md` (Gift Cards bottom navigation fix); `docs/session_logs/2026-05-07_1748_ott-live-absa-smoke.md` (live production ABSA smoke completed and reconciled); `docs/session_logs/2026-05-07_1610_ott-gift-card-catalog-sync.md` (OTT gift-card provider sync/import fix); `docs/session_logs/2026-05-07_1545_gift-cards-wallet-entry.md` (Gift Cards wallet entry point reusing retail voucher purchase flow); `docs/session_logs/2026-05-07_1442_ott-transaction-display-fix.md` (dashboard Recent Transactions line-item fix and OTT safe descriptions); `docs/session_logs/2026-05-07_1133_ott-staging-payout-validation.md` (ABSA staging payout completed; Nedbank staging rejected by OTT account authorisation and reversed/refunded); `docs/session_logs/2026-05-07_1051_ott-production-catalog-readiness.md` (OTT production catalog readiness, read-only audit, voucher recognition, Withdraw Cash hardening); `docs/session_logs/2026-05-07_1007_mobilemart-sftp-email-handover.md` (MobileMart SFTP email handover and partner static-IP next step); `docs/session_logs/2026-05-05_2011_uber-eats-governance-docs.md` (Uber / Eats governance handover and OTT morning parking note); `docs/session_logs/2026-05-05_1708_ott-production-float-funding-coa.md` (OTT production float funding COA journals); `docs/session_logs/2026-05-05_1333_ott-commercial-volume-forecast.md` (OTT commercial volume forecast); `docs/session_logs/2026-05-02_1442_referral-sms-outcome-modal.md` (referral SMS outcome modal); `docs/session_logs/2026-05-02_1105_send-money-instant-payment-ui.md` (Send Money Instant Payment UI); `docs/session_logs/2026-05-02_1053_retail-voucher-brand-logos.md` (retail voucher brand logos); `docs/session_logs/2026-05-02_1039_branded-loading-spinner.md` (branded wallet loading spinner); `docs/session_logs/2026-05-02_0730_ott-webhook-contract-alignment.md` (Jaco email alignment for timeout, webhook hash, statuses, and pending completion ledger recovery); `docs/session_logs/2026-05-01_2205_ott-payout-diagnostics.md`; `docs/session_logs/2026-05-01_2105_voucher-purchase-identity-fix.md`; `docs/session_logs/2026-05-01_2022_product-catalog-governance.md`; `docs/session_logs/2026-05-01_1844_wallet-withdraw-cash-ui-cleanup.md`; `docs/session_logs/2026-05-01_1640_ott-withdraw-cash-frontend.md`; `docs/session_logs/2026-05-01_1146_ott-payout-catalog-uat-readiness.md`; `docs/session_logs/2026-05-01_1055_ott-uat-readonly-readiness.md`; `docs/session_logs/2026-04-30_1625_discovery-rtp-h2h-wrap.md`; `docs/session_logs/2026-04-30_1225_discovery-rtp-pbac-suppression.md`; `docs/session_logs/2026-04-30_1220_h2h-r100-reprocess.md`; `docs/session_logs/2026-04-29_2150_sbsa-h2h-fstp-finalisation.md`; `docs/session_logs/2026-04-29_2020_easypay-reference-migration-hardening.md`; `docs/session_logs/2026-04-29_1904_ott-payout-scaffold.md`; `docs/session_logs/2026-04-29_1046_easypay-v5-expiry-staging-test-pins.md`; `docs/session_logs/2026-04-28_1745_ott-mobile-integration-framework.md`
**Classification**: Internal - Banking-Grade Operations Manual

---

## 📌 **WHAT IS MYMOOLAH?**

MyMoolah Treasury Platform (MMTP) is South Africa's premier Mojaloop-compliant digital wallet and payment solution. It provides: wallet services, VAS (airtime, data, vouchers, bill payments, electricity), cash-out (EasyPay), referrals, KYC, and automated multi-supplier reconciliation. AI support powered by LangChain RAG v3.1 with 240-entry KB and topic filtering. Self-hosted security layer: Redis-backed distributed rate limiting, bot scoring, PoW CAPTCHA, AI cost gateway, GCP Cloud Armor WAF + Cloud CDN — no SaaS dependencies. **Production**: api-mm.mymoolah.africa, wallet.mymoolah.africa. Built on Node.js, PostgreSQL, React, GCP. For operating rules, workflow, and constraints, read `docs/CURSOR_2.0_RULES_FINAL.md` first.

---

## 📋 **NEW AGENT ONBOARDING CHECKLIST** (DO IN ORDER)

1. [ ] Read `docs/CURSOR_2.0_RULES_FINAL.md` (MANDATORY - provide proof of reading)
2. [ ] Read this file (`docs/AGENT_HANDOVER.md`)
3. [ ] Read 2-3 most recent `docs/session_logs/*.md`
4. [ ] Read `docs/CHANGELOG.md` (last 2 weeks)
5. [ ] Read `docs/DATABASE_CONNECTION_GUIDE.md` (if DB work planned)
6. [ ] Run `git status` → commit or stash if needed
7. [ ] Run `git pull origin main`
8. [ ] Run `git log --oneline -10`
9. [ ] Review "Next Development Priorities" below
10. [ ] Confirm with user: "✅ Onboarding complete. Ready to work on [task]. What would you like me to do?"

---

## 📚 **DOCUMENT MAP** (Which Doc for What)

| Need to… | Read |
|----------|------|
| Understand rules & workflow | `docs/CURSOR_2.0_RULES_FINAL.md` |
| Understand project & status | `docs/AGENT_HANDOVER.md` (this file) |
| See change history | `docs/CHANGELOG.md` |
| Run DB migrations | `docs/DATABASE_CONNECTION_GUIDE.md` |
| Set up dev environment | `docs/DEVELOPMENT_GUIDE.md` |
| Test in Codespaces | `docs/CODESPACES_TESTING_REQUIREMENT.md` |
| Portal development | `docs/PORTAL_DEVELOPMENT_GUIDE.md` |
| Ledger Chart of Accounts | `docs/CHART_OF_ACCOUNTS.md` |
| EasyPay V5 agent onboarding (START HERE) | `docs/EASYPAY_V5_AGENT_HANDOVER.md` |
| EasyPay V5 implementation plan (6 tasks) | `docs/EASYPAY_V5_FINALISATION_PLAN.md` |
| EasyPay V5 partner questions & finalisation | `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md` + `docs/integrations/EasyPay_API_Integration_Guide.md` |
| Deploy | `docs/DEPLOYMENT_GUIDE.md`, `docs/archive/deployment/GCP_PRODUCTION_DEPLOYMENT.md` |
| API contracts | `docs/API_DOCUMENTATION.md` |
| Recent chat context | `docs/session_logs/` (2-3 most recent) |
| Cursor skills inventory (21 skills) | `docs/CURSOR_SKILLS.md` |
| Historical updates & integrations | `docs/archive/agent_handover_history.md` |
| Extended rules (model selection, examples) | `docs/archive/CURSOR_RULES_EXTENDED.md` |
| Docs archive map | `docs/DOCS_CONSOLIDATION_2026.md` |
| **Flash API docs, legal, deal sheet** | **Google Drive: https://drive.google.com/drive/folders/1KbQ1joMy8h3-B6OoDAG3VigqcWNUBWno?usp=sharing** |
| Flash local API reference & testing | `integrations/flash/FLASH_TESTING_REFERENCE.md` |
| **MobileMart API docs, legal, product lists** | **Google Drive: https://drive.google.com/drive/folders/1_qpaRxUBTCr40wlFl54qqSjNZ6HX8xs3?usp=sharing** |
| MobileMart local integration docs | `integrations/mobilemart/MOBILEMART_REFERENCE.md` |
| VAS supplier failover architecture | `services/vasSupplierExecutor.js`, `services/supplierFailoverService.js`, `services/supplierCircuitBreaker.js` |
| **Zapper API docs, SLA, QR test codes** | **Google Drive: https://drive.google.com/drive/folders/1cvXKEACgwbvZsp8A-8KPy8-q0QvWcVgh?usp=sharing** |
| Zapper local integration docs | `integrations/zapper/ZAPPER_REFERENCE.md` |
| **OTT Mobile integration framework** | `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md` |
| **Withdrawals / eeziCash / TPPP (AML, monitoring, KB)** | `docs/WITHDRAWALS_COMPLIANCE_AND_KB.md` + `docs/integrations/MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html` + `docs/policies/INDEX.md` |
| Security overview (incl. cash-out logging) | `docs/security.md` |
| Sponsor TPPP brief (withdrawals section) | `docs/STANDARD_BANK_TPPP_BRIEF.md` |

---

## 📋 **WHAT TO DO / WHAT NOT TO DO** (PROJECT-SPECIFIC)

| ✅ DO | ❌ DON'T |
|------|----------|
| Edit any UI/frontend (code is source of truth) | Wait for Figma or treat any `.tsx` as design-tool-owned |
| Adapt backend to support frontend needs | Use git worktrees |
| Work in `/mymoolah/` only | Test on local |
| Test in Codespaces | Use dummy/test data for production flows |
| Use real transactions (no dummy data) | Use dummy/test data for production flows |
| Sweep `scripts/` before creating | Create duplicate scripts |
| Run migrations before seeding | Seed before migrations |
| Commit AND push after changes | Leave push for user |

---

## 📋 **TABLE OF CONTENTS**

### **I. Critical Requirements (MUST READ FIRST)**
1. [Critical: New Agents Must Read Rules First](#-critical-new-agents-must-read-rules-first-)
2. [Critical: All Testing Must Be in Codespaces](#-critical-all-testing-must-be-in-codespaces-)
3. [Critical: Never Use Git Worktrees](#-critical-never-use-git-worktrees-)

### **II. Operating Principles**
4. [Agent Operating Principles](#-agent-operating-principles-mandatory-reading)
5. [Decision Gates](#decision-gates)
6. [Common Anti-Patterns](#common-anti-patterns-avoid-these)

### **III. Current Project Status**
7. [Current Session Summary](#-current-session-summary)
8. [Recent Updates](#recent-updates-last-14-days)
9. [Reconciliation System](#-reconciliation-system)
10. [Next Development Priorities](#-next-development-priorities)
11. [Recommendations for Next Agent](#-recommendations-for-next-agent)

---

**Archived content**: See `docs/archive/agent_handover_history.md` for historical updates, integration details (Peach, Zapper, MMAP, Figma), and previous session summaries.

---

## 📊 **EXECUTIVE SUMMARY**

### **Platform Status**
The MyMoolah Treasury Platform (MMTP) is a **production-ready, banking-grade financial services platform** with complete integrations, world-class security, and 11-language support. The platform serves as South Africa's premier Mojaloop-compliant digital wallet and payment solution.

### **Latest Achievement (April 8, 2026 - 09:45)**
**Disbursement portal hardening (v2.92.0)** — **Auth**: `middleware/auth.js` tries `JWT_SECRET` then `PORTAL_JWT_SECRET` so portal admin tokens work on main-backend routes (`/api/v1/disbursement-clients`, etc.). **listClients**: Portal JWTs carry `portalUserId` not `id`; non-admin branch no longer sets `created_by` to `undefined` (Sequelize 500). Portal callers with `portalUserId` see full client list. **Client portal users**: CRUD under `/api/v1/disbursement-clients/:clientId/users`; `getClient` includes `users` (excludes `password_hash`); admin overlay Section 5. **Validation**: `client_code` pattern `^[A-Za-z0-9-]{1,20}$`. **Docs**: `CODESPACES_TESTING_REQUIREMENT` v1.1.0 (one-click vs `start-all-services.sh`, log paths), `CURSOR_2.0_RULES_FINAL`, `git-workflow.mdc`, `PORTAL_DEVELOPMENT_GUIDE` v1.1.1, `DEVELOPMENT_GUIDE`, `DISBURSEMENT_API`, `SBSA_WAGE_DISBURSEMENT_PLAN` status, `CHANGELOG` v2.92.0. Session log: `docs/session_logs/2026-04-08_0930_disbursement-portal-codespaces-docs.md`.

### **Previous Achievement (April 7, 2026 - 23:45)**
**Disbursement Phase 3 Complete (v2.91.0)** — All SBSA Wage Disbursement Plan sub-phases (A-E) fully implemented. **CSS migration**: 5 portal overlays migrated from inline hex to design system tokens (`--primary`, `--success-color`, `--destructive`, Tailwind class maps). **CRITICAL FIX**: `disbursementController.js` was using `req.user?.id` which is `undefined` for portal JWTs — added `resolveUserId()` that reads `portalUserId || id`. Added `requireDisbursementAccess` route middleware. **SFTP results delivery** (Sub-phase E): `notificationEngine.js` extended with `buildResultsCsv()` + `sendSftpResults()` via GCS; wired into `disbursementNotificationService.js` (fire-and-forget). **139 unit tests**: `feeEngine` (32), `clientFloatService` (39), `fileParserService` (68) — all passing. **API docs**: `docs/DISBURSEMENT_API.md` (852 lines) — Quick Start, 17 endpoints, webhook contract, ISO 20022 rejection codes, CSV format. **Notification settings UI**: Section 4 added to `DisbursementClientDetailOverlay.tsx` — event types x channels with toggle badges. **White-label client portal**: 11 new files — `clientPortalAuth.js` middleware, auth + portal controllers, routes at `/api/v1/client-portal`, 6 React pages (login, layout, dashboard, runs list, run detail, upload), `ClientAuthContext`, wired in `server.js` + `RouteConfig` + `AppProviders`. Vite build: 1445 modules, zero errors. Session log: `docs/session_logs/2026-04-07_2345_disbursement-phase3-complete.md`.

### **Previous Achievement (April 7, 2026 - 22:30)**
**Disbursement Wallet Architecture Fix + PayShap RPP + Multer (v2.90.0)** — CRITICAL architecture fix: wallet disbursements now use **internal ledger transfer** (DR Client Float 2100-20-XX → CR User Wallet 2100-01-01) instead of routing through the bank. `approveRun()` fully rewritten with three-way rail split: **EFT** (Pain.001 bulk XML + SBSA SFTP, unchanged), **PayShap** (calls existing RPP service per payment via `sbClient.initiatePayment()`, instant), **Wallet** (finds User by MSISDN, credits wallet via `Wallet.credit()`, creates Transaction record, marks 'accepted' immediately). Float debited per-rail group with correct journal entries. `createRun()` fixed — wallet payments no longer set treasury account details. `clientFloatService.debitFloat()` updated — wallet rail credits `USER_WALLET_ACCOUNT` (2100-01-01) not `BANK_ACCOUNT`. PayShap RPP wired into disbursement flow using existing `pain001Builder` + `sbClient`. Multer wired into routes for real multipart file uploads. xlsx installed (v0.18.5). All 59 verification checks pass. Session log: `docs/session_logs/2026-04-07_2230_disbursement-wallet-fix-rpp-multer.md`.

### **Previous Achievement (April 7, 2026 - 21:00)**
**Disbursement Phase 2 — API, Models & Portal UI (v2.89.0)** — Complete Phase 2 of the disbursement service. **5 new Sequelize models**: DisbursementClient, DisbursementClientFee, KybDocument, DisbursementNotificationPreference, DisbursementClientUser (auto-loaded by models/index.js). **Updated** DisbursementPayment model (added fee_cents, payment_rail, metadata). Added belongsTo(DisbursementClient) on DisbursementRun. **Client management API**: `disbursementClientController.js` (9 methods: CRUD, KYB upload/review with auto-OCR, fee configuration, beneficiary file parsing) + `routes/disbursementClient.js` (9 validated endpoints) wired at `/api/v1/disbursement-clients` in server.js. **Portal UI**: DisbursementClientManagementOverlay (client list, filters, create modal) + DisbursementClientDetailOverlay (detail view, KYB documents, fee config). Routes + sidebar registered. **Fixed** Vite proxy split: `/api/v1/admin` → portal backend (3002), `/api` → main backend (3001). **Wired** notificationEngine into disbursementService (submit/approve/reject fire-and-forget). **Wired** kybComplianceService GPT-4o OCR into document upload flow. All syntax checks + Vite build pass. No new migrations needed. Session log: `docs/session_logs/2026-04-07_2100_disbursement-phase2-api-models-portal.md`.

### **Previous Achievement (April 7, 2026 - 16:30)**
**Disbursement Phase 1 Backend Services (v2.88.0)** — Complete Phase 1 backend for the banking-grade disbursement service (Sessions 1-3). **2 migrations**: `20260408_01` creates 5 new tables (`disbursement_clients`, `disbursement_client_fees`, `kyb_documents`, `disbursement_notification_preferences`, `disbursement_client_users`) + alters `disbursement_payments` (adds `fee_cents`, `payment_rail`); `20260408_02` seeds 5 ledger accounts. **7 new services**: `feeEngine.js` (per-client fee calculation in cents), `clientFloatService.js` (ACID float with SELECT FOR UPDATE + double-entry JEs), `fileParserService.js` (CSV/Excel/Pain.001 XML + SA CDV), `kybComplianceService.js` (GPT-4o OCR for 5 entity types), `notificationEngine.js` (webhook HMAC + email, 8 event types), `sbsaSftpClientService.js` (GCS-based SFTP upload), `pain002PollerService.js` (GCS inbox poller). **Modified** `disbursementService.js` for multi-rail routing: wallet payments use MM's SBSA treasury account + MSISDN as reference (same EFT path). KYB gate on submission. Fee + float integrated into approval flow. PayShap RPP deferred (TODO). ~3,400 lines of new banking-grade code. **Migrations NOT yet run — run on UAT then staging.** Session log: `docs/session_logs/2026-04-07_1630_disbursement-phase1-services.md`.

### **Previous Achievement (April 7, 2026 - 15:00)**
**Portal Cloud Run Staging Deployment (v2.87.0)** — MMTP Admin Portal deployed to GCP Cloud Run (staging) as single-service architecture. Express backend serves both API and frontend static files from one origin (banking-grade: no CORS between services, simpler CSP). Created multi-stage Dockerfile, `deploy-portal.sh` with `--no-cache` (no cached builds), `start.sh` entry point (constructs DATABASE_URL from Cloud Run env vars). Fixed Vite `crossorigin` CORS issue. Updated `seed-portal-admin.js` to accept `uat|staging|production` argument. Portal verified live: health endpoints, DB connection, login, dashboard. Session log: `docs/session_logs/2026-04-07_1500_portal-cloud-run-staging-deployment.md`.

### **Previous Achievement (April 7, 2026 - 11:30)**
**Portal Layout Consistency Fix (v2.86.4)** — Fixed sidebar "floating" between pages in MMAP. Three root causes: (1) `index.html` `#root` had persistent `display: flex; align-items: center; justify-content: center` from loading spinner CSS — centered the entire app instead of stretching edge-to-edge. Scoped with `:has(.loading-container)`. (2) No `html/body/#root` height chain — added outside `@layer` in `index.css`. (3) `AppLayoutWrapper` remounted on every navigation (each route had its own copy) — converted to React Router nested routes with single `<AppLayoutWrapper/>` using `<Outlet/>`. Sidebar now persists across navigation, no more visual flicker. Vite build passes. Session log: `docs/session_logs/2026-04-07_1130_portal-layout-consistency-fix.md`.

### **Previous Achievement (April 7, 2026 - 02:15)**
**Proxy Auth Token Fix (v2.86.3)** — Fixed root cause of recurring `read ECONNRESET` in Codespaces. Previous 3s stabilization pause only addressed cold-proxy timing; the real cause was **expired OAuth2 tokens** in stale Cloud SQL Auth Proxies (proxy held port open but returned 401 on every DB connection). `start-all-services.sh` Step 2 now: (1) kills all existing proxies on ports 6543/6544/6545, (2) refreshes gcloud access token non-interactively via `gcloud auth print-access-token`, (3) warns if refresh fails (user may need manual `gcloud auth login`), (4) starts fresh proxies with valid credentials. Tested by Andre in Codespaces — all 6 services started cleanly. Session log: `docs/session_logs/2026-04-07_0200_start-all-services-auth-token-fix.md`.

### **Previous Achievement (April 7, 2026 - 01:45)**
**Portal UI Complete + Brand Logos + Dev Guide (v2.86.2)** — (1) Portal UI overhaul approved by Andre. 5 screens fully styled with CSS variables: Login (split-screen brand layout with stacked logo), Dashboard (KPI cards, settlements, alerts, entity table), AppLayoutWrapper (dark sidebar with diamond icon logo, header with page title), UserManagement (user list, KYC dots, detail drawer), TransactionMonitoring (transaction list, filters, journal drawer). 4 screens functional but use inline styles (UnallocatedDeposits, Disbursement×3). 7 placeholder "Coming Soon" screens with styled layouts. (2) Official MyMoolah brand logos integrated (3 PNG variants: stacked, icon, horizontal) — login brand panel, sidebar header, mobile header. (3) Primary color corrected from `#00B894` (teal) to `#86BE41` (MyMoolah brand green). Blue `#2D8CCA` confirmed as secondary. All CSS tokens updated. (4) Created `docs/PORTAL_DEVELOPMENT_GUIDE.md` — design tokens, logo usage rules, architecture, screen status, build tutorial, conventions, recommended build order. (5) SKILL.md brand color table updated with official RGB values. (6) Fixed `start-all-services.sh` — 3s proxy stabilization pause. Session logs: `docs/session_logs/2026-04-07_0130_portal-ui-final-documentation.md`, `docs/session_logs/2026-04-06_2330_portal-ui-overhaul.md`.

### **Previous Achievement (April 6, 2026 - 22:30)**
**Codespaces Startup Script & Portal Auth Security Fix (v2.85.2)** — Created `scripts/start-all-services.sh` for one-command Codespaces startup (proxies, main backend, wallet frontend, portal backend, portal frontend, all ports set to Public). Migrated all portal auth from `localStorage` to `sessionStorage` across 8 files — closing the browser now requires re-login (banking-grade). Debugged and resolved Codespaces port forwarding 404 issue (browser cache). Session log: `docs/session_logs/2026-04-06_2230_startup-script-and-auth-fix.md`.

### **Previous Achievement (April 6, 2026 - 22:00)**
**MMTP Admin Portal DB Helper Migration & First Live Test (v2.85.1)** — Continuation of portal rebuild. All portal backend controllers migrated from custom Sequelize to `db-connection-helper.js` via new `portal/backend/helpers/getDbClient.js` wrapper. Fixed frontend build failures: missing `tsconfig.json`, unavailable `Handshake` icon (replaced with `Briefcase`), `dist/` added to `.gitignore`. Created `scripts/seed-portal-admin.js` for seeding admin users. Portal tested end-to-end in Codespaces: JWT HS512 login, dashboard with real UAT data, Clearflow sidebar navigation. **Andre confirmed portal is functional but "looks horrendous" — UI styling is the #1 priority for next session.** Read the `frontend-design` skill and Behance Clearflow reference for design direction. Session logs: `docs/session_logs/2026-04-06_2200_portal-db-helper-and-testing.md`, `docs/session_logs/2026-04-06_2100_portal-security-hardening-and-rebuild.md`.

### **Previous Achievement (April 6, 2026 - 15:00)**
**USSD Phase 2 Services (v2.84.0)** — Complete USSD Phase 2 for `*120*5616#` (production) and `*120*34248#` (staging). New services: (1) Send Money (P2P) — wallet-to-wallet to existing MMTP users, free SMS to both parties. (2) Airtime for Others (eeziAirtime) — Flash PIN voucher, SMS delivery, R0.40 fee. (3) Buy Electricity (eeziPower) — Flash PIN voucher, SMS delivery, R0.40 fee. (4) Buy Voucher — 6 brands (1Voucher, OTT, Blu, Betway, Hollywood Bets, SupaBets), commission-based supplier selection, PIN via SMS, R0.40 fee. (5) Cash Out updated to PIN via SMS (R0.40 fee). (6) New ledger account `4000-20-03` SMS Fee Revenue, 3-line JE (R0.35 ex-VAT + R0.05 VAT). (7) Menu restructured: Main — Balance, Send Money, Buy Airtime, Buy Data, Cash Out, More. More — Airtime for Others, Electricity, Vouchers, Mini Statement, Change PIN, Referral, Help. Migration `20260406_01` applied to staging + production. Session log: `docs/session_logs/2026-04-06_1400_ussd-phase2-services.md`.

### **Previous Achievement (April 6, 2026 - 14:00)**
**Voucher v_best_offers Integration, Electricity Cleanup & adService Typo Fix (v2.83.0)** — Integrated voucher catalog with `v_best_offers` materialized view. Fixed Flash electricity hardcoded values. Fixed `2100-05-001` → `2100-05-01` ledger account typo. Cleaned up stale bestOfferService references. Session log: `docs/session_logs/2026-04-06_1400_voucher-v-best-offers-electricity-cleanup.md`.

### **Previous Achievement (April 6, 2026 - 10:00)**
**Auditing Skill v2.1.0 + Admin Portal Builder Skill + Knowledge Base Update (v2.82.0)** — (1) Enhanced `.agents/skills/auditing/SKILL.md` from v2.0.0 to v2.1.0 with 8 targeted improvements: canonical CoA reference to `docs/CHART_OF_ACCOUNTS.md`, Mojaloop-to-MMTP account code mapping table, commission config reference (`config/supplier-commissions.json`, `v_best_offers`, `tax_transactions` FK known issue), Cloud Scheduler integration patterns (Section 9.6), `v_best_offers`/`ProductVariant`/`ProductSelectionRule` in architecture reference, IFRS/IAS presentation requirements, and Agent Optimization section for Claude Opus 4.6 (Section 15). (2) Created new `.agents/skills/admin-portal-builder/SKILL.md` v1.0.0 — 12-section guide (680+ lines) for MMTP Admin Portal: RBAC, dashboard architecture, data tables, maker-checker workflows, admin audit logging, overlay patterns, API design, 15-screen priority list, frontend component standards, code review checklist. (3) Updated `docs/CURSOR_SKILLS.md`, `docs/CHANGELOG.md`, `.cursor/rules/tech-debt.mdc`, `docs/AGENT_HANDOVER.md`. Internet research across GitHub, OpenClaw, LobeHub, and 5+ repositories confirmed existing auditing skill is already best-in-class. Session log: `docs/session_logs/2026-04-06_1000_auditing-skill-portal-skill-knowledge-base.md`.

### **Previous Achievement (April 4, 2026 - 23:00)**
**Chart of Accounts & Missing Account Migrations (v2.80.0)** — (1) Created `docs/CHART_OF_ACCOUNTS.md` as the canonical CoA reference: 28 accounts, 15 journal templates, Mojaloop settlement mapping, solvency rules, product registration checklist, reserved ranges for 10 future verticals (MoolahMove, TCIB, lending, insurance, stokvels, etc.), env var map, cross-references. Documented 5 misalignments in `internationalPaymentService.js`. (2) Created migration `20260405_01_seed_missing_ledger_accounts.js` for 4 accounts (`1100-02-01` SBSA Statement Recon, `2200-03-01` Referral Payable, `2600-01-01` Unallocated Suspense, `5100-02-01` Referral Expense). Applied to staging and production — all 4 already existed (manually created). Migration recorded in `SequelizeMeta`. Tech-debt updated: missing migrations RESOLVED, internationalPaymentService and adService `2100-05-001` typo flagged. Session log: `docs/session_logs/2026-04-04_2300_chart-of-accounts.md`.

### **Previous Achievement (April 3, 2026 - evening)**
**Production Full Audit Script + Treasury / Referral / Voucher / VAS Audit Refinements** — Added and hardened `scripts/production-full-audit.js` (db-connection-helper, multi-env). Wallet reconciliation fixed for positive stored amounts on outflows. Referral audit aligns `referral_earnings` with `REFERRAL-%` journal entries; production ledger topped up for two missing referral postings (manual, session log). Treasury section documents operator TA facts (**R2,500** MobileMart bank prepayment, P2P vs Flash), removes misleading balance equality check, shows MobileMart `supplier_floats`. RTP fees described as **R5.75 full pass-through** (no MM margin). Internal **MyMoolah** voucher legs scoped via metadata (`voucher_issue` / `standard`); outbound voucher payments listed separately. VAS completeness warnings cleared using `metadata.walletTransactionId` and commission JE timestamp proximity. Session log: `docs/session_logs/2026-04-03_2100_production-audit-treasury-referrals-vouchers-vas.md`.

### **Previous Achievement (April 3, 2026 - 15:00)**
**VAS Catalog Simplification (Staging + Production) + Biller Telecoms Fix + eeziPower Label Fix** — (1) Applied VAS Catalog Simplification to production: ran migrations `20260403_02` (product_selection_rules, 60 rules) and `20260403_03` (v_best_offers materialized view, 197 rows). 8/9 regression tests passed. (2) Fixed empty Telecoms biller category: MobileMart's `mobilemart_content_creator: "telcos"` wasn't in `BILLER_CATEGORY_MAP` — added keyword, unlocking 35 telecoms billers. (3) Fixed eeziPower purchases mislabelled as "eeziAirtime": backend now uses correct labels/vasType/metadata per `isEeziPower` flag; frontend `TransactionDetailModal` shows "Your eeziPower PIN" with amber styling and electricity instructions. Session logs: `docs/session_logs/2026-04-03_1500_vas-catalog-production-biller-eezipower-fix.md`, `docs/session_logs/2026-04-03_1400_vas-catalog-simplification.md`.

### **Previous Achievement (April 3, 2026 - 09:00)**
**Referral System Banking-Grade Fix** — Complete audit and fix of referral system. Core bug: `generateReferralCode()` generated new random code on every call, never persisting it. Codes displayed on Referral page changed every refresh; copied codes couldn't be used for signup. Fixed: added `referral_code` column to `users` table (migration `20260403_01`), code generated once and reused forever. `processSignup()` now dual-path: matches SMS invite codes first, then stable user codes. USSD `handleReferralCode()` fixed (queried non-existent `referral_codes` table). Dead `getReferralCode()` removed from frontend apiService. Controller dashboard parallelized with `Promise.all()`. All error responses hardened (no `error.message` leak). Share URL corrected to `wallet.mymoolah.africa/register`. Zero linter errors. **Requires migration + redeployment.** Session log: `docs/session_logs/2026-04-03_0900_referral-system-banking-grade-fix.md`.

### **Previous Achievement (April 2, 2026 - 15:30)**
**RTP Discovery Bank Reconciliation & CdtrRefInf.Ref Fix** — (1) Live R10 RTP to Discovery Bank reconciled across all production ledgers: wallet credited R4.25 (R10 - R5.75 fee), SBSA fee correctly split (R5.00 ex-VAT + R0.75 VAT), journal entry #5 balanced (DR R10.00 = CR R10.00), tax transaction recorded as pass-through (net VAT R0). (2) Fixed critical `CdtrRefInf.Ref` bug: Pain.013 remittance info was using user-provided `description`/`reference` text instead of creditor's MSISDN from DB. This would break wallet auto-crediting via the deposit notification service. Now always uses `"{CreditorName}: {creditorPhoneNumber}"` from `users.phoneNumber`. Applied to both `initiateRtpRequest()` and `retryRtpAsPbac()`. User description preserved in RTP metadata as `userDescription`. **Requires redeployment.** Session log: `docs/session_logs/2026-04-02_1530_rtp-discovery-bank-reconciliation-reference-fix.md`.

### **Previous Achievement (April 1, 2026 - 18:50)**
**Production User Cleanup & Rate Limiter Fix** — (1) Diagnosed production 429 errors via `gcloud logging read` — `financialLimiter` (10 req/min) was applied to all `/api/v1/wallets` routes including dashboard GETs. Split into `walletReadLimiter` (120/min for GET) and `financialLimiter` (10/min for POST/PUT/DELETE only). Auth limiter increased from 5→15 failed attempts/15min. (2) Purged User ID 1 (Andre Botes, +27825571055) from production: 7 rows deleted (users, kyc, wallets, UserSettings, notifications×3). Sequence reset — next registration gets ID 1. Product/supplier data verified untouched (1,974 products, 2 suppliers, 93 commission tiers). Created `scripts/delete-production-user.js` with dry-run, SAVEPOINT isolation, and sequence reset. **Rate limiter fix requires redeployment.** Session log: `docs/session_logs/2026-04-01_1850_production-user-cleanup-rate-limiter-fix.md`.

### **Previous Achievement (April 1, 2026 - 17:00)**
**Production API Testing & Fixes (15+ issues)** — Comprehensive staging API testing session with André. Fixed: (1) Registration 500 — passport `idType` mapping + `walletId` length; (2) KYC rejection flow — direct SQL updates, self-healing status, rejection modal with specific reason; (3) KYC re-upload stale reason bug; (4) POA-specific OCR validation (surname match, 2/4 address indicators, 90-day recency); (5) `kyc_tier` in `/api/v1/users/me`; (6) All native `alert()` calls replaced with styled `ErrorModal` (added `success` type); (7) Payment request 500 — missing `version` column (new migration) + encryption keys missing from deploy script; (8) Voucher purchase 500 — `errorData` string-to-object wrapping; (9) Commission ENUM crash — `service_type::text` cast + try/catch. Migrations `20260401_01` and `20260401_02` applied to staging + production. Both environments deployed as `20260401_v1`. 1Voucher product code 311 rejected by Flash (error 2283) — data issue needs Flash confirmation. Session log: `docs/session_logs/2026-04-01_1700_production-api-testing-fixes.md`.

### **Previous Achievement (March 17, 2026 - 19:00)**
**EFT Overlay Polish + VoiceInput On-Demand Rewrite** — (1) "Top-up via EFT" overlay fully aligned with global design system: Account Holder "MyMoolah Treasury", Account Number "272406481", corrected "How it works" steps, PayShap instant-payment section (24/7/365), "Tap to Add Money" and "ATM Cash Send" tiles hidden. Fixed missing TopBanner (`/add-money-eft` added to `pagesWithTopBanner`) and missing BottomNavigation (added to both `shouldShowNav` and `showBottomNav` allowlists). Updated `mymoolah-wallet-frontend/.env.local` with correct Vite vars. (2) VoiceInput complete rewrite — old implementation created `SpeechRecognition` in a `useEffect` with `onTranscript`/`onError` deps; every parent re-render destroyed and recreated the instance before `onstart` fired. New on-demand approach creates/tears down instance per button tap; `continuous: false`; fully self-contained. SupportPage simplified — mic button lives directly in input row (no two-step toggle). User confirmed: "works much better now". (3) Fixed disbursement routes auth import. Session log: `docs/session_logs/2026-03-17_1900_eft-overlay-voice-input-fix.md`.

### **Previous Achievement (March 12, 2026 - 23:30)**
**Self-Hosted Security Layer — Full Debug & All Environments Stable** — Resolved a cascade of issues that emerged from the new security layer across Codespaces (UAT), Staging, and Cloud Run. **8 fixes**: (1) `botScoring.js` blocked Azure IPs (Codespaces) → log-only in dev; (2) JWT 401s — all `jwt.sign` calls updated to `HS512`, verifier accepts both HS512+HS256 during 24h transition; (3) Staging 403/CORS — GCP IAP was incorrectly enabled on `be-staging-wallet` → disabled via gcloud; (4) Cloud Armor quota exceeded → removed inappropriate OWASP CRS body-scanning rules (SQLi/XSS/LFI/RCE/Scanner — wrong for REST JSON API); (5) `ioredis ECONNREFUSED` in Cloud Run → all security modules now only connect to Redis if `REDIS_URL` env var is set; (6) AI support disabled in Codespaces → `OPENAI_API_KEY` now explicitly exported by `start-codespace-with-proxy.sh`; (7) 429s on dashboard polling → added `walletReadLimiter` (120/min) for GET wallet routes, retained `financialLimiter` (10/min) for writes; (8) Staging treated as production by rate limiters → `STAGING=true` now triggers `devMax` limits. Session log: `docs/session_logs/2026-03-12_2300_security-layer-debug-all-envs-resolved.md`.

### **Previous Achievement (March 12, 2026 - 18:00)**
**Banking-Grade Self-Hosted Security Layer (No SaaS Dependency)** — Comprehensive security hardening across all MMTP environments. Fixed 6 critical middleware gaps: JWT algorithm pinning (`HS512`), JWT_SECRET hardcoded fallback removed, `hpp` + `mongoSanitize` now properly wired, `requireAdminKey` fails-closed when env var unset, rate-limiter staging bypass replaced with lenient dev multipliers. Built 5 new modules: `middleware/distributedRateLimiter.js` (Redis-backed, 13 route groups, per-user keying), `middleware/botScoring.js` (passive bot detection — UA/headers/velocity/datacenter IP), `middleware/requestGuard.js` (consolidated auth guards), `services/powChallenge.js` (self-hosted SHA-256 hashcash PoW CAPTCHA, no third-party), `services/aiGateway.js` (OpenAI cost proxy — semantic cache, per-user $0.50/day budget, global $10/day alert, prompt injection detection). Created `scripts/enable-gcp-security.sh` for GCP Cloud Armor (OWASP CRS, geo-restriction ZA, edge rate limiting, SBSA IP allowlist) + Cloud CDN (wallet frontend). Deployed to both staging (`mmtp-waf-staging` → `be-staging-backend`) and production (`mmtp-waf-production` → `be-production-backend`, CDN on `be-production-wallet`). Session log: `docs/session_logs/2026-03-12_1800_banking-grade-security-layer.md`.

### **Previous Achievement (March 15, 2026 - 18:00)**
**AI Support v3.1 — Comprehensive KB (240 entries) + Topic Filtering** — FAQ_MASTER.md rewritten (accurate, no USDC/white-label/developer FAQs). generate-knowledge-base.js generates 176 new GEN- entries (96 FAQ + 80 GPT-4o gap fill). Topic filtering: Layer 0 (score < 0.20 → instant refusal, 0 LLM cost) + Layer 2 (system prompt STRICT SCOPE RULE). UAT confirmed: referral, fees, eeziPay steps, off-topic blocked, live balance. Session log: `docs/session_logs/2026-03-15_1800_comprehensive-kb-topic-filtering.md`.

### **Previous Achievement (March 14, 2026 - 19:00)**
**LangChain RAG AI Support v3 — Phase 1 + Phase 2 + Cost Optimisation** — Replaced 4,649 lines of pattern-matching AI support code with a clean 481-line LangChain RAG service. Phase 1: Semantic KB search (64 embedded entries, OpenAI `text-embedding-3-small`). Phase 2: Transactional AI — detects personal questions (balance, transactions), fetches live user data from DB, injects into LLM context. Cost optimisation: 4-layer system (Redis cache → direct KB hit ≥92% → GPT-4o-mini → self-learning). Self-learning saves unknown questions to KB as `isActive=false` for admin review. Projected cost at 3M users: ~$150–360/month vs $30k without optimisations. Switched `gpt-4o` → `gpt-4o-mini` across feedbackService, googleReviewService, codebaseSweepService, feedbackController. KYC stays on `gpt-4o`. Tested in UAT — transactions, balance, and KB queries all working. Added Tech Debt & Architectural Concerns section to CURSOR_2.0_RULES_FINAL.md. Session log: `docs/session_logs/2026-03-14_1900_langchain-rag-phase2-cost-optimisation.md`.

### **Previous Achievement (March 7, 2026 - 18:00)**
**Cloud Build Migration & npm Cleanup** — Deploy scripts now use `gcloud builds submit` instead of local Docker. No Docker Desktop needed for deployments. Build times: backend ~6min, wallet ~3.5min (was ~28min). Node 20 LTS in both Dockerfiles. Removed dead crypto/xss-clean packages. International Airtime pinless implemented; staging returns Flash Code 2200 (billing not configured) — awaiting Flash support. Session log: `docs/session_logs/2026-03-07_1800_cloud-build-migration-npm-cleanup.md`.

### **Previous Achievement (February 27, 2026 - 14:00)**
**Figma Restriction Removed — Code as Frontend Source of Truth** — Removed Figma read-only rule. Codebase is now frontend source of truth; agents may edit any UI/frontend including `mymoolah-wallet-frontend/pages/*.tsx`. Figma is historical only and no longer an active design platform, source of truth, or approval gate. Updated CURSOR_2.0_RULES_FINAL.md, AGENT_HANDOVER.md, AGENT_ROLE_TEMPLATE.md. Enables frontend-design skill on main app pages. Session log: `docs/session_logs/2026-02-27_1400_figma-restriction-removed-code-source-of-truth.md`.

### **Previous Achievement (February 21, 2026 - 17:00)**
**PayShap Callbacks + EasyPay Cash-In + Partner Drive Docs** — (1) PayShap: Added parameterised callback routes for RPP/RTP (batch + realtime) to `standardbankController.js` and `routes/standardbank.js`. Added GET polling routes. Created `services/standardbankPollingService.js` with RPP/RTP status polling, terminal status detection, and stale transaction recovery. Updated `client.js` callback URL comments. (2) EasyPay: Swept full codebase. Confirmed Receiver ID `5063` in `voucherController.js`, 14-digit number format, Receiver architecture (EasyPay calls us). Drafted activation email to Razine for UAT + Production. (3) Google Drive: Documented Flash, MobileMart, Zapper partner Drive folders — created `integrations/mobilemart/MOBILEMART_REFERENCE.md`, `integrations/zapper/ZAPPER_REFERENCE.md`, updated `FLASH_TESTING_REFERENCE.md` and `AGENT_HANDOVER.md` document map. Session log: `docs/session_logs/2026-02-21_1700_payshap-easypay-zapper-drive-docs.md`.

### **Previous Achievement (February 26, 2026 - 12:45)**
**Flash Integration Fixes & Clean-Slate Catalog Test** — (1) Fixed 3 Flash API transaction endpoint bugs from official v4 PDF review: `gift-vouchers/purchase` → `gift-voucher/purchase` (singular), cellular payload `subAccountNumber` → `accountNumber`, prepaid utilities `transactionID` → `meterNumber` + optional `isFBE`. (2) Fixed denominations validator in `Product.js` and `ProductVariant.js` — extended `VARIABLE_RANGE_TYPES` to include `airtime`, `data`, `voucher`, `cash_out`. (3) Created migration `20260226_01_add_role_to_users.js` — adds `role` ENUM column to `users` table; applied to Staging and Production. (4) Created and ran clean-slate catalog test scripts for Staging (38 Flash + 56 MobileMart) and Production (81 Flash + 1,726 MobileMart). Both environments verified with live API data. Daily 02:00 scheduler proven end-to-end. Session log: `docs/session_logs/2026-02-26_1245_flash-integration-fixes-clean-slate-catalog-test.md`.

### **Previous Achievement (February 21, 2026 - 16:00)**
**Bill Payment Overlay Fixes & Production API Compliance** - (1) Removed 5 filter buttons (All, Airtime, Data, Electricity, Biller) from bill-payment-overlay via BeneficiaryList `showFilters={false}`. (2) Fixed create/add beneficiary: BeneficiaryModal `initialBillerName` prop, pre-fill biller name, ensure new recipients appear in filtered list. (3) Production API compliance: backend overlay reads billerName from `billerServices.accounts[0].billerName` (fallback to metadata); frontend overlayService maps billerServices to metadata.billerName; saveBeneficiary return includes metadata.billerName. Files: BillPaymentOverlay.tsx, BeneficiaryModal.tsx, overlayService.ts, overlayServices.js. Session log: `docs/session_logs/2026-02-21_1600_bill-payment-overlay-fixes-production-compliance.md`.

### **Previous Achievement (February 21, 2026)**
**NotificationService Fix** - Fixed "NotificationService is not a constructor" after VAS purchases (airtime, data, electricity, bill payment). Replaced `new NotificationService()` + `sendToUser` with `notificationService.createNotification()`. Uses `txn_wallet_credit` type; subtype in payload. File: `routes/overlayServices.js`.

### **Previous Achievement (February 19, 2026 - 11:00)**
**EasyPay Duplicate Fix & Partner API Docs** - Fixed dashboard transaction list duplicate for EasyPay voucher refunds (EPVOUCHER-REF/EXP): second grouping loop now iterates over `otherTransactions` only. Created `docs/MMTP_PARTNER_API_IMPLEMENTATION_PLAN.md`; sandbox URL set to staging.mymoolah.africa. Session log: `docs/session_logs/2026-02-19_1100_easypay-duplicate-fix-partner-api-docs.md`.

### **Previous Achievement (February 15, 2026 - 18:00)**
**Production Deployment Live** - Production platform deployed and live. API: `https://api-mm.mymoolah.africa`, Wallet: `https://wallet-mm.mymoolah.africa`. Fixed database connection (DATABASE_URL secret, start.sh, .dockerignore); graceful OpenAI degradation (5 services); ledger account check as warning; SSL cert cert-production-v3 (api-mm, wallet); URL map updated. Afrihost DNS: api-mm (5-char subdomain requirement), wallet.mymoolah.africa. Static IP: 34.128.163.17. Session log: `docs/session_logs/2026-02-15_1800_production-deployment-live-ssl-dns.md`.

### **Previous Achievement (February 12, 2026 - 17:00)**
**Production Database Migration Complete** - Full migration from Staging to Production successful. Fixed 5 migration blockers: (1) drop-flash inline migrate when FLASH supplier missing, (2) create vas_transactions table for fresh DBs, (3) flash serviceType ENUM add digital_voucher, (4) vouchers use `type` column not `voucherType`, (5) vas enum existence check before modifying. All 80+ migrations applied to `mymoolah_production` on Cloud SQL `mmtp-pg-production`. MobileMart, Flash, EasyPay, reconciliation, referrals, USDC, NFC, Standard Bank tables all created. Float accounts seeded. Session log: `docs/session_logs/2026-02-12_1700_production-migration-complete.md`.

### **Previous Achievement (February 12, 2026 - 15:00)**
**SBSA PayShap Integration Complete** - Full Standard Bank PayShap: UAT implementation (migrations, models, Ping auth, API client, Pain.001/Pain.013 builders, callback handler, RPP/RTP services, ledger), business model correction (LEDGER_ACCOUNT_BANK, no prefunded float), deposit notification endpoint (reference = MSISDN), original R4 fee plan now superseded by the Apr 26 VAT strategy and current SBSA pass-through + MMTP markup model. Request Money proxy when Peach archived. Awaiting OneHub credentials for UAT. Session logs: `2026-02-12_1200_sbsa-payshap-uat-implementation.md`, `2026-02-12_1400_sbsa-payshap-business-model-deposit-notification.md`, `2026-02-12_1500_payshap-fee-implementation.md`. UAT guide: `docs/SBSA_PAYSHAP_UAT_GUIDE.md`; current VAT policy: `docs/VAT_ACCOUNTING_STRATEGY.md`.

### **Previous Achievement (February 10, 2026 - 16:00)**
**NFC Tap to Add Money — Refinements & Fixes** - Fixed frontend duplicate CreditCard import, added Tap to Add Money card to Transact page, fixed NfcDepositIntent/user_id model mismatch, Halo API amount-as-number (E103), ECONNRESET troubleshooting in DB guide, copy updates (Google Pay/Apple Pay), quick amounts R50-R8000 with grid layout, max R10k. Rule 9A: sweep scripts before creating. Knowledge base updated with Tap to Add Money and last 3 weeks. Session logs: `docs/session_logs/2026-02-10_1400_nfc-tap-to-add-money-implementation.md`, `docs/session_logs/2026-02-10_1550_nfc-tap-to-add-money-refinements.md`.

### **Previous Achievement (February 02, 2026)**
**NFC Deposit Implementation Plan (Phase 1) — Halo Dot** - Created comprehensive, implementation-ready plan for NFC tap-to-deposit using Halo Dot (Halo.Link/Halo.Go). Phase 1: deposits only (no virtual card). Full plan: `docs/NFC_DEPOSIT_IMPLEMENTATION_PLAN.md`. Updated `docs/integrations/StandardBankNFC.md` with Phase 1/2 split and Halo Dot vendor. Added NFC env vars to `env.template`. Phase 2 (virtual debit card for POS) deferred until Standard Bank issues virtual cards.

### **Previous Achievement (February 09, 2026 - 16:00)**
**Transaction Detail Modal & USDC Fee UI** - Transaction Details modal: reverted Blockchain Tx ID (recipient is auto-credited; banking/Mojaloop practice = reference only, no "paste to top up"). USDC send: renamed "Platform fee" to "Transaction Fee" in quote and Confirm sheet; removed "Network fee" from UI (was R 0,00). Session log: `docs/session_logs/2026-02-09_1600_transaction-detail-usdc-fee-ui.md`. Commits: 44f6c348 (add Tx ID), 47307db4 (revert), 5ac1522b (fee labels).

### **Recent Updates (Last 7 Days – March 11–17, 2026)**
- **Mar 17 (19:00)**: EFT overlay polish + VoiceInput on-demand rewrite — mic button now works on Chrome/Android; SupportPage mic integrated directly into input row. Disbursement auth import fixed. Session log: `docs/session_logs/2026-03-17_1900_eft-overlay-voice-input-fix.md`.
- **Mar 17 (18:00)**: Unallocated deposits suspense + ops alert; fuzzy MSISDN matching; SBSA H2H Wage/Salary Disbursement (Pain.001/Pain.002, maker/checker, portal UI). Session log: `docs/session_logs/2026-03-17_1800_unallocated-deposits-disbursement.md`.
- **Mar 17 (10:00)**: SFTP port 22 → 5022 (SBSA confirmed); EBONF rejection code → professional daily-limit message. Session log: `docs/session_logs/2026-03-17_1000_sftp-port-5022-ebonf-message.md`.
- **Mar 16 (21:32)**: RTP callback UETR fallback fix — batch callback matching; Standard Bank + Capitec RTP end-to-end confirmed. Session log: `docs/session_logs/2026-03-16_2132_rtp-callback-uetr-fix.md`.
- **Mar 12 (23:30)**: Security layer full debug — 8 fixes across Codespaces/Staging/Cloud Run: botScoring Azure IP fix, JWT HS512 migration + transition window, GCP IAP disabled on be-staging-wallet, OWASP CRS rules removed from Cloud Armor WAF, Redis ECONNREFUSED fix (guard with REDIS_URL), OPENAI_API_KEY startup export, walletReadLimiter for dashboard GET polling, STAGING=true uses devMax. All environments confirmed stable. Session log: `docs/session_logs/2026-03-12_2300_security-layer-debug-all-envs-resolved.md`.
- **Mar 15 (18:00)**: AI Support v3.1 — Comprehensive KB (240 entries) + Topic Filtering. FAQ_MASTER.md rewritten (removed USDC/white-label/NFC/developer FAQs, added referrals/fees/tiers/eeziPay/EasyPay). generate-knowledge-base.js: parses FAQ_MASTER (96 Q&A) + GPT-4o gap fill (80 Q&A) = 176 new GEN- entries. Topic filtering: Layer 0 (score < 0.20 → instant refusal, 0 LLM cost), Layer 2 (system prompt STRICT SCOPE RULE). UAT tested: referral program, Bronze fee, eeziPay USSD steps, off-topic blocked, live balance — all passed. Session log: `docs/session_logs/2026-03-15_1800_comprehensive-kb-topic-filtering.md`.
- **Mar 12 (23:00)**: Session docs updated (security layer session log created, BANKING_GRADE_ARCHITECTURE.md v2.12.0). Codespaces transaction history debug — Cloud SQL proxy not running caused `ECONNREFUSED 127.0.0.1:6543` and empty dashboard. Fix: always use `bash scripts/start-codespace-with-proxy.sh` (not `npm start`). Cloudflare vs self-hosted comparison conducted — MMTP covers ~75% of Cloudflare capabilities; remaining gaps (TLS fingerprinting, L3/L4 volumetric DDoS) not relevant at current scale. User confirmed satisfaction with self-hosted approach. Session log: `docs/session_logs/2026-03-12_2300_security-review-transaction-debug-cloudflare.md`.
- **Mar 12 (18:00)**: Banking-Grade Self-Hosted Security Layer — 6 critical fixes (JWT HS512 pinning, JWT_SECRET hardcoded fallback removed, hpp/mongoSanitize wired, adminKey fails-closed, staging rate-limit bypass removed). 5 new modules: distributedRateLimiter.js (Redis, 13 routes), botScoring.js, requestGuard.js, powChallenge.js (self-hosted PoW), aiGateway.js (OpenAI cost proxy). GCP Cloud Armor + CDN deployed staging + production. Session log: `docs/session_logs/2026-03-12_1800_banking-grade-security-layer.md`.
- **Mar 14 (22:00)**: Deployed to Staging (`00252-pqc`) and Production (`00032-qs6`). Production confirmed working — mixed Afrikaans/English query "uh wat is my wallet saldo" returned "Jou wallet saldo is ZAR 49,324.29" in 4s. Codebase sweep permanently disabled. Multilingual transactional intent added (Afrikaans, isiZulu, isiXhosa, Sesotho).
- **Mar 14 (19:00)**: LangChain RAG AI Support v3 — Phase 1 (KB semantic search, 64 entries embedded) + Phase 2 (transactional AI: live balance + transactions) + cost optimisation (4 layers: cache → direct KB → gpt-4o-mini → self-learning). All non-KYC OpenAI calls switched to gpt-4o-mini. embed-knowledge-base.js rewritten to use db-connection-helper.js. Rules updated with Tech Debt section. KB accuracy review flagged for Tap to Add Money entries.
- **Mar 13 (22:00)**: Field-level AES-256-GCM encryption for idNumber (POPIA compliance). Deployed to UAT, Staging, Production.
- **Mar 13 (16:00)**: SBSA H2H Credit Notifications — SFTP Gateway recreated, PG15 submitted. Capitec RTP confirmed working.
- **Mar 7 (18:00)**: Cloud Build migration & npm cleanup — deploy scripts use gcloud builds submit. No Docker Desktop needed.
- **Mar 4 (11:17)**: Cursor skills consolidated — all 8 skills in `.agents/skills/` (single parent).
- **Feb 21 (21:00)**: Standard Bank PayShap banking-grade overhaul — removed Peach proxy workaround; aligned Pain.001 (top-level grpHdr/pmtInf[], pmntInfId, reqdExctnDt.dtTm, lclInstrm.prtry, cdtrAgt+brnchId, rmtInf.strd[], splmtryData) and Pain.013 (PascalCase, DbtrAcct.Id.Item.Id+Prxy, CdtrAgt.Othr.Id, Amt.Item.Value, PmtCond, RmtInf.Strd[]) with SBSA Postman samples; fixed RTP callback URLs in client.js; scope-keyed token cache in pingAuthService; ACID transaction ordering in RPP/RTP services; added proxyResolutionClient.js; express-validator on routes.
- **Feb 21 (19:00)**: Documentation consolidation — archived ~75 docs to `docs/archive/` (deployment, codespaces, mobilemart, beneficiary, partner-api, referral, easypay, zapper, figma, peach-payments, security); merged INPUT_FIELD_FIXES, 2FA_IMPLEMENTATION, SECURITY (badge/certificate/token); created DOCS_CONSOLIDATION_2026.md. Session log updated with git push/pull status. Codespaces synced (82 files, fast-forward).
- **Feb 21 (17:00)**: Bill payment MobileMart prevend fix — v2 API URL construction (use baseUrl for /v2 paths, was incorrectly .../v1/v2/... returning HTML); improved product matching (no products[0] fallback; fuzzy match; clear error when no match). Fixes "prevend did not return transactionId" and wrong product (Ekurhuleni for PEP).
- **Feb 21 (16:00)**: Bill payment overlay fixes — removed 5 filter buttons; fixed add beneficiary (initialBillerName, pre-fill, filtered list); production API compliance (billerName from billerServices.accounts[0]).
- **Feb 21**: NotificationService fix — VAS purchase notifications now use createNotification (not sendToUser); fixes "NotificationService is not a constructor" after airtime/data/electricity/bill purchases.
- **Feb 19**: EasyPay voucher refund duplicate fix (walletController); MMTP Partner API implementation plan created; sandbox = staging.mymoolah.africa.
- **Feb 18**: Documentation consolidation phase 2 (cross-links, status cleanup, archive).
- **Feb 15**: Production deployment live. API: api-mm.mymoolah.africa, Wallet: wallet-mm.mymoolah.africa. DB connection fix, OpenAI graceful degradation, SSL cert v3, Afrihost DNS (api-mm 5-char workaround).
- **Feb 12**: Production database migration complete (all 80+ migrations applied, 5 fixes for fresh-DB compatibility). SBSA PayShap integration complete (UAT implementation, business model, deposit notification; original R4 fee/VAT split later superseded by Apr 26 VAT pass-through policy). Awaiting OneHub credentials.
- **Feb 09**: Transaction Detail modal (Reference/Amount/Status only); USDC fee UI (Transaction Fee label, Network fee removed); USDC send flow fixes (VALR quoteId/path/params, ledger balance, UAT simulation, negative amount for sent, success UI guards, beneficiary/wallet resolution, VALR float check + ErrorModal).
- **Feb 08**: Migrations-before-seeding rule in Cursor rules and handover; Watch to Earn demo videos in Staging (auto-seed when no ads, seed script `--staging`).
- **Feb 07**: USDC Send feature implementation; USDC fixes and banking-grade sweep (beneficiary list, Redis v5, VALR 503, edit flow, banners, filter removal, validation/DB aggregation/idempotency/VALR guards).
- **Feb 06**: Proxy and gcloud auth UX (interactive gcloud auth in start-codespace-with-proxy, ADC fallback, fail-fast with auth instructions).
- **Feb 04**: Global Airtime/Data own-amount variantId resolution; proxy credentials when ADC blocked (gcloud user credentials, token flag).
- **Feb 02**: Flash cash_out vasType, transaction splitting, Recent/History display, TransactionDetailModal cash-out PIN; ZERO SHORTCUTS POLICY; voucher icons; USDC remove beneficiary; migrations-before-seeding and USDC per-environment docs; agent commit-and-push rule.

### **Previous Achievement (February 07, 2026 - 22:30)**
**USDC Fixes, Banners & Banking-Grade Sweep** - Fixed USDC beneficiary list not showing (Beneficiary model `cryptoServices` field, enrichment from `serviceAccountRecords`, filter by normalized table). Fixed Redis v5 cache compatibility (`set` with EX), VALR 503 on missing/invalid credentials, and USDC beneficiary edit flow (onEdit/onAddNew, modal prefill for wallet/country/relationship/purpose). Buy USDC overlay now shows top and bottom sticky banners (App + BottomNavigation); removed filter row (All/Airtime/Data/etc) and improved spacing. Full banking-grade sweep: all USDC routes use express-validator + handleValidation; limit checks use DB aggregation only (SUM/ABS, no JS sum); idempotency via client key or crypto.randomUUID(); VALR guarded (isConfigured/signRequest), unsupported _idempotencyKey removed from VALR body; controller uses service layer only (getTransactionById); limit/offset/address sanitized. Session log: `docs/session_logs/2026-02-07_2230_usdc-fixes-banners-banking-grade-sweep.md`. Commits: bf2d271a, b8d662f5, f1095d11, 429c7a60, 1c7b9f65.

### **Previous Achievement (February 07, 2026 - 15:00)**
**USDC Send Feature Implementation** - Complete implementation of "Buy USDC" cross-border value transfer feature with VALR integration (FSCA-licensed CASP FSP 53308). Banking-grade architecture: existing `transactions` table, `beneficiaries.crypto_services` JSONB, full ledger integration (VALR float 1200-10-06), Redis rate caching, overlay pattern, retry + circuit breaker. Compliance: Travel Rule, sanctions (8 blocked countries), limits (R5k/txn, R15k/day, R50k/month), new beneficiary controls. Frontend: overlay flow, quote expiry, Solana validation, explorer links. Seven API endpoints. Disabled by default pending VALR credentials and RMCP approval.

### **Previous Achievement (February 01, 2026 - 20:00)**
**Complete Flash API Integration** - Flash integration upgraded from "database label only" to "full production API integration". Integrated Flash cash-out overlay with real API (replaced simulation with real PIN extraction). Integrated Flash electricity purchase following MobileMart pattern (lookup meter + purchase flow). Environment-aware operation implemented (`FLASH_LIVE_INTEGRATION` flag). Token/PIN extraction from Flash API responses with comprehensive error handling. Transaction metadata includes Flash transaction details. Flash infrastructure (controller, auth service, routes) now 100% connected and production-ready. Ready for Staging testing with production credentials from Tia (Flash IT engineer).

### **Previous Achievement (February 01, 2026 - 17:00)**
**Complete MobileMart Production Integration** - Full end-to-end implementation of electricity purchase with MobileMart production API (prevend + purchase flow, real 20-digit token extraction). Extended integration to bill payments and digital vouchers. All 5 MobileMart services now environment-aware (UAT simulation, Staging/Production real API). Successfully deployed to staging and tested with production credentials (R20 live electricity transaction confirmed). Transaction detail modal with token display (grouped by 4 digits, MMTP-aligned styling). All services production-ready.

### **Next Priority**
**Go-Live Preparation (within 2 weeks)**:
1. ✅ KB generated and tested in UAT (240 active entries, topic filtering working)
2. **NEXT**: Seed KB to Staging — `npm run generate:kb:staging` then `npm run embed:kb:staging`
3. **NEXT**: Seed KB to Production — `npm run generate:kb:production` then `npm run embed:kb:production`
4. **NEXT**: Deploy code (ragService v3.1 + topic filtering) — `./scripts/deploy-backend.sh --staging` then `--production`
5. Archive legacy AI services (`bankingGradeSupportService.js`, `aiSupportService.js`, `semanticEmbeddingService.js`) and `scripts/run-sweep-patterns-migration.sh`
6. **Phase 3 — Admin Portal: KB Review Screen** (Wishlist — see `docs/PRIORITIZED_TODO_LIST.md`)
   - View/approve/edit/reject `isActive=false` KB entries (auto-learned + GEN-)
   - Table: question, answer, date, category, source | Actions: Approve / Edit / Reject / Bulk approve
   - After approval → trigger `embed:kb` automatically
   - Location: portal admin area (authenticated route)
7. Phase 3 (Future): Redis conversation memory across sessions
8. **Treasury / audit (optional)**: With proxies healthy, re-run `node scripts/production-full-audit.js --production` after material activity; automate referral commission JEs when `referral_earnings` rows are created (see tech debt register — ledger drift was corrected manually Apr 3).

**⚠️ CODESPACES STARTUP — CRITICAL REMINDER**: Main backend + proxy: `./scripts/one-click-restart-and-start.sh` or `bash scripts/start-codespace-with-proxy.sh` (NOT raw `npm start`). **Admin Portal** (disbursement clients, Vite 3003): `./scripts/start-all-services.sh` — then `tail -f /tmp/mymoolah-logs/backend.log` for errors. Cloud SQL Auth Proxy must listen on 6543. If `ECONNREFUSED 127.0.0.1:6543`, start proxies. If `EADDRINUSE: 0.0.0.0:3001`, free the port first.

**SBSA PayShap UAT** - Obtain OneHub credentials from Standard Bank; run migrations; set STANDARDBANK_PAYSHAP_ENABLED=true and SBSA_* env vars; whitelist callback URLs; test RPP/RTP flows. See `docs/SBSA_PAYSHAP_UAT_GUIDE.md`.

**Flash Integration Testing** - Test Flash integration in Codespaces (cash-out and electricity). Add Flash production credentials to Staging Secret Manager (credentials received from Tia, Flash IT engineer). Verify token extraction, wallet debits, and transaction history. Monitor first live transactions. Optional: Extend Flash integration to airtime/data, bill payments, and vouchers following same pattern.

### **Previous Achievement (January 26, 2026 - 23:15)**
**Documentation Consolidation & Sync** - Consolidated multiple conflicting development and onboarding guides into a single source of truth (`DEVELOPMENT_GUIDE.md`). Standardized environment configurations (ports, database access) and the official Git sync workflow across all documentation. Archived redundant files (`SETUP_GUIDE.md`, `PROJECT_ONBOARDING.md`) to prevent future drift.

### **Previous Achievement (January 24, 2026 - 09:09)**
**NFC Deposit/Payment Implementation Plan** - Comprehensive banking-grade implementation plan created for NFC deposits (SoftPOS inbound) and NFC payments (tokenized virtual card outbound) with Standard Bank T-PPP. Plan enforces MPoC/CPoC compliance, mandates native kernels (Android: certified EMV L2/MPoC kernel, iOS: Tap to Pay on iPhone), and uses push provisioning to Apple/Google wallets for outbound payments. Includes complete architecture, data models, services, APIs, security requirements, testing strategy, and rollout plan. Plan documented in `docs/integrations/StandardBankNFC.md` for later execution.

### **Previous Achievement (January 21, 2026 - 14:52)**
**Watch to Earn UI Improvements** - Improved Watch to Earn modal styling and Quick Access Services configuration. Split "Loyalty & Promotions" into 3 independent services (Watch to Earn active, Rewards Program and Promotions coming soon), fixed modal width and close button styling, improved loading state, and updated terminology consistency.

### **Previous Achievement (January 20, 2026 - 18:27)**
**Watch to Earn UAT Fixes** - Fixed critical issues for UAT testing: allowed re-watching ads in UAT/Staging (all 10 ads remain visible for demos), fixed 500 error on video completion by converting Decimal to number for response formatting, improved error handling and logging, ensured database tables/columns exist via idempotent seeder script, and simplified wallet balance updates. Watch to Earn is now fully functional for UAT demos with all ads visible and re-watchable. Environment-based behavior: UAT/Staging shows all ads and allows re-watching, Production enforces one-view-per-ad fraud prevention.

### **Previous Achievement (January 20, 2026)**
**Watch to Earn Implementation** - Complete video advertising platform implemented with banking-grade security. Users earn R2.00-R3.00 by watching 20-30s video ads. Merchants prepay into ad float accounts (prefunded float system). Dual ad types: Reach (brand awareness) and Engagement (lead generation with email/webhook delivery). B2B "Payout-to-Promote" incentive: merchants earn ad float credits when making payouts (R200 payout = R6.00 credit = 1 free ad). Includes 3 new database tables, 3 services, 5 API endpoints, frontend components (LoyaltyPromotionsPage + EarnMoolahsModal), manual moderation queue, rate limiting (5 ads/hour), server-side watch verification, and double-entry ledger integration. Cost-optimized: R0.001 per view with CDN. Ready for UAT with dummy merchant and 10 test ads.

### **Previous Achievement (January 17, 2026)**
**EasyPay Standalone Voucher UI Improvements** - Enhanced EasyPay standalone voucher user experience with business-focused messaging, proper badge display (EPVoucher blue badge), redemption validation to prevent invalid attempts, Simulate button for UAT testing, and accessibility improvements. Updated voucher information messages to reflect award-winning platform positioning, fixed badge to show "EPVoucher" instead of "MMVoucher", added frontend validation to prevent redeeming 14-digit EasyPay PINs in wallet, extended Simulate function to support standalone vouchers, and fixed AlertDialog accessibility warnings.

### **Previous Achievement (January 16, 2026)**
**Markdown PDF Converter & EasyPay Simulation Fix** - Created generic markdown-to-PDF converter script (`scripts/md-to-pdf.js`) for converting any documentation to PDF format. Fixed EasyPay Top-up Simulate function authentication issue by allowing JWT Bearer tokens in UAT/test environments while maintaining API key requirement for production. Added `marked` and `puppeteer` dependencies for PDF generation.

### **Previous Achievement (January 15, 2026)**
**Float Account Ledger Integration & Balance Monitoring** - Fixed critical banking-grade compliance issue where float accounts used operational identifiers instead of proper ledger account codes. Implemented complete ledger integration (all floats now have ledger codes 1200-10-XX), consolidated duplicate Zapper float accounts, created missing MobileMart float account, and implemented scheduled float balance monitoring service with email notifications to suppliers when balances are low.

### **Previous Achievement (January 15, 2026)**
**EasyPay Top-up @ EasyPay Transformation** - Complete transformation of EasyPay voucher system from "buy voucher, then pay at store" to "create top-up request, pay at store, get money back". Features include: split transaction display (gross in Recent, net + fee in History), PIN formatting (x xxxx xxxx xxxx x), UAT simulation button, proper cancel/expiry handling (no wallet credit for top-up vouchers), and banking-grade compliance.

### **Previous Achievement (January 14, 2026)**
**Flash Reconciliation Integration & SFTP IP Standardization** - Complete Flash supplier reconciliation system integrated (FlashAdapter, file generator, database config), SFTP infrastructure standardized to static IP (34.35.137.166), both MobileMart and Flash configured for automated reconciliation.

### **Previous Achievement (January 13, 2026)**
**Banking-Grade Automated Reconciliation System** - Complete multi-supplier transaction reconciliation framework with self-healing capabilities (80% auto-resolution), immutable audit trails, and <200ms performance per transaction.

### **Core Capabilities**
- ✅ **Multi-Supplier Payments**: MobileMart (1,769 products), Zapper QR, Peach Payments (archived)
- ✅ **PayShap (Standard Bank)**: RPP/RTP integration UAT ready; replaces archived Peach when enabled
- ✅ **Advanced Features**: 5-tier referral system, KYC/FICA compliance, real-time notifications
- ✅ **Banking-Grade Security**: TLS 1.3, JWT HS512, AES-256-GCM, RBAC, immutable audit trails
- ✅ **Global Reach**: 11 languages (English, Afrikaans, Zulu, Xhosa, Sotho, Tswana, Pedi, Venda, Tsonga, Ndebele, Swati)
- ✅ **Production Infrastructure**: Google Cloud Platform (Staging + Production), Cloud SQL, Secret Manager
- ✅ **Reconciliation**: Automated multi-supplier recon (MobileMart + Flash), self-healing, 99%+ match rate, SFTP integration (static IP: 34.35.137.166)

### **Technology Stack**
- **Backend**: Node.js 22.x, Express.js, Sequelize ORM, PostgreSQL 15.x
- **Frontend**: React 18.x, TypeScript, Tailwind CSS
- **Infrastructure**: Google Cloud Run, Cloud SQL, Secret Manager, Cloud Storage, Load Balancers
- **Security**: Google Cloud IAM, TLS 1.3, JWT HS512, bcrypt, rate limiting
- **Integrations**: MobileMart API, Zapper API, Google Cloud Services, SMTP alerts

### **Key Performance Indicators**
- API Response Time: <200ms (target)
- Database Queries: <50ms (target)
- Throughput: >1,000 requests/second
- Availability: 99.95% uptime
- Match Rate: >99% (reconciliation)
- Auto-Resolution: 80% (reconciliation)

### **Critical Reading Requirements**
1. **`docs/CURSOR_2.0_RULES_FINAL.md`** - MANDATORY reading before any work
2. **`docs/DATABASE_CONNECTION_GUIDE.md`** - MANDATORY for database operations
3. **This document (AGENT_HANDOVER.md)** - Complete operational context

---

## ⚠️ **CRITICAL: NEW AGENTS MUST READ RULES FIRST** ⚠️

**BEFORE DOING ANY WORK, YOU MUST:**

1. **Read `docs/CURSOR_2.0_RULES_FINAL.md`** using `read_file` tool
2. **Provide proof of reading** (summarize 3-5 key rules, mention specific details)
3. **State explicitly**: "✅ Rules reading completed - I have read `docs/CURSOR_2.0_RULES_FINAL.md` and will follow all rules"
4. **NO WORK UNTIL CONFIRMED** - You cannot proceed with any work until rules reading is confirmed with evidence

**This is MANDATORY per Rule 2. Failure to do this will result in incorrect work.**

---

## ⚠️ **CRITICAL: ALL TESTING MUST BE IN CODESPACES** ⚠️

**MANDATORY TESTING REQUIREMENT:**

- ❌ **DO NOT** test on local machine
- ❌ **DO NOT** test in other environments  
- ✅ **ALWAYS** test in Codespaces (CS)
- ✅ **ALWAYS** use Codespaces as primary testing environment

**Reason**: Codespaces has correct environment configuration, database connections, and credentials matching production-like conditions.

**Documentation**: See `docs/CODESPACES_TESTING_REQUIREMENT.md` for:
- Complete Codespaces .env configuration
- Testing workflow and commands
- Zapper credentials status
- Verification checklist

**Current Codespaces .env**: Contains all required credentials including Zapper UAT credentials. See `docs/CODESPACES_TESTING_REQUIREMENT.md` for full configuration.

---

## 🚫 **CRITICAL: NEVER USE GIT WORKTREES** 🚫

**MANDATORY WORKING DIRECTORY RULE:**

- ❌ **NEVER** use git worktrees or work in `/Users/andremacbookpro/.cursor/worktrees/`
- ❌ **NEVER** create new worktrees with `git worktree add`
- ✅ **ALWAYS** work ONLY in `/Users/andremacbookpro/mymoolah/` (main repository)

**Reason**: Worktrees cause severe agent confusion, leading to:
- Agents reading wrong/stale file versions
- Changes made in wrong locations
- Merge conflicts and lost work
- 14 worktrees were found and removed on January 9, 2026

**If you see worktree paths**: STOP immediately and alert the user. Do not proceed with any work in worktrees.

---

## 🤖 **AGENT OPERATING PRINCIPLES** (MANDATORY READING)

You operate within MyMoolah's **banking-grade 3-layer architecture** that separates concerns to maximize reliability. LLMs are probabilistic; banking systems require deterministic consistency. This system bridges that gap.

---

### **The 3-Layer Architecture (MyMoolah Edition)**

**Layer 1: Directives (What to do)**
- **Location**: `docs/` folder - your instruction set
- **Key files**: 
  - `docs/CURSOR_2.0_RULES_FINAL.md` - Operating rules (MUST READ FIRST)
  - `docs/DATABASE_CONNECTION_GUIDE.md` - Database work (MANDATORY before migrations)
  - `docs/DEVELOPMENT_GUIDE.md` - Development patterns
  - `docs/API_DOCUMENTATION.md` - API contracts
  - `docs/session_logs/` - Historical context from previous agents
- **Purpose**: Define goals, constraints, tools, patterns, and edge cases in natural language

**Layer 2: Orchestration (Decision making)**
- **Location**: This is YOU, the AI agent
- **Your job**: 
  - Read directives before acting
  - Call execution tools in correct order
  - Handle errors intelligently
  - Ask for clarification when ambiguous
  - Update session logs with learnings
- **Key principle**: You don't write database migrations from scratch—you read `docs/DATABASE_CONNECTION_GUIDE.md`, understand the pattern, use `scripts/run-migrations-master.sh`, handle errors, document learnings

**Layer 3: Execution (Doing the work)**
- **Location**: Deterministic Node.js/JavaScript in `scripts/`, `services/`, `controllers/`, `models/`
- **Characteristics**: 
  - Reliable, testable, fast
  - Environment variables in `.env`
  - Handles API calls, database operations, business logic
  - Well-commented and production-ready
- **Purpose**: Push complexity into deterministic code, not LLM reasoning

**Why this works**: If you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. **Solution**: Push complexity into deterministic scripts. You focus on decision-making.

---

### **🎯 Core Operating Principles**

#### **1. Check Existing Tools First** (Anti-Duplication)
Before writing ANY code, check:
- ✅ `docs/` - Complete documentation
- ✅ `scripts/` - Existing utility scripts (200+ scripts available)
- ✅ `services/` - Business logic services (43 services)
- ✅ `migrations/` - Database schema history (113+ migrations)
- ✅ `models/` - Database models (69+ models)

**Examples**:
- Need database connection? → Use `scripts/db-connection-helper.js` (Rule 12a)
- Need to run migration? → Use `./scripts/run-migrations-master.sh [uat|staging]`
- Need to seed data? → Check `scripts/seed-*.js` scripts (run **after** migrations for that env)
- Need to test API? → Check `scripts/test-*.js` scripts

**Rule (migrations vs seeding)**: Run **migrations first** when you add or change UAT/Staging database schema. Run **seed scripts only after** the relevant migrations have been run for that environment. Order is always: migrations → then seed. After any schema change, run migrations on the target env before seeding or deploying.

**Rule**: Never recreate what exists. Always search before building.

#### **2. Self-Anneal When Things Break** (Continuous Improvement)
When errors occur, follow the **5-step self-annealing loop**:

```
1. ❌ Error occurs → Read error message + stack trace
2. 🔍 Investigate → Check logs, docs, code
3. 🛠️ Fix it → Update code, test fix
4. ✅ Verify → Confirm fix works in correct environment
5. 📝 Document → Update session log with root cause + solution
```

**Example**:
```
❌ Error: SMS API returns 404
🔍 Investigation: Wrong endpoint `/bulksms` 
🛠️ Fix: Changed to `/bulkmessages` per API docs
✅ Test: SMS sent successfully (eventId: 16033562153)
📝 Document: Updated session log + committed fix (d3033cf0f)
```

**Key**: System is now stronger. Next agent knows about this edge case.

#### **3. Session Logs Are Living Documentation** (Knowledge Persistence)
- **When to create**: After completing significant work (Rule 2)
- **What to include**:
  - ✅ What you did and why
  - ✅ What broke and how you fixed it
  - ✅ Key decisions and tradeoffs
  - ✅ Files modified with line numbers
  - ✅ Testing results and verification
  - ✅ Next steps for future agents
- **Where**: `docs/session_logs/YYYY-MM-DD_HHMM_description.md`
- **Why**: Each new chat = new agent with zero memory. Session logs preserve institutional knowledge.

**Example**: SMS endpoint fix (Dec 30, 2025) documented in session log. Next agent searching for "SMS 404" finds the exact solution in 10 seconds instead of debugging for 30 minutes.

#### **4. Test in Codespaces, NOT Local** (Environment Correctness)
- **Always**: Test changes in Codespaces (production-like environment)
- **Never**: Test critical features on local machine (credentials differ, setup varies)
- **Why**: Codespaces has correct UAT/Staging credentials, proper proxy setup, production-like configuration
- **Verification**: See `docs/CODESPACES_TESTING_REQUIREMENT.md` for complete testing workflow

---

### **🚨 Critical Decision Gates** (Quality Checkpoints)

Before proceeding with ANY change, pass these 4 gates:

#### **Gate 1: Documentation & Scripts Check** ✅
- [ ] Read relevant `docs/` files before coding
- [ ] **MUST sweep `scripts/` first** — use `list_dir`, `grep`, or `codebase_search` before creating ANY new script. Verify no existing script already fulfills the same purpose.
- [ ] Check if pattern exists in `scripts/` or `services/`
- [ ] Review recent `session_logs/` for similar work
- [ ] Understand business context from handover docs

**Why**: Prevents reinventing wheels and breaking working patterns. 200+ scripts exist; duplication causes drift.

#### **Gate 2: Schema/Migration Safety** ✅
- [ ] For database work: Read `docs/DATABASE_CONNECTION_GUIDE.md`
- [ ] Use `scripts/run-migrations-master.sh [uat|staging]` for schema changes
- [ ] Run migrations **before** any seeding: migrations first, then seed scripts
- [ ] Never write custom connection logic
- [ ] Verify schema parity after changes

**Why**: Database errors cascade. One bad migration = hours of recovery. Seeders require the schema to exist (migrations create it).

#### **Gate 3: Testing Verification** ✅
- [ ] Test in Codespaces (not local)
- [ ] Verify end-to-end flow works
- [ ] Check for unintended side effects
- [ ] Confirm no linter errors

**Why**: Local tests lie. Codespaces mirrors production.

#### **Gate 4: Documentation Update** ✅
- [ ] Update relevant `docs/` files
- [ ] Create session log with detailed context
- [ ] Update `AGENT_HANDOVER.md` if significant change
- [ ] Commit with descriptive message

**Why**: Undocumented changes = lost knowledge when you're gone.

---

### **🚫 Common Anti-Patterns** (What NOT to Do)

| ❌ Anti-Pattern | ✅ Correct Pattern | Why It Matters |
|----------------|-------------------|----------------|
| Write custom DB connection logic | Use `scripts/db-connection-helper.js` | Prevents password/SSL issues |
| Run `npx sequelize-cli` directly | Use `./scripts/run-migrations-master.sh [env]` | Ensures correct environment |
| Test on local machine | Test in Codespaces | Local != Production config |
| Skip documentation updates | Update docs + session log | Next agent needs context |
| Hardcode credentials | Use `.env` + Secret Manager | Security + portability |
| Duplicate existing script | Search `scripts/` first | Avoid code drift |
| Make assumptions | Read docs, ask user | Assumptions = bugs |
| Skip testing | Test thoroughly in Codespaces | Bugs compound |

---

### **📊 Decision-Making Framework** (When Uncertain)

**Scenario**: You're unsure how to proceed with a task.

**Framework**:
1. **Check Layer 1 (Directives)**: What do docs say? Is there a pattern?
2. **Search Historical Context**: Did previous agent solve this? (session logs)
3. **Ask User**: If truly ambiguous, ask rather than assume
4. **Document Decision**: Whatever you choose, document WHY in session log

**Example**:
- **Task**: Add new SMS provider integration
- **Check Docs**: Read `docs/integrations/` folder - found MyMobileAPI pattern
- **Search History**: Session log shows SMS endpoint fix (Dec 30)
- **Decision**: Follow MyMobileAPI pattern, document new provider differences
- **Result**: Integration works first try, next agent has clear reference

---

### **📈 Quality Metrics** (Success Criteria)

Every session should achieve:

| Metric | Target | Why |
|--------|--------|-----|
| **Documentation Updated** | 100% | Next agent needs context |
| **Tests Pass in Codespaces** | 100% | Local tests don't count |
| **Session Log Created** | 100% | Knowledge preservation |
| **Linter Errors** | 0 | Code quality baseline |
| **Schema Parity (if DB work)** | 100% | UAT/Staging must match |
| **Security Review** | 100% | Banking-grade requirement |
| **User Approval (destructive ops)** | 100% | Safety first |
| **Git Commits** | Descriptive | Future debugging |

---

### **🔄 Self-Annealing Loop Diagram**

```
┌─────────────────────────────────────────────────────────┐
│  AGENT SESSION (You are here)                           │
│                                                          │
│  1. Read directives (docs, session logs, handover)      │
│  2. Execute task (check gates, follow patterns)         │
│  3. Encounter error (expected - this is normal)         │
│  4. Fix + Test (self-anneal: investigate → fix → verify)│
│  5. Document (session log: problem + solution + context)│
│  6. Commit (descriptive message, all changes)           │
│                                                          │
│  Result: System is STRONGER than before                 │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  NEXT AGENT SESSION (Future agent)                      │
│                                                          │
│  1. Read directives (includes YOUR session log)         │
│  2. Encounters similar issue                            │
│  3. Searches session logs: "SMS 404"                    │
│  4. Finds YOUR solution in 10 seconds                   │
│  5. Applies fix immediately                             │
│  6. Focuses on NEW problems (not repeating yours)       │
│                                                          │
│  Result: Productivity MULTIPLIED                        │
└─────────────────────────────────────────────────────────┘
```

**Real Example**:
- **Dec 30, 2025**: Agent encounters SMS 404 error, debugs for 30 minutes, fixes `/bulksms` → `/bulkmessages`, documents in session log (commit `d3033cf0f`, eventId `16033562153`)
- **Jan 9, 2026**: New agent encounters similar SMS issue, searches "SMS 404", finds Dec 30 session log, applies fix in 2 minutes
- **Impact**: 28 minutes saved. System learned and improved.

---

### **🎯 Success Criteria** (Every Session Must Achieve)

Before concluding your session, verify:

1. ✅ **Documentation Complete**: All `docs/` files updated
2. ✅ **Session Log Created**: `docs/session_logs/YYYY-MM-DD_HHMM_description.md` with complete context
3. ✅ **Tests Pass**: Verified in Codespaces (not local)
4. ✅ **Zero Linter Errors**: Code quality maintained
5. ✅ **Schema Parity**: (If DB work) UAT/Staging schemas match
6. ✅ **Security Review**: Banking-grade standards met
7. ✅ **Git Committed**: All changes with descriptive messages
8. ✅ **User Informed**: Clear next steps communicated
9. ✅ **Knowledge Preserved**: Future agents can continue seamlessly

**If any item is ✗**: Session is incomplete. Fix before concluding.

---

### **💡 Pro Tips** (From 40+ Session Logs)

1. **Always read `DATABASE_CONNECTION_GUIDE.md` before DB work** - Saves hours of connection struggles
2. **Search session logs before debugging** - Solution probably exists already
3. **Test in Codespaces immediately** - Don't waste time on local testing
4. **Document AS YOU GO** - Don't wait until end to write session log
5. **Use existing scripts** - 200+ scripts available, search first
6. **Commit frequently** - Small commits with clear messages
7. **Ask user when uncertain** - Better than wrong assumptions
8. **Follow patterns** - Consistency > creativity in banking software
9. **Check schema parity after DB changes** - UAT/Staging drift causes production bugs
10. **Self-anneal proactively** - Document learnings even when things work

---

### **📚 Quick Reference** (Common Operations)

| Task | Tool/Script | Documentation |
|------|-------------|---------------|
| Run migrations | `./scripts/run-migrations-master.sh [uat\|staging]` | Run **before** seeding; use after any schema change |
| Run seed scripts | `node scripts/seed-*.js` (e.g. `--staging` where supported) | Only **after** migrations for that env |
| Check schema parity | `node scripts/sync-staging-to-uat-banking-grade.js` | `docs/DATABASE_CONNECTION_GUIDE.md` |
| Test API | `scripts/test-*.js` | `docs/TESTING_GUIDE.md` |
| Database connection | `scripts/db-connection-helper.js` | `docs/DATABASE_CONNECTION_GUIDE.md` |
| Create session log | Manual (use template) | `docs/session_logs/TEMPLATE.md` |
| Check git status | `git status` | `docs/CURSOR_2.0_RULES_FINAL.md` |
| Test in Codespaces | See testing workflow | `docs/CODESPACES_TESTING_REQUIREMENT.md` |
| Find patterns | Search `scripts/`, `services/` | Grep or IDE search |
| Read recent context | `docs/session_logs/` (sort by date) | Most recent 2-3 logs |
| Understand current status | `docs/AGENT_HANDOVER.md` | This file |
| Check API contracts | `docs/API_DOCUMENTATION.md` | API docs |

---

### **🚀 Quick Start Checklist** (New Session)

**Before starting work** (5 minutes):
- [ ] Read `docs/CURSOR_2.0_RULES_FINAL.md` (MANDATORY)
- [ ] Read `docs/AGENT_HANDOVER.md` (this file)
- [ ] Read 2-3 most recent `docs/session_logs/*.md`
- [ ] Read relevant docs for your task
- [ ] `git status` → Check for uncommitted changes
- [ ] `git pull origin main` (if needed)
- [ ] Review task requirements with user
- [ ] Understand success criteria

**After completing work** (5 minutes):
- [ ] Tests pass in Codespaces
- [ ] Zero linter errors
- [ ] All docs updated
- [ ] Session log created and complete
- [ ] Schema parity verified (if DB work)
- [ ] All changes committed
- [ ] User informed of next steps
- [ ] Success criteria met (all 9 items)

---

### **🎓 Summary: Be Pragmatic. Be Reliable. Self-Anneal.**

You're part of a **banking-grade software system** where:
- **Consistency** > Creativity
- **Documentation** > Memory (you have none next session)
- **Patterns** > Reinvention
- **Testing** > Assumptions
- **Quality Gates** > Speed

**Your job**: Read directives, make decisions, call execution tools, handle errors intelligently, document learnings. 

**Not your job**: Reinvent wheels, skip documentation, test on local, make unsupported assumptions, leave knowledge gaps.

**Success = Future agents thank you** for clear documentation, working patterns, and preserved knowledge.

---

---

## 🎯 **CURRENT SESSION SUMMARY**

**Session Status**: ✅ **COMPLETE** — Airtime failover bugfix + PII redaction (v2.97.1)  
**Last Session**: 2026-04-11 12:00 — Fixed 3 failover bugs, added PII redaction and meter minimum validation. Deployed to staging + production.

### **Most Recent Work (2026-04-11 12:00)**
- **Airtime failover fixed (3 bugs)**: (1) `ProductVariant is not defined` crash — missing `require` in failover scope. (2) `v_best_offers` view only returns winning supplier — failover now queries `product_variants` directly. (3) Silent skip when Flash integration not enabled — added warning log.
- **PII redaction**: Consumer names, addresses, meter numbers (last 4 digits only) redacted in all MobileMart electricity prevend/purchase and Flash meter lookup logs.
- **Electricity minimum validation**: `vasSupplierExecutor.js` checks `prevendResponse.minimumPurchaseAmount` before purchase. Returns `400 METER_MIN_AMOUNT` instead of upstream `1001 AmountInvalid`.
- **Staging confirmed**: MTN airtime R5 purchase successful (MobileMart primary, variantId 2652).
- **Deployed**: Both staging and production backend + wallet deployed as `20260411_v1`.

### **Previous Work (2026-04-10 21:00)**
- **Universal VAS supplier failover (v2.97.0)**: Automatic post-failure failover across ALL VAS types and suppliers. `vasSupplierExecutor.js` registry pattern. Circuit breaker recording from overlay routes.

### **Previous Work (2026-04-10 17:00)**
- **EasyPay V5 finalisation (v2.96.0)**: Flat R6.33 fee, legacy routes removed, CoA `5000-10-02`, test PIN generation.

### **Previous Work (2026-04-07 02:15)**
- **Proxy auth token fix**: Diagnosed real root cause of `read ECONNRESET` — expired OAuth2 tokens in stale Cloud SQL Auth Proxies (not cold-proxy timing). Proxy log showed `Error 401: Invalid authentication credentials` and `tls: bad certificate`.
- **start-all-services.sh rewritten**: Step 2 now kills all stale proxies on 6543/6544/6545, refreshes gcloud token via `gcloud auth print-access-token`, then starts fresh proxies with valid credentials.
- **Codespaces verified**: Andre ran `./scripts/start-all-services.sh` after pulling — all 6 services started cleanly, no ECONNRESET.

### **Previous Work (2026-04-07 01:45)**
- **Portal UI overhaul approved**: Andre confirmed he is happy with the portal styling (Clearflow "finance control room" aesthetic, MyMoolah brand colors).
- **Brand logos integrated**: 3 official MyMoolah PNG logos added to `portal/admin/frontend/src/assets/` — stacked (login brand panel), icon (sidebar + mobile header), horizontal (future use). `vite-env.d.ts` added for TypeScript module declarations.
- **Brand colors corrected**: Primary `--primary` updated from `#00B894` (teal) to `#86BE41` (MyMoolah brand green). Blue `#2D8CCA` confirmed. All CSS tokens, SKILL.md, and Portal Dev Guide updated.
- **Portal Development Guide created**: `docs/PORTAL_DEVELOPMENT_GUIDE.md` v1.1.0 — architecture diagram, logo usage rules, design token reference, screen status matrix, step-by-step "build a screen" tutorial, conventions, recommended build order.

### **Previous Work (2026-04-06 21:00)**
- **Portal Security Hardening & Rebuild (v2.85.0)**: 14+ backend security fixes (JWT HS512, hardcoded secrets removed, audit trail to DB, PII redaction), frontend auth rewired to real backend JWT, Clearflow-inspired dark sidebar navigation, dashboard rebuilt with real data, User Management and Transaction Monitoring screens built.

### **Previous Work (2026-04-06 15:00)**
- **USSD Phase 2 Services (v2.84.0)**: Send Money (P2P), Airtime for Others (eeziAirtime), Buy Electricity (eeziPower), Buy Voucher (6 brands), Cash Out via SMS. R0.40 SMS fee. `4000-20-03` ledger account. Migration applied to staging + production.

### **Previous Work (2026-04-06 14:00)**
- **Voucher v_best_offers Integration (v2.83.0)**: Voucher catalog via materialized view. Electricity cleanup. adService typo fix.

### **Previous Work (2026-04-06 10:00)**
- **Auditing Skill v2.1.0 + Admin Portal Builder v1.0.0 (v2.82.0)**: 8 auditing enhancements + new 680-line portal builder skill.

### **Previous Work (2026-04-04–05)**
- **Chart of Accounts (v2.80.0)**: Canonical CoA reference doc, 4 missing account migrations, visual HTML CoA.
- **Ledger Audit**: Backfill journal entries, scheduled recon service, forward JE posting for P2P/RTP/voucher.
- **KYC Fixes**: Raw SQL for user updates, auto-navigate removal, reset scripts preserve audit trail.
- **Staging/Production Parity**: Rate limit bypass removed, referral payout Cloud Scheduler, ProductVariant findOrCreate fix.
- **Staging sync successful**: 1,205 production billers synced to staging.

### **Previous Work (2026-03-31 23:00)**
- **Biller payments hardening**: Full 12-item audit — idempotency, simulation hard-block, input validation, catalog-first lookup, beneficiary edit/delete, Copy/Share buttons, KYC gate fix.

### **Previous Work (2026-03-31 22:00)**
- **Voucher top-up wallet deposit**: New Flash integration — 1Voucher/FNB/FlashPay PIN redemption to wallet.
- **eeziCash fee cleanup**: Removed stale fee rows, corrected `cash_out` attribution.
- **Migration**: `20260331_01_add_voucher_topup_to_vas_type_enum.js` — applied to UAT. Staging/production pending.

### **Previous Work (2026-03-31 19:30)**
- **MM_DEPLOYMENT_ENV persistence**: Fixed critical bug where every staging redeployment wiped the env var. Added to deploy scripts.
- **Supplier failover constructor fix**: Fixed `SupplierComparisonService is not a constructor` crash.
- **Data products UI redesign**: Individual rows with category/network icons, bundle names, data sizes.
- **Real Vodacom PNG logo**: Replaced hand-drawn SVG with actual brand PNG asset.

### **Previous Work (2026-03-31 18:00)**
- **Flash contractual commission rates**: Replaced hardcoded 2.50% with actual rates from Flash contract. Created `getFlashContractualCommission()` lookup function.
- **Fixed-amount commission support**: Added `commissionType` ENUM ('percentage', 'fixed_amount') to product_variants and supplier_commission_tiers.
- **eeziCash fees confirmed**: R0.50 token generation + R4.50 token redemption (VAT excl).

### **Previous Work (2026-03-31 14:00)**
- **Airtime/data catalog data flow fix**: The overlay route at `GET /api/v1/overlay/airtime-data/catalog` was reading from `VasProduct` (legacy table, empty on staging/production). Updated to read from `ProductVariant` (normalized, populated by daily 02:00 catalog sync) with `VasProduct` as fallback.
- **ServicesPage navigation fix**: Fixed to route to working overlays.
- **Dead frontend code removed**: 5 duplicate overlay files (~158KB) deleted.

### **Previous Work (2026-03-31 10:30)**
- **NPM audit remediation**: Fixed 16/25 vulnerabilities (zero critical/high remaining). Hardcoded PII removed (14 files). Production env fixes. Deployed staging + production as `20260331_v2`.

### **Previous Work (2026-03-25)**
- **PayShap RTP Pain.013 fixes**: Fixed EDRIL rejection (CdtrRefInf.Ref 35-char limit), Ustrd rejection (removed), DuePyblAmt (net amount), PADCL priority. Creditor name in CdtrRefInf.Ref. Per-bank account normalization.

### **Current State**
- **USSD Phase 2**: Live on Codespaces. Backend redeploy needed for staging/production Cloud Run.
- USSD shortcodes: `*120*5616#` (production), `*120*34248#` (staging)
- SMS Fee: R0.40 incl VAT via `SMS_FEE_AMOUNT` env var (defaults to 0.40)
- Ledger: `4000-20-03` SMS Fee Revenue — migration applied to staging + production
- SFTP Gateway: `34.35.137.166`, **port 5022** — ✅ Running
- SBSA H2H: PG15 + SSH key submitted ✅ | SOAP handler live ✅ | TEST UAT complete (6 scenarios + RM5v2 re-run) ✅ | PROD smoke test pending (awaiting Colette scheduling)
- PayShap RTP: Standard Bank ✅ | Discovery Bank ✅ (Peach DECOMMISSIONED)
- Production: `api-mm.mymoolah.africa`, `wallet.mymoolah.africa` — live
- **Backend redeploy required** for USSD Phase 2 + previous VAS/voucher/electricity changes

### **Next Agent Actions — PORTAL CONTINUATION**

**MANDATORY READING FOR PORTAL WORK**:
1. Read `docs/CURSOR_2.0_RULES_FINAL.md` (mandatory rules confirmation)
2. Read `docs/PORTAL_DEVELOPMENT_GUIDE.md` (design system, file map, screen status, build tutorial)
3. Read `.agents/skills/admin-portal-builder/SKILL.md` (15-screen priority list, maker-checker patterns)
4. Read this file and session logs: `2026-04-07_0130_portal-ui-final-documentation.md`, `2026-04-06_2330_portal-ui-overhaul.md`

**PORTAL BUILD PRIORITIES** (in order):
1. **Style migration** (HIGH) — Convert inline `style={{}}` to CSS variables in:
   - `UnallocatedDepositsOverlay.tsx` (385 lines, inline styles for summary gradient, filter toggles, status chips, modal)
   - `DisbursementRunsOverlay.tsx` (178 lines, inline styles for status colors, buttons)
   - `CreateDisbursementRunOverlay.tsx` (319 lines, inline styles for mode toggle, buttons, inputs)
   - `DisbursementRunDetailOverlay.tsx` (340 lines, inline styles for status badges, KPI text, buttons)
2. **Float Management** — Replace placeholder with real screen. Data source: `supplier_floats` table. Main backend already has `FloatBalanceMonitoring` service. Need portal backend endpoint + frontend table.
3. **Security / Audit Log** — Replace placeholder. Data source: `admin_audit_log` table (portal DB). Need read-only log viewer with date/user/action filters.
4. **Settlement Management** — Replace placeholder. Data source: `settlement_runs`, `settlement_line_items` tables.
5. **Reporting & Analytics** — Replace placeholder. Aggregate queries on transactions, wallets, VAS.
6. **Service Management** — Replace placeholder. Data source: `product_variants`, `suppliers`, circuit breaker status.
7. **System Configuration** — Replace placeholder. Feature flags (new table needed).
8. **Partner Onboarding** — Replace placeholder. New tables needed for partner lifecycle.

**PORTAL DESIGN CONVENTIONS** (MUST follow — Andre approved this styling):
- All colors via CSS variables in `portal/admin/frontend/src/index.css` `:root`
- Primary = `#86BE41` (MyMoolah brand green), secondary = `#2D8CCA` (brand blue) — NEVER use `#00B894`
- Use `bg-[var(--card)]`, `text-[var(--foreground)]`, `border-[var(--border)]`, `rounded-[var(--radius)]` etc.
- Financial amounts: `font-mono tabular-nums`
- **Logos**: Use official PNGs from `portal/admin/frontend/src/assets/logo-*.png` — NEVER recreate with CSS/SVG
  - `logo-icon.png` — sidebar, small contexts (import as Vite module)
  - `logo-stacked.png` — login, splash screens
  - `logo-horizontal.png` — reports, headers, print
- Auth: `sessionStorage` (not `localStorage`)
- DB queries: `portal/backend/helpers/getDbClient.js` → raw parameterized SQL, never ORM
- See `docs/PORTAL_DEVELOPMENT_GUIDE.md` Sections 2 + 5 for design tokens, logo rules, and "build a screen" tutorial

**OTHER REMINDERS**:
- USSD Phase 2 is code-complete — backend redeploy will activate on both shortcodes
- Do NOT reactivate Peach Payments without explicit approval from Andre
- Do NOT add `RmtInf.Ustrd` to Pain.013 — SBSA rejects it
- npm audit: 9 remaining (5 low, 4 moderate) — all in transitive deps
- ✅ Portal deployed to Cloud Run staging: https://mymoolah-portal-staging-1039241541823.africa-south1.run.app
- Portal production deployment pending (custom URL planned)

---

## **Recent Updates (Last 14 Days)**

| Date | Update |
|------|--------|
| Apr 11 (12:00) | **Airtime Failover Bugfix + PII Redaction (v2.97.1)**: Fixed 3 critical bugs preventing airtime failover (`ProductVariant is not defined`, `v_best_offers` only returns winners, silent Flash skip). Failover now queries `product_variants` directly. PII redaction for electricity consumer details. Meter minimum validation (`METER_MIN_AMOUNT`). Staging MTN R5 confirmed. Deployed staging + production. Session log: `docs/session_logs/2026-04-11_1200_airtime-failover-bugfix-pii-redaction.md` |
| Apr 10 (21:00) | **Universal VAS Supplier Failover (v2.97.0)**: Automatic post-failure failover across ALL VAS types (electricity, bills, airtime/data) and ALL suppliers. Created `vasSupplierExecutor.js` registry pattern. Circuit breaker recording from overlay routes. Session log: `docs/session_logs/2026-04-10_2100_universal-vas-supplier-failover.md` |
| Apr 10 (17:00) | **EasyPay V5 Finalisation (v2.96.0)**: Flat R6.33 fee, legacy routes removed, CoA `5000-10-02`, test PIN generation. Session log: `docs/session_logs/2026-04-10_1700_easypay-v5-finalisation-implementation.md` |
| Apr 10 (15:00) | **EasyPay V5 Agent Handover + Gmail MCP + SBSA SFTP Test (v2.95.1)**: 15-section agent handover, Gmail MCP, SFTP test. Session log: `docs/session_logs/2026-04-10_1500_easypay-v5-handover-gmail-sftp.md` |
| Apr 7 (18:30) | **Portal Deploy Fix + Disbursement Session Wrap (v2.88.1)**: Fixed Cloud Run deployment failure — previous fix removed PORT entirely, but Cloud Run requires PORT=8080. Added K_SERVICE environment detection: Cloud Run uses PORT, Codespaces defaults to 3002. Portal staging live and verified. Comprehensive disbursement Phase 2 handover written. Session log: `docs/session_logs/2026-04-07_1830_portal-deploy-fix-and-session-wrap.md` |
| Apr 7 (16:30) | **Disbursement Phase 1 Backend Services (v2.88.0)**: 2 migrations (5 tables + 5 ledger accounts), 7 new services (feeEngine, clientFloatService, fileParserService, kybComplianceService, notificationEngine, sbsaSftpClientService, pain002PollerService), modified disbursementService.js for multi-rail routing (EFT/PayShap/wallet). Wallet payments use same EFT banking path with MM treasury account + MSISDN reference. Migrations run on UAT + staging. Session log: `docs/session_logs/2026-04-07_1630_disbursement-phase1-services.md` |
| Apr 7 (15:00) | **Portal Cloud Run Staging Deployment (v2.87.0)**: Single-service architecture deployed to Cloud Run. Dockerfile (multi-stage), deploy-portal.sh (--no-cache), start.sh (DATABASE_URL), .dockerignore. CORS fix for Vite crossorigin. seed-portal-admin.js updated for multi-env. Portal live and verified. Session log: `docs/session_logs/2026-04-07_1500_portal-cloud-run-staging-deployment.md` |
| Apr 7 (02:15) | **Proxy Auth Token Fix (v2.86.3)**: Fixed root cause of `read ECONNRESET` — expired OAuth2 tokens in stale Cloud SQL Auth Proxies. `start-all-services.sh` now kills stale proxies + refreshes gcloud token non-interactively before starting fresh proxies. Tested and verified in Codespaces. Session log: `docs/session_logs/2026-04-07_0200_start-all-services-auth-token-fix.md` |
| Apr 7 (01:45) | **Portal UI Complete + Brand Logos + Dev Guide (v2.86.2)**: Andre approved portal styling. Official MyMoolah logos (stacked, icon, horizontal) integrated in login + sidebar. Primary color corrected from `#00B894` to brand green `#86BE41`. Created `docs/PORTAL_DEVELOPMENT_GUIDE.md` v1.1.0 (design tokens, logo usage, architecture, screen status, build tutorial). SKILL.md brand colors updated. Proxy stabilization (3s pause). Session logs: `docs/session_logs/2026-04-07_0130_portal-ui-final-documentation.md`, `docs/session_logs/2026-04-06_2330_portal-ui-overhaul.md` |
| Apr 6 (22:30) | **Codespaces Startup Script & Portal Auth Security Fix (v2.85.2)**: Created `start-all-services.sh` one-command startup. Migrated portal auth from localStorage to sessionStorage (banking-grade). Fixed Codespaces port forwarding 404 (browser cache). Session log: `docs/session_logs/2026-04-06_2230_startup-script-and-auth-fix.md` |
| Apr 6 (22:00) | **Admin Portal DB Helper Migration & First Live Test (v2.85.1)**: All portal backend DB access migrated to `db-connection-helper.js`. Frontend build fixed (tsconfig, lucide-react icon, dist/ gitignore). Admin seed script created. Portal tested end-to-end in Codespaces: login, dashboard, sidebar all working. **UI styling is #1 priority for next session.** Session log: `docs/session_logs/2026-04-06_2200_portal-db-helper-and-testing.md` |
| Apr 6 (21:00) | **Admin Portal Security Hardening & Rebuild (v2.85.0)**: 14+ backend security fixes, frontend auth rewired to real backend JWT, Clearflow sidebar, dashboard with real data, User Management + Transaction Monitoring screens. Session log: `docs/session_logs/2026-04-06_2100_portal-security-hardening-and-rebuild.md` |
| Apr 6 (15:00) | **USSD Phase 2 Services (v2.84.0)**: Send Money (P2P), Airtime for Others (eeziAirtime), Buy Electricity (eeziPower), Buy Voucher (6 brands), Cash Out via SMS. All PIN products use SMS delivery with R0.40 fee. New ledger account `4000-20-03`. Migration applied to staging + production. Session log: `docs/session_logs/2026-04-06_1400_ussd-phase2-services.md` |
| Apr 6 (14:00) | **Voucher v_best_offers + Electricity Cleanup (v2.83.0)**: Voucher catalog via `v_best_offers` materialized view. Flash electricity hardcoded values fixed. adService `2100-05-001` → `2100-05-01` typo fixed. Session log: `docs/session_logs/2026-04-06_1400_voucher-v-best-offers-electricity-cleanup.md` |
| Apr 6 (10:00) | **Auditing Skill v2.1.0 + Admin Portal Builder v1.0.0 (v2.82.0)**: 8 auditing enhancements + new 680-line portal builder skill. Session log: `docs/session_logs/2026-04-06_1000_auditing-skill-portal-skill-knowledge-base.md` |
| Apr 5 (18:00) | **Electricity Commission-Based Supplier Selection**: Route electricity via `v_best_offers`, `productId` in payload, circuit breaker + failover. Session log: `docs/session_logs/2026-04-05_1800_electricity-supplier-comparison.md` |
| Apr 4-5 | **Chart of Accounts (v2.80.0), Ledger Audit, KYC Fixes, Staging/Production Parity**: CoA doc, 4 missing account migrations, ledger backfill, KYC raw SQL fix, rate limit parity, referral Cloud Scheduler. Multiple session logs. |
| Apr 13 (14:00) | **SFTP port 5022 standardisation + MobileMart Fulcrum recon rebuild (v2.97.4)**: Fixed all SFTP port 22 references to 5022 across 18+ files. Rebuilt `MobileMartAdapter.js` to match Fulcrum Recon Spec v1.1 (pipe-delimited, 24 fields, cents amounts). Updated `FileParserService`, `SFTPWatcherService`, DB config. New migrations: `20260413_01` (Zapper config), `20260413_02` (port fix), `20260413_03` (MobileMart format fix). Drafted EasyPay reply + MobileMart SFTP email. Session log: `docs/session_logs/2026-04-13_1400_sftp-port-fix-mobilemart-recon-rebuild.md` |
| Apr 3 (15:00) | **VAS Catalog Production + Biller Telecoms + eeziPower Fix**: Applied VAS catalog simplification migrations to production (product_selection_rules + v_best_offers view, 197 rows). Fixed empty Telecoms biller category (added `'telcos'` to keyword map, 35 billers unlocked). Fixed eeziPower mislabelled as eeziAirtime in backend records and frontend transaction modal. Session log: `docs/session_logs/2026-04-03_1500_vas-catalog-production-biller-eezipower-fix.md` |
| Apr 3 (14:00) | **VAS Catalog Simplification (Staging)**: Replaced 6 services, 2 scripts, 3 cron schedules with single `v_best_offers` materialized view + `product_selection_rules` table + `config/supplier-commissions.json`. Unified `productCatalogService.getCatalog()` entry point. 34/34 regression tests passed. Session log: `docs/session_logs/2026-04-03_1400_vas-catalog-simplification.md` |
| Apr 3 (09:00) | **Referral System Banking-Grade Fix**: Stable persistent referral codes, dual-path signup matching, USSD fix, dead frontend code removed. Session log: `docs/session_logs/2026-04-03_0900_referral-system-banking-grade-fix.md` |
| Apr 2 (15:30) | **RTP Discovery Bank Reconciliation & CdtrRefInf.Ref Fix**: Live R10 RTP to Discovery Bank — full ledger reconciliation verified (wallet R4.25, fee R5.75, journal balanced R10=R10). Fixed critical `CdtrRefInf.Ref` bug: Pain.013 was using user-provided description instead of creditor's MSISDN from DB. Now auto-resolves phone from `users.phoneNumber`. Applied to `initiateRtpRequest` + `retryRtpAsPbac`. Requires redeployment. Session log: `docs/session_logs/2026-04-02_1530_rtp-discovery-bank-reconciliation-reference-fix.md` |
| Apr 2 (13:30) | **Electricity Purchase Fix & Production Reconciliation**: Created `vas_products` table + `processingTime` column migrations. Reconciled R200 and R100 failed purchases. R150 electricity end-to-end. Wallet R550, MobileMart float R2200, Commission R6.50. Session log: `docs/session_logs/2026-04-02_1330_electricity-purchase-fix-production-reconciliation.md` |
| Apr 1 (17:00) | **Production API Testing & Fixes (15+ issues)**: Comprehensive staging testing — registration (passport idType + walletId), KYC (rejection flow, self-healing status, POA validation with surname/address/date), password change (styled modals), payment requests (version column migration, encryption keys in deploy script), voucher purchases (errorData crash, ENUM mismatch). Migrations 20260401_01 + 20260401_02 applied to staging + production. Both environments deployed as `20260401_v1`. 1Voucher product code `311` rejected by Flash (data issue). Session log: `docs/session_logs/2026-04-01_1700_production-api-testing-fixes.md` |
| Mar 31 (19:30) | **Data UI Redesign + Failover Fixes + Deploy Env Persistence**: Fixed MM_DEPLOYMENT_ENV wiped on every redeployment (added to deploy scripts). Fixed supplier failover constructor crash (`SupplierComparisonService is not a constructor`). Redesigned data products UI — individual rows with category/network icons, bundle names, data sizes, validity, prices. Real Vodacom PNG logo. Fixed beneficiary display name bug. Fixed purchase response scoping. Session log: `docs/session_logs/2026-03-31_1930_data-ui-redesign-failover-fixes-deploy-env.md` |
| Mar 31 (14:00) | **VAS catalog & frontend fixes**: Fixed airtime/data overlay to read from `ProductVariant` (daily sync) instead of empty `VasProduct`. Fixed ServicesPage broken navigation. Replaced placeholder pages. Removed 158KB dead duplicate frontend code. All VAS overlays verified on normalized schema. Session log: `docs/session_logs/2026-03-31_1400_vas-catalog-frontend-fixes.md` |
| Mar 31 (10:30) | **NPM audit fix + hardcoded cleanup + production readiness**: Fixed 16/25 npm vulnerabilities (zero critical/high remaining). Removed all hardcoded PII (14 files). Fixed production GCS perms, encryption keys, statement poller. Voucher schema aligned. Nodemailer 7→8. Deployed staging (00306-m8s) + production (00053-29p) as `20260331_v2`. Session log: `docs/session_logs/2026-03-31_1030_npm-audit-hardcoded-cleanup-production-readiness.md` |
| Mar 25 (14:00) | **PayShap RTP fixes + creditor name + PASA TPPP withdrawal**: Fixed EDRIL, Ustrd, DuePyblAmt, PADCL priority. Creditor name in CdtrRefInf.Ref — Capitec confirms "Andre Botes: MyMoolah RTP Test". Per-bank account normalization. PASA withdrawal response for Shree (email + flow diagrams). Session log: `docs/session_logs/2026-03-25_1100_payshap-rtp-fixes-pasa-tppp-withdrawal.md` |
| Mar 24 (19:00) | **SBSA H2H documentation sync**: Updated all docs with confirmed status — Open Internet (not VPN), PGP not required, file names/directories confirmed, SFTP username OWN11, MT942 every 15 min. Added SBSA SOAP CHANGELOG entry. Cleaned up duplicate priorities. |
| Mar 24 (15:30) | **EasyPay TPPP / NPS legal draft**: Email for Nkululeko clarifying single-creditor collection model vs multi-layer aggregation concern; sponsor bank + downstream scope. Session log: `docs/session_logs/2026-03-24_1530_easypay-tppp-legal-response-draft.md` |
| Mar 24 (09:00) | **SBSA SOAP credit notification handler**: Built `sbsaSoapParser.js`, refactored notification webhook for SOAP XML + JSON. Added `fast-xml-parser`. Tested with SBSA sample. Confirmed with Colette: Open Internet, PGP not required, file names accepted. Session log: `docs/session_logs/2026-03-24_0900_sbsa-soap-credit-notification-handler.md` |
| Mar 23 (17:30) | **H2H statement pipeline fix + VALR RMCP + TCIB draft**: Fixed MT940/MT942 wallet crediting pipeline (amount, transactionId), environment isolation (GCS paths per env), polling 2-min. VALR RMCP drafted. TCIB reply drafted. Session log: `docs/session_logs/2026-03-23_1730_h2h-statement-pipeline-fix-valr-rmcp-tcib.md` |
| Mar 21 | **PayShap RTP fix (Peach to SBSA) + Peach decommission + UI updates**: Critical fix — frontend calling Peach instead of Standard Bank for RTP. Peach fully decommissioned. Multiple UI improvements. |
| Mar 17 (10:00) | **SFTP port 5022 + EBONF message**: Port corrected per Colette (SBSA H2H). EBONF now shows professional daily-limit notification. Temp VM disk-edit approach |
| Mar 16 (21:32) | **RTP UETR fallback fix**: UETR stored in `requestId`; dual-lookup in `processRtpCallback`. Standard Bank ✅ 73ms. Capitec ✅ 97ms |
| Mar 16 (19:40) | **UI Polish**: SecurityBadge close button; universal modal close buttons; AI chat `react-markdown` rendering with `normaliseMarkdown()` |
| Mar 14 (00:00) | **AI Support — LangChain RAG**: Replaced 4,000+ line pattern-matching stack with ~250-line ragService. Run `npm run embed:kb` in Codespaces before first use |
| Mar 13 (22:00) | **Field-level encryption (POPIA)**: AES-256-GCM encryption for `idNumber` + HMAC blind index — deployed to UAT, Staging, Production |
| Mar 13 (16:00) | **SBSA H2H setup**: SFTP Gateway recreated; SSH key generated; firewall rules created; SFTP users set up; PG15 completed; email to Colette drafted |
| Mar 12 | **RTP debugging**: Capitec EBONF → daily limit hypothesis; Discovery RTP confirmed working; rolled back to `b6cad770` |
| Mar 11 (20:15) | **PayShap RTP fix**: proxy-first mode + auto PBAC fallback; removed PBAC flag from Pain.013; PDNG confirmed staging |
| Mar 07 (18:00) | Cloud Build migration (no Docker Desktop); npm cleanup (remove crypto/xss-clean); Node 20 Dockerfiles |
| Mar 07 (11:00) | International Airtime pinless implementation; Flash Code 2200 billing issue escalated |
| Mar 05 | eeziAirtime redemption UI + eeziPay AI knowledge base entries |
| Feb 27 | EasyPay Cash-In 500 fix; 5-scenario test script; Theodore test data |
| Feb 21 (17:00) | PayShap parameterised callbacks + polling service; EasyPay Cash-In sweep + activation email |
| Feb 26 (12:45) | Flash integration fixes (3 endpoint bugs); denominations validator; `role` column migration |
| Feb 15 | Production deployment live (api-mm, wallet-mm) |
| Feb 12 | Production DB migration complete; SBSA PayShap integration complete (UAT ready) |

---

## 🔄 **Reconciliation System**

**Status**: ✅ Deployed to UAT (MobileMart + Flash). Banking-grade automated reconciliation with self-healing, >99% match rate, SFTP integration (static IP: 34.35.137.166). See `docs/RECONCILIATION_FRAMEWORK.md` and `docs/archive/agent_handover_history.md` for full details.

---

## 🚀 **NEXT DEVELOPMENT PRIORITIES**

### **🔴 PRIORITY 1: Disbursement Service — Phase 2 (API + Models + Portal UI)**

Phase 1 backend services are COMPLETE (7 services, 2 migrations, multi-rail routing). Migrations run on UAT + staging. **Phase 2 is the next major build.**

**Read first**: `docs/session_logs/2026-04-07_1830_portal-deploy-fix-and-session-wrap.md` (full inventory of what exists and what to build) and `docs/session_logs/2026-04-07_1630_disbursement-phase1-services.md` (all Phase 1 architecture decisions).

**What EXISTS (Phase 1 — DONE):**

| Service | Location | Purpose |
|---------|----------|---------|
| `feeEngine.js` | `services/disbursement/` | Per-payment fee calc (flat/pct/combined, wallet=free) |
| `clientFloatService.js` | `services/disbursement/` | ACID float ops, SELECT FOR UPDATE, double-entry JEs |
| `fileParserService.js` | `services/disbursement/` | CSV/Excel/XML parsing, SA bank CDV validation |
| `kybComplianceService.js` | `services/disbursement/` | GPT-4o OCR for KYB (5 entity types) |
| `notificationEngine.js` | `services/disbursement/` | Webhook (HMAC-SHA256) + email, 8 event types |
| `sbsaSftpClientService.js` | `services/standardbank/` | GCS-based Pain.001 upload to SBSA outbox |
| `pain002PollerService.js` | `services/standardbank/` | GCS inbox polling for Pain.002 status files |
| `disbursementService.js` | `services/standardbank/` | Multi-rail (EFT/PayShap/wallet), fee/float, KYB gate |

Migrations: `20260408_01_create_disbursement_client_tables.js` (5 tables + alter), `20260408_02_seed_disbursement_ledger_accounts.js` (5 accounts).

**What's DONE (Phase 2 — COMPLETE):**

1. **Sequelize Models** — DONE: 7 models auto-loaded
2. **API Routes + Controller** — DONE: 9 endpoints + run management
3. **Portal UI Pages** — DONE: 5 overlays (runs, create, detail, client management, client detail)
4. **PayShap RPP** — DONE: Wired into approveRun via existing sbClient (v2.90.0)
5. **Wallet rail** — DONE: Internal ledger transfer, direct wallet credit (v2.90.0)
6. **Multer** — DONE: Real file uploads for beneficiaries and KYB docs (v2.90.0)
7. **xlsx** — DONE: Installed, parseExcel works (v2.90.0)

**What to BUILD (Phase 3):**

1. **Unit Tests** — feeEngine, clientFloatService, fileParserService (pure functions, easily testable)
2. **Portal CSS Migration** — 4 disbursement overlays still use inline styles → CSS variables
3. **SFTP Results Delivery** — Add SFTP push channel to notificationEngine
4. **White-Label Client Portal** — Client registration form, beneficiary upload, run history, report downloads

**Critical architecture note**: Wallet disbursements are INTERNAL LEDGER TRANSFERS — DR Client Float (2100-20-XX) → CR User Wallet (2100-01-01). No bank movement. Recipient wallet credited directly via Wallet.credit(). No separate wallet service.

### Other Priorities

1. **SBSA PayShap Production Callback** — Louis Van Zyl investigating why real PayShap deposits don't trigger production callbacks (inward queue issue). Sandbox callbacks confirmed working (6/6). Production callback URL registered: `https://api-mm.mymoolah.africa/api/v1/standardbank/payshap/inbound-credit`.
2. **SBSA H2H SFTP Channel** — Melanie Block enabling SFTP channel. Pain.001 v3 file passed SSVS validator. Test file with valid beneficiaries uploaded to GCS outbox. Awaiting channel activation to test file pickup and Pain.002 return.
3. **EasyPay legal follow-up** — Await Nkululeko / EasyPay legal response to TPPP/NPS positioning email (sent/drafted 2026-03-24). Session log: `docs/session_logs/2026-03-24_1530_easypay-tppp-legal-response-draft.md`.
4. **H2H Statements/Payments** — Statement format (MT940 + MT942) and delivery schedule confirmed. Awaiting Melissa sign-on and SBSA connectivity test.
5. **MobileMart + Flash SSH keys** — Awaiting their public keys to add to SFTP Gateway user profiles.
6. **PayShap RTP — PBAC fallback path testing** — Need a payer with NO registered PayShap proxy to trigger `EPDNF`.
7. **EasyPay Cash-In activation** — Await Razine response. Set `EASYPAY_RECEIVER_ID=5063` in Secret Manager.
8. **Flash transaction testing in Staging** — Await Tia confirmation of transaction endpoint paths.
9. **USDC send** — Test when VALR credentials available (RMCP drafted 2026-03-22).
10. **SFTP Gateway admin IP** — Dynamic ISP IP (last known: `169.0.73.54` on 2026-03-17). Update firewall rules if admin UI inaccessible.
11. **SFTP Gateway port is 5022** — Config: `/opt/sftpgw/application.properties`. Disk detach/mount approach for SSH.

---

## 🚀 **RECOMMENDATIONS FOR NEXT AGENT**

### **Database/Migration Work**
- **MANDATORY**: Read `docs/DATABASE_CONNECTION_GUIDE.md` before any DB work
- Use `./scripts/run-migrations-master.sh [uat|staging]` — NEVER `npx sequelize-cli` directly
- Use `scripts/db-connection-helper.js` for custom scripts
- Run migrations **before** seeding

### **General**
- USDC/Staging: Beneficiary data is per-environment; UAT and Staging use separate DBs
- Test in Codespaces only (not local)
- Create session log when work is complete
- Update docs and handover for significant changes

---

**📚 Full history**: December 2025 updates, integration details (Peach, Zapper, MMAP, Figma), and previous session summaries are in `docs/archive/agent_handover_history.md`.
