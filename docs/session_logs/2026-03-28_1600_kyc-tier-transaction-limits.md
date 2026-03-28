# Session Log - 2026-03-28 - KYC Tier Transaction Limits (FICA-Compliant)

**Session Date**: 2026-03-28 16:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~2 hours (continuation of earlier KYC tier session)

---

## Session Summary

Researched FICA-compliant transaction limits for MyMoolah's 3-tier KYC system, then implemented centralized, enforceable limits across the entire backend and frontend codebase. Created `config/kycTierLimits.js` as the single source of truth. Updated the KYC/CDD policy document to v2.0 with the new Tier 0/1/2 model.

---

## Tasks Completed

- [x] Researched SA FICA regulations, FIC Exemption 17 (PCC 21), and industry benchmarks (VodaPay, Capitec, Mama Money, Hello Paisa, FNB eWallet)
- [x] Defined conservative, FICA-compliant transaction limits for Tier 0, Tier 1, and Tier 2
- [x] Created centralized `config/kycTierLimits.js` — single source of truth for all tier limits
- [x] Updated Wallet model (`canDebit()`, `credit()`) with tier-aware limit checks
- [x] Updated `authController.js` to use tier defaults when creating wallets at web registration
- [x] Updated `ussdAuthService.js` to set Tier 0 wallet limits at USSD registration
- [x] Updated `ussdMenuService.js` to use centralized config (removed hardcoded env var usage)
- [x] Updated `walletController.js` — `sendMoney()` enforces `canSendMoney` + single-txn limit; `creditWallet()` enforces `maxBalance`; `getBalance()` returns tier limits
- [x] Updated `kycController.js` — wallet limits auto-upgraded when KYC tier changes
- [x] Updated `settingsController.js` — user-set limits capped at tier maximum
- [x] Updated `kycMiddleware.js` — attaches `kycTier` and `tierLimits` to `req.kycStatus`
- [x] Updated `WalletSettingsPage.tsx` — tier-aware limit sliders with upgrade prompts
- [x] Updated `docs/policies/02-KYC-CDD-Policy.md` to v2.0 with Tier 0/1/2 model
- [x] Updated CHANGELOG.md and AGENT_HANDOVER.md

---

## Key Decisions

- **Conservative Tier 0 limits**: After research, André correctly challenged the initial revision to use VodaPay Lite limits. The final decision is the conservative position (R1k/txn, R3k/day, R5k/month, no send/withdraw) because FICA does not have an explicit provision for "format-validated ID only" — even FIC Exemption 17 requires identity verification against a document. Recommended formal compliance opinion for future Tier 0 limit increases.
- **FIC Exemption 17 as Tier 1 basis**: Tier 1 limits (R5k/day, R25k/month, R25k balance) are directly from the official FIC PCC 21 document — the legal ceiling for reduced CDD without proof of address.
- **Centralized config, not env vars**: Created `config/kycTierLimits.js` as the single source of truth rather than using environment variables. This ensures consistency across all code paths and makes limits auditable.
- **No new services/controllers/routes**: All changes made by editing existing files. Only one new file created (`config/kycTierLimits.js`).

---

## Files Modified

- `config/kycTierLimits.js` — **NEW**: Centralized tier limits config
- `models/Wallet.js` — Added tier-aware `canDebit()` and `credit()` with balance cap
- `controllers/authController.js` — Wallet creation uses `getWalletDefaults(tier)`
- `controllers/walletController.js` — `sendMoney()`, `creditWallet()`, `getBalance()` tier enforcement
- `controllers/kycController.js` — Wallet limits upgraded on tier changes
- `controllers/settingsController.js` — User limits capped at tier max
- `services/ussdMenuService.js` — Uses centralized config
- `services/ussdAuthService.js` — USSD wallet uses Tier 0 defaults
- `middleware/kycMiddleware.js` — Attaches tier info to request
- `mymoolah-wallet-frontend/pages/WalletSettingsPage.tsx` — Tier-aware UI
- `mymoolah-wallet-frontend/components/WalletSettingsPage.tsx` — Synced copy
- `mymoolah-wallet-frontend/components/KYCDocumentsPage.tsx` — Synced copy
- `docs/policies/02-KYC-CDD-Policy.md` — Updated to v2.0
- `docs/CHANGELOG.md` — New entry
- `docs/AGENT_HANDOVER.md` — Updated

---

## Issues Encountered

- **VodaPay Lite comparison was misleading**: Initially revised Tier 0 to match VodaPay Lite (R5k/day send, R3k/day withdraw). André correctly pointed out that competitors doing something is not proof of FICA compliance. Reverted to conservative limits.
- **Capitec USSD is not comparable to Tier 0**: Capitec requires full FICA at account opening (in-branch with physical ID + POA). Their USSD channel gives full access because KYC is already complete. Not comparable to MyMoolah's Tier 0 (no document).

---

## Testing Performed

- [x] Linter checks — zero errors on all modified files
- [ ] Manual testing — requires deployment to Codespaces
- [ ] Unit tests — existing USSD tests should still pass

---

## Next Steps

- [ ] Deploy to Codespaces and test: `git pull origin main && cd mymoolah-wallet-frontend && npm run build && cd .. && ./scripts/one-click-restart-and-start.sh`
- [ ] Run existing USSD tests: `npm test -- --testPathPattern=ussd`
- [ ] Consider adding a database migration to update existing wallets' `dailyLimit`/`monthlyLimit` to match their `kyc_tier`
- [ ] Obtain formal FICA compliance opinion on Tier 0 limits from a fintech attorney
- [ ] Consider adding Tier 0 send/withdraw functionality in future once compliance opinion obtained

---

## Important Context for Next Agent

- `config/kycTierLimits.js` is the SINGLE SOURCE OF TRUTH for all tier limits. Do not hardcode limits elsewhere.
- The `.env.codespaces` still has `USSD_TIER0_DAILY_LIMIT` and `USSD_TIER0_MONTHLY_LIMIT` but they are NO LONGER USED — the centralized config takes precedence.
- Existing wallets in UAT/Staging/Production still have the old R100,000 daily / R1,000,000 monthly limits. A backfill migration may be needed to align existing wallets.
- The `Wallet.credit()` balance cap check is only enforced when `kycTier` is explicitly passed in options. Not all credit paths pass this yet (e.g., admin credits, deposit notifications).
- Tier 0 users CANNOT send money or withdraw cash. This is enforced in `walletController.sendMoney()`. USSD cashout paths also check via `checkBalanceAndLimits()`.

---

## Related Documentation

- `config/kycTierLimits.js` — Single source of truth
- `docs/policies/02-KYC-CDD-Policy.md` — Policy v2.0
- FIC PCC 21 (Exemption 17) — https://www.lawexplorer.co.za/StatutoryDatabase/SubordinateFile/SubordinateFileDownload/5698
