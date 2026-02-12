# SBSA PayShap UAT Guide

**Date**: 2026-02-12  
**Status**: Implementation complete – awaiting OneHub credentials for UAT  

---

## Prerequisites

1. **OneHub access** from Standard Bank CIB
2. **API user** created in Rapid Payments portal with:
   - Client ID (Ping)
   - Client Secret (for HMAC callback validation)
   - IBM Client ID and IBM Client Secret (API gateway)
3. **Callback URLs** whitelisted:
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

# Ledger (optional)
LEDGER_ACCOUNT_SBSA_PAYSHAP_FLOAT=1200-10-07
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
| `/api/v1/standardbank/payshap/rpp` | POST | JWT | Initiate PayShap payment (Send Money) |
| `/api/v1/standardbank/payshap/rtp` | POST | JWT | Initiate Request to Pay |
| `/api/v1/standardbank/callback` | POST | x-GroupHeader-Hash | RPP batch callback |
| `/api/v1/standardbank/realtime-callback` | POST | x-GroupHeader-Hash | RPP realtime callback |
| `/api/v1/standardbank/rtp-callback` | POST | x-GroupHeader-Hash | RTP callback |
| `/api/v1/standardbank/rtp-realtime-callback` | POST | x-GroupHeader-Hash | RTP realtime callback |

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
- [ ] RTP: Request created; Paid callback credits wallet
- [ ] Ledger postings correct
- [ ] Sandbox scenarios tested (fail, success, Presented, etc.)

---

## Restart

After env changes or deployment:

```bash
# Restart backend
pm2 restart mymoolah-backend  # or your process manager
```
