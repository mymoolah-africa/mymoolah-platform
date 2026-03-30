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
- [ ] Monitor staging logs for Louis's test POST (PayShap-Inbound callback)
- [ ] Once callback confirmed, verify wallet auto-credit flow end-to-end
- [ ] Switch callback URL from staging to production (`api-mm.mymoolah.africa`) for Wednesday go-live
- [ ] Run `seed-support-knowledge-base.js` to populate updated knowledge base entries
- [ ] Test full deposit flow: PayShap → callback → wallet credit → balance update in web app

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
- Why didn't SBSA's callback fire for the PayShap deposits? Louis says no activation needed — investigating.
- Does SBSA send `x-GroupHeader-Hash` with inbound credit callbacks? (Auth mechanism TBC)
- GCS permission error on staging for SBSA statement polling — known issue, not blocking.

---

## Related Documentation
- `docs/policies/02-KYC-CDD-Policy.md` — KYC tier features and limits
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Standard Bank integration reference
- `integrations/standardbank/callbackValidator.js` — Hash validation for SBSA callbacks
- `config/kycTierLimits.js` — Single source of truth for tier limits and features
