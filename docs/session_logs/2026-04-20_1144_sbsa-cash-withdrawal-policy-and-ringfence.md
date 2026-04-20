# Session Log — 2026-04-20 — SBSA Cash-Withdrawal Policy, Letter & Own-Funds Ring-Fence Plan

**Session Date**: 2026-04-20 (concluded ~11:44 SAST)  
**Agent**: Cursor AI Agent (Claude 4.5 Opus + Gemini 3 Pro for research sub-agents)  
**User**: André  
**Session Duration**: ~1 day (spanning multiple turns)

---

## Session Summary

Drafted the full POL-020 Cash Withdrawal & Own-Funds Ring-Fencing Policy, the banking-grade HTML cover letter to Standard Bank requesting formal product approval, and the phased backend implementation plan for ring-fencing own-funds deposits against cash withdrawals (Flash eeziCash, EasyPay, Cliquefin/OTT, USSD, and any future Cash-Withdrawal Partner). Swept the terminology across the entire policy corpus to align on "Cash Withdrawal" / "Cash-Withdrawal Partner", added count-based velocity controls (per-60m/24h/month caps, structuring detection, channel-rotation detection, step-up and pending-review mechanics), corrected partner-name error `QuickFin` → `Cliquefin` across 25 documents, and aligned the SBSA letter with André's corrections (real reg no, legal@ inbox, MyMoolah Treasury Platform branding, real signatories, removal of unsupported claims about an existing SBSA sponsorship agreement, and full scrub of "trust account" language in favour of "segregated account").

---

## Tasks Completed

- [x] `docs/policies/20-Cash-Withdrawal-Policy.md` — POL-020 v1.0 → v1.3 (ring-fence rule, regulatory framework, controls, velocity caps §7.6–§7.11, segregated-account alignment)
- [x] `docs/policies/2026-04-20_StandardBank_CashWithdrawal_Policy_Letter.html` — A4 print-ready banking-grade letter to SBSA, brand-marked, signed by CEO/CCO
- [x] `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md` — phased backend plan (name-match classifier, single `restricted_balance` pool, velocity enforcement phase, rollout staging)
- [x] `config/cashWithdrawalVelocity.js` — authoritative thresholds for velocity, aggregation, structuring, channel-rotation, step-up (single source of truth with POL-020)
- [x] `config/kycTierLimits.js` — added per-tier `cashWithdrawalCount` caps + `getCashWithdrawalCountCaps(tier)` helper
- [x] `docs/TERMS_AND_CONDITIONS.md` — v2.3.0 → v2.4.1 (ring-fence §4.4 plus velocity §4.4.8/§4.4.9)
- [x] `docs/FAQ_MASTER.md` — +5 customer-facing Q&A entries in §9c covering velocity, step-up, pending review, channel rotation, FICA thresholds
- [x] `docs/policies/04-Transaction-Monitoring-Policy.md` — v1.2 → v1.3 (new rule family §5.2.8, CW-VEL-*, CW-AGG-*, CW-STR-*, CW-CHR-*, CW-SUP-*)
- [x] Corpus-wide terminology sweep (v1.3 of INDEX, v1.2 of POL-01/02/03/05/13/18, plus 10 handbook/guide docs): "cash-out" → "cash withdrawal", "Cash-out partner" → "Cash-Withdrawal Partner". Internal code identifiers (`Wallet.canCashOut()`, `cashOutRoutes`, etc.) deliberately preserved to avoid breaking changes — documented in the implementation plan.
- [x] Corpus-wide partner-name correction `QuickFin` → `Cliquefin` (25 files across `/docs`, one sed pass, zero remaining occurrences)
- [x] SBSA letter content alignment (legal opinion review + André's corrections): real reg no `2024/315592/07`, `legal@mymoolah.africa`, "MyMoolah Treasury Platform" replacing "MyMoolah Wallet" in subject, removal of Section E (multi-party FICA protocol), removal of the "addendum to existing sponsorship agreement" request (we don't have one — we have a PASA TPPP certificate), simplified single-request Section F, CEO = André Botes Sr, CCO = André Botes Jr, brand-mark inlined from `mymoolah-wallet-frontend/assets/logo3.svg`, enclosures trimmed to POL-020 + FICA RMCP only, full scrub of "trust account" / "trust posture" wording (replaced with "segregated account")
- [x] POL-020 v1.3: "sponsor-bank trust posture" and "sponsor-bank-held trust account" in §5 regulatory framework table → "sponsor-bank-held segregated account" (consistency with letter)

---

## Key Decisions

- **Classification rule** (André): `name_match` — Jaro-Winkler on remitter name vs FICA-verified wallet-holder name, unknown-defaults-to-restricted (conservative). Applied at deposit ingress.
- **Balance model** (André): `single_pool` — reuse existing `wallets.restricted_balance` column for all restricted funds (own-funds + voucher deposits), with source identified via transaction metadata. No new column.
- **Terminology scope** (André, mid-session): broaden partner category from "eeziCash + EasyPay" to the generic "Cash-Withdrawal Partner" to accommodate Cliquefin/OTT and future retail/trader partners; standardise on "Cash Withdrawal" over "Cash-out" as the product term. Backend code identifiers deliberately kept as-is.
- **Velocity policy** (André): accept the proposed layered control set — count caps (2/3/15 per tier), FICA-aligned aggregation triggers (R24,999.99 review; R49,999.99 CTR), structuring detection, channel-rotation detection, step-up at 80%, pending-review at 100%. Initial rollout in log-only mode per POL-020 §7.11 with `CASH_WITHDRAWAL_VELOCITY_MODE=log_only`.
- **SBSA sponsorship wording** (André correction): we do *not* have an SBSA sponsorship agreement — only a PASA TPPP certificate. Letter rewritten to reference PASA certification, drop the "addendum to existing sponsorship agreement" preference, and simply request Standard Bank's written no-objection.
- **Trust-account terminology** (André correction): customer float is held in **segregated accounts**, not trust accounts. All "trust account" / "trust posture" language removed from the letter and POL-020's regulatory framework table. Policies that might reach SBSA Legal must be internally consistent.
- **Letter ships against POL-020 v1.1** (André, explicit): letter references kept at v1.1 even though POL-020 has since progressed to v1.3 in the repo. Letter is a point-in-time artefact dated 20 April 2026.
- **Partner-name correction** (André): `QuickFin` is `Cliquefin`. Swept across 25 docs; POL-020 changelog retained `QuickFin` in v1.1's description entry (since that was never published externally before being auto-corrected via sed to `Cliquefin`).

---

## Files Modified

### New files
- `docs/policies/20-Cash-Withdrawal-Policy.md` — POL-020 v1.3, canonical cash-withdrawal & ring-fence policy
- `docs/policies/2026-04-20_StandardBank_CashWithdrawal_Policy_Letter.html` — SBSA cover letter (A4, print-ready)
- `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md` — phased backend plan (deposit classifier, velocity service, rollout stages)
- `config/cashWithdrawalVelocity.js` — velocity/aggregation/structuring/channel-rotation/step-up thresholds (single source of truth with POL-020 §7.6–§7.10)
- `docs/session_logs/2026-04-20_1144_sbsa-cash-withdrawal-policy-and-ringfence.md` — this session log

### Modified
- `config/kycTierLimits.js` — per-tier `cashWithdrawalCount` object + `getCashWithdrawalCountCaps(tier)` helper
- `docs/TERMS_AND_CONDITIONS.md` — v2.3.0 → v2.4.1 (§4.4 ring-fence, §4.4.8–§4.4.9 velocity, §4.4.10 legal basis)
- `docs/FAQ_MASTER.md` — +5 Q&A entries in §9c (velocity, step-up, pending review, channel rotation, FICA thresholds)
- `docs/policies/INDEX.md` — v1.3 (corpus terminology alignment note; also auto-picks up Cliquefin correction)
- `docs/policies/01-AML-CFT-Policy.md` — v1.2 (terminology sweep)
- `docs/policies/02-KYC-CDD-Policy.md` — v2.2 (terminology sweep)
- `docs/policies/03-Sanctions-Policy.md` — v1.2 (terminology sweep)
- `docs/policies/04-Transaction-Monitoring-Policy.md` — v1.3 (new rule family §5.2.8)
- `docs/policies/05-Fraud-Prevention-Policy.md` — v1.2 (terminology sweep + typologies)
- `docs/policies/13-Information-Security-Policy.md` — v1.2 (terminology sweep)
- `docs/policies/18-Compliance-Review-Policy.md` — v1.2 (terminology sweep)
- `docs/WITHDRAWALS_COMPLIANCE_AND_KB.md` — terminology alignment
- `docs/SECURITY.md` — terminology alignment
- `docs/STANDARD_BANK_TPPP_BRIEF.md` — terminology alignment, Cliquefin listed
- `docs/BANKING_GRADE_ARCHITECTURE.md` — outbound-flow paragraph updated
- `docs/SETTLEMENTS.md` — wallet-cash-withdrawal paragraph updated, ledger names preserved
- `docs/DEVELOPMENT_GUIDE.md` — engineering guidance for cash withdrawals / TPPP / Cash-Withdrawal Partners
- `docs/DOMAIN_MODEL.md` — supplier integrations paragraph includes Cliquefin/OTT
- `docs/USSD_INTEGRATION_GUIDE.md` — menu flow terminology
- `docs/INTEGRATIONS_COMPLETE.md` — voucher-types bullet
- `docs/CHART_OF_ACCOUNTS.md` — deposit ring-fence prose cites POL-020
- `docs/integrations/MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html` — legal characterisation labels
- `docs/FLASH_VOUCHER_RINGFENCING_UNDERTAKING.md` — Cliquefin spelling correction
- `docs/index.md` / `docs/README.md` / `docs/PROJECT_STATUS.md` — recent-work blocks reflect POL-020 + letter + plan + terminology sweep

---

## Code Changes Summary

This session was documentation-and-configuration-heavy. Two code-adjacent changes:

- `config/cashWithdrawalVelocity.js` (new) — exports `ENFORCEMENT_MODE`, `AGGREGATION`, `STRUCTURING`, `CHANNEL_ROTATION`, `STEP_UP`, `COUNTER_KEYS`, `COUNTER_TTL_SEC`. Mode defaults to `log_only` per POL-020 §7.11; set `CASH_WITHDRAWAL_VELOCITY_MODE=enforce` to activate blocking (not yet consumed by any runtime service — that's Phase 4 of the implementation plan).
- `config/kycTierLimits.js` — added `cashWithdrawalCount` sub-objects to each tier and `getCashWithdrawalCountCaps(tier)` helper. Not yet consumed at runtime.

No controllers, services, routes, models, or migrations were touched. No database changes. No API surface changes. No breaking changes to any existing functionality.

---

## Issues Encountered

- **Sub-agent context sprawl** on the initial exploration — mitigated by splitting research into three parallel sub-agents (legal/regulatory; backend/wallet/ledger; frontend/modal) and merging findings before drafting.
- **Duplicate changelog entry** briefly introduced in `docs/policies/05-Fraud-Prevention-Policy.md` during terminology alignment — consolidated into one v1.2 entry.
- **Legal-characterisation drift** flagged by André: letter used "existing sponsorship agreement" (we don't have one) and "trust account" (not our legal position) — both removed in favour of PASA TPPP certification + segregated-account framing.
- **Partner-name error** `QuickFin` vs `Cliquefin` spread to 25 files during the terminology sweep — corrected via single sed pass across the corpus.

---

## Testing Performed

- [x] Linter clean on `config/kycTierLimits.js` and `config/cashWithdrawalVelocity.js`
- [x] Visual verification of the HTML letter in Safari (logo renders, layout holds on A4, print preview clean)
- [x] Grep sweep verification: 0 `QuickFin` occurrences, 0 `trust account` / `trust posture` occurrences in `/docs` (outside POL-020 changelog entry which is expected)
- [ ] No unit/integration tests — this session produced no executable code paths. Tests are scoped to the implementation plan phases.

---

## Next Steps

### Immediate (André)
- [ ] Review final HTML letter in browser (already open in Safari — `⌘R` to refresh)
- [ ] Save-as-PDF: File → Export as PDF (or ⌘P → PDF dropdown → Save as PDF)
- [ ] Add hand-written signatures (or keep printed-name with typed signature block as-is)
- [ ] Send to SBSA TPPP Sponsorship / Group Compliance at their standard intake address
- [ ] Run `git push origin main` after reviewing the commits this agent is leaving

### Backend implementation (later session)
- [ ] Phase 1 — Deposit classification service (`services/depositClassifier.js`) — name-match + default-restricted
- [ ] Phase 2 — Wire classifier into all deposit ingress paths (SBSA, PayShap, NFC, Flash voucher, MMTP inbound)
- [ ] Phase 3 — Extend `Wallet.canCashOut()` to enforce `balance − restricted_balance ≥ amount` atomically (already present — verify edge cases under high concurrency)
- [ ] Phase 4 — `services/cashWithdrawalVelocityService.js` — Redis-backed rolling counters, step-up/pending-review state machine, error-code emission (`WALLET.CASH_WITHDRAW_VELOCITY_EXCEEDED`, `…_STEP_UP_REQUIRED`, `…_PENDING_REVIEW`)
- [ ] Phase 5 — Frontend modal `CashWithdrawBlockedModal.tsx` (no Cash-Available balance surfaced; one modal handles all three new error codes + existing `CASH_WITHDRAW_RESTRICTED`)
- [ ] Phase 6 — Tests (unit, ledger, race, E2E)
- [ ] Phase 7 — Shadow → enforce → operationalise rollout (CCO + CTO sign-off at each gate)

### AI Knowledge Base regeneration (when ready)
- [ ] `node scripts/generate-knowledge-base.js` (picks up new §9c FAQ entries)
- [ ] `node scripts/embed-knowledge-base.js` (re-embeds the RAG store)
- [ ] Smoke-test with a question like "Can I withdraw cash from money I transferred from my own bank account?"

---

## Important Context for Next Agent

- **POL-020 is now the canonical cash-withdrawal policy.** Any change to cash-withdrawal UX, partner onboarding, velocity thresholds, classification rules, or ledger structure must reference POL-020 and, where substantive, produce a version bump + changelog entry.
- **`config/cashWithdrawalVelocity.js` is the single runtime source of truth for velocity thresholds** — policy prose in POL-020 §7.6–§7.10 and this config file must not drift. Enforcement mode is controlled by `CASH_WITHDRAWAL_VELOCITY_MODE` env var (`log_only` default, `enforce` for live blocking).
- **Backend code identifiers were deliberately preserved** — `Wallet.canCashOut()`, `cashOutRoutes`, `cashOutController`, etc. still use the "cash-out" idiom. Do NOT rename in bulk without a dedicated, tested refactor session. The policy terminology and the code terminology are decoupled on purpose.
- **Letter references POL-020 v1.1** even though the repo has v1.3. This is an explicit decision — the letter is a point-in-time snapshot dated 20 April 2026. Future correspondence should cite the current policy version.
- **Cliquefin (not QuickFin).** If you see QuickFin anywhere that was merged after this session, it's a typo — correct it.
- **No SBSA sponsorship agreement exists.** We hold a PASA TPPP certificate. Any future doc that claims an existing SBSA agreement must be corrected.
- **Customer float is held in segregated accounts at SBSA** — never in "trust accounts". Maintain this distinction in all external communications.
- **Phase 4 velocity enforcement is gated by the implementation plan** — do not ship live blocking without CCO + CTO sign-off and shadow-mode evidence per POL-020 §7.11.

---

## Questions/Unresolved Items

- None blocking. André has approved all policy content, the letter, the plan, velocity thresholds, and the corpus sweep.

---

## Related Documentation

- POL-020: `docs/policies/20-Cash-Withdrawal-Policy.md`
- Letter: `docs/policies/2026-04-20_StandardBank_CashWithdrawal_Policy_Letter.html`
- Plan: `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md`
- Policy index: `docs/policies/INDEX.md`
- Config: `config/cashWithdrawalVelocity.js`, `config/kycTierLimits.js`
- T&C: `docs/TERMS_AND_CONDITIONS.md`
- FAQ: `docs/FAQ_MASTER.md` §9c
- Related policies updated: POL-001, POL-002, POL-003, POL-004, POL-005, POL-013, POL-018
- Handbook docs updated: `docs/SECURITY.md`, `docs/STANDARD_BANK_TPPP_BRIEF.md`, `docs/BANKING_GRADE_ARCHITECTURE.md`, `docs/SETTLEMENTS.md`, `docs/DEVELOPMENT_GUIDE.md`, `docs/DOMAIN_MODEL.md`, `docs/USSD_INTEGRATION_GUIDE.md`, `docs/INTEGRATIONS_COMPLETE.md`, `docs/CHART_OF_ACCOUNTS.md`, `docs/WITHDRAWALS_COMPLIANCE_AND_KB.md`, `docs/integrations/MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html`, `docs/FLASH_VOUCHER_RINGFENCING_UNDERTAKING.md`
