# MyMoolah Treasury Platform - Agent Handover Documentation

**Last Updated**: 2026-02-27 12:00  
**Latest Feature**: EasyPay Cash-In activation complete (500 fix, test script, Razeen/Theodore docs)  
**Document Version**: 2.11.25  
**Session logs**: `docs/session_logs/2026-02-27_1200_easypay-500-fix-activation-complete.md`, `docs/session_logs/2026-02-26_1930_easypay-cashin-activation-fixes.md`, `docs/session_logs/2026-02-26_1245_flash-integration-fixes-clean-slate-catalog-test.md`  
**Classification**: Internal - Banking-Grade Operations Manual

---

## 📌 **WHAT IS MYMOOLAH?**

MyMoolah Treasury Platform (MMTP) is South Africa's premier Mojaloop-compliant digital wallet and payment solution. It provides: wallet services, VAS (airtime, data, vouchers, bill payments, electricity), cash-out (EasyPay), USDC, NFC deposits, referrals, KYC, and automated multi-supplier reconciliation. **Production**: api-mm.mymoolah.africa, wallet.mymoolah.africa. Built on Node.js, PostgreSQL, React, GCP. For operating rules, workflow, and constraints, read `docs/CURSOR_2.0_RULES_FINAL.md` first.

---

## 📋 **NEW AGENT ONBOARDING CHECKLIST** (DO IN ORDER)

1. [ ] Read `docs/CURSOR_2.0_RULES_FINAL.md` (MANDATORY - provide proof of reading)
2. [ ] Read this file (`docs/agent_handover.md`)
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
| Understand project & status | `docs/agent_handover.md` (this file) |
| See change history | `docs/CHANGELOG.md` |
| Run DB migrations | `docs/DATABASE_CONNECTION_GUIDE.md` |
| Set up dev environment | `docs/DEVELOPMENT_GUIDE.md` |
| Test in Codespaces | `docs/CODESPACES_TESTING_REQUIREMENT.md` |
| Deploy | `docs/DEPLOYMENT_GUIDE.md`, `docs/archive/deployment/GCP_PRODUCTION_DEPLOYMENT.md` |
| API contracts | `docs/API_DOCUMENTATION.md` |
| Recent chat context | `docs/session_logs/` (2-3 most recent) |
| Historical updates & integrations | `docs/archive/agent_handover_history.md` |
| Extended rules (model selection, examples) | `docs/archive/CURSOR_RULES_EXTENDED.md` |
| Docs archive map | `docs/DOCS_CONSOLIDATION_2026.md` |
| **Flash API docs, legal, deal sheet** | **Google Drive: https://drive.google.com/drive/folders/1KbQ1joMy8h3-B6OoDAG3VigqcWNUBWno?usp=sharing** |
| Flash local API reference & testing | `integrations/flash/FLASH_TESTING_REFERENCE.md` |
| **MobileMart API docs, legal, product lists** | **Google Drive: https://drive.google.com/drive/folders/1_qpaRxUBTCr40wlFl54qqSjNZ6HX8xs3?usp=sharing** |
| MobileMart local integration docs | `integrations/mobilemart/MOBILEMART_REFERENCE.md` |
| **Zapper API docs, SLA, QR test codes** | **Google Drive: https://drive.google.com/drive/folders/1cvXKEACgwbvZsp8A-8KPy8-q0QvWcVgh?usp=sharing** |
| Zapper local integration docs | `integrations/zapper/ZAPPER_REFERENCE.md` |

---

## 📋 **WHAT TO DO / WHAT NOT TO DO** (PROJECT-SPECIFIC)

| ✅ DO | ❌ DON'T |
|------|----------|
| Adapt backend to Figma designs | Edit `mymoolah-wallet-frontend/pages/*.tsx` |
| Work in `/mymoolah/` only | Use git worktrees |
| Test in Codespaces | Test on local |
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

### **Latest Achievement (February 27, 2026 - 12:00)**
**EasyPay Cash-In Activation Complete** — (1) Fixed `authorisationRequest` 500 for Scenario 4 (open amount): root cause was missing `userId`/`walletId` on `payments`; migration `20260227_add_userid_walletid_to_payments.js` and `Payment` model updated. (2) Removed staging debug from controller. (3) Created `scripts/test-easypay-5-scenarios.sh` — 11/11 tests pass on Staging. (4) Created Theodore test data doc, Razeen reply draft, and copy-paste versions. User sent Razeen reply and shared restricted folder with Theodore. Session log: `docs/session_logs/2026-02-27_1200_easypay-500-fix-activation-complete.md`.

### **Previous Achievement (February 26, 2026 - 19:30)**
**EasyPay Cash-In Activation Fixes** — (1) Mounted EasyPay routes at `/billpayment/v1` in `server.js` (per EasypayReceiverV5.yaml basePath). (2) Updated `middleware/easypayAuth.js` to accept `Authorization: SessionToken {token}` (EasyPay V5 spec). (3) Disabled Cash-Out and Standalone Voucher routes (Cash-In only). (4) Rewrote `scripts/seed-easypay-data.js` with Receiver ID 5063 and 5 test scenarios for Theodore Smith. (5) Fixed expired bill handling — return ResponseCode 3 in `infoRequest` and `authorisationRequest`. (6) Added staging-only debug in `authorisationRequest` catch to surface exact error. Seeded Staging; `infoRequest` passes all 5 scenarios. `authorisationRequest` returns 500 for Scenario 4 — debug deploy pending. Session log: `docs/session_logs/2026-02-26_1930_easypay-cashin-activation-fixes.md`.

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
**SBSA PayShap Integration Complete** - Full Standard Bank PayShap: UAT implementation (migrations, models, Ping auth, API client, Pain.001/Pain.013 builders, callback handler, RPP/RTP services, ledger), business model correction (LEDGER_ACCOUNT_BANK, no prefunded float), deposit notification endpoint (reference = MSISDN), R4 fee (RPP: principal+fee; RTP: principal−fee), VAT split to revenue/VAT control, TaxTransaction audit. Request Money proxy when Peach archived. Awaiting OneHub credentials for UAT. Session logs: `2026-02-12_1200_sbsa-payshap-uat-implementation.md`, `2026-02-12_1400_sbsa-payshap-business-model-deposit-notification.md`, `2026-02-12_1500_payshap-fee-implementation.md`. UAT guide: `docs/SBSA_PAYSHAP_UAT_GUIDE.md`.

### **Previous Achievement (February 10, 2026 - 16:00)**
**NFC Tap to Add Money — Refinements & Fixes** - Fixed frontend duplicate CreditCard import, added Tap to Add Money card to Transact page, fixed NfcDepositIntent/user_id model mismatch, Halo API amount-as-number (E103), ECONNRESET troubleshooting in DB guide, copy updates (Google Pay/Apple Pay), quick amounts R50-R8000 with grid layout, max R10k. Rule 9A: sweep scripts before creating. Knowledge base updated with Tap to Add Money and last 3 weeks. Session logs: `docs/session_logs/2026-02-10_1400_nfc-tap-to-add-money-implementation.md`, `docs/session_logs/2026-02-10_1550_nfc-tap-to-add-money-refinements.md`.

### **Previous Achievement (February 02, 2026)**
**NFC Deposit Implementation Plan (Phase 1) — Halo Dot** - Created comprehensive, implementation-ready plan for NFC tap-to-deposit using Halo Dot (Halo.Link/Halo.Go). Phase 1: deposits only (no virtual card). Full plan: `docs/NFC_DEPOSIT_IMPLEMENTATION_PLAN.md`. Updated `docs/integrations/StandardBankNFC.md` with Phase 1/2 split and Halo Dot vendor. Added NFC env vars to `env.template`. Phase 2 (virtual debit card for POS) deferred until Standard Bank issues virtual cards.

### **Previous Achievement (February 09, 2026 - 16:00)**
**Transaction Detail Modal & USDC Fee UI** - Transaction Details modal: reverted Blockchain Tx ID (recipient is auto-credited; banking/Mojaloop practice = reference only, no "paste to top up"). USDC send: renamed "Platform fee" to "Transaction Fee" in quote and Confirm sheet; removed "Network fee" from UI (was R 0,00). Session log: `docs/session_logs/2026-02-09_1600_transaction-detail-usdc-fee-ui.md`. Commits: 44f6c348 (add Tx ID), 47307db4 (revert), 5ac1522b (fee labels).

### **Recent Updates (Last 7 Days – February 21–27, 2026)**
- **Feb 27 (12:00)**: EasyPay Cash-In activation complete — fixed authorisationRequest 500 (userId/walletId migration), removed staging debug, created 5-scenario test script (11/11 pass), Theodore test data + Razeen reply docs, copy-paste versions. User sent Razeen reply and shared restricted folder with Theodore.
- **Feb 21 (21:00)**: Standard Bank PayShap banking-grade overhaul — removed Peach proxy workaround; aligned Pain.001 (top-level grpHdr/pmtInf[], pmntInfId, reqdExctnDt.dtTm, lclInstrm.prtry, cdtrAgt+brnchId, rmtInf.strd[], splmtryData) and Pain.013 (PascalCase, DbtrAcct.Id.Item.Id+Prxy, CdtrAgt.Othr.Id, Amt.Item.Value, PmtCond, RmtInf.Strd[]) with SBSA Postman samples; fixed RTP callback URLs in client.js; scope-keyed token cache in pingAuthService; ACID transaction ordering in RPP/RTP services; added proxyResolutionClient.js; express-validator on routes.
- **Feb 21 (19:00)**: Documentation consolidation — archived ~75 docs to `docs/archive/` (deployment, codespaces, mobilemart, beneficiary, partner-api, referral, easypay, zapper, figma, peach-payments, security); merged INPUT_FIELD_FIXES, 2FA_IMPLEMENTATION, SECURITY (badge/certificate/token); created DOCS_CONSOLIDATION_2026.md. Session log updated with git push/pull status. Codespaces synced (82 files, fast-forward).
- **Feb 21 (17:00)**: Bill payment MobileMart prevend fix — v2 API URL construction (use baseUrl for /v2 paths, was incorrectly .../v1/v2/... returning HTML); improved product matching (no products[0] fallback; fuzzy match; clear error when no match). Fixes "prevend did not return transactionId" and wrong product (Ekurhuleni for PEP).
- **Feb 21 (16:00)**: Bill payment overlay fixes — removed 5 filter buttons; fixed add beneficiary (initialBillerName, pre-fill, filtered list); production API compliance (billerName from billerServices.accounts[0]).
- **Feb 21**: NotificationService fix — VAS purchase notifications now use createNotification (not sendToUser); fixes "NotificationService is not a constructor" after airtime/data/electricity/bill purchases.
- **Feb 19**: EasyPay voucher refund duplicate fix (walletController); MMTP Partner API implementation plan created; sandbox = staging.mymoolah.africa.
- **Feb 18**: Documentation consolidation phase 2 (cross-links, status cleanup, archive).
- **Feb 15**: Production deployment live. API: api-mm.mymoolah.africa, Wallet: wallet-mm.mymoolah.africa. DB connection fix, OpenAI graceful degradation, SSL cert v3, Afrihost DNS (api-mm 5-char workaround).
- **Feb 12**: Production database migration complete (all 80+ migrations applied, 5 fixes for fresh-DB compatibility). SBSA PayShap integration complete (UAT implementation, business model, deposit notification, R4 fee, VAT split). Awaiting OneHub credentials.
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
**Production Live** - Production deployed. API: https://api-mm.mymoolah.africa, Wallet: https://wallet-mm.mymoolah.africa. Verify health and wallet; seed ledger accounts (2200-01-01, 4000-10-01, 2300-10-01); optionally add OPENAI_API_KEY for AI support. Wallet build: ensure VITE_API_BASE_URL=https://api-mm.mymoolah.africa when rebuilding. See `docs/archive/deployment/GCP_PRODUCTION_DEPLOYMENT.md`.

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
3. **This document (agent_handover.md)** - Complete operational context

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
- [ ] Update `agent_handover.md` if significant change
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
| Understand current status | `docs/agent_handover.md` | This file |
| Check API contracts | `docs/API_DOCUMENTATION.md` | API docs |

---

### **🚀 Quick Start Checklist** (New Session)

**Before starting work** (5 minutes):
- [ ] Read `docs/CURSOR_2.0_RULES_FINAL.md` (MANDATORY)
- [ ] Read `docs/agent_handover.md` (this file)
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

**Session Status**: 🔄 **IN PROGRESS** — EasyPay Cash-In activation fixes deployed; authorisationRequest 500 under investigation  
**Last Session**: 2026-02-26 — EasyPay /billpayment/v1 mount, SessionToken auth, expired fix, seed script, staging debug

### **Most Recent Work (2026-02-26)**
- **EasyPay /billpayment/v1**: Routes mounted at `/billpayment/v1` (EasypayReceiverV5.yaml basePath). Ping returns OK on Staging.
- **EasyPay auth**: `Authorization: SessionToken {token}` supported in `easypayAuth.js`. Cash-Out and Standalone Voucher routes disabled.
- **EasyPay seed**: Rewritten with 5 scenarios (valid unpaid, already paid, expired, open amount, fixed amount). Seeded Staging successfully.
- **Expired fix**: `infoRequest` and `authorisationRequest` return ResponseCode 3 for expired bills. Committed; deploy pending.
- **authorisationRequest 500**: Scenario 4 (open amount) returns 500. Staging-only debug added — deploy and retry to get exact error.

### **Current State**
- EasyPay `infoRequest` passes all 5 scenarios on Staging (Scenario 3 needs redeploy for expired fix)
- EasyPay `authorisationRequest` returns 500 for Scenario 4 — root cause unknown; debug deploy will surface error
- Production live: api-mm.mymoolah.africa, wallet.mymoolah.africa
- Awaiting: Deploy to Staging, fix authorisationRequest 500, send test data to Theodore Smith

### **Next Agent Actions**
1. Deploy to Staging: `bash scripts/build-push-deploy-staging.sh`
2. Retry `authorisationRequest` Scenario 4 — capture `debug` from response
3. Fix root cause, remove staging debug, redeploy
4. Send SessionToken + 5 EasyPay numbers to Theodore Smith (encrypted)

---

## **Recent Updates (Last 14 Days)**

| Date | Update |
|------|--------|
| Feb 26 (19:30) | EasyPay Cash-In activation: /billpayment/v1 mount, SessionToken auth, expired fix (RC:3), seed script (5 scenarios), staging debug for authorisationRequest 500 |
| Feb 26 (12:45) | Flash integration fixes (3 endpoint bugs); denominations validator; `role` column migration; clean-slate catalog test Staging + Production |
| Feb 21 (17:00) | PayShap parameterised callbacks + polling service; EasyPay Cash-In sweep + activation email; Flash/MobileMart/Zapper Google Drive docs |
| Feb 25 | Variable-first product catalog filter — `priceType` schema, classify/deactivate fixed duplicates, API returns variable fields, full deploy Staging + Production |
| Feb 21 | Browserslist/caniuse-lite update; SBSA PayShap email; Bill payment MobileMart prevend fix; overlay fixes; NotificationService fix; DSTV beneficiary filter |
| Feb 19 | EasyPay voucher refund duplicate fix; MMTP Partner API implementation plan |
| Feb 18 | Documentation consolidation phase 2 |
| Feb 15 | Production deployment live (api-mm, wallet-mm) |
| Feb 12 | Production DB migration complete; SBSA PayShap integration complete (UAT ready) |
| Feb 09 | Transaction Detail modal; USDC fee UI |
| Feb 08 | Migrations-before-seeding rule; Watch to Earn demo videos |

---

## 🔄 **Reconciliation System**

**Status**: ✅ Deployed to UAT (MobileMart + Flash). Banking-grade automated reconciliation with self-healing, >99% match rate, SFTP integration (static IP: 34.35.137.166). See `docs/RECONCILIATION_FRAMEWORK.md` and `docs/archive/agent_handover_history.md` for full details.

---

## 🚀 **NEXT DEVELOPMENT PRIORITIES**

1. **EasyPay Cash-In activation** — `/billpayment/v1` mounted and live on Staging. SessionToken auth, expired fix (RC:3), seed script with 5 scenarios done. **Pending**: (a) Deploy to Staging (expired fix + debug), (b) Fix authorisationRequest 500 for Scenario 4 (open amount) — debug will surface exact error, (c) Send SessionToken + 5 test numbers to Theodore Smith. Razine: UAT configured; await production credentials, IP whitelist, SFTP.
2. **PayShap UAT testing (2 March)** — André to push to GitHub and deploy to Staging. Test RPP/RTP callbacks with Gustaf on 2 March. See `docs/SBSA_PAYSHAP_UAT_GUIDE.md`.
3. **Flash transaction testing in Staging** — Await Tia confirmation of transaction endpoint paths. Then begin live transaction tests: 1Voucher, Gift Voucher, Cellular Airtime Pinless, Eezi Voucher, Prepaid Utilities. Endpoint paths confirmed from official v4 PDF.
4. **Fix `.env.codespaces` MobileMart URL** — `MOBILEMART_API_URL` is currently `https://uat.fulcrumswitch.com` (UAT). Should be `https://fulcrumswitch.com` (Production) for clean-slate tests run from Codespaces.
5. **Investigate 3 failed MobileMart bill-payment products** — Rest Assured Plan, Matjhabeng Municipality, PayJoy SA failed validation. Minor — investigate separately.
6. **USDC send** — Test in Codespaces when VALR credentials available.

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
