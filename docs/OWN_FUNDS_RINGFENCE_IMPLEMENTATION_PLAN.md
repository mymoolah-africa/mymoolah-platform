# Own-Funds Ring-Fence — Engineering Implementation Plan

**Document status:** Draft for André's approval  
**Owner:** Engineering, jointly with Compliance  
**Related policy:** `docs/policies/20-Cash-Withdrawal-Policy.md` (POL-020 v1.1)  
**Partner letter:** `docs/policies/2026-04-20_StandardBank_CashWithdrawal_Policy_Letter.html`  
**Date:** 20 April 2026  
**Classification:** Internal — engineering reference

---

## 0. Goal

Extend the existing restricted-balance machinery (built for Flash voucher deposits) so that **a wallet holder's own-money deposits are ring-fenced against cash withdrawal**, while **third-party credits (wages, loans, bulk disbursements, P2P credits)** remain eligible for cash withdrawal through any MyMoolah **Cash-Withdrawal Partner** — currently eeziCash (Flash Group), EasyPay retail cash-withdrawal, Cliquefin / OTT cash-withdrawal vouchers, USSD cash-withdrawal, and any successor partner.

This plan does **not** change the existing Flash voucher ring-fence; it composes on top of it using the same `wallets.restricted_balance` column and the same `canCashOut`/release machinery.

---

## 1. Design decisions (confirmed by André, 20 April 2026)

| Decision | Choice |
|---|---|
| Classification rule | **Name-match at ingress** — remitter vs FICA-verified wallet-holder name. |
| Balance model | **Single pool** — reuse `wallets.restricted_balance`; carry source in metadata. |
| UX for blocked cash withdrawal | Modal only; **no Cash-Available figure** surfaced. |
| Historical data | Best-effort classification backfill to `metadata`; do **not** retrospectively adjust `restricted_balance`. |
| Scope of enforcement | All existing cash-withdrawal exits (eeziCash PIN, EasyPay retail cash-withdrawal, USSD cash-withdrawal, and the upcoming Cliquefin / OTT cash-withdrawal voucher rail) + any future Cash-Withdrawal Partner. |

---

## 2. Current-state summary (research findings)

Files and fields already in place:

- `models/Wallet.js` — `balance`, `restrictedBalance` (column `restricted_balance`, default 0). Methods: `canDebit`, `canCashOut` (lines 287-306), `credit`, `debit`.
- `services/restrictedFundsService.js` — `postVoucherDepositAndRestriction(...)`, `releaseRestrictedFunds(...)` (FIFO). GL accounts via env: `LEDGER_ACCOUNT_CLIENT_FLOAT` (default `2100-01-01`), `LEDGER_ACCOUNT_CLIENT_FLOAT_RESTRICTED` (default `2100-01-02`), `LEDGER_ACCOUNT_FLASH_FLOAT` (default `1200-10-04`).
- `services/standardbankDepositNotificationService.js` — `processDepositNotification` — writes `Transaction{type:'deposit', metadata:{source:'SBSA_DEPOSIT_NOTIFICATION'}}` and credits wallet.
- `services/standardbankRtpService.js` — `creditWalletOnPaid` — writes `Transaction{type:'receive', metadata:{payshapType:'rtp'}}`. Note: also calls `releaseRestrictedFunds` on outbound RPP debits.
- `services/nfcDepositService.js` — Halo Dot NFC deposit credit.
- `services/standardbank/disbursementService.js` — MMTP corporate client disbursement; credits wallet with `metadata.source:'DISBURSEMENT_WALLET'`, includes `employeeRef`, `runReference`.
- `controllers/flashController.js` — `redeemVoucherTopup` (unchanged; already restricts), `purchaseCashOutPin` (enforces `canCashOut`), `purchaseEeziVoucher` (currently uses direct balance check — to be audited in §6).
- `controllers/voucherController.js` — `issueEasyPayCashout` (enforces `canCashOut`).
- `services/ussdMenuService.js` — USSD cash-withdrawal path (uses `canCashOut`, the retained code identifier for the wallet-level guard).
- Frontend overlays:
  - `mymoolah-wallet-frontend/components/overlays/flash-eezicash/FlashEeziCashOverlay.tsx`
  - `mymoolah-wallet-frontend/components/overlays/cashout-easypay/CashoutEasyPayOverlay.tsx`

---

## 3. Data model changes

### 3.1 No new column on `wallets`
Reuse `restricted_balance`. Nothing to migrate on this table.

### 3.2 Transaction metadata envelope (convention, not schema change)

Every inbound-credit writer stamps `transactions.metadata` with a standard envelope:

```json
{
  "source": "SBSA_DEPOSIT_NOTIFICATION | SBSA_PAYSHAP_RTP | NFC_HALO | FLASH_VOUCHER | MM_DISBURSEMENT | P2P_WALLET | VAS_COMMISSION",
  "fundOrigin": "own_funds | third_party_credit | voucher_deposit | unknown",
  "isRestricted": true,
  "nameMatch": {
    "remitter":       "<raw remitter name from payload>",
    "walletHolder":   "<concatenated FICA-verified full name>",
    "normalized":     { "remitter": "...", "walletHolder": "..." },
    "score":          0.94,
    "threshold":      0.90,
    "band":           "match | review | no_match",
    "matched":        true
  },
  "classifierVersion": "1.0.0"
}
```

Fields are optional where not applicable (e.g. `FLASH_VOUCHER`, `MM_DISBURSEMENT` skip `nameMatch`).

### 3.3 New append-only audit table

Migration: `migrations/YYYYMMDD_create_deposit_classification_audit.js`

```sql
CREATE TABLE deposit_classification_audit (
  id                BIGSERIAL PRIMARY KEY,
  transaction_id    VARCHAR(64)   NOT NULL,
  wallet_id         VARCHAR(64)   NOT NULL,
  user_id           BIGINT        NOT NULL,
  rail              VARCHAR(40)   NOT NULL,
  amount_cents      BIGINT        NOT NULL,
  remitter_name     TEXT,
  wallet_holder     TEXT,
  score             NUMERIC(5,4),
  threshold         NUMERIC(5,4),
  band              VARCHAR(16),     -- match | review | no_match | skipped
  decision          VARCHAR(20) NOT NULL,  -- own_funds | third_party_credit | voucher_deposit | unknown
  is_restricted     BOOLEAN     NOT NULL,
  classifier_version VARCHAR(16),
  override_by       VARCHAR(64),
  override_reason   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dca_user_created     ON deposit_classification_audit (user_id, created_at DESC);
CREATE INDEX idx_dca_wallet_created   ON deposit_classification_audit (wallet_id, created_at DESC);
CREATE INDEX idx_dca_rail_decision    ON deposit_classification_audit (rail, decision);
```

**Append-only**: no UPDATE / DELETE in code paths. Overrides are written as a new row referencing the original `transaction_id`.

### 3.4 New error code

Add `WALLET.CASH_WITHDRAW_RESTRICTED` to the API error taxonomy. `canCashOut` failures surface this code plus a stable `messageKey` for i18n.

---

## 4. New service — `services/depositClassificationService.js`

### 4.1 Public API

```js
/**
 * Classify an inbound deposit as own_funds / third_party_credit / voucher_deposit / unknown.
 *
 * @param {Object} input
 * @param {'SBSA_DEPOSIT_NOTIFICATION'|'SBSA_PAYSHAP_RTP'|'NFC_HALO'|'FLASH_VOUCHER'|'MM_DISBURSEMENT'|'P2P_WALLET'|'VAS_COMMISSION'} input.rail
 * @param {string} [input.remitterName]
 * @param {string} input.walletHolderFullName
 * @param {number} input.amountCents
 * @param {string} input.externalRef
 * @returns {{ fundOrigin, isRestricted, score, threshold, band, rationale, classifierVersion }}
 */
async function classifyInboundDeposit(input) { ... }
```

### 4.2 Rail rules

| Rail | Rule |
|---|---|
| `MM_DISBURSEMENT` | Always `third_party_credit`, unrestricted. Skip name-match. |
| `P2P_WALLET` | Always `third_party_credit`, unrestricted (sender is a different FICA-verified wallet holder). |
| `VAS_COMMISSION` | Always `third_party_credit`, unrestricted. |
| `FLASH_VOUCHER` | Always `voucher_deposit`, restricted (existing behaviour). |
| `SBSA_DEPOSIT_NOTIFICATION` | Name-match; match → `own_funds`. No-match → `third_party_credit`. Missing remitter → `unknown`. |
| `SBSA_PAYSHAP_RTP` | Same as `SBSA_DEPOSIT_NOTIFICATION`. |
| `NFC_HALO` | Default to `own_funds` (user self-loads with a card on their own handset). If the rail ever surfaces a cardholder name, apply name-match. |
| Any other / unknown rail | `unknown` (restricted). |

### 4.3 Name normalisation (utility `utils/nameMatch.js`)

Steps:
1. Unicode NFKD + diacritic strip.
2. Lowercase.
3. Strip punctuation (`. , - '`) and honorifics (`mr mrs ms dr prof` etc.).
4. Collapse whitespace.
5. Token-split; expand single-letter initials to placeholder (`a.` → `a`).
6. Sort tokens (to tolerate surname-first vs forename-first).

### 4.4 Similarity score
Jaro-Winkler over the concatenated normalised strings **and** a tokenised max-bipartite matching score — take the max of the two. Threshold: `NAME_MATCH_THRESHOLD` env var, default `0.90`. Review band `NAME_MATCH_REVIEW_MIN`, default `0.85`.

Scoring outcomes:
- `score >= threshold` → `band: "match"` → `fundOrigin: own_funds`, restricted.
- `threshold > score >= review_min` → `band: "review"` → conservative default `own_funds`, restricted; write a review row to `deposit_classification_audit` for compliance to examine.
- `score < review_min` → `band: "no_match"` → `fundOrigin: third_party_credit`, unrestricted.
- No remitter name → `band: "skipped"` → `unknown`, restricted.

### 4.5 Ledger side-effect

When the classifier returns `isRestricted: true` for a non-voucher source, the integration point calls a new sibling:

```js
restrictedFundsService.postOwnFundsRestriction({
  walletId, userId, netAmountCents, reference, memo: 'OWN_FUNDS_RESTRICTION'
});
```

which:
1. credits `2100-01-02` and debits `2100-01-01` for `netAmountCents` (same balanced pair as voucher restriction, different memo);
2. increments `wallets.restricted_balance` by the same amount inside the same DB transaction.

---

## 5. Integration wiring

| File | Change |
|---|---|
| `services/standardbankDepositNotificationService.js` | In `processDepositNotification`, after resolving the wallet and before `wallet.credit`, call `classifyInboundDeposit({ rail: 'SBSA_DEPOSIT_NOTIFICATION', remitterName: payload.debtorName, walletHolderFullName: `${user.firstName} ${user.lastName}`, amountCents, externalRef })`. Stamp `metadata` envelope. If restricted, post `postOwnFundsRestriction`. Write audit row either way. |
| `services/standardbankRtpService.js` | In `creditWalletOnPaid`, same pattern with `rail: 'SBSA_PAYSHAP_RTP'` and `remitterName` taken from the RTP payload (`payerName` / debtor info). |
| `services/nfcDepositService.js` | Default `rail: 'NFC_HALO'`. Classifier will return `own_funds` + restricted. If a cardholder name is available in future, pass it as `remitterName`. |
| `services/standardbank/disbursementService.js` | Add envelope stamping with `rail: 'MM_DISBURSEMENT'`, `fundOrigin: 'third_party_credit'`, `isRestricted: false`. No ledger change (behaviour identical to today). Write audit row with `band: 'skipped'`, `decision: 'third_party_credit'`. |
| `controllers/flashController.js` → `redeemVoucherTopup` | Unchanged runtime behaviour. Stamp envelope with `rail: 'FLASH_VOUCHER'`, `fundOrigin: 'voucher_deposit'`, `isRestricted: true`. Write audit row. |
| `controllers/*` (P2P wallet-to-wallet credit, VAS commission credit) | Stamp envelope accordingly (`third_party_credit`, unrestricted). |

All integration points must wrap the classifier + credit + restriction in a **single DB transaction** to preserve atomicity.

---

## 6. Cash-withdrawal guard sweep

1. **Audit every cash-withdrawal exit.** Grep for `canCashOut`, `restrictedBalance`, `purchaseCashOutPin`, `issueEasyPayCashout`, USSD cash-withdrawal handler, and (when wired) the Cliquefin / OTT cash-withdrawal-voucher handler. Confirm every path computes `balance - restricted_balance` before debit and returns the `WALLET.CASH_WITHDRAW_RESTRICTED` error on failure. (Note: backend function/identifier names retain the historical `CashOut` spelling; user-facing, policy and T&C language uses "cash withdrawal".)
2. **Verify `purchaseEeziVoucher`**. The subagent flagged that this handler currently checks `balance >= totalChargeCents` directly. Product + legal must decide whether the eezi-voucher product is cash-equivalent (→ must go through `canCashOut`) or a VAS item (→ leave alone). Record the decision in a short ADR under `docs/adr/`.
3. **Fix the EasyPay cash-withdrawal route gap.** Verify the route mounting of `POST /api/v1/vouchers/easypay/cashout/issue` in `routes/vouchers.js` against the frontend call in `CashoutEasyPayOverlay.tsx`. Reconcile the mismatch — either add the route or correct the frontend path. (File and route names retain the historical `cashout` spelling; this does not affect user-facing terminology.)

---

## 7. Frontend restriction modal

- New shared component: `mymoolah-wallet-frontend/components/overlays/shared/CashWithdrawBlockedModal.tsx`.
- Trigger: any API response with `error.code === 'WALLET.CASH_WITHDRAW_RESTRICTED'`.
- Copy (EN first; ZU / XH / AF to follow via i18n):
  - Title: **"Cash withdrawal not available for these funds"**
  - Body: A short two-paragraph explanation that own-money deposits are ring-fenced against cash withdrawal by law and policy; that the funds remain fully usable for transfers, PayShap, bill payments, airtime, data, electricity, and merchant payments.
  - Primary CTA: **"OK, got it"**.
  - Secondary CTA: **"Learn more"** → opens in-app support article sourced from the FAQ / AI KB.
- **No numeric Cash-Available figure is rendered.**
- Integration points: every Cash-Withdrawal Partner overlay — current: Flash eeziCash overlay (`FlashEeziCashOverlay.tsx`), EasyPay cash-withdrawal overlay (`CashoutEasyPayOverlay.tsx`); forthcoming: Cliquefin / OTT cash-withdrawal-voucher overlay; plus USSD cash-withdrawal (text-only analogue of the same message).

---

## 8. Historical backfill

Script: `scripts/backfill-deposit-fund-origin.js` (dry-run + execute modes).

1. Iterate `transactions` WHERE `type IN ('deposit','receive')` ordered by `createdAt ASC`, chunked by 1,000.
2. Derive `rail` from `metadata.source` (fallback: `unknown`).
3. Run the classifier with whatever remitter-name information is present (often absent for historical rows).
4. Write `deposit_classification_audit` rows with `band: 'historical'` where name data is missing.
5. Stamp `metadata.fundOrigin` on the `transactions` row.
6. **Do NOT adjust `restricted_balance`** for historical deposits — we do not retroactively restrict funds that users may already have withdrawn as cash.
7. Emit a CSV summary report: counts by `rail` × `fundOrigin`, total restricted (would-be) amount, ambiguous cases.

---

## 9. Testing (per fintech-TDD skill)

### 9.1 Unit
- `utils/nameMatch.js` — canonical cases (exact, initials, title+surname, unicode diacritics, joint account with two names, surname-first, no remitter).
- `services/depositClassificationService.js` — one test per rail rule, edge cases at threshold boundaries (0.899, 0.900, 0.851).

### 9.2 Integration
- SBSA deposit notification with matching name → wallet balance up, restricted up, `canCashOut` for amount > unrestricted returns false.
- SBSA deposit notification with non-matching name → balance up, restricted unchanged, cash withdrawal allowed.
- SBSA PayShap RTP with missing debtor name → unknown → restricted.
- Disbursement rail credit → balance up, restricted unchanged, cash withdrawal allowed.
- Flash voucher redemption → balance up, restricted up (existing behaviour preserved).
- Every cash-withdrawal endpoint — eeziCash PIN, EasyPay retail cash-withdrawal, Cliquefin / OTT cash-withdrawal voucher, USSD cash-withdrawal — returns `WALLET.CASH_WITHDRAW_RESTRICTED` when `unrestricted < amount`.
- PayShap RPP outbound with restricted funds → `releaseRestrictedFunds` runs FIFO and reduces `restricted_balance`.

### 9.3 Ledger
- Debits == credits on every posted JE.
- Hourly reconciliation: `SUM(wallets.restricted_balance) == net credit balance of 2100-01-02` within R0.01.

### 9.4 Frontend
- Playwright: trigger a blocked cash withdrawal, assert modal renders, assert no Cash-Available number is shown anywhere in the overlay.

Coverage target: ≥ 90% on `depositClassificationService` and `utils/nameMatch`.

---

## 10. Observability

- Metrics (Prometheus): `deposit_classification_total{rail,decision,band}`, `cash_withdraw_blocked_total{rail}`, `restricted_balance_recon_diff_cents`.
- Dashboard: name-match score histogram, review-band rate per day, blocked-cash-withdrawal rate, recon diff.
- Alerts: recon diff > R0.01; review-band rate above SLO (e.g. 5% of classifications); classifier errors per minute.

---

## 11. Security, privacy, compliance

- Remitter and wallet-holder names are PII. Audit rows are retained under POL-007 (≥ 5 years). Exports from `deposit_classification_audit` require CCO approval.
- Logs emit only hashed snippets of names and the score — never full PII — per POL-013 (Information Security) structured-logging rules.
- The classifier is deterministic and documented, so it can be evidenced to a regulator on demand.

---

## 12. Phased rollout

**Phase 1 — Shadow (~1 week).** Classifier runs and writes `metadata` + audit rows on every inbound deposit, but **does not increment `restricted_balance` for non-voucher sources**. Monitor the review-band rate, false-positive flags raised by Compliance on a sampled basis, and threshold tuning. No user-visible change.

**Phase 2 — Enforce.** Turn on `postOwnFundsRestriction` for non-voucher sources. Ship the `CashWithdrawBlockedModal`. Publish the FAQ/KB entries (pre-approved by Compliance) and regenerate the AI KB. Communicate to support team.

**Phase 3 — Sweep & backfill.** Resolve the cash-withdrawal guard items in §6. Run the historical backfill script in dry-run, review the report with CCO, then execute. Produce the first compliance report.

**Phase 4 — Cash-withdrawal velocity enforcement (POL-020 §7.6 – §7.10).** This phase productionises the velocity rule family defined in POL-004 §5.2.8.

- *Thresholds (authoritative values):*
  - Tier 1: 2 / rolling 60 min, 3 / rolling 24 h, 15 / calendar month. Unique partners per 24 h: 2. Unique retailers per 24 h: 3.
  - Tier 2: 3 / rolling 60 min, 5 / rolling 24 h, 30 / calendar month. Unique partners per 24 h: 3. Unique retailers per 24 h: 5.
  - FICA aggregation: R24,999.99 review; R49,999.99 CTR auto-file + same-day hold.
  - Rapid deployment: ≥ 80 % of tier daily value cap within 2 h → OTP step-up.
  - Structuring: CW-STR-01/02/03 per POL-020 §7.8.
  - Channel rotation: CW-CHR-01/02 per POL-020 §7.9.
  - Step-up / hold: CW-SUP-01/02 per POL-020 §7.10.
- *New files:*
  - `services/cashWithdrawalVelocityService.js` — Redis rolling counters + DB calendar-month aggregate + evaluator returning `{ decision: 'allow' | 'step_up' | 'pending_review' | 'block', ruleId, context }`.
  - `config/cashWithdrawalVelocity.js` — **already added** (thresholds, counter key names, TTLs, enforcement mode flag).
- *Config changes:*
  - `config/kycTierLimits.js` — **already extended** with `cashWithdrawalCount` per tier (Tier 0: zeros; Tier 1: {2,3,15,2,3}; Tier 2: {3,5,30,3,5}) and new `getCashWithdrawalCountCaps(tier)` export.
  - Environment variable `CASH_WITHDRAWAL_VELOCITY_MODE` — default `log_only`; flip to `enforce` after shadow period.
- *Integration points (every cash-withdrawal endpoint must route through the evaluator):*
  - `controllers/voucherController.issueEasyPayCashout`
  - `controllers/voucherController.purchaseCashOutPin` (eeziCash)
  - Any Cliquefin / OTT cash-withdrawal voucher endpoint on onboarding
  - USSD cash-withdrawal flow in `services/ussdMenuService.js`
  - `Wallet.prototype.canCashOut` calls the velocity evaluator after the ring-fence check; a non-`allow` decision surfaces the appropriate outcome to the caller.
- *New error codes:*
  - `WALLET.CASH_WITHDRAW_VELOCITY_EXCEEDED` — returned for any `CW-VEL-*` or `CW-CHR-02` block.
  - `WALLET.CASH_WITHDRAW_STEP_UP_REQUIRED` — returned when decision is `step_up` (frontend presents OTP challenge).
  - `WALLET.CASH_WITHDRAW_PENDING_REVIEW` — returned when decision is `pending_review` (frontend presents the pending-review screen).
- *Frontend:*
  - Extend `CashWithdrawBlockedModal` (or introduce a sibling) to render three variants: Restricted (Own Funds), Velocity-Exceeded (count cap), Pending-Review (hold).
  - Ensure the OTP step-up flow is reused from the existing auth module; do not duplicate.
- *Telemetry:*
  - Structured log events `cw_velocity.eval`, `cw_velocity.block`, `cw_velocity.step_up`, `cw_velocity.pending_review`, `cw_aggregation.ctr_auto_file` (PII-redacted per POL-013).
  - Daily summary posted to the compliance analyst dashboard; weekly summary posted to CCO.
- *Testing (per fintech-TDD skill):*
  - Unit: threshold maths per tier; rolling-window correctness across TTL rollover; channel-rotation distinct-set maths.
  - Integration: each cash-withdrawal endpoint honours `log_only` vs `enforce` mode; correct error codes returned; no regression to Own-Funds ring-fence enforcement.
  - Ledger: blocked and pending attempts create **no** journal entries; allowed attempts post correctly.
  - Race: concurrent same-user attempts resolved deterministically (Redis atomic counters + Lua script or `INCR` with TTL).
  - E2E: Tier-1 user at 3/3 24 h cap → blocked; Tier-2 user at 80 % cap → OTP; Tier-2 user at R25,000 rolling 24 h → review flag emitted; Tier-2 user at R50,000 rolling 24 h → CTR auto-file + hold.
- *Rollout staging:*
  - **Phase 4a — Shadow (~2 weeks).** `CASH_WITHDRAWAL_VELOCITY_MODE=log_only`. Service runs, alerts Compliance, **no user-visible block**. Tune thresholds against observed baseline.
  - **Phase 4b — Enforce.** Flip mode to `enforce`. Announce via in-app notification and support briefing. Monitor block rate and compliance ticket volume daily for 2 weeks.
  - **Phase 4c — Operationalise.** Move velocity tuning under the joint CCO + CTO change procedure in POL-020 §9. Publish the first Compliance report (blocked attempts, CTR auto-files, step-ups, holds cleared vs sustained).

**Phase 5 — Partner communication.** Deliver the Standard Bank letter (`docs/policies/2026-04-20_StandardBank_CashWithdrawal_Policy_Letter.html`) through the CEO/CCO, follow up on the multi-party FICA protocol (sponsor bank + each Cash-Withdrawal Partner), and track the product-approval response.

---

## 13. Out-of-scope (for this work stream)

- Introducing a Cash-Available balance in the UI.
- Per-source sub-ledger buckets (deferred; revisit if regulator requests finer-grained reporting).
- Changes to the Flash voucher ring-fence (already live; only composed with).
- Changes to the MMTP Disbursement rail (already correctly classified as third-party).

---

## 14. Dependencies & risks

| Risk | Mitigation |
|---|---|
| Name-match false positives (spouse deposits classified as own) | Review band + dispute procedure (§6.5 of POL-020). Phase-1 shadow mode to tune threshold before enforcement. |
| Remitter-name field missing from SBSA payloads | Default to `unknown` / restricted. Work with SBSA to ensure the field is populated (this is already part of the SBSA deposit notification schema). |
| User confusion with no Cash-Available figure | Clear modal copy, FAQ / AI KB entries, support team training. |
| Ledger recon drift during rollout | Recon runs hourly from day one; alert on > R0.01. |

---

## 15. Sign-off checklist

- [ ] CCO sign-off on POL-020 v1.1
- [ ] CTO sign-off on this implementation plan
- [ ] ADR recorded for `purchaseEeziVoucher` cash-equivalent decision
- [ ] Phase 1 go-live ticket created
- [ ] Standard Bank letter dispatched (tracked)

---

*Maintained by MyMoolah Engineering. Changes tracked in `docs/CHANGELOG.md`.*
