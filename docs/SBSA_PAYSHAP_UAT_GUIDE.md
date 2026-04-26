# SBSA PayShap UAT Guide

**Date**: 2026-02-12 (updated 2026-03-11)  
**Status**: ✅ **Production live on Staging** — proxy-first RTP + PBAC fallback deployed  

---

## Fee Structure

| Flow | Principal | MM Fee | User wallet effect |
|------|-----------|--------|--------------------|
| **RPP** (outbound) | R100 sent | R4 charged | Debit R104 (principal + fee) |
| **RTP** (inbound) | R200 received | R4 deducted | Credit R196 (principal − fee) |

- **RPP response**: `amount`, `fee`, `totalDebit`, `currency`
- **RTP response**: `amount`, `fee`, `netCredit`, `currency`, `expiresAt`
- Env: `PAYSHAP_FEE_MM_ZAR=4`, `PAYSHAP_FEE_SBSA_ZAR=3` (SBSA cost recorded when settled)

---

## Prerequisites

1. **OneHub access** from Standard Bank CIB
2. **API user** created in Rapid Payments portal with:
   - Client ID (Ping)
   - Client Secret (for HMAC callback validation)
   - IBM Client ID and IBM Client Secret (API gateway)
3. **Callback URLs** whitelisted:
   - `https://<your-domain>/api/v1/standardbank/notification` (deposit notification)
   - `https://<your-domain>/api/v1/standardbank/callback`
   - `https://<your-domain>/api/v1/standardbank/realtime-callback`
   - `https://<your-domain>/api/v1/standardbank/rtp-callback`
   - `https://<your-domain>/api/v1/standardbank/rtp-realtime-callback`

---

## Environment Variables (UAT)

Set in `.env` or Codespaces Secrets:

```bash
STANDARDBANK_PAYSHAP_ENABLED=true
STANDARDBANK_ENVIRONMENT=uat

# Ping OAuth (OneHub)
SBSA_PING_TOKEN_URL=https://enterprisestssit.standardbank.co.za/as/token.oauth2
SBSA_PING_CLIENT_ID=<from SBSA>
SBSA_PING_CLIENT_SECRET=<from SBSA>

# IBM API Gateway
SBSA_IBM_CLIENT_ID=<from SBSA>
SBSA_IBM_CLIENT_SECRET=<from SBSA>

# API Base URLs (UAT)
SBSA_RPP_BASE_URL=https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/rapid-payments
SBSA_RTP_BASE_URL=https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/request-to-pay

# Callback
SBSA_CALLBACK_SECRET=<API user secret from OneHub>
SBSA_CALLBACK_BASE_URL=https://staging.mymoolah.africa  # or ngrok for local testing

# Optional: MMTP debtor/creditor accounts (for Pain.001/Pain.013)
SBSA_DEBTOR_ACCOUNT=<MMTP TPP account>
SBSA_DEBTOR_NAME=MyMoolah Treasury
SBSA_CREDITOR_ACCOUNT=<MMTP receiving account for RTP>
SBSA_CREDITOR_NAME=MyMoolah Treasury

# Ledger: Uses LEDGER_ACCOUNT_BANK (1100-01-01) - MM SBSA main account

# PayShap RPP fee model (VAT incl)
# SBSA RPP fee is pass-through clearing/payable; MMTP VAT control only records VAT on MMTP markup.
PAYSHAP_SBSA_FEE_TIER_RPP_ZAR=5.75
PAYSHAP_MM_RPP_MARKUP_ZAR=1.00
LEDGER_ACCOUNT_PAYSHAP_SBSA_CLEARING=2200-02-01
```

---

## Migrations

Run before UAT:

```bash
./scripts/run-migrations-master.sh uat
```

Creates:
- `standard_bank_transactions` – RPP and RTP transaction records
- `standard_bank_rtp_requests` – RTP request tracking

---

## UAT Sandbox Behaviour

### RPP
- ~90% success rate (random)
- **Debtor account ending in 4**: Always fails (use for failure testing)
- Multiple test accounts provided by SBSA

### RTP
Creditor account last digit drives outcome:

| Last Digit | Result |
|------------|--------|
| 1 | Internal Exception |
| 2, 3 | Presented (simulated response ~2 min; 75% Paid, 25% Cancel/Decline) |
| 4 | Rejected |
| 5 | Cancelled |
| 6 | Declined |
| 7 | Received |

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/standardbank/notification` | POST | X-Signature (HMAC) | Deposit notification — H2H SOAP/JSON (reference = CID = MSISDN) |
| `/api/v1/standardbank/payshap/rpp` | POST | JWT | Initiate PayShap payment (Send Money) |
| `/api/v1/standardbank/payshap/rtp` | POST | JWT | Initiate Request to Pay |
| `/api/v1/standardbank/payshap/inbound-credit` | POST | x-GroupHeader-Hash / X-Signature | **Inbound PayShap credit** — third-party deposits via PayShap rails |
| `/api/v1/standardbank/callback` | POST | x-GroupHeader-Hash | RPP batch callback |
| `/api/v1/standardbank/realtime-callback` | POST | x-GroupHeader-Hash | RPP realtime callback |
| `/api/v1/standardbank/rtp-callback` | POST | x-GroupHeader-Hash | RTP callback |
| `/api/v1/standardbank/rtp-realtime-callback` | POST | x-GroupHeader-Hash | RTP realtime callback |

### Deposit Notification (H2H — Colette's Team)

When a deposit hits the MM SBSA main account, SBSA POSTs to `/notification`. The payload must include:
- `transactionId` - for idempotency
- `referenceNumber` (or `reference`, `cid`) - CID = MSISDN (wallet to credit) or float identifier (SUP-, CLI-, SP-, RES-)
- `amount` - amount to credit

### PayShap Inbound Credit (PayShap Team — Gustaf)

When a third-party PayShap payment is received on the treasury account (NOT initiated by MyMoolah), the PayShap system sends a real-time notification. This is **separate** from the H2H SOAP notification:
- **Endpoint**: `/api/v1/standardbank/payshap/inbound-credit`
- **Auth**: `x-GroupHeader-Hash` (HMAC-SHA256) or `X-Signature` (HMAC-SHA256)
- **Payload**: JSON with `transactionId`, `reference`/`proxy` (MSISDN), `amount`, `currency`
- **MSISDN extraction**: Handles extra digits banks may prepend/append to the phone number reference
- **Cross-channel idempotency**: Detects if the same deposit was already processed via H2H SOAP (within 90s window)
- **Fallback**: Unmatched RPP callbacks (existing `/callback` routes) with ACCC/ACSP status are also routed to this handler

**TBC with Gustaf**: Exact callback URL and payload format for inbound PayShap credits.

---

## PayShap Proxy Registration

**Proxy registration is the USER's responsibility, not MyMoolah's.** Each user registers their own PayShap proxy (mobile number linked to a bank account) via their own banking app. A user can have multiple proxies across different banks and chooses which is their primary PayShap ID.

MyMoolah does NOT register users' MSISDNs on the PayShap proxy directory. The Proxy Resolution API (`proxyResolutionClient.js`) is for RESOLVING proxies (looking up which bank account a phone number maps to before sending a payment), not for registering them.

---

## Request Money Proxy (Frontend)

When Peach is archived and `STANDARDBANK_PAYSHAP_ENABLED=true`, the frontend's call to `/api/v1/peach/request-money` is proxied to Standard Bank PayShap. No frontend changes required.

---

## Verification Checklist

- [ ] OneHub access granted
- [ ] API user created; credentials received
- [ ] Callback URLs whitelisted (HTTPS, public)
- [ ] Migrations run in UAT
- [ ] Env vars set in Codespaces UAT
- [ ] Ping token retrieval working
- [ ] RPP initiation returns 202
- [ ] RTP initiation returns 202
- [ ] Callbacks received and hash validated
- [ ] RPP: Wallet debit and transaction created
- [ ] RTP: Request created; Paid callback credits wallet (principal − fee)
- [ ] RPP: Wallet debited principal + fee; ledger postings correct
- [ ] Sandbox scenarios tested (fail, success, Presented, etc.)

---

## RTP Mode Logic (Updated 2026-03-11)

### Debtor Identification — Proxy vs PBAC

| Condition | Mode | Pain.013 structure |
|-----------|------|--------------------|
| `payerMobileNumber` present | **Proxy** | `DbtrAcct.Id.Item.Id = "Proxy"`, `Prxy.Id = 27XXXXXXXXX`, `DbtrAgt = proxy domain (e.g. capitec)` |
| `payerMobileNumber` absent + `payerAccountNumber` present | **PBAC** | `DbtrAcct.Id.Item.Id = accountNumber`, no `Prxy` block, `DbtrAgt = branch code (e.g. 470010)` |

**Key rules:**
- `PmtTpInf` must always be `{}` (empty) in Pain.013 RTP — the `PBAC` local instrument code belongs in Pain.001 RPP only.
- Frontend always sends both mobile + account — backend applies proxy-first logic.
- If proxy is rejected (EPDNF/EBONF/EERRR), backend automatically retries as PBAC.
- Retry state stored in `standard_bank_rtp_requests.metadata` (`retryOf`, `retryMode`, `retryAttempt`).

### Fallback Flow
```
1. RTP sent → Proxy mode (mobile number, payer bank domain in DbtrAgt)
2. SBSA callback: RJCT with EPDNF/EBONF/EERRR (system rejection, not payer decline)
3. retryRtpAsPbac() triggered automatically
4. RTP resent → PBAC mode (account number, branch code in DbtrAgt)
5. If PBAC also rejected → user notified "could not be delivered"
```

---

## Restart

After env changes or deployment:

```bash
# Restart backend
pm2 restart mymoolah-backend  # or your process manager
```
