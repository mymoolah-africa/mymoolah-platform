# Session Log - 2026-03-17 19:00 - EFT Overlay + Voice Input Fix

**Session Date**: 2026-03-17 19:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~2 hours  

---

## Session Summary

Two major feature areas addressed this session: (1) Complete build-out and styling polish of the "Top-up via EFT" overlay — including correct bank details, PayShap section, hidden unused tiles, and fixing the missing top/bottom banners; (2) Full rewrite of the VoiceInput component to fix a long-standing bug where the mic button did nothing despite the mic test passing. The mic fix was the most technically significant change — a root-cause fix that eliminated all useEffect-lifecycle race conditions.

---

## Tasks Completed

- [x] Added "Top-up via EFT" tile to TransactPage and AddMoneyEftOverlay with global design system styling
- [x] Renamed tile and overlay header from "Add Money via EFT" → "Top-up via EFT"
- [x] Fixed Account Holder to "MyMoolah Treasury" and Account Number to "272406481"
- [x] Fixed `mymoolah-wallet-frontend/.env.local` to match correct bank details (`VITE_MM_BANK_ACCOUNT=272406481`, `VITE_MM_ACCOUNT_HOLDER=MyMoolah Treasury`)
- [x] Fixed "How it works" steps 2 and 3 copy (correct MSISDN reference, beneficiary name)
- [x] Added PayShap instant payment section with correct 24/7/365 text (not business hours)
- [x] Hidden "Tap to Add Money" and "ATM Cash Send" tiles via `hidden: true` on Service interface
- [x] Fixed missing TopBanner — added `/add-money-eft` to `pagesWithTopBanner` in `App.tsx`
- [x] Fixed missing BottomNavigation — added `/add-money-eft` to both `shouldShowNav` and `showBottomNav` allowlists in `BottomNavigation.tsx`
- [x] Rewrote `VoiceInput.tsx` — on-demand SpeechRecognition (not useEffect-managed), ~625 lines → ~170 lines
- [x] Simplified `SupportPage.tsx` — removed two-step "Show Voice Input" toggle; mic button sits directly in input row
- [x] Fixed disbursement routes auth import (`const authenticateToken = require('../middleware/auth')`)
- [x] Confirmed voice input working on Chrome — mic button turns red/pulses while listening, transcript populates input field

---

## Key Decisions

- **On-demand SpeechRecognition**: Instead of managing SpeechRecognition in a useEffect (which caused it to be destroyed and recreated on every callback reference change), the new VoiceInput creates and tears down the instance on-demand per button tap. This is the correct pattern for browser speech APIs.
- **`continuous: false`**: Capture one phrase → populate input → stop. Simpler and more reliable than continuous mode which required complex state management.
- **No two-step mic toggle**: The old "Show Voice Input" button that revealed the full VoiceInput component added confusion. The mic button now lives directly in the input row next to the text field and send button — identical UX pattern to WhatsApp/Telegram voice input.
- **Inline `isSupported()` check**: New VoiceInput does its own browser/HTTPS check without depending on `browserSupport.ts`, making it fully self-contained.
- **PayShap 24/7/365**: User corrected the PayShap text — PayShap processes in seconds 24/7/365, NOT only during business hours. Fixed accordingly.

---

## Files Modified

- `mymoolah-wallet-frontend/pages/TransactPage.tsx` — Added `hidden?: boolean` to Service interface; added EFT tile; hid Tap to Add Money and ATM Cash Send tiles
- `mymoolah-wallet-frontend/components/overlays/AddMoneyEftOverlay.tsx` — Complete styling overhaul: white header, Montserrat font, CSS variables, brand green, correct bank details, PayShap section, 24/7/365 text
- `mymoolah-wallet-frontend/.env.local` — Updated `VITE_MM_BANK_ACCOUNT=272406481` and `VITE_MM_ACCOUNT_HOLDER=MyMoolah Treasury`
- `mymoolah-wallet-frontend/App.tsx` — Added `/add-money-eft` to `pagesWithTopBanner`
- `mymoolah-wallet-frontend/components/BottomNavigation.tsx` — Added `/add-money-eft` to `shouldShowNav` and `showBottomNav`
- `mymoolah-wallet-frontend/components/VoiceInput.tsx` — Full rewrite: on-demand SpeechRecognition, self-contained, ~170 lines
- `mymoolah-wallet-frontend/pages/SupportPage.tsx` — Simplified: removed two-step toggle, mic directly in input row, cleaned up unused imports (Badge, MicrophoneTest, isVoiceInputActive state)
- `routes/disbursement.js` — Fixed `authenticateToken` require path

---

## Code Changes Summary

- **Root cause fix for mic**: `VoiceInput` was recreating `SpeechRecognition` on every parent re-render because `onTranscript`/`onError` were in the `useEffect` dep array. New on-demand approach: `start()` creates the instance, `stop()` destroys it.
- **EFT overlay**: Full alignment with global design system — Montserrat, CSS variables (`--color-brand-green`, `--mobile-font-*`), white card header, inline "Done" button (not sticky), scroll body.
- **BottomNavigation** needed path added to **two separate** allowlists (both `shouldShowNav` logic block and `showBottomNav` early-return block) — missing from one caused the bottom nav to be absent.

---

## Issues Encountered

- **Mic button did nothing**: Root cause was stale closure / useEffect lifecycle bug in old `VoiceInput`. `SpeechRecognition` was being destroyed milliseconds after creation because `onTranscript`/`onError` callbacks in `SupportPage` were being recreated on every render, triggering the `useEffect` cleanup and re-init. Even after wrapping callbacks in `useCallback`, there were edge cases. Complete rewrite resolved it definitively.
- **Missing BottomNavigation**: `BottomNavigation.tsx` has two separate code paths that both gate rendering — a path missing from one but present in the other caused the bottom nav to not appear on `/add-money-eft`. Fixed by adding to both.
- **Wrong bank details displaying**: Despite code showing correct fallbacks, `mymoolah-wallet-frontend/.env.local` had old values (`VITE_MM_BANK_ACCOUNT` and `VITE_MM_ACCOUNT_HOLDER`) which Vite's env injection was overriding the fallbacks with. Fixed `.env.local`.
- **PayShap text correction**: Original copy said "during business hours". Corrected to 24/7/365 per user instruction.
- **iOS Chrome crash on first voice access**: Pre-requesting `getUserMedia` before `SpeechRecognition.start()` prevents the iOS Chrome WebView from crashing when the mic permission prompt fires via the speech engine. Retained in new implementation.

---

## Testing Performed

- [x] Manual testing performed — user confirmed "works much better now"
- [ ] Unit tests written/updated — voice input is browser API, manual testing only
- [x] EFT overlay visually verified — top banner, scrollable body, bottom nav all present

---

## Next Steps

- [ ] **SMTP in deploy script** (`scripts/deploy-backend.sh`) — Add `SMTP_USER=smtp-user:latest,SMTP_PASS=smtp-pass:latest` to `build_secrets_args()` and `SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,OPS_ALERT_EMAIL=support@mymoolah.africa` to `--set-env-vars`; then redeploy staging + production so Cloud Run gets SMTP credentials
- [ ] **Voice input on Android** — Test on Android Chrome. Web Speech API should work fine; Huawei devices without Google services may not have the API — the new `isSupported()` check in VoiceInput will show the mic button as disabled (opacity 0.4) in that case
- [ ] **finance@mymoolah.africa setup** — User deferred, needs to set up this Google Workspace email for the `SMTP_USER` / `SMTP_PASS` used in Float Balance Monitoring alerts
- [ ] **PayShap UAT end-to-end** — Awaiting OneHub credentials from SBSA

---

## Important Context for Next Agent

- **VoiceInput.tsx is now ~170 lines** — do not revert to old complex version. The on-demand pattern is intentional and correct.
- **SupportPage no longer has `isVoiceInputActive` state, `showMicrophoneTest` state, or MicrophoneTest imports** — these were removed in the simplification. If you need a mic test, it still exists in `components/MicrophoneTest.tsx` but is not rendered in SupportPage.
- **EFT overlay bank details come from `mymoolah-wallet-frontend/.env.local`** — `VITE_MM_BANK_ACCOUNT=272406481` and `VITE_MM_ACCOUNT_HOLDER=MyMoolah Treasury`. The component has matching fallback values.
- **BottomNavigation has two separate allowlists** — if adding a new route, check BOTH `shouldShowNav` and `showBottomNav` blocks.
- **SMTP is broken in all Cloud Run environments** — backend logs `[FloatBalanceMonitoring] SMTP credentials invalid` on startup. Root cause: `scripts/deploy-backend.sh` does not pass `SMTP_USER`/`SMTP_PASS` secrets to Cloud Run. Pending fix.
- **Frontend uses Vite** — frontend env vars must be `VITE_` prefixed and defined in `.env.local` to be available at runtime. Backend uses `dotenv` with `.env`.

---

## Questions/Unresolved Items

- Will PayShap and eeziPay tiles be made visible once those features are fully live?
- Should the "Tap to Add Money" tile be unhidden once NFC/Halo Dot is live in production?

---

## Related Documentation

- `docs/agent_handover.md` — Updated this session
- `docs/CHANGELOG.md` — Updated this session
- Commits: `17422e9a` (disbursement fix), `042b391c` (EFT tile), `3edefc4a` (bank details + PayShap), `75a7dc77` (TopBanner), `8883cc04` (BottomNavigation), `88431a91` (bank details correction), `e558896a` (mic test fix), `65d75a6a` (Android hardening), `3fb620b6` (stale closure fix), `2ea6e08c` (full mic rewrite — current state)
