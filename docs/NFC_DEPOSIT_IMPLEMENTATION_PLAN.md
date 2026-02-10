# NFC Deposit Implementation Plan — Phase 1 (Deposits Only)

**Last Updated**: February 2, 2026  
**Version**: 2.0.0  
**Status**: ✅ **READY FOR IMPLEMENTATION**  
**SoftPOS Vendor**: Halo Dot (Halo.Link / Halo.Go)  
**Phase 2**: Virtual debit card for POS payments — deferred until Standard Bank issues virtual cards

---

## Executive Summary

This plan implements **NFC tap-to-deposit** for MyMoolah wallets using **Halo Dot** SoftPOS. Users tap their contactless card on a device running Halo.Go/Halo.Link to deposit funds into their MyMoolah wallet. Settlement flows to the MyMoolah Treasury account at Standard Bank.

**Phase 1 scope**: Deposits only. No virtual card, no issuing, no provisioning.  
**Phase 2 scope** (later): Virtual debit card for POS payments to 3rd-party retailers — requires Standard Bank virtual card issuance.

---

## 1. Research Findings

### 1.1 Codebase & Documentation Review

- **Existing plan**: `docs/integrations/StandardBankNFC.md` (Jan 2026) — covered both deposits and virtual card; vendor-agnostic.
- **Session log**: `docs/session_logs/2026-01-24_0909_nfc-deposit-payment-plan.md` — planning only, no code.
- **No prior NFC implementation** — greenfield for Phase 1.

### 1.2 Halo Dot Research

| Resource | URL | Key Info |
|----------|-----|----------|
| Docs | https://docs.halodot.io/ | Intro, features, pricing |
| Halo.SDK | https://www.halodot.io/halo-sdk | PCI MPoC SDK — Kotlin, Flutter, React Native; requires PCI lab cert |
| Halo.Link | https://www.halodot.io/halo-link | App-to-app via Intents/Deeplinking; **no PCI cert needed** |
| Transaction Guide | https://halo-dot-developer-docs.gitbook.io/halo-dot/readme/transaction-app2app-integration-guide | Intent API, deeplink flow |
| Merchant Portal | https://go.merchantportal.prod.haloplus.io/ | Merchant ID, API Key |
| Developer Portal | https://go.developerportal.qa.haloplus.io/ | SDK credentials, NDA |

**Halo Dot Integration Options**:
- **Halo.Link** (recommended for Phase 1): Branded companion app; Intents/Deeplinking; returns outcome to your app; no PCI cert.
- **Halo.SDK**: Embed SoftPOS in your app; requires PCI MPoC lab certification.
- **Halo.Go**: Standalone Halo app; same intent/deeplink flow as Halo.Link.

### 1.3 Payment Flow (Halo Dot)

```
Customer tap → Halo app (kernel) → Payment processor → Acquirer → Card network → Issuer
→ Auth response → Acquirer → Merchant settlement (T+1/T+2) → MyMoolah Treasury (Standard Bank)
```

Halo Dot acts as PSP; settlement lands in merchant's nominated bank account (MyMoolah Treasury).

---

## 2. Architecture — Phase 1 (Deposits Only)

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NFC DEPOSIT FLOW (Phase 1)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐    1. Request deposit     ┌──────────────────────┐
  │ MyMoolah     │ ────────────────────────▶│ MyMoolah Backend     │
  │ Wallet App   │    (amount, userId)       │                      │
  └──────────────┘                           └──────────┬───────────┘
        │                                                │
        │ 2. Create intent (Halo API)                    │
        │◀───────────────────────────────────────────────┤
        │    { consumerTxId, jwt }                        │
        │                                                │
        │ 3. Launch Halo.Go/Halo.Link (intent/deeplink)  │
        ▼                                                │
  ┌──────────────┐    4. User taps card      ┌───────────▼───────────┐
  │ Halo.Go /    │ ────────────────────────▶│ Halo Backend          │
  │ Halo.Link   │                           │ (Acquirer/Processor)  │
  └──────────────┘                           └──────────┬───────────┘
        │                                                │
        │ 5. Return result (success/error)                │
        │◀───────────────────────────────────────────────┤
        │                                                │
        │ 6. Report result to MyMoolah backend             │
        ▼                                                │
  ┌──────────────┐    7. Credit wallet       ┌───────────▼───────────┐
  │ MyMoolah     │ ────────────────────────▶│ NFCDepositService     │
  │ Backend     │    (idempotency, amount)   │ Ledger + Transaction │
  └──────────────┘                           └──────────────────────┘
        │                                                │
        │ 8. Settlement (T+1/T+2)                        │
        │    Acquirer → MyMoolah Treasury (Standard Bank) │
        └────────────────────────────────────────────────┘
```

### 2.2 Halo Dot Intent API (Backend → Halo)

**Create Intent Transaction** (Approach 1.1 — recommended)

```
POST https://kernelserver.{env}.haloplus.io/consumer/intentTransaction
```

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| x-api-key | API Key from Merchant Portal |
| Authorization | JWT (optional; API Key can be used instead) |

| Body Field | Type | Required | Description |
|------------|------|----------|-------------|
| merchantId | String | Yes | From Merchant Portal |
| paymentReference | String | Yes | Unique MyMoolah reference (idempotency key) |
| amount | String | Yes | Amount (e.g. "100.01") |
| timestamp | String | Yes | ISO 8601 |
| currencyCode | String | Yes | ISO 4217 (e.g. "ZAR") |

**Response**: `consumerTransactionId`, `jwt` (transaction token)

**Alternative — Session Token** (Approach 1.2): Single merchant, session token valid 60–720 min. Fewer API calls for multiple deposits.

```
POST https://authserver.{env}.haloplus.io/refresh/intentSessionToken
Body: { "expiryMinutes": 60 }  // optional, default 60
```

### 2.3 Intent/Deeplink to Halo.Go

The app sends the `consumerTransactionId` and `jwt` to Halo.Go/Halo.Link via:
- **Android**: Intent (sample code in Merchant Portal → Help Center → App to App)
- **iOS**: Deeplink (URL scheme from Halo)
- **Deeplink API**: `POST https://kernelserver.{env}.haloplus.io/consumer/qrCode` — returns deep link or QR code image

### 2.4 Result Handling

Halo.Go returns control to the MyMoolah app with success or error code. The app must then call MyMoolah backend to:
1. Confirm the deposit (idempotency key = paymentReference)
2. Credit wallet
3. Post ledger entries

**Critical**: Do not credit wallet from the app alone. Backend must verify (or reconcile) before crediting. If Halo provides a webhook for settlement confirmation, use it for reconciliation; otherwise credit on auth success with idempotency.

---

## 3. Data Models & Migrations

### 3.1 New Models (Phase 1)

**`NfcDepositIntent`** — Created when user initiates deposit

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| userId | INT | FK users |
| walletId | STRING | FK wallets |
| amount | DECIMAL(15,2) | Requested amount |
| currencyCode | STRING(3) | ZAR |
| paymentReference | STRING | Unique idempotency key (used in Halo API) |
| consumerTransactionId | STRING | From Halo response |
| status | ENUM | pending, completed, failed, expired |
| haloEnv | STRING | dev, qa, prod |
| completedAt | TIMESTAMP | When wallet credited |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**`NfcCallbackLog`** — Audit log for deposit confirmations

| Column | Type | Description |
|--------|------|-------------|
| id | INT | PK |
| paymentReference | STRING | Idempotency key |
| rawPayload | JSONB | For debugging (redact PAN) |
| status | STRING | success, failed |
| walletCredited | BOOLEAN | |
| createdAt | TIMESTAMP | |

### 3.2 Transaction Extensions

Add to `Transaction.type` ENUM: `nfc_deposit`

---

## 4. Backend Services

### 4.1 NFCDepositService

**Responsibilities**:
- Call Halo Dot Intent API to create intent transaction
- Store `NfcDepositIntent` with pending status
- Receive deposit confirmation from app (or webhook)
- Idempotency: `paymentReference` must be unique; reject duplicates
- Credit wallet via `Wallet.credit()`
- Create `Transaction` (type: `nfc_deposit`)
- Post ledger: Debit NFC float / Treasury; Credit user wallet clearing
- Update `NfcDepositIntent.status` to completed

**Ledger alignment** (double-entry):
- Debit: NFC acquiring float (e.g. `1200-10-10` — new account for NFC deposits)
- Credit: User wallet clearing (e.g. `1100-01-01` or wallet-specific)

**Environment variables**:
```
HALO_DOT_ENV=qa                    # dev, qa, prod
HALO_DOT_MERCHANT_ID=<from portal>
HALO_DOT_API_KEY=<from portal>
HALO_DOT_KERNEL_BASE_URL=https://kernelserver.qa.haloplus.io
HALO_DOT_AUTH_BASE_URL=https://authserver.qa.haloplus.io
LEDGER_ACCOUNT_NFC_FLOAT=1200-10-10
```

### 4.2 HaloDotClient (Internal)

- `createIntentTransaction({ merchantId, paymentReference, amount, timestamp, currencyCode })`
- `getIntentSessionToken(expiryMinutes?)` — for session token approach
- `getDeepLink({ merchantId, paymentReference, amount, timestamp, currencyCode })` — for QR/deeplink

---

## 5. API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/nfc/deposit/create` | POST | JWT | Create deposit intent; returns `consumerTransactionId`, `jwt`, `deepLink` (optional) |
| `/api/v1/nfc/deposit/confirm` | POST | JWT | Confirm deposit (called by app after Halo returns success); credits wallet |
| `/api/v1/nfc/deposit/history` | GET | JWT | List user's NFC deposits (paginated) |

**Request/Response examples**:

**POST /api/v1/nfc/deposit/create**
```json
// Request
{ "amount": 100.50, "currencyCode": "ZAR" }

// Response
{
  "consumerTransactionId": "tx-abc123",
  "jwt": "eyJ...",
  "paymentReference": "NFC-20260202-xyz",
  "deepLink": "halodot://pay?tx=tx-abc123&jwt=eyJ...",
  "expiresAt": "2026-02-02T12:35:00Z"
}
```

**POST /api/v1/nfc/deposit/confirm**
```json
// Request
{ "paymentReference": "NFC-20260202-xyz", "result": "success" }
// Optional: { "result": "failed", "reasonCode": "..." }
```

---

## 6. Frontend / Wallet App

### 6.1 Deposit Flow UX

1. User taps "Deposit via NFC" (or "Tap to Deposit")
2. User enters amount (or selects preset)
3. App calls `POST /api/v1/nfc/deposit/create`
4. App receives `consumerTransactionId`, `jwt`, `deepLink`
5. App launches Halo.Go via intent (Android) or deeplink (iOS)
6. User taps card on device
7. Halo.Go returns to app with success/error
8. App calls `POST /api/v1/nfc/deposit/confirm` with `paymentReference` and `result`
9. Show success/failure; refresh balance

### 6.2 Deep Link Handling

- **PWA/TWA**: Use `window.open(deeplink)` or Web Intent API if available
- **Native wrapper**: Use platform intent (Android) or `Linking.openURL` (React Native)

### 6.3 Halo.Go Installation

User must have Halo.Go or Halo.Link installed. Show download link if not installed.

---

## 7. Security & Compliance

- **No PAN/CVV storage**: Halo handles all card data; MyMoolah never sees it
- **Idempotency**: `paymentReference` is unique; reject duplicate confirmations
- **HMAC/signature**: If Halo provides webhook with signature, validate before crediting
- **Rate limiting**: Max NFC deposits per user per hour (e.g. 10)
- **Amount limits**: Min R1, max R5,000 per tap (configurable)
- **Audit**: Log all `NfcDepositIntent` and `NfcCallbackLog` entries

---

## 8. Testing Strategy

| Type | Scope |
|------|-------|
| Unit | `NFCDepositService`, `HaloDotClient` (mocked Halo API) |
| Integration | Full flow with Halo sandbox (dev/qa env) |
| UAT | Real Halo.Go app + test cards in Halo QA |
| Reconciliation | Daily settlement report vs ledger (when available) |

---

## 9. Implementation Checklist

### Phase 1 — Deposits Only

- [ ] **Prerequisites**
  - [ ] Register on Halo Merchant Portal; obtain Merchant ID and API Key
  - [ ] Confirm Halo Dot settlement account = MyMoolah Treasury (Standard Bank)
  - [ ] Add env vars to `env.template` and secrets

- [ ] **Models & Migrations**
  - [ ] Create migration: `NfcDepositIntent` table
  - [ ] Create migration: `NfcCallbackLog` table
  - [ ] Add `nfc_deposit` to Transaction type enum

- [ ] **Backend**
  - [ ] `services/haloDotClient.js` — Halo API wrapper
  - [ ] `services/nfcDepositService.js` — intent creation, wallet credit, ledger
  - [ ] `controllers/nfcDepositController.js`
  - [ ] `routes/nfc.js` — mount under `/api/v1/nfc`
  - [ ] Ledger account for NFC float (migration or config)

- [ ] **Frontend**
  - [ ] "Tap to Deposit" button/screen
  - [ ] Amount input
  - [ ] Intent/deeplink launch to Halo.Go
  - [ ] Confirm callback to backend
  - [ ] Success/error UI

- [ ] **Documentation**
  - [ ] Update `docs/integrations/StandardBankNFC.md` with Phase 1 completion
  - [ ] API docs for NFC endpoints
  - [ ] Runbook for settlement reconciliation

### Phase 2 — Virtual Card (Deferred)

- [ ] Await Standard Bank virtual card issuance
- [ ] Implement `VirtualCardService`, `CardAuthService`, provisioning
- [ ] See original `StandardBankNFC.md` for architecture

---

## 10. References

- [Halo Dot Docs](https://docs.halodot.io/)
- [Halo Dot Transaction App2App Guide](https://halo-dot-developer-docs.gitbook.io/halo-dot/readme/transaction-app2app-integration-guide)
- [Halo Merchant Portal](https://go.merchantportal.prod.haloplus.io/)
- [Halo Developer Portal](https://go.developerportal.qa.haloplus.io/)
- [Standard Bank NFC Plan](docs/integrations/StandardBankNFC.md)
- [Ledger Service](services/ledgerService.js)
