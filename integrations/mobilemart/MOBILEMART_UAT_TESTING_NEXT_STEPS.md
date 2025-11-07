# MobileMart (Fulcrum) — UAT Testing Next Steps

## 1) Provide details to MobileMart

- Cellphone number for UAT credential delivery (WhatsApp)
- Alert email recipients (system alerts)
- Balance email recipients (optional) and preferred frequency

## 2) Configure UAT environment

Add to `.env` (local/Codespaces) and production variables template:

```
MOBILEMART_ENV=uat
MOBILEMART_BASE_URL=https://uat.fulcrumswitch.com
MOBILEMART_CLIENT_ID=<from_UAT_pack>
MOBILEMART_CLIENT_SECRET=<from_UAT_pack>
MOBILEMART_SCOPE=api
```

Validate token retrieval:

```bash
curl -X POST "https://uat.fulcrumswitch.com/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$MOBILEMART_CLIENT_ID&client_secret=$MOBILEMART_CLIENT_SECRET&scope=$MOBILEMART_SCOPE"
```

## 3) Smoke tests

- Token: ensure non-empty access_token and sensible expiry
- Products: call representative product endpoints per VAS type
  - Airtime: `/api/v1/airtime/products`
  - Data: `/api/v1/data/products`
  - Vouchers: `/api/v1/voucher/products`
  - BillPayments: `/api/v1/billpayment/products`
  - Utilities: `/api/v1/prepaidutility/products`

## 4) Execute test pack (UAT)

For each product category in the test pack:
- Fetch products
- Perform sample purchase per category (per pack guidance)
- Verify status callbacks or polling endpoints
- Record request/response pairs and outcomes

## 5) Email configuration

- System Alerts: supply final recipient list to MobileMart
- Balance Emails (optional): recipients and frequency

## 6) Acceptance & promotion

- Collate results and evidence (logs, JSON samples)
- Address any discrepancies and retest
- Submit completion to MobileMart; request approval to move to Prod

## 7) Post-UAT production config

Update env in production deployment pipeline:

```
MOBILEMART_ENV=prod
MOBILEMART_BASE_URL=https://fulcrumswitch.com
MOBILEMART_CLIENT_ID=<prod_client_id>
MOBILEMART_CLIENT_SECRET=<prod_client_secret>
MOBILEMART_SCOPE=api
```

Re-run token + product list sanity checks in Prod prior to live traffic.

## References

- UAT Swagger: https://uat.fulcrumswitch.com/swagger
- Token curl (Prod reference from email): see status doc


