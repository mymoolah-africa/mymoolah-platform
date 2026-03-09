# Session Log: SBSA PayShap Production Credentials Setup

**Date:** 2026-03-04  
**Time:** ~14:00 SAST  
**Agent:** Claude (Sonnet 4.5)  
**Session Type:** Configuration / Infrastructure  
**Status:** ✅ deploy-backend.sh updated | ⚠️ 2 secrets still pending from user

---

## Session Summary

André received production credentials from SBSA for PayShap integration (Ping OAuth + IBM API Gateway). This session updated the Cloud Run deployment pipeline to inject SBSA credentials from GCS Secret Manager into both staging and production backends.

---

## Tasks Completed

### 1. Confirmed architecture: Ping vs IBM credential roles

- **Ping** (`SBSA_PING_CLIENT_ID/SECRET`): OAuth 2.0 Bearer token for **both RPP and RTP** — 4 scopes: `rpp.payments.post/get` + `rpp.requestToPay.post/get`
- **IBM** (`SBSA_IBM_CLIENT_ID/SECRET`): API gateway pass-through headers (`X-IBM-Client-Id` / `X-IBM-Client-Secret`) on **every** SBSA API call (RPP + RTP)
- André's assumption ("Ping=RPP, IBM=RTP") was corrected: both credentials are needed for both flows

### 2. Updated `scripts/deploy-backend.sh`

Three changes made:

**a) Added `SBSA_CALLBACK_BASE_URL` per environment:**
```bash
if [ "$ENVIRONMENT" == "staging" ]; then
  SBSA_CALLBACK_BASE_URL="https://staging.mymoolah.africa"
else
  SBSA_CALLBACK_BASE_URL="https://api-mm.mymoolah.africa"
fi
```

**b) Added SBSA secrets to `build_secrets_args()` base string:**
```
SBSA_PING_CLIENT_ID=sbsa-ping-client-id:latest
SBSA_PING_CLIENT_SECRET=sbsa-ping-client-secret:latest
SBSA_IBM_CLIENT_ID=sbsa-ibm-client-id:latest
SBSA_IBM_CLIENT_SECRET=sbsa-ibm-client-secret:latest
SBSA_CALLBACK_SECRET=sbsa-callback-secret:latest
SBSA_DEBTOR_ACCOUNT=sbsa-debtor-account:latest
SBSA_CREDITOR_ACCOUNT=sbsa-debtor-account:latest (same as debtor)
```

**c) Added SBSA env vars to `--set-env-vars`:**
```
STANDARDBANK_PAYSHAP_ENABLED=true
PEACH_INTEGRATION_ARCHIVED=true
STANDARDBANK_ENVIRONMENT=production
SBSA_PING_TOKEN_URL=https://enterprisests.standardbank.co.za/as/token.oauth2
SBSA_RPP_BASE_URL=https://api-gateway.standardbank.co.za/sbsa/ext-prod/rapid-payments
SBSA_RTP_BASE_URL=https://api-gateway.standardbank.co.za/sbsa/ext-prod/request-to-pay
SBSA_PROXY_BASE_URL=https://api-gateway.standardbank.co.za/sbsa/ext-prod/proxy-resolution
SBSA_CALLBACK_BASE_URL=${SBSA_CALLBACK_BASE_URL}  (env-specific)
SBSA_DEBTOR_NAME=MyMoolah Treasury
SBSA_CREDITOR_NAME=MyMoolah Treasury
SBSA_ORG_ID=2019/0519463/07
SBSA_CREDITOR_BANK_BRANCH=051001
PAYSHAP_MM_RPP_MARKUP_ZAR=1.00
PAYSHAP_PROXY_VALIDATION_FEE_ZAR=1.25
LEDGER_ACCOUNT_PAYSHAP_SBSA_COST=5000-10-01
```

### 3. Created `scripts/setup-sbsa-production-secrets.sh`

New script that:
- Creates/updates 6 GCS Secret Manager secrets
- Grants `roles/secretmanager.secretAccessor` to both staging and production service accounts
- Handles `upsert` (creates new OR adds a new version if secret already exists)
- Skips placeholder secrets with clear warnings and re-run instructions
- Has credentials for 4/6 secrets embedded; 2 still need values from André

---

## Production Credentials Received

| Credential | Value |
|---|---|
| `SBSA_PING_CLIENT_ID` | `164f96b3-9e2d-44d5-aa27-ff683b60a136` |
| `SBSA_PING_CLIENT_SECRET` | `TMG0v3vQTgVy6TzCSen7TWHbFA7NiWsafYYn479YQBuisywbwg2VSrqLpKETrMNw` |
| `SBSA_IBM_CLIENT_ID` | `b79a1a8c9efc86d79bdef352a4c94a78` |
| `SBSA_IBM_CLIENT_SECRET` | `00b9ca1736e99e1dd0f3099aa2bac7ea` |

---

## Outstanding — 2 Items Still Needed from André/SBSA

| Item | GCS Secret Name | Notes |
|---|---|---|
| `SBSA_CALLBACK_SECRET` | `sbsa-callback-secret` | HMAC secret from OneHub for validating `x-GroupHeader-Hash` callbacks. UAT was `srBFXm0JiGVX27iJI9IJtjusMJaxl8puLYPZ3aZvMWM=`. Production may differ. |
| `SBSA_DEBTOR_ACCOUNT` | `sbsa-debtor-account` | Real MMTP production TPP bank account number at SBSA (12 digits). UAT used test account `000602739172`. |

---

## Production URLs (hardcoded in deploy script)

| Variable | Production URL |
|---|---|
| `SBSA_PING_TOKEN_URL` | `https://enterprisests.standardbank.co.za/as/token.oauth2` ⚠️ **Confirm with SBSA** |
| `SBSA_RPP_BASE_URL` | `https://api-gateway.standardbank.co.za/sbsa/ext-prod/rapid-payments` |
| `SBSA_RTP_BASE_URL` | `https://api-gateway.standardbank.co.za/sbsa/ext-prod/request-to-pay` |
| `SBSA_PROXY_BASE_URL` | `https://api-gateway.standardbank.co.za/sbsa/ext-prod/proxy-resolution` |

⚠️ The production Ping token URL is an educated guess (removing `sit` from the UAT URL). **Confirm this with the SBSA credentials documentation before first deploy.**

---

## Files Modified

| File | Change |
|---|---|
| `scripts/deploy-backend.sh` | Added SBSA secrets to `build_secrets_args()`, added SBSA env vars to `--set-env-vars`, added `SBSA_CALLBACK_BASE_URL` per environment |
| `scripts/setup-sbsa-production-secrets.sh` | NEW — GCS Secret Manager setup script |

---

## Callback URLs to Whitelist in OneHub (Production)

```
https://api-mm.mymoolah.africa/api/v1/standardbank/notification
https://api-mm.mymoolah.africa/api/v1/standardbank/callback
https://api-mm.mymoolah.africa/api/v1/standardbank/realtime-callback
https://api-mm.mymoolah.africa/api/v1/standardbank/rtp-callback
https://api-mm.mymoolah.africa/api/v1/standardbank/rtp-realtime-callback
```

Staging (may already be whitelisted from UAT):
```
https://staging.mymoolah.africa/api/v1/standardbank/...
```

---

## Next Steps for André

1. **Confirm Ping token URL**: Check SBSA production credentials pack for the correct OAuth token endpoint
2. **Get callback secret**: Check OneHub portal or SBSA credentials email for the production callback HMAC secret
3. **Get debtor account**: Confirm the real MMTP production bank account number at SBSA
4. **Run the setup script**: `./scripts/setup-sbsa-production-secrets.sh` (will create 4 known secrets immediately; 2 pending)
5. **Whitelist callback URLs** in OneHub for production domain
6. **Deploy to staging**: `./scripts/deploy-backend.sh --staging`
7. **Test RPP and RTP** on staging against live SBSA production API
8. **Deploy to production**: `./scripts/deploy-backend.sh --production`

---

## Important Notes for Next Agent

- **UAT credentials** remain unchanged in `.env.codespaces` — Codespaces UAT still uses the old test credentials
- **Production URL** `STANDARDBANK_ENVIRONMENT=production` activates different base URLs in `client.js` automatically
- **Both service accounts** (`mymoolah-staging-sa` and `mymoolah-production-sa`) are granted Secret Accessor on all 6 SBSA secrets
- The setup script uses `upsert_secret()` — safe to re-run after adding remaining values
- **RPP and RTP both passed UAT** end-to-end as of 2026-02-24 — code is production-ready
