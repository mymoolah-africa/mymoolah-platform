# EasyPay V5 Cash-In Integration — Agent Handover Script

**Created**: 2026-04-10  
**Author**: Planning agent (Claude)  
**Purpose**: Complete onboarding brief for a new agent to execute the EasyPay V5 Phase 1 (Cash-In) finalisation  
**Status**: READY FOR IMPLEMENTATION

---

## 1. READ THESE FILES FIRST (in this order)

| Priority | File | What you learn |
|----------|------|----------------|
| 1 | `docs/CURSOR_2.0_RULES_FINAL.md` | Mandatory rules — confirm reading before any work |
| 2 | `docs/AGENT_HANDOVER.md` | Current project status and priorities |
| 3 | **This file** | EasyPay-specific context, decisions, and task list |
| 4 | `docs/EASYPAY_V5_FINALISATION_PLAN.md` | Detailed 6-task implementation plan with exact code changes |
| 5 | `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md` | Questions asked/answered with EasyPay |
| 6 | `integrations/easypay/EasypayReceiverV5.yaml` | Official V5 OpenAPI spec (source of truth for payloads) |
| 7 | `docs/CHART_OF_ACCOUNTS.md` Section 3.1 | EasyPay journal entry patterns |
| 8 | `docs/session_logs/2026-04-10_1400_easypay-v5-finalisation-plan.md` | Planning session context |
| 9 | `docs/session_logs/2026-04-10_1200_easypay-v5-partner-qa-docs.md` | Documentation alignment session |

---

## 2. WHAT IS EASYPAY V5 CASH-IN?

**Product**: User tops up their MyMoolah wallet with cash at any EasyPay retail point (Pick n Pay, Shoprite, Checkers, Spar, etc.)

**How it works**:
1. User requests a top-up in the app or via USSD (`*120*5616#` > More > Top-up at Retail)
2. MMTP generates a **14-digit EasyPay PIN** (format: `9` + `5063` receiver ID + 8-digit account + Luhn check)
3. User takes PIN to retail, pays cash
4. EasyPay's switch calls MMTP's **V5 receiver** endpoints in sequence:
   - `POST /billpayment/v1/infoRequest` — lookup bill by PIN
   - `POST /billpayment/v1/authorisationRequest` — validate amount, authorise payment
   - `POST /billpayment/v1/paymentNotification` — payment taken, MMTP credits wallet
5. User wallet is credited **immediately** on `paymentNotification` (gross amount minus flat R6.33 fee)
6. EasyPay settles to MMTP's Standard Bank account **T+2 business days** (single daily batch)

**Contract**: "Lesaka ADP | MyMoolah : Supplier Bill Payment Service Agreement" — signed and completed via Adobe Sign on **8 April 2026** by Werner van Reenen (EasyPay) and Andre Botes (MMTP).

---

## 3. WHAT HAS BEEN BUILT (already working)

| Component | File | Status |
|-----------|------|--------|
| V5 receiver controller (info, auth, payment) | `controllers/easyPayController.js` | Done — handles all 3 V5 endpoints |
| Fee calculation + 2-JE ledger posting | `services/easyPayDepositService.js` | Done — needs Task 2 update (flat fee only) |
| V5 routes with auth middleware | `routes/easypay.js` | Done |
| SessionToken authentication | `middleware/easypayAuth.js` | Done |
| 14-digit PIN generation (Luhn) | `utils/easyPayUtils.js` | Done |
| Bill model with userId | `models/Bill.js` | Done |
| Migration: userId on bills table | `migrations/20260409_01_add_userId_to_bills.js` | Done — applied to UAT, staging, production |
| PIN issuance endpoint (app) | `controllers/voucherController.js` (`issueEasyPayVoucher`) | Done |
| PIN issuance route | `routes/vouchers.js` (`POST /easypay/topup/issue`) | Done |
| USSD "Top-up at Retail" flow | `services/ussdMenuService.js` | Done — option 8 in More Menu |
| Frontend tile enabled | `mymoolah-wallet-frontend/pages/TransactPage.tsx` | Done — tile shows "New" badge |
| Dashboard transaction grouping | `controllers/walletController.js` | Done — EasyPay deposits show net amount |
| Supplier commission config | `config/supplier-commissions.json` | Done — EASYPAY entry with zero margin |

---

## 4. WHAT STILL NEEDS TO BE DONE (6 tasks)

Full details in `docs/EASYPAY_V5_FINALISATION_PLAN.md`. Summary:

### Task 1: New CoA account `5000-10-02` (EasyPay Cash Handling Fee)
- Create migration to seed ledger account
- Update `docs/CHART_OF_ACCOUNTS.md` sections 2.5, 7, 8
- Add `LEDGER_ACCOUNT_EASYPAY_CASH_HANDLING=5000-10-02` to `env.template`

### Task 2: Fix fee model (user pays R6.33 flat, MMTP absorbs handling)
- `services/easyPayDepositService.js`: remove `handlingPct` from `calculateEasyPayFee()`. Formula = R5.50 + 15% VAT = R6.33 flat
- Add `postCashHandlingCost()` function for batch recon job (DR `5000-10-02` / CR `1200-10-02`)
- Remove `EASYPAY_TOPUP_CASH_HANDLING_PCT` from `env.template`

### Task 3: Remove legacy settlement routes
- `routes/vouchers.js`: remove `POST /easypay/topup/settlement` and `POST /easypay/settlement`
- `controllers/voucherController.js`: remove `processEasyPaySettlement` function
- Keep: `issueEasyPayVoucher` and `POST /easypay/topup/issue`
- **SECURITY**: `POST /easypay/settlement` currently has NO auth middleware — must be removed

### Task 4: Generate ~50 test PINs for EasyPay staging partner testing
- Create `scripts/generate-easypay-test-pins.js` using `db-connection-helper.js`
- For partner testing against `https://staging.mymoolah.africa/billpayment/v1/`, generate with `node scripts/generate-easypay-test-pins.js --staging` so the `bills` rows exist in the same database the public endpoint uses.
- The generator selects active wallet users from the target DB at runtime; do not hardcode `users.id` values for staging.
- Output CSV and XLSX to `docs/integrations/easypay_test_pins.*`; send the XLSX for manual partner testing so PINs remain text.
- Scenarios: happy path, already paid, expired, cancelled, boundary, amount mismatch, USSD, orphan, invalid PIN

### Task 5: Draft SFTP credentials email for EasyPay
- Save as `docs/integrations/EASYPAY_UAT_CREDENTIALS_EMAIL_DRAFT.md`
- Include: V5 receiver URLs, SessionToken auth, SFTP details (`34.35.137.166`), test data CSV
- Request from EP: egress IPs, sample recon file, go-live date

### Task 6: Documentation sweep
- Update CoA, Integration Guide, Partner QA Checklist, Changelog, Handover, supplier-commissions, env.template

### Execution order
Tasks 1 + 3 in parallel → Task 2 → Task 4 → Task 5 → Task 6 (last)

---

## 5. KEY DECISIONS ALREADY MADE (do NOT re-decide)

| Decision | Rationale | Date |
|----------|-----------|------|
| V5 is the ONLY cash-in route | Confirmed by EasyPay in 10 April meeting. Legacy settlement routes are MMTP assumptions, not EP flows. | 2026-04-10 |
| MMTP generates the 14-digit PIN | EP confirmed: receiver defines PIN format/length. Our format: `9` + `5063` + 8-digit + Luhn. | 2026-04-10 |
| User pays flat R5.50 + VAT = R6.33 | Cash handling fee is variable (merchant-dependent), known only from SFTP recon file. MMTP absorbs it. | 2026-04-10 |
| Cash handling fee → new CoA `5000-10-02` | Same pattern as `5000-10-01` (PayShap SBSA Fee). Direct cost of deposit service. Andre approved. | 2026-04-10 |
| EasyPay deposits are NOT ringfenced | Unlike Flash voucher deposits, EasyPay cash-in is unrestricted. No `restricted_balance` logic. | 2026-04-09 |
| Wallet credited immediately on paymentNotification | Not on settlement. T+2 settlement is float management, not user-facing. | 2026-04-09 |
| JE pattern: 2 at payment + 1 at recon + 1 at settlement | JE1 gross deposit, JE2 user fee, JE3 batch handling cost, JE4 T+2 bank credit. | 2026-04-10 |

---

## 6. OUTSTANDING ITEMS TO SEND TO EASYPAY

The following items must be sent to EasyPay to proceed with staging partner testing. Andre will send these via email to `Malusi@easypay.co.za` and `Razeen@easypay.co.za`:

### A. MMTP must provide to EasyPay:

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | V5 Receiver URLs (Staging partner-test + Production) | Ready | Staging partner-test: `https://staging.mymoolah.africa/billpayment/v1/`, Prod: `https://api-mm.mymoolah.africa/billpayment/v1/` |
| 2 | EasyPay API key / SessionToken for Staging partner-test | Needs creation | Production EasyPay API credential stored in GCP Secret Manager for the deployed staging service; share via secure channel |
| 3 | EasyPay API key / SessionToken for Production | Needs creation | Same production EasyPay API credential model, stored in GCP Secret Manager |
| 4 | ~50 test EasyPay PINs (CSV/XLSX) | Needs Task 4 | Script generates Bills in an explicit `uat` or `staging` DB target and outputs CSV/XLSX; use `--staging` for `staging.mymoolah.africa` |
| 5 | SFTP credentials for daily recon upload | Needs setup | Create `easypay` user on SFTP VM (`34.35.137.166`), share SSH public key exchange |
| 6 | Firewall allowlist for EP egress IPs | Waiting on EP | Need their egress IP CIDRs first |

### B. MMTP needs FROM EasyPay:

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Sample daily SFTP reconciliation file | NOT YET REQUESTED | Andre to ask — need column format, timezone, delimiter |
| 2 | Egress IP CIDRs (staging partner-test + production) | NOT YET REQUESTED | For Cloud Run / load balancer allowlisting |
| 3 | Confirmation of min/max deposit amounts | ANSWERED (meeting) | R50 min, R4000 max — matches our config |
| 4 | Cash handling fee confirmation | ANSWERED (meeting) | Variable per merchant; comes in SFTP recon file, not V5 payload |
| 5 | V5 = only route confirmation | ANSWERED (meeting) | Yes — legacy routes to be removed |
| 6 | Go-live date for staging partner testing | NOT YET REQUESTED | Ask when sharing credentials |

---

## 7. EASYPAY CONTACTS (from email history)

| Name | Email | Role |
|------|-------|------|
| Malusi Mbulwana-Barnard | Malusi@easypay.co.za | Technical lead (sent meeting invite, confirms scope) |
| Razeen Abrahams | Razeen@easypay.co.za | Technical (sent V5 message flow diagrams on 9 April) |
| Nkululeko Dladla | Nkululeko@easypay.co.za | Commercial / relationship (contract closure) |
| Tracy Pryce | Tracy@easypay.co.za | Legal / contracts (Adobe Sign) |
| Werner van Reenen | Werner@easypay.co.za | Senior management (co-signed agreement) |
| Theodore Smith | Theodore@easypay.co.za | Integration support (on leave until 2 Mar, may be back) |

---

## 8. EMAIL TIMELINE (key events)

| Date | Event | Thread |
|------|-------|--------|
| 19 Mar 2026 | Nkululeko raises legal concern about TPPP | `AGREEMENT: EASYPAY \| MYMOOLAH` |
| 23 Mar 2026 | Andre + Nkululeko call; legal resolution path agreed | Same thread |
| 24 Mar 2026 | Andre sends formal position to EP legal | Same thread |
| 7 Apr 2026 | Tracy sends updated Supplier Bill Payment Agreement for signature | Adobe Sign thread |
| 8 Apr 2026 | Agreement fully executed (Werner + Andre signed) | Adobe Sign completed |
| 8 Apr 2026 | Nkululeko confirms contract closed, hands to technical team | `MYMOOLAH"` thread |
| 9 Apr 2026 | Razeen sends V5 message flow diagrams (simple + all flows) | Same thread |
| 9 Apr 2026 | Malusi sends Teams meeting invite for 10 April 10:00 | `Bill Pay Message Flows` |
| 10 Apr 2026 | Meeting held — V5 confirmed as only route, fee model clarified | Verbal (outcomes in plan doc) |

---

## 9. V5 PAYLOAD QUICK REFERENCE

### InfoRequest (EP → MMTP)
```json
{ "EasyPayNumber": "95063XXXXXXXX" }
```
Response: `ResponseCode` 0=Allow, 1=InvalidAccount, 4=UnknownAPIkey, 5=AlreadyPaid + `correctAmount`, `minAmount`, `maxAmount`, `expiryDate`, `fields.customerName`, `echoData`

### AuthorisationRequest (EP → MMTP)
```json
{ "EasyPayNumber": "95063XXXXXXXX", "Amount": 10000 }
```
Response: `ResponseCode` 0=Allow, 1=InvalidAccount, 2=InvalidAmount, 3=Expired, 4=UnknownAPIkey + `ResponseMessage`, `Amount`, `expiryDate`, `echoData`

### PaymentNotification (EP → MMTP)
```json
{
  "MerchantId": "006008800085122",
  "TerminalId": "01180024",
  "PaymentDate": "2024-01-03 12:58:04",
  "Reference": "1d21e120ab82",
  "EasyPayNumber": "95063XXXXXXXX",
  "AccountNumber": "XXXXXXXX",
  "Amount": 10000,
  "EchoData": "pipe|delimited|opaque|string"
}
```
Response: `{ "EchoData": "...exactly as received..." }` — **receiver cannot decline**

**All amounts in cents. Amount is GROSS (what customer paid). No fee/net/handling fields in V5.**

---

## 10. KNOWN RISKS AND GOTCHAS

| Risk | Detail | Mitigation |
|------|--------|------------|
| Amount type mismatch | V5 spec says `type: number` — could be float or string | Use `parseFloat()` not `parseInt()` |
| AccountNumber length | EP examples show 13 digits; our code does `substring(5,13)` for 8 | Use `EasyPayNumber` for DB lookup (primary key), not `AccountNumber` |
| Legacy route unauthenticated | `POST /easypay/settlement` has NO `easypayAuthMiddleware` | Remove in Task 3 — security risk |
| Dual settlement models | `processEasyPaySettlement` uses different fee logic than V5 `paymentNotification` | Remove legacy in Task 3; V5 is authoritative |
| JE failure after wallet credit | `easyPayController.paymentNotification` credits wallet, then posts JEs — if JE fails, ledger drifts | Already logged as `jeError`; consider wrapping in Sequelize transaction |
| SFTP recon file format unknown | Can't build parser until sample file received | Ask EP; build parser after receiving |
| Cash handling cost not in V5 | Float balance overstated intraday until recon JE3 | Acceptable per Andre |

---

## 11. FILES MAP (complete)

### Code files to modify
| File | Change | Task |
|------|--------|------|
| `services/easyPayDepositService.js` | Remove handling %, add `postCashHandlingCost()` | Task 2 |
| `controllers/voucherController.js` | Remove `processEasyPaySettlement` function | Task 3 |
| `routes/vouchers.js` | Remove legacy settlement routes | Task 3 |

### Code files — NO changes needed
| File | Role |
|------|------|
| `controllers/easyPayController.js` | V5 receiver (minor: defensive Amount parsing optional) |
| `routes/easypay.js` | V5 routes with auth |
| `middleware/easypayAuth.js` | SessionToken auth |
| `utils/easyPayUtils.js` | PIN generation |
| `models/Bill.js` | Bill model |
| `services/ussdMenuService.js` | USSD top-up flow |

### New files to create
| File | Purpose | Task |
|------|---------|------|
| `migrations/20260410_01_create_easypay_cash_handling_account.js` | Seed `5000-10-02` ledger account | Task 1 |
| `scripts/generate-easypay-test-pins.js` | Generate 50 test Bills + CSV/XLSX for explicit `uat` or `staging` target | Task 4 |
| `docs/integrations/EASYPAY_UAT_CREDENTIALS_EMAIL_DRAFT.md` | Email template for EP | Task 5 |
| `docs/integrations/easypay_test_pins.csv` / `.xlsx` | Test data output | Task 4 |

### Documentation to update
| File | What to update | Task |
|------|---------------|------|
| `docs/CHART_OF_ACCOUNTS.md` | Section 3.1 JE pattern, Section 2.5 new account, Section 7+8 | Tasks 1, 6 |
| `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md` | Mark sections ANSWERED | Task 6 |
| `docs/integrations/EasyPay_API_Integration_Guide.md` | Remove/mark legacy settlement | Task 6 |
| `docs/API_DOCUMENTATION.md` | Remove/mark legacy endpoints | Task 6 |
| `docs/CHANGELOG.md` | Add v2.95.0 entry | Task 6 |
| `docs/AGENT_HANDOVER.md` | Update status, version, session ref | Task 6 |
| `config/supplier-commissions.json` | Update EASYPAY note | Task 6 |
| `env.template` | Remove deprecated vars, add new | Tasks 2, 6 |

### Reference files (read-only)
| File | Role |
|------|------|
| `integrations/easypay/EasypayReceiverV5.yaml` | Official V5 OpenAPI spec |
| `integrations/easypay/EasyPay BillPayment Receiver API.postman_collection.json` | Postman collection (share with EP) |
| `docs/EASYPAY_V5_FINALISATION_PLAN.md` | Detailed task specifications |

---

## 12. GMAIL MCP — EASYPAY EMAIL ACCESS

The Gmail MCP is configured and authenticated. Use it to:
- Search: `{"query": {"rawGmailQuery": "from:easypay.co.za newer_than:7d"}, "maxResults": 10}`
- Read: `{"id": "MESSAGE_ID", "contentType": "text"}` (note: EP Outlook emails often return empty body — use `snippet`)
- Send: avoid Unicode in subject lines (use plain hyphens, not em dashes)

**Key thread IDs** (for context):
- `19d6d9ef507a5d3f` — Contract closure + technical handover (Nkululeko → Malusi/Razeen)
- `19d71569b744c780` — Bill Pay Message Flows (meeting invite from Malusi)
- `19d04b1224d7f87f` — Original agreement/legal thread (Nkululeko, Werner, Tracy)

**Email signature template**: `config/email-signature.html` — append to outbound emails

---

## 13. TESTING COMMANDS (for Andre in Codespaces)

After implementation, tell Andre to run:
```bash
git pull origin main
cd mymoolah-wallet-frontend && npm run build && cd ..
./scripts/one-click-restart-and-start.sh
```

For migrations:
```bash
./scripts/run-migrations-master.sh uat
./scripts/run-migrations-master.sh staging
./scripts/run-migrations-master.sh production
```

---

## 14. SKILLS TO USE

| Task | Skill |
|------|-------|
| Migration creation | `.agents/skills/safe-database-migrations/SKILL.md` |
| CoA / ledger work | `.agents/skills/auditing/SKILL.md` |
| Test data script | `.agents/skills/fintech-test-driven-development/SKILL.md` |
| API changes | `.agents/skills/api-design-principles/SKILL.md` |

---

## 15. SUBAGENT STRATEGY

Use parallel subagents for independent tasks:

```
Main agent orchestrates:
 ├── Subagent A: Task 1 (migration + CoA docs) — read auditing SKILL, create migration
 ├── Subagent B: Task 3 (remove legacy routes) — read voucherController + vouchers route, delete code
 └── Main agent: Tasks 2, 4, 5, 6 sequentially after A+B complete
```

Each subagent should read only the files it needs (3-5 max). Do NOT load the full codebase.
