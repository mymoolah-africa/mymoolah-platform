# EasyPay — Partner Q&A checklist (Bill Payment Receiver V5)

**Purpose**: Single document to take into the EasyPay (Lesaka) meeting and to drive post-meeting configuration and engineering.  
**Audience**: MyMoolah (MMTP) integration + EasyPay technical/commercial contacts.  
**Canonical integration spec (receiver)**: `integrations/easypay/EasypayReceiverV5.yaml`  
**Last updated**: 2026-04-10

---

## Executive summary (for EasyPay)

MyMoolah **Phase 1 — Top-up @ EasyPay (cash-in)** is implemented on **EasyPay’s official Bill Payment Receiver V5** protocol. MMTP **generates** the **14-digit bill number** (PIN); the user pays cash at retail; EasyPay’s switch calls MMTP **`/billpayment/v1/*`** (`infoRequest` → `authorisationRequest` → `paymentNotification`). MMTP credits the user wallet on **`paymentNotification`** and accounts for pass-through fees in the ledger.

**Open items** below are the remaining **commercial, payload, settlement, and credential** details needed to declare V5 integration **fully finalised** (reconciliation automation + exact user-facing fee copy).

---

## A. Protocol and product scope

| # | Question | Why it matters |
|---|----------|----------------|
| A1 | Confirm that **wallet top-up (cash-in)** for receiver **5063** (or agreed receiver ID) uses **only** the **V5 BillPayment Receiver** callbacks to MMTP, not a parallel proprietary settlement POST to `/api/v1/vouchers/easypay/topup/settlement`. | Avoids duplicate or conflicting settlement paths; aligns docs and ops. |
| A2 | Confirm **MMTP always issues** the **14-digit** number; EasyPay does **not** replace it with a different PIN for this product. | Matches current `generateEasyPayNumber()` + `Bill` / `Voucher` model. |
| A3 | Confirm **amount** in **`paymentNotification`** is the **gross** amount the customer paid at the terminal (in **cents** per V5), and whether any fields carry **fee**, **net**, or **VAT** breakdown. | MMTP currently **recalculates** fee via `easyPayDepositService.calculateEasyPayFee()` from env; if EP provides authoritative fee/net, we should align. |
| A4 | Confirm **min/max** cash top-up amounts for this product (MMTP currently enforces **R50–R4000** on API; USSD uses a fixed menu within that range). | Contract vs app limits. |

---

## B. Fees and VAT (pass-through)

| # | Question | Why it matters |
|---|----------|----------------|
| B1 | Exact **cash handling** percentage for **cash deposit** top-ups (deal sheet range **0.20%–0.50%**). | Sets `EASYPAY_TOPUP_CASH_HANDLING_PCT` in Secret Manager / env. |
| B2 | Confirm **R5.50 excl. VAT** fixed fee per transaction for this product (or updated figure). | Sets `EASYPAY_TOPUP_FIXED_FEE_EXCL_VAT` (cents). |
| B3 | Confirm **15% VAT** applies on the **fee excl. VAT** only (not on gross deposit). | Matches current formula in `easyPayDepositService.js`; confirm with EP. |
| B4 | Will EasyPay provide a **fee breakdown** on statements or settlement files that matches what the terminal charged? | Audit and user dispute handling. |

---

## C. Settlement and reconciliation (T+2)

| # | Question | Why it matters |
|---|----------|----------------|
| C1 | Exact **bank statement reference / narrative** format for credits to MMTP’s Standard Bank account (**T+2 business days**, single daily batch as agreed). | Auto-match to ledger account **1200-10-02** (EasyPay Top-up Float). |
| C2 | ~~Does EasyPay provide a daily settlement / reconciliation file?~~ **ANSWERED (Apr 2026)**: Yes — **SOF (Statement of Funds)** file delivered via SFTP. Format: `easy[receiverId].[sequence]` (e.g., `easy2138.148`). Record types: SOF/X/P/T + footer. Key fields: `ep_txn_ref` (X.5), `easypay_code` (P.3), `gross_amount` (P.1), `fee` (P.2), `vat` (T.2). Adapter built: `EasyPayAdapter.js`. | ✅ Implemented. |
| C3 | **Batching**: one transfer per day vs multiple; **currency**; **value date** rules. | Cash flow and float monitoring. |

---

## D. Security, credentials, and SLAs

| # | Question | Why it matters |
|---|----------|----------------|
| D1 | **UAT** and **production** values for **`SessionToken`** (or agreed auth): how issued, rotated, and communicated. MMTP expects **`Authorization: SessionToken {token}`** matching `EASYPAY_API_KEY` (see `middleware/easypayAuth.js`). | Live V5 calls must authenticate. |
| D2 | ~~**IP allowlisting**~~ **ANSWERED (Apr 2026)**: EasyPay public IP is **`20.164.206.68`** (provided by Razeen). GCP firewall rule needed: `allow-easypay-sftp` on `tcp:5022` from `20.164.206.68/32` with tag `sftp-1-deployment`. | ✅ IP received — firewall rule pending. |
| D3 | **Timeout / retry** expectations on `infoRequest`, `authorisationRequest`, `paymentNotification` (EP side and MMTP side). | Capacity and alerting. |
| D4 | **Ping / health**: use of `GET /billpayment/v1/ping` for monitoring (no auth). | Ops runbooks. |

**MMTP public V5 base paths** (same router):

- `https://{host}/billpayment/v1/` — per `EasypayReceiverV5.yaml`
- `https://{host}/api/v1/easypay/` — alias mount in `server.js`

---

## E. Legacy MMTP endpoints (clarity)

| # | Question | Why it matters |
|---|----------|----------------|
| E1 | Is **`POST /api/v1/vouchers/easypay/topup/settlement`** still required for **any** EasyPay flow, or is it **legacy / internal-only**? If legacy, can EasyPay document **V5-only** for Phase 1 cash-in? | Reduces partner confusion; safe deprecation later. |

---

## F. After the meeting — MMTP engineering checklist

Use EasyPay’s written answers to close these out:

- [x] Update **Secret Manager / env**: done (`EASYPAY_TOPUP_CASH_HANDLING_PCT` removed, `LEDGER_ACCOUNT_EASYPAY_CASH_HANDLING=5000-10-02` added).
- [x] **Fee model**: confirmed flat R5.50 + VAT = R6.33; cash handling is variable, from SFTP recon file, MMTP absorbs.
- [ ] If **authoritative fee/net** appears in V5 payload: adjust **`paymentNotification`** in `controllers/easyPayController.js` and **`easyPayDepositService.js`** to use EP values (with fallbacks and audit logging).
- [ ] **Frontend / USSD copy**: align estimated fee text with confirmed formula and min/max.
- [x] **Reconciliation**: SOF format confirmed — `EasyPayAdapter.js` rewritten to parse SOF/X/P/T format. Migration `20260413_04` updates DB config. Sample file `easy2138.148` received from Razeen.
- [ ] **Docs**: mark this checklist **Complete** with date + link to EP email/PDF; bump `EasyPay_API_Integration_Guide.md` version.
- [x] **Legacy route**: E1 confirmed V5-only; legacy settlement routes removed 2026-04-10.

---

## Related MMTP documentation

| Document | Role |
|----------|------|
| `docs/integrations/EasyPay_API_Integration_Guide.md` | Partner-facing API and process guide (includes V5 summary + link here). |
| `docs/CHART_OF_ACCOUNTS.md` §3.1 | EasyPay cash-in 2-JE pattern + T+2 bank settlement. |
| `docs/session_logs/2026-04-09_2200_easypay-v5-implementation.md` | Implementation session context. |
| `middleware/easypayAuth.js` | SessionToken / X-API-Key / UAT Bearer behaviour. |
| `services/easyPayDepositService.js` | Fee formula and 2-JE posting. |

---

**Contact (MMTP)**: integrations / support as listed in `EasyPay_API_Integration_Guide.md`.
