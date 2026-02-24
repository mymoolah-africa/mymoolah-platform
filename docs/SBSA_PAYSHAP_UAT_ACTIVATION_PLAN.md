# SBSA PayShap UAT Activation Plan

**Date**: 2026-02-23  
**Status**: Ready for activation – credentials received  
**Purpose**: Activate PayShap servers in UAT (backend + frontend) and seed 7 test payer accounts for RTP

> ⚠️ **Security**: Credentials below must be stored in `.env` or Codespaces Secrets. Do NOT commit real values to git. Remove or redact before pushing if this file is tracked.

---

## 1. Implementation Plan Summary (Memorized)

### Architecture
- **RPP (Send Money)**: Wallet → third-party bank account. User debits principal + R4 fee.
- **RTP (Request Money)**: Request sent to payer's bank. When Paid, wallet credits principal − R4 fee.
- **Deposit Notification**: SBSA POSTs to `/notification` when deposit hits MM SBSA main account; reference = MSISDN → wallet to credit.
- **Ledger**: Uses `LEDGER_ACCOUNT_BANK` (1100-01-01); no prefunded float.

### Backend
- **Routes**: `/api/v1/standardbank/payshap/rpp`, `/payshap/rtp`, `/notification`, callbacks
- **Proxy**: When `STANDARDBANK_PAYSHAP_ENABLED=true` and Peach archived, `POST /api/v1/peach/request-money` → `standardbankController.initiatePayShapRtp`
- **Frontend**: Calls `/api/v1/peach/request-money` (no change); backend proxies to Standard Bank

### UAT Sandbox Behaviour
| Flow | Behaviour |
|------|-----------|
| **RPP** | ~90% success; account ending in **4** always fails |
| **RTP** | Creditor account last digit: 1=Exception, 2/3=Presented (~2 min), 4=Rejected, 5=Cancelled, 6=Declined, 7=Received |

### Callback URLs (whitelist in OneHub)
- `https://staging.mymoolah.africa/api/v1/standardbank/notification`
- `https://staging.mymoolah.africa/api/v1/standardbank/callback`
- `https://staging.mymoolah.africa/api/v1/standardbank/realtime-callback`
- `https://staging.mymoolah.africa/api/v1/standardbank/rtp-callback`
- `https://staging.mymoolah.africa/api/v1/standardbank/rtp-realtime-callback`

---

## 2. UAT Credentials (Incorporate into .env / Codespaces Secrets)

**Store in `.env` or Codespaces Secrets. Do NOT commit to git.**

| Variable | Value |
|----------|-------|
| `SBSA_PING_CLIENT_ID` | `a5370231-aa5f-4c33-b313-6c8e03271c28` |
| `SBSA_PING_CLIENT_SECRET` | `S3cr3t-311de-fd25d` |
| `SBSA_IBM_CLIENT_ID` | `a98f3c8dd655b4f3b27c1c02ec495b08` |
| `SBSA_IBM_CLIENT_SECRET` | `1fbd5009d748e31e08620f9ef29df524` |
| `SBSA_CALLBACK_SECRET` | `srBFXm0JiGVX27iJI9IJtjusMJaxl8puLYPZ3aZvMWM=` |

---

## 3. Seven Test Payer Accounts (RTP UAT)

These accounts are for RTP testing. Last digit drives sandbox outcome per table above.

| # | Account Number | Last Digit | Expected Outcome |
|---|----------------|------------|------------------|
| 1 | 000602739172 | 2 | Presented (~2 min; 75% Paid, 25% Cancel/Decline) |
| 2 | 000602739174 | 4 | Rejected |
| 3 | 000602739178 | 8 | (check SBSA spec) |
| 4 | 000602739177 | 7 | Received |
| 5 | 000602739173 | 3 | Presented (~2 min) |
| 6 | 000602739176 | 6 | Declined |
| 7 | 000602739175 | 5 | Cancelled |

**Bank**: Standard Bank (code `051001`) – SBSA UAT test accounts.

---

## 4. Activation Checklist

### Backend (Codespaces UAT)

1. **Set environment variables** in Codespaces Secrets or `.env`:
   ```bash
   STANDARDBANK_PAYSHAP_ENABLED=true
   STANDARDBANK_ENVIRONMENT=uat
   PEACH_INTEGRATION_ARCHIVED=true

   SBSA_PING_TOKEN_URL=https://enterprisestssit.standardbank.co.za/as/token.oauth2
   SBSA_PING_CLIENT_ID=<from section 2>
   SBSA_PING_CLIENT_SECRET=<from section 2>
   SBSA_IBM_CLIENT_ID=<from section 2>
   SBSA_IBM_CLIENT_SECRET=<from section 2>
   SBSA_CALLBACK_SECRET=<from section 2>
   SBSA_CALLBACK_BASE_URL=https://staging.mymoolah.africa

   SBSA_RPP_BASE_URL=https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/rapid-payments
   SBSA_RTP_BASE_URL=https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/request-to-pay
   ```

2. **Run migrations**:
   ```bash
   ./scripts/run-migrations-master.sh uat
   ```

3. **Restart backend** after env changes.

### Frontend

- No code changes required. Request Money page already:
  - Calls `/api/v1/peach/request-money` (proxied to Standard Bank when enabled)
  - Accepts `payerAccountNumber`, `payerBankName` for bank RTP
  - Uses PayShap banks list (Standard Bank included)

### Seven Test Payers in Frontend

**Current behaviour**: User manually enters payer account + bank. "Recent payers" only shows MyMoolah wallet payers (from `PaymentRequest`).

**Options to make 7 test accounts available**:
1. **Seed script**: Create a seed that inserts "preset payers" or extends `listRecentPayers` to include bank RTP payers from `StandardBankRtpRequest`.
2. **UAT preset list**: Add a config-driven list of UAT test payers (account + bank) shown when `STANDARDBANK_ENVIRONMENT=uat` or similar flag.
3. **Manual entry**: Users type the 7 account numbers when testing (quick reference doc).

**Recommended**: Create `scripts/seed-sbsa-uat-test-payers.js` that seeds the 7 accounts into a new table or extends an existing "saved payers" / "preset payers" feature, and wire the Request Money UI to show them when in UAT.

---

## 5. Verification Steps

- [ ] Ping token retrieval works (`node -e "require('./integrations/standardbank/pingAuthService').getToken().then(t=>console.log('OK',!!t)).catch(e=>console.error(e))"`)
- [ ] RPP initiation returns 202 (use account NOT ending in 4)
- [ ] RTP initiation returns 202 (use any of 7 test accounts)
- [ ] Callbacks received and hash validated
- [ ] RPP: Wallet debited principal + fee; transaction created
- [ ] RTP: Request created; Paid callback credits wallet (principal − fee)
- [ ] Sandbox scenarios: test accounts 2, 4, 5, 6, 7 for Rejected, Received, Presented, Declined, Cancelled

---

## 6. Related Docs

- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` – Full UAT guide
- `docs/integrations/StandardBankPayShap.md` – Architecture
- `docs/session_logs/2026-02-12_1200_sbsa-payshap-uat-implementation.md` – Implementation session
