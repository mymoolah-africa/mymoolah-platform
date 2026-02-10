# Session Log - 2026-02-10 - NFC Tap to Add Money Refinements & Fixes

**Session Date**: 2026-02-10 15:50  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~2 hours

---

## Session Summary
Refined and fixed NFC Tap to Add Money feature: frontend duplicate import fix, Transact page visibility, DB/model fixes (user_id vs userId), Halo API amount format (E103), ECONNRESET troubleshooting, copy updates (Google Pay/Apple Pay), quick amounts (R50,R200,R500,R1000,R3000,R5000,R8000), grid layout, max amount 10k. Added Rule 9A (scripts sweep before creating). Updated knowledge base with last 3 weeks of changes.

---

## Tasks Completed
- [x] Fix duplicate CreditCard import in BottomNavigation.tsx (frontend 500 error)
- [x] Add Tap to Add Money card to Transact page Payments & Transfers section
- [x] Fix NfcDepositIntent/NfcCallbackLog underscored mismatch (user_id vs userId)
- [x] Fix Halo Intent API E103: send amount as number not string
- [x] Add ECONNRESET troubleshooting to DATABASE_CONNECTION_GUIDE.md
- [x] Update Tap to Add Money description: "Tap your card or use Google Pay / Apple Pay"
- [x] Update quick amounts: R50, R200, R500, R1000, R3000
- [x] Add R5000, R8000 buttons; grid layout (4 cols, gap-3); max amount 10k
- [x] Add Rule 9A: MUST sweep scripts/ before creating new scripts
- [x] Create session log; update agent_handover, changelog, readme, development_guide
- [x] Update knowledge base with Tap to Add Money and last 3 weeks changes

---

## Key Decisions
- **Model fix**: Set underscored: false on NfcDepositIntent/NfcCallbackLog to match migration's camelCase columns
- **Halo API**: Amount must be JSON number, not string (Halo validates E103)
- **Quick amounts**: R50,R200,R500,R1000,R3000,R5000,R8000; grid layout for professional UI
- **NFC max**: Raised to R10,000 (env.template NFC_DEPOSIT_MAX_AMOUNT)

---

## Files Modified
- `mymoolah-wallet-frontend/components/BottomNavigation.tsx` - Remove duplicate CreditCard import
- `mymoolah-wallet-frontend/pages/TransactPage.tsx` - Add Tap to Add Money card; description
- `models/NfcDepositIntent.js`, `models/NfcCallbackLog.js` - underscored: false
- `services/haloDotClient.js` - Send amount as number to Halo API
- `services/nfcDepositService.js` - Pass amountNum directly (not toFixed)
- `docs/DATABASE_CONNECTION_GUIDE.md` - ECONNRESET troubleshooting
- `docs/CURSOR_2.0_RULES_FINAL.md` - Rule 9A scripts sweep
- `docs/AGENT_HANDOVER.md` - Gate 1: scripts sweep
- `mymoolah-wallet-frontend/components/overlays/TapToAddMoneyOverlay.tsx` - Description, QUICK_AMOUNTS, grid layout, MAX_AMOUNT
- `env.template` - NFC_DEPOSIT_MAX_AMOUNT=10000
- `scripts/seed-support-knowledge-base.js` - Tap to Add Money FAQ entries (Q3.2 updated, Q3.2a, Q3.2b, Q11.6, Q11.5.1)

### Knowledge Base Entries Added (Last 3 Weeks)
- **Q3.2** (load_funds): Updated to include Tap to Add Money, Request Money, Top-up at EasyPay
- **Q3.2a**: What is Tap to Add Money? (tap card / Google Pay / Apple Pay at Halo.Go)
- **Q3.2b**: Where do I find Tap to Add Money? (Transact → Payments & Transfers)
- **Q11.6**: USDC send fees (7.5% Transaction Fee)
- **Q11.5.1**: Transaction Detail modal (Reference, Amount, Status only; no blockchain Tx ID)

---

## Issues Encountered
- **Frontend 500**: Duplicate CreditCard import in BottomNavigation — removed
- **user_id does not exist**: Migration created camelCase (userId); model had underscored:true expecting user_id — set underscored:false
- **E103 .amount should be number**: Halo API expects number; we sent string — parse and send as number
- **E122 Invalid Merchant**: Halo registration/configuration — merchant must be registered in Halo QA portal (not a code fix)
- **ECONNRESET on migrations**: Proxy started before gcloud auth — restart proxy after auth

---

## Important Context for Next Agent
- **Tap to Add Money**: Requires Halo merchant registration in QA (E122 if not registered)
- **Run migrations**: Use `./scripts/run-migrations-master.sh uat` (not npx sequelize-cli directly)
- **Scripts**: Always sweep scripts/ before creating new ones (Rule 9A)
- **Knowledge base**: Run `node scripts/seed-support-knowledge-base.js` after editing seed script

---

## Related Documentation
- docs/NFC_DEPOSIT_IMPLEMENTATION_PLAN.md
- docs/integrations/StandardBankNFC.md
- docs/DATABASE_CONNECTION_GUIDE.md
- docs/session_logs/2026-02-10_1400_nfc-tap-to-add-money-implementation.md
