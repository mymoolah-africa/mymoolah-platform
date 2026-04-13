# EasyPay V5 Finalisation Plan — Implementation Brief for Next Agent

**Created**: 2026-04-10  
**Author**: André (product owner) + Claude planning agent  
**Status**: APPROVED — ready for implementation  
**Prerequisite reading**: `docs/CURSOR_2.0_RULES_FINAL.md`, `docs/AGENT_HANDOVER.md`, this file  
**V5 spec**: `integrations/easypay/EasypayReceiverV5.yaml`  
**Postman collection**: `integrations/easypay/EasyPay BillPayment Receiver API.postman_collection.json`  
**Partner Q&A (closed items)**: `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md`

---

## Context (read first)

EasyPay confirmed in the 10 April meeting:

1. **V5 BillPayment Receiver is the only route** for Phase 1 cash-in. The legacy settlement routes (`/api/v1/vouchers/easypay/topup/settlement` and `/api/v1/vouchers/easypay/settlement`) were built on MMTP's own assumptions and are NOT used by EasyPay's switch. **Remove them.**
2. **Cash handling fee is variable** — depends on the merchant's acquiring bank and payment method. The exact rate per transaction will be in the **daily SFTP reconciliation file** EasyPay sends. It is NOT in the V5 payload.
3. **MMTP absorbs the cash handling cost** as a cost of revenue initially. The user pays a flat **R5.50 excl VAT** fee only. After accumulating data on actual handling costs, André will decide whether to adjust the user-facing fee.
4. **SFTP credentials**: MMTP gives EasyPay access to our existing SFTP (`34.35.137.166`). EasyPay uploads daily recon files. **Ask EasyPay for a sample file** to confirm column mapping.
5. **Test data**: MMTP must pre-generate ~50 EasyPay PINs (Bills + Vouchers) covering all V5 response scenarios so EasyPay can test their switch against our receiver.

---

## V5 payload reference (from `EasypayReceiverV5.yaml`)

### PaymentNotification (what EasyPay sends when payment is taken at POS)

```json
{
  "MerchantId": "006008800085122",
  "TerminalId": "01180024",
  "PaymentDate": "2024-01-03 12:58:04",
  "Reference": "1d21e120ab82",
  "EasyPayNumber": "9506312345678X",
  "AccountNumber": "12345678",
  "Amount": 15000,
  "EchoData": "000000000000002|00000001|20210430|185248|6|9202117470005030000"
}
```

**Critical**: `Amount` is **always gross in cents** (what the customer paid). V5 has **no fee, net, or handling fields**. The handling cost is only known from the SFTP settlement file.

### PaymentResponse (what MMTP must return)

```json
{ "EchoData": "...exactly as received..." }
```

**Receiver cannot decline a valid PaymentNotification.** Just echo back `EchoData`.

### InfoResponse (what MMTP returns on infoRequest)

```json
{
  "ResponseCode": "0",
  "correctAmount": 10000,
  "minAmount": 5000,
  "maxAmount": 400000,
  "expiryDate": "2026-04-15",
  "fields": { "customerName": "John Doe" },
  "echoData": "..."
}
```

All amounts in **cents**. `ResponseCode`: 0=Allow, 1=InvalidAccount, 4=UnknownAPIkey, 5=AlreadyPaid.

### AuthorisationResponse

```json
{
  "ResponseCode": "0",
  "ResponseMessage": "Allow payment",
  "Amount": 10000,
  "expiryDate": "2026-04-15",
  "echoData": "..."
}
```

`ResponseCode`: 0=Allow, 1=InvalidAccount, 2=InvalidAmount, 3=ExpiredPayment, 4=UnknownAPIkey.

---

## Task 1: New CoA account — `5000-10-02` EasyPay Cash Handling Fee

**Best banking practice rationale**: The cash handling cost is a direct cost of the deposit service, not a commission, not a general operating expense. It sits alongside `5000-10-01` (Cost of Sales: PayShap SBSA Fee) which is the exact same concept — a variable third-party cost that MMTP absorbs. Using the same account class (5000-10-xx) maintains consistency and gives P&L visibility separate from user-facing fees.

### Changes

1. **Migration** `20260410_01_create_easypay_cash_handling_account.js`:
   - Seed `ledger_accounts` row: code `5000-10-02`, name `Cost of Sales: EasyPay Cash Handling Fee`, type `expense`, normal side `debit`
   - `down()`: remove account

2. **`docs/CHART_OF_ACCOUNTS.md`**:
   - Section 2.5 (Expenses): add row for `5000-10-02`
   - Section 7 (Reserved ranges): update `5000-10-xx` to note `02` allocated
   - Section 8 (Env var map): add `LEDGER_ACCOUNT_EASYPAY_CASH_HANDLING` → `5000-10-02`

3. **`env.template`**: add `LEDGER_ACCOUNT_EASYPAY_CASH_HANDLING=5000-10-02`

---

## Task 2: Change fee model — user pays R5.50 + VAT only; MMTP absorbs handling

### Current state (wrong)

`easyPayDepositService.calculateEasyPayFee()` computes: `R5.50 + (gross × 0.3%) + 15% VAT on total` → user pays R6.67 on R100.

### Target state

User pays: **R5.50 + 15% VAT on R5.50 = R6.33** (flat, regardless of amount).  
MMTP cost (handling): **variable, known only from SFTP recon file — posted later**.  
At `paymentNotification` time: only the R6.33 user fee is charged.

### Changes

1. **`services/easyPayDepositService.js`**:
   - `calculateEasyPayFee()`: remove `handlingPct` term. Formula becomes:
     ```
     feeExclVat = fixedFee (R5.50)
     vat = feeExclVat × 0.15
     totalFee = feeExclVat + vat
     netAmount = grossAmount - totalFee
     ```
   - Remove `EASYPAY_TOPUP_CASH_HANDLING_PCT` usage (it's no longer a realtime fee component)
   - Add a new exported function `postCashHandlingCost({ reference, amount })` for the recon job to call later:
     ```
     DR  5000-10-02  CoS: EasyPay Cash Handling    R{amount}
     CR  1200-10-02  EasyPay Top-up Float           R{amount}
     ```
     This reduces the float receivable to match what EasyPay actually settles.

2. **`controllers/easyPayController.js` `paymentNotification`**: no structural change — it already calls `calculateEasyPayFee()` which will now return the flat R6.33 total.

3. **JE pattern becomes 2 JEs at payment time + 1 JE at recon time**:

   **At `paymentNotification` (realtime):**
   - JE1: DR `1200-10-02` / CR `2100-01-01` — gross face value
   - JE2: DR `2100-01-01` / CR `1200-10-02` — user fee (R6.33)

   **At recon (batch, after SFTP file):**
   - JE3: DR `5000-10-02` / CR `1200-10-02` — cash handling cost per transaction

   **At T+2 bank settlement:**
   - JE4: DR `1100-01-01` / CR `1200-10-02` — bank credit (net of all fees)

4. **`env.template`**: remove `EASYPAY_TOPUP_CASH_HANDLING_PCT` line (or comment it out with "deprecated" note). Keep `EASYPAY_TOPUP_FIXED_FEE_EXCL_VAT=550`.

5. **Frontend / USSD copy**: update any fee text that mentions "handling fee" to just say "R5.50 + VAT" or "R6.33 transaction fee".

---

## Task 3: Remove legacy settlement routes

### Files to change

1. **`routes/vouchers.js`**:
   - Remove: `router.post('/easypay/topup/settlement', ...)` (line ~18)
   - Remove: `router.post('/easypay/settlement', ...)` (line ~47)
   - Keep: `router.post('/easypay/issue', ...)` — this is the PIN issuance endpoint (used by app + USSD), NOT a settlement route

2. **`controllers/voucherController.js`**:
   - Remove or comment out: `processEasyPayTopupSettlement` function (~lines 1220-1400)
   - Remove or comment out: `processEasyPaySettlement` function
   - Keep: `issueEasyPayVoucher` (PIN issuance)

3. **`docs/integrations/EasyPay_API_Integration_Guide.md`**:
   - Section 4.1: remove the legacy settlement endpoint documentation OR clearly mark as "REMOVED — V5 only"
   - Section 2.3 (Quick Test curls): remove the `topup/settlement` curl examples

4. **`docs/API_DOCUMENTATION.md`**:
   - Remove or mark the legacy settlement endpoint section

5. **`tests/easypay-webhook.test.js`**: update to test V5 endpoints instead of legacy settlement

---

## Task 4: Generate ~50 test PINs for EasyPay UAT

Create a script `scripts/generate-easypay-test-pins.js` that:

1. Uses `scripts/db-connection-helper.js` (`getUATClient()`)
2. Generates 50 Bills + Vouchers across these scenarios:

| Scenario | Count | Bill status | Amount (cents) | Notes |
|----------|-------|-------------|----------------|-------|
| Happy path — various amounts | 10 | `pending` | 5000, 10000, 15000, 20000, 25000, 30000, 50000, 100000, 200000, 400000 | Full V5 flow should succeed |
| Already paid | 5 | `paid` | 10000 | `infoRequest` → ResponseCode 5 |
| Expired (past dueDate) | 5 | `pending` | 10000 | `authorisationRequest` → ResponseCode 3 |
| Cancelled | 3 | `cancelled` | 10000 | `infoRequest` → ResponseCode 3 (expired/cancelled) |
| Different user (multiple PINs) | 5 | `pending` | 5000–50000 | Verify per-PIN wallet credit |
| Boundary: min R50 | 3 | `pending` | 5000 | R50 minimum |
| Boundary: max R4000 | 3 | `pending` | 400000 | R4000 maximum |
| Amount mismatch test | 5 | `pending` | 10000 (min=max=10000) | `authorisationRequest` with wrong amount → ResponseCode 2 |
| USSD-issued | 3 | `pending` | 10000, 20000, 50000 | metadata.channel = 'ussd' |
| No userId (orphan) | 3 | `pending`, userId=null | 10000 | `paymentNotification` → logs error, returns EchoData |
| **Invalid PIN format** | 5 | N/A (not in DB) | N/A | EasyPay sends bad PINs; `infoRequest` → ResponseCode 1 |

3. Output a **CSV** file `docs/integrations/easypay_test_pins.csv` with columns: `PIN, Amount_Cents, Amount_Rands, Scenario, Expected_InfoResponse, Expected_AuthResponse, Expected_PaymentResponse, Bill_Status, User_ID`
4. Assign test PINs to user ID 1 (André) except for the "different user" and "no userId" scenarios

**Important**: Use `generateEasyPayNumber()` from `utils/easyPayUtils.js` for PIN generation. All Bills need `userId` set (except orphan scenario).

---

## Task 5: SFTP credentials delivery to EasyPay

Draft an email (save as `docs/integrations/EASYPAY_UAT_CREDENTIALS_EMAIL_DRAFT.md`) containing:

1. **V5 Receiver URLs**:
   - UAT: `https://staging.mymoolah.africa/billpayment/v1/`
   - Production: `https://api-mm.mymoolah.africa/billpayment/v1/`

2. **Authentication**: `Authorization: SessionToken {token}` — token value to be shared via secure channel (Signal / encrypted email)

3. **SFTP for daily recon files**:
   - Host: `34.35.137.166`, Port: 5022, User: `easypay`
   - Auth: SSH public key (ask EP for their public key)
   - Upload directory: `/home/easypay/` (mapped to GCS bucket)

4. **Test data**: attached CSV of ~50 PINs with expected outcomes

5. **Request from EasyPay**:
   - Their egress IP CIDRs for firewall allowlisting
   - A sample daily settlement/recon file (format, columns, timezone)
   - Confirmation of go-live date for UAT testing

---

## Task 6: Update documentation

1. **`docs/CHART_OF_ACCOUNTS.md`** §3.1: update the JE template to show:
   - 2 JEs at payment time (user fee = flat R6.33)
   - JE3 at recon time (cash handling cost)
   - JE4 at T+2 settlement
   - Remove the handling % from the example

2. **`docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md`**: mark sections A1, B1–B3, E1 as ANSWERED. Update §F checklist with completion dates.

3. **`docs/AGENT_HANDOVER.md`**: update status, version, session log ref

4. **`docs/CHANGELOG.md`**: add v2.95.0 entry

5. **`config/supplier-commissions.json`**: update EASYPAY.topup note to reflect "flat R5.50 + VAT; no handling % charged to user"

6. **`env.template`**: clean up deprecated vars, add new `LEDGER_ACCOUNT_EASYPAY_CASH_HANDLING`

---

## Execution order (suggested)

1. **Task 1** — CoA account (migration + docs) — no code dependency
2. **Task 2** — Fee model change (easyPayDepositService + env) — depends on Task 1 for account code
3. **Task 3** — Remove legacy routes (dead code removal) — independent
4. **Task 4** — Test data script — depends on Tasks 1-2 for correct fee model
5. **Task 5** — Email draft — depends on Task 4 for CSV
6. **Task 6** — Documentation sweep — do last, captures all changes

Tasks 1, 3 can run in parallel. Tasks 2, 4, 5 are sequential. Task 6 is final.

---

## V5 spec observations for implementation accuracy

From `EasypayReceiverV5.yaml` sweep:

1. **`Amount` in paymentNotification is `type: number`** (not integer) — current code does `parseInt()` on auth but uses raw on notification. Both should handle decimal cents safely.
2. **`EasyPayNumber` example in spec is 19 digits** (`9202117470005030074`) — our PINs are 14 digits. This is fine per EP confirmation (receiver defines length). But the `AccountNumber` field may be longer than 8 chars in EP's example (`1747000503007` = 13 digits). Our code extracts `substring(5, 13)` for 8 digits. Verify EP sends our exact format back or be defensive.
3. **`InfoRequest` has no `Amount` field** — it only asks for bill info. Amount is only in `authorisationRequest` and `paymentNotification`.
4. **`AuthorisationResponse` requires `Amount` (integer, cents)** and `expiryDate` — current code provides both. Good.
5. **`PaymentResponse` only requires `EchoData`** — receiver cannot decline. Current code returns `{ EchoData }`. Good.
6. **Security scheme**: `Authorization` header, `apiKey` type. Our middleware handles `SessionToken {token}` format which matches the spec description: `"SessionToken abcde12345"`.
7. **Postman collection** uses `{{baseUrl}}` variable and `{{apiKey}}` for auth. We should set these in the Postman env when sharing with EP.
8. **`EchoData` is pipe-delimited** in examples: `000000000000002|00000001|20210430|185248|6|9202117470005030000`. Our code treats it as opaque string — correct.

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| EP sends `Amount` as string instead of number | Use `parseFloat()` with fallback, not `parseInt()` |
| EP `AccountNumber` length differs from our 8-digit assumption | Use `EasyPayNumber` for lookup (primary key), not `AccountNumber` |
| SFTP recon file format unknown | Ask for sample file; build parser after receiving it |
| Cash handling cost unknown until recon file arrives | JE3 posted in batch after file; float balance may be slightly overstated intraday (acceptable) |
| Legacy routes still called by internal simulate button | Update simulate button to call V5 endpoints instead |

---

## Files map (for next agent quick reference)

| File | What's there | What to change |
|------|-------------|----------------|
| `controllers/easyPayController.js` | V5 handler (info, auth, payment) | Minor: defensive Amount parsing |
| `services/easyPayDepositService.js` | Fee calc + 2-JE posting | Task 2: remove handling %, add `postCashHandlingCost()` |
| `controllers/voucherController.js` | `issueEasyPayVoucher` + legacy settlement | Task 3: remove legacy settlement functions |
| `routes/vouchers.js` | Legacy settlement routes + issue route | Task 3: remove settlement routes |
| `routes/easypay.js` | V5 routes (ping, info, auth, notification) | No change |
| `middleware/easypayAuth.js` | SessionToken auth | No change |
| `utils/easyPayUtils.js` | PIN generation, validation | No change |
| `models/Bill.js` | Bill model with userId | No change |
| `services/ussdMenuService.js` | USSD top-up at retail flow | Minor: fee text if shown |
| `docs/CHART_OF_ACCOUNTS.md` | CoA + JE templates | Task 1 + Task 6 |
| `docs/integrations/EasyPay_API_Integration_Guide.md` | Partner guide v1.1.0 | Task 6 |
| `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md` | Meeting Q&A | Task 6: mark answered |
| `config/supplier-commissions.json` | EASYPAY entry | Task 6: update note |
| `env.template` | Fee env vars | Task 2 + Task 6 |
| `integrations/easypay/EasypayReceiverV5.yaml` | Official V5 OpenAPI spec | No change (reference only) |
| `integrations/easypay/EasyPay BillPayment Receiver API.postman_collection.json` | Postman collection | No change (share with EP) |
