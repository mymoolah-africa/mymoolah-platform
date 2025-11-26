## Peach Payments Integration (Sandbox)

⚠️ **STATUS: ARCHIVED** ⚠️  
**Archived Date**: 2025-11-26  
**Reason**: Integration temporarily canceled due to PayShap provider competition  
**Archive Flag**: `PEACH_INTEGRATION_ARCHIVED=true` in `.env`  
**See**: `docs/archive/PEACH_ARCHIVAL_RECORD.md` for details

---

### Overview
Peach Payments provides card, A2A, Pay by Bank, and PayShap capabilities. This integration focuses on PayShap (RPP outbound and RTP request‑to‑pay) and uses Hosted Checkout V2 for sandbox, with a fallback to the Payments API when required.

References:
- Tokenisation, shared functionality and parameters: https://developer.peachpayments.com/docs/checkout-tokenisation
- Hosted Checkout V2 (auth, endpoints, flows): https://developer.peachpayments.com/docs/v2-checkout-hosted

### Current Status
- Database table `peach_payments` created and managed by Sequelize.
- Backend scaffolded and wired:
  - `integrations/peach/client.js` (OAuth + Checkout/Payments helpers)
  - `controllers/peachController.js` (RPP initiation)
  - `routes/peach.js` (exposes `/api/v1/peach`)
  - `models/PeachPayment.js` (audit/trace of Peach interactions)
- Route available (JWT required): `POST /api/v1/peach/payshap/rpp`
- OAuth to Peach works and returns `access_token`.
- Pending: Confirm the correct Hosted Checkout channel for the sandbox entity; otherwise use Payments API with SigV4.

### Environment Variables (.env)
Required keys (sandbox):
```
PEACH_BASE_AUTH=https://sandbox-dashboard.peachpayments.com
PEACH_BASE_CHECKOUT=https://testsecure.peachpayments.com
PEACH_CLIENT_ID=<from Peach>
PEACH_CLIENT_SECRET=<from Peach>
PEACH_MERCHANT_ID=<from Peach>
PEACH_ENTITY_ID_PSH=<PayShap-enabled Entity ID>
PEACH_ENABLE_TEST_MODE=true
```
Existing core keys:
```
DATABASE_URL=postgres://mymoolah_app:<password>@127.0.0.1:5433/mymoolah
JWT_SECRET=<32+ chars>
```

### Database Schema
Table: `peach_payments`
- `id` (PK)
- `type` enum: `payshap_rpp` | `payshap_rtp`
- `merchantTransactionId` (unique)
- `peachReference` (e.g., checkoutId or txn id)
- `amount` (DECIMAL 15,2), `currency` (ZAR)
- `partyAlias` (optional; e.g., phone when using simulator)
- `status` (`initiated` | `processing` | `success` | `failed`)
- `resultCode`, `resultDescription`
- `rawRequest` JSON, `rawResponse` JSON
- `webhookReceivedAt`, `createdAt`, `updatedAt`

Applied DB grants (Cloud SQL → Query Editor, DB `mymoolah`):
```
GRANT USAGE, CREATE ON SCHEMA public TO mymoolah_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mymoolah_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mymoolah_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mymoolah_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mymoolah_app;
```

### Backend Components
- `integrations/peach/client.js`
  - `getAccessToken()` → POST `{PEACH_BASE_AUTH}/api/oauth/token` with `{ clientId, clientSecret, merchantId }`; returns `access_token`.
  - `createCheckoutPayShap({ amount, currency='ZAR', description, shopperResultUrl })` → POST `{PEACH_BASE_CHECKOUT}/v2/checkout` with Bearer token, sets `defaultPaymentMethod='PAYSHAP'` and `forceDefaultMethod=true`, returns `{ checkoutId, redirectUrl }`.
  - `createPayShapDebit(...)` (prototype for Payments API). Note: This API path requires AWS SigV4 signing; use if Hosted Checkout is not available.
- `controllers/peachController.js`
  - `initiatePayShapRpp(req,res)`: creates a `peach_payments` record and calls `createCheckoutPayShap`, then returns `{ checkoutId, redirectUrl }`.
- `routes/peach.js`
  - `POST /api/v1/peach/payshap/rpp` (JWT auth via `middleware/auth.js`).
- `models/PeachPayment.js` → Sequelize model mapping to `peach_payments`.

### Public API (internal consumers)
`POST /api/v1/peach/payshap/rpp`
- Headers: `Authorization: Bearer <JWT>`
- Body:
```
{
  "amount": "100.00",
  "currency": "ZAR",
  "description": "Test PayShap RPP"
}
```
- 201 response:
```
{
  "success": true,
  "data": {
    "merchantTransactionId": "PSH-<timestamp>-<rand>",
    "checkoutId": "<id>",
    "redirectUrl": "<url>",
    "status": "processing"
  }
}
```
- 500 response includes Peach error details (safe subset).

### Design: Bank Accounts First (Aliases Optional)
Production request bodies will prefer bank account details:
- RPP:
```
{
  "amount": "100.00",
  "currency": "ZAR",
  "debtorAccount": {
    "accountNumber": "1234567890",
    "bankCode": "250655",
    "accountType": "cheque"
  },
  "sandboxSimPhone": "+27711111200"  // optional, sandbox only
}
```
- RTP:
```
{
  "amount": "250.00",
  "currency": "ZAR",
  "payerAccount": {
    "accountNumber": "0987654321",
    "bankCode": "210554",
    "accountType": "savings"
  },
  "expiryMinutes": 60,
  "sandboxSimPhone": "+27711111200"  // optional, sandbox only
}
```
Aliases (phone/email) remain optional and are stored for simulator/testing only.

### Flows
Auth:
- `POST {PEACH_BASE_AUTH}/api/oauth/token` → `{ access_token, token_type, expires_in }`.

RPP (Hosted Checkout V2 sandbox):
1) `POST {PEACH_BASE_CHECKOUT}/v2/checkout` with Bearer JWT and body `{ entityId, amount, currency, defaultPaymentMethod:'PAYSHAP', forceDefaultMethod:true, shopperResultUrl }`.
2) Return `{ checkoutId, redirectUrl }` and store in `peach_payments` as `processing`.
3) User completes flow at `redirectUrl`. Peach redirects to `shopperResultUrl` and/or sends webhook.

Payments API variant:
- If required, implement AWS SigV4 signed `POST /v1/payments?entityId=...` with `paymentBrand=PAYSHAP`, `paymentType=DB`, and sandbox `customParameters.enableTestMode=true`.

Webhooks (planned):
- `POST /api/v1/peach/webhook`
  - Validate signature (if provided).
  - Update `peach_payments.status`, `resultCode`, `resultDescription`, and set `webhookReceivedAt`.
  - Apply ledger effects on success.

### Sandbox Testing Notes
- Set `PEACH_ENABLE_TEST_MODE=true` to send `customParameters.enableTestMode=true`.
- Known simulator phones (when used):
  - `+27-711111200` → success (`000.100.110`)
  - `+27-711111160` → declined (`100.396.101`)
  - `+27-711111140` → expired (`100.396.104`)
  - `+27-711111107` → connector error (`900.100.100`)
- In sandbox, Hosted Checkout may bypass verification and show a success modal before redirecting.

### Security & Compliance
- Never store PAN/CVV; only store Peach tokens/ids.
- Keep secrets only in `.env` and secure stores.
- Mask sensitive fields in logs; follow strong password and JWT practices.

### Operations
- Backend start: `npm start`
- Health: `GET /health`
- Logs: backend console, and Peach dashboard (`http://sandbox-dashboard.peachpayments.com`).

### Open Items / Next Steps
1) Confirm the correct Checkout endpoint/channel for entity `PEACH_ENTITY_ID_PSH` to resolve “Channel not found”.
2) If Payments API is mandated, add AWS SigV4 signing to `createPayShapDebit`.
3) Implement RTP endpoints and webhooks.
4) Adjust public request schemas to bank-account‑first and update controller mapping.


