# Session Log - 2026-03-30 - USSD Registration Fix, KYC UI Updates, PayShap Inbound Credit Handler

**Session Date**: 2026-03-30 10:30  
**Agent**: Cursor AI Agent (Claude)  
**User**: André  
**Session Duration**: ~3.5 hours

---

## Session Summary
Fixed critical USSD wallet registration failure (idNumberHash NOT NULL constraint), made several KYC UI corrections (Tier 0 features, accepted document types, progress bar), rewrote the PayShap inbound credit handler to parse SBSA's confirmed ISO 20022 Pain.002 payload format, registered callback URL with SBSA portal, and added comprehensive deposit instructions (EFT + PayShap) to the AI support knowledge base.

---

## Tasks Completed
- [x] Fixed USSD registration crash: `idNumberHash` NOT NULL constraint violation — now encrypts ID number and computes blind index hash in raw SQL INSERT
- [x] Fixed `ussdMenuService.js` existing user ID update to also encrypt and hash
- [x] Disabled "Receive Deposits" for Tier 0 users (FICA compliance — VAS only)
- [x] Updated all frontend labels to list all 4 accepted ID document types (SA ID book, passport, driver's licence, temporary ID)
- [x] Fixed verification progress bar to align with 3-tier model (33%/66%/100% instead of 25%/50%/75%/100%)
- [x] Rewrote `handlePayshapInboundCredit` to parse Gustaf's confirmed ISO 20022 Pain.002 nested payload
- [x] Registered PayShap inbound callback URL in SBSA portal (staging)
- [x] Updated SBSA_CALLBACK_SECRET in GCP Secret Manager
- [x] Tested PayShap deposits via ShapID (Mymoolah@STANDARDBANK) — money arrived but callback not yet firing (awaiting SBSA activation by Louis)
- [x] Added comprehensive EFT and PayShap deposit instructions to AI knowledge base (Q3.2, Q3.2c-f)
- [x] Redeployed both staging and production Cloud Run

---

## Key Decisions
- **Tier 0 Receive Deposits disabled**: Under FICA conservative approach, Tier 0 users (no document verification) should only have VAS purchases. Receive deposits requires Tier 1+.
- **Progress bar 33/66/100**: 3-tier system means 1/3, 2/3, 3/3 — not 4-step.
- **PayShap inbound auth relaxed for testing**: Handler logs warning but accepts payload even without auth header, since SBSA's callback auth mechanism isn't fully confirmed yet.
- **Staging callback URL for testing**: Registered `staging.mymoolah.africa` in SBSA portal; will switch to `api-mm.mymoolah.africa` for production go-live Wednesday.

---

## Files Modified
- `services/ussdAuthService.js` — Added `encrypt()` and `blindIndex()` for ID number in USSD registration INSERT
- `services/ussdMenuService.js` — Added `encrypt()` and `blindIndex()` for existing user ID UPDATE, plus import
- `config/kycTierLimits.js` — Set `canReceiveDeposits: false` for Tier 0
- `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx` — Tier 0 receive deposits disabled, progress bar 33/66/100, document types updated
- `mymoolah-wallet-frontend/components/KYCStatusPage.tsx` — Synced with pages version
- `mymoolah-wallet-frontend/pages/KYCDocumentsPage.tsx` — Updated upload descriptions and button text for all 4 document types
- `mymoolah-wallet-frontend/components/KYCDocumentsPage.tsx` — Synced with pages version
- `mymoolah-wallet-frontend/components/KYCDocumentUpload.tsx` — Updated description text
- `controllers/standardbankController.js` — Complete rewrite of `handlePayshapInboundCredit` for ISO 20022 Pain.002
- `scripts/seed-support-knowledge-base.js` — Updated Q3.2, added Q3.2c (EFT), Q3.2d (PayShap), Q3.2e (reference importance), Q3.2f (banking details)
- `docs/policies/02-KYC-CDD-Policy.md` — Tier 0 receive deposits disabled, Tier 1 accepted documents listed

---

## Issues Encountered
- **USSD registration crash (idNumberHash NOT NULL)**: The staging DB migration `20260313_02_idnumberhash_unique_notnull.js` set `idNumberHash` to NOT NULL. USSD registration used raw SQL (bypassing Sequelize hooks) and didn't include this column. Fixed by importing `encrypt` and `blindIndex` from `utils/fieldEncryption.js`.
- **PayShap callback not firing**: Registered callback URL in SBSA portal, sent 2x R10 PayShap via ShapID from Discovery Bank. Money arrived in treasury account but no callback received. Louis (SBSA) investigating — says no activation needed but will send manual test POST.
- **SBSA_CALLBACK_SECRET timing**: Secret was updated in GCP Secret Manager after deployment. Cloud Run reads secrets at startup, so redeployment was required.

---

## Testing Performed
- [x] USSD wallet registration tested on staging via *120*34248# — successful (Leonie Botes, user created with encrypted ID)
- [x] KYC status modal verified on staging — Tier 0 shows correct limits, features (VAS only), 33% progress
- [x] PayShap deposit via ShapID tested (2x R10 from Discovery Bank to Mymoolah@STANDARDBANK) — funds received on treasury account
- [ ] PayShap inbound callback — awaiting SBSA test POST from Louis
- [x] Both staging and production deployed with latest code

---

## Next Steps
- [ ] Awaiting Louis (SBSA) to resolve production inward queue — real PayShap deposits not triggering callbacks
- [ ] Awaiting Melanie (SBSA) to enable SFTP channel for H2H file exchange
- [ ] Once SFTP channel enabled: test Pain.001 file pickup and Pain.002 return
- [ ] Once production callback confirmed: test full deposit → wallet credit flow end-to-end
- [ ] Tonight: Work on staging and production VAS products
- [ ] Future: Build frontend portal for Excel/CSV upload → Pain.001 conversion

---

## Important Context for Next Agent
- **SBSA PayShap contact**: Gustaf Delport (on leave), Louis Van Zyl (active) — Louis is testing the callback
- **PayShap ShapID**: `Mymoolah@STANDARDBANK` — registered on SBSA's Rapid Payments platform
- **Treasury Account**: Acc 272406481, Branch 002154, Standard Bank
- **Callback URL registered**: `https://staging.mymoolah.africa/api/v1/standardbank/payshap/inbound-credit` (switch to production URL for go-live)
- **SBSA_CALLBACK_SECRET**: Updated in GCP Secret Manager from SBSA portal's Organization Notification Management section
- **idNumberHash**: Staging and production DBs have NOT NULL + UNIQUE constraint on this column. Any raw SQL INSERT/UPDATE on `users.idNumber` MUST also include encrypted value and blind index hash.
- **Tier 0 features**: VAS only. No receive deposits, send money, withdraw cash, or international.
- **Production deployment**: Already deployed with latest code (including ISO 20022 parser). Ready for go-live once callback is confirmed.

---

## Questions/Unresolved Items
- Why aren't real PayShap deposits triggering production callbacks? Louis investigating SBSA inward queue.
- SFTP outbound to SBSA (196.8.85.62/196.8.86.53:5022) — firewall still blocking from our IP? Melanie enabling channel may resolve.
- Does SBSA send `x-GroupHeader-Hash` or `X-Signature` with production callbacks? Auth mechanism TBC.

---

## Afternoon Session (14:00–16:30 SAST)

### PayShap Inbound Credit — Louis Van Zyl Testing

- Louis (SBSA) sent **6 sandbox test callbacks** to staging endpoint — all received and processed successfully
- First callback processed deposit; subsequent 5 correctly returned `already_processed` (idempotency working)
- Test payload: payer `LouisMoolah`, txId `250911CIBRPP00000018C18`, amounts R100 and R5,000, status ACCC
- Full ISO 20022 Pain.002 payload structure confirmed and parsed correctly
- **Logging bug found and fixed**: `console.log` used `%.2f` (C/Python syntax) instead of template literal — arguments were shifting. Fixed with template literal. Committed and pushed.

### PayShap Production Callback Issue

- André sent 4 real PayShap deposits (R10 + R10 + R8 + R5) via Discovery Bank to ShapID `Mymoolah@STANDARDBANK`
- All payments successfully credited treasury account (272406481)
- **Zero production callbacks received** — SBSA's production inward queue not generating callbacks
- Louis confirmed: staging URL was registered as production callback (intentional for testing)
- André switched callback URL in SBSA portal from staging to production: `https://api-mm.mymoolah.africa/api/v1/standardbank/payshap/inbound-credit`
- Updated `SBSA_CALLBACK_SECRET` in GCP Secret Manager
- Still no production callback after R5 test — Louis investigating SBSA's inward queue

### H2H SFTP — Melanie Block Testing

- Melanie confirmed Pain.001 v3 file **passed SBSA's SSVS validator**
- Issue: debit account was wrong (used old account instead of profile account 272406481) — Melanie corrected
- Beneficiary accounts were test/invalid — expected for unit testing
- Melanie asked to **enable the SFTP channel** — André approved
- Generated new Pain.001 test file with valid beneficiary accounts:
  - SBSA: 10111730633 (branch 051001) — R1.00
  - Discovery: 18828076450 (branch 679000) — R1.00
  - Capitec: 1254107337 (branch 470010) — R1.00
- File uploaded to GCS outbox: `gs://mymoolah-sftp-inbound/standardbank/outbox/MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260330150000000.xml`
- SFTP gateway VM confirmed RUNNING (34.35.137.166, port 5022)
- Firewall rules confirmed: SBSA test and prod IPs whitelisted on port 5022

### Payment Template for Portal

- Created CSV payment template at `docs/templates/pain001_payment_template.csv`
- Created bank branch code reference at `docs/templates/pain001_bank_branch_codes.csv`
- Template supports both **external bank EFT** payments and **MyMoolah wallet top-ups** (same treasury account, mobile number as reference)
- 17 major SA banks with universal branch codes included

### Afternoon Commits
- `fix: PayShap inbound log format — replace %.2f with template literal`
- `docs: add Pain.001 v3 test file for SBSA H2H channel testing`
- `docs: add Pain.001 payment CSV template and bank branch codes`
- `docs: update Pain.001 template with MyMoolah wallet top-up examples`

---

## Related Documentation
- `docs/policies/02-KYC-CDD-Policy.md` — KYC tier features and limits
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Standard Bank integration reference
- `integrations/standardbank/callbackValidator.js` — Hash validation for SBSA callbacks
- `config/kycTierLimits.js` — Single source of truth for tier limits and features
