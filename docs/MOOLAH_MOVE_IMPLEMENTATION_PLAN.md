# MoolahMove — International Payments Feature
## Implementation Plan & Architecture Reference

**Product Name**: MoolahMove  
**Tagline**: "Move your Moolah"  
**Feature Type**: Cross-border remittance (consumer-facing, crypto-invisible)  
**Version**: 1.0.0  
**Created**: February 24, 2026  
**Status**: 🟡 Phase 1 Complete — Awaiting Yellow Card KYB Approval  

---

## 1. Product Vision

MoolahMove enables MyMoolah wallet holders in South Africa to send money to family and friends in other African countries. The recipient receives local fiat currency in their bank account or mobile money wallet.

**The customer never sees crypto, USDC, Solana, or blockchain. Ever.**

### User Journey (Customer View)

```
1. Select recipient
   → "Sipho's Mom (Malawi · Airtel Money)"

2. Enter amount
   → "Send R500"

3. Accept Quote modal (no PIN / SMS required — just tap Accept)
   ┌─────────────────────────────────────────┐
   │  MoolahMove Quote                       │
   │                                         │
   │  You send        R525.00                │
   │  (R500 + R25 fee)                       │
   │                                         │
   │  Rate            R18.44 / USD           │
   │  Recipient gets  ~$27.12 USD            │
   │  Delivered via   Airtel Money, Malawi   │
   │                                         │
   │  ⏱ Rate valid for 28s                  │
   │                                         │
   │  ℹ️ Final local currency amount is set  │
   │     by Airtel Money at delivery time.   │
   │                                         │
   │  [Cancel]          [Accept & Send]      │
   └─────────────────────────────────────────┘

4. Done ✓
   → "Payment sent ✓"
   → Push notification when Yellow Card confirms delivery
```

### Why USD-Denominated Quotes

MyMoolah **does not control** the USD→MWK (or USD→KES, USD→ZWL) exchange rate — that is set by Yellow Card and the recipient's mobile money provider at the moment of disbursement. Quoting in local currency would create a liability if the rate moves between quote and delivery.

**What we lock:** The ZAR→USD rate (via VALR, valid 30 seconds).  
**What we commit to:** The USD value the recipient receives.  
**What we disclaim:** The final local currency amount (shown as indicative only).

This is the same model used by Wise, Remitly, and WorldRemit for volatile-currency corridors.

### What Happens Behind the Scenes (Invisible to Customer)

```
1. MyMoolah debits R525 from SA wallet (face value R500 + 5% fee R25)
2. VALR API: ZAR → USDC on Solana (~2 seconds, ~0.18% fee)
3. MMTP sends USDC to Yellow Card treasury wallet (~5 seconds, <$0.01)
4. Yellow Card: USDC → MWK → Airtel Money (minutes)
5. Yellow Card webhook → MyMoolah → push notification to SA user
```

---

## 2. Business Model

### Fee Structure

| Component | Amount (R500 send) | Notes |
|-----------|-------------------|-------|
| Face value sent | R500 | ZAR that buys USDC |
| MoolahMove fee (5% incl. VAT) | R25 | MyMoolah revenue |
| **Total charged to user** | **R525** | |
| VALR swap cost | ~R0.90 | 0.18% |
| Solana network fee | <R0.20 | <$0.01 |
| Yellow Card disbursement | ~R5–R10 | 1%–2% |
| **Gross margin per R500** | **~R14–R19** | ~55%–75% |

### Competitive Positioning

| Service | Fee | Speed |
|---------|-----|-------|
| **MoolahMove** | **5%** | **<15 min** |
| Western Union | 5%–8% | Hours–Days |
| Bank wire | R150 fixed + 2%–3% | 2–5 days |
| Wise | 1.5%–2.5% | Hours |

MoolahMove is priced competitively vs. traditional channels while maintaining healthy margins.

---

## 3. Technical Architecture

### "Solana Corridor" Flow

```
[SA User Wallet] 
      │ ZAR debit (face value + 5% fee)
      ▼
[MyMoolah Ledger]
      │ ZAR → USDC via VALR API (HMAC-SHA512)
      ▼
[VALR Exchange] ──→ USDC on Solana
      │ USDC withdrawal to Yellow Card treasury
      ▼
[Yellow Card Treasury Wallet]
      │ POST /disbursements (HMAC-SHA256)
      ▼
[Yellow Card] ──→ Local fiat conversion
      │ Mobile Money / Bank Transfer
      ▼
[Recipient in Malawi/Kenya/Zimbabwe/etc.]
      │ Webhook: disbursement.completed
      ▼
[MyMoolah Backend] ──→ Push notification to SA user
```

### Provider Responsibilities

| Provider | Role | Auth | Status |
|----------|------|------|--------|
| **VALR** | ZAR→USDC swap + Solana withdrawal | HMAC-SHA512 | ✅ Live |
| **Yellow Card** | USDC→local fiat + payout | HMAC-SHA256 | 🟡 KYB Pending |
| **Solana** | Settlement network | N/A | ✅ Live |

---

## 4. Supported Countries & Channels

Yellow Card coverage (20 African countries). Priority corridors for MoolahMove:

| Country | Code | Mobile Money | Bank Transfer |
|---------|------|-------------|---------------|
| Malawi | MW | Airtel Money, TNM Mpamba | ✅ |
| Kenya | KE | M-Pesa, Airtel Money | ✅ |
| Zimbabwe | ZW | EcoCash, OneMoney | ✅ |
| Zambia | ZM | Airtel Money, MTN MoMo | ✅ |
| Tanzania | TZ | M-Pesa, Airtel Money, Tigo Pesa | ✅ |
| Uganda | UG | MTN MoMo, Airtel Money | ✅ |
| Nigeria | NG | Bank Transfer | ✅ |
| Ghana | GH | MTN MoMo, Vodafone Cash | ✅ |
| Rwanda | RW | MTN MoMo, Airtel Money | ✅ |

> **Note**: Exact channel IDs are fetched dynamically from `GET /channels?country=XX` at runtime.
> This means new channels are automatically available without code changes.

---

## 5. Database Changes Required

### 5.1 Beneficiary Model Extension

The `beneficiaries` table needs a new JSONB column for international payment accounts.

**Migration file**: `migrations/YYYYMMDD_add_international_services_to_beneficiaries.js`

```javascript
// Structure of internationalServices JSONB:
{
  "accounts": [
    {
      "id": "uuid-v4",
      "channelId": "mw-airtel-mobile",       // Yellow Card channel ID
      "country": "MW",                         // ISO 2-letter country code
      "currency": "MWK",                       // ISO 3-letter currency
      "paymentMethod": "mobile_money",         // mobile_money | bank_transfer
      "provider": "Airtel Money",              // Human-readable provider name
      "accountNumber": "+265991234567",        // Mobile number or bank account
      "accountName": "Grace Banda",            // Recipient name (required by Yellow Card)
      "isDefault": true,
      "isActive": true,
      "createdAt": "2026-02-24T10:00:00Z",
      "updatedAt": "2026-02-24T10:00:00Z"
    }
  ]
}
```

**Beneficiary model ENUM update**: Add `'international'` to `accountType` ENUM.

> ⚠️ The `accountType` field is VARCHAR(50), NOT an ENUM — safe to add without migration risk.

### 5.2 Ledger Account

Add Yellow Card treasury float account:

```sql
INSERT INTO ledger_accounts (account_code, account_name, account_type, parent_account_code, is_active, description)
VALUES (
  '1200-10-07',
  'Yellow Card USDC Treasury Float',
  'asset',
  '1200-10',
  true,
  'Yellow Card treasury wallet for MoolahMove international disbursements'
);
```

**Migration file**: `migrations/YYYYMMDD_create_yellowcard_float_account.js`

### 5.3 Transaction Metadata

MoolahMove transactions use the existing `transactions` table with `metadata` JSONB:

```javascript
{
  transactionType: 'moolahmove_send',
  // What sender paid
  zarFaceValue: 500,               // ZAR face value (excl. fee)
  zarFee: 25,                      // MyMoolah fee (5% incl. VAT)
  zarTotal: 525,                   // Total debited from user
  // Rate the sender accepted (ZAR → USD, locked at quote time)
  zarUsdRate: 18.44,
  // What recipient receives — USD is the committed value
  usdAmount: 27.12,                // USD value guaranteed to recipient
  // Local currency is indicative only — set by Yellow Card at disbursement
  localCurrency: 'MWK',
  localAmountIndicative: null,     // Populated from Yellow Card webhook on completion
  // Recipient
  recipientName: 'Grace Banda',
  recipientAccount: '+265991234567',
  recipientCountry: 'MW',
  recipientProvider: 'Airtel Money',
  // Yellow Card
  yellowCardChannelId: 'mw-airtel-mobile',
  yellowCardDisbursementId: 'YC-123456',
  yellowCardStatus: 'processing',  // pending|processing|completed|failed
  // VALR
  valrOrderId: 'VLR-789',
  valrWithdrawalId: 'VLR-WD-456',
  // Compliance (Travel Rule)
  purpose: 'family_support',
  complianceCleared: true
}
```

> **Why USD, not local currency?**  
> MyMoolah controls the ZAR→USD rate (locked via VALR for 30s). We do NOT control  
> the USD→MWK rate — that is set by Yellow Card and Airtel Money at disbursement time.  
> Quoting in local currency would expose MMTP to FX liability on every transaction.  
> The sender accepts the ZAR→USD rate; the USD amount is our commitment.

---

## 6. Backend Services to Build

### 6.1 `services/yellowCardService.js` 🔧 SKELETON BUILT

**Location**: `/services/yellowCardService.js`  
**Status**: Skeleton built, awaiting Yellow Card sandbox credentials

Key methods:
```javascript
yellowCardService.getChannels(countryCode)          // GET /channels?country=MW
yellowCardService.getRate(channelId, amount)         // GET /rates
yellowCardService.createDisbursement(params)         // POST /disbursements
yellowCardService.getDisbursementStatus(id)          // GET /disbursements/:id
yellowCardService.verifyWebhookSignature(headers, body) // HMAC verification
```

**Authentication**: HMAC-SHA256 (same pattern as VALR HMAC-SHA512)
```
X-YC-Timestamp: Unix timestamp (ms)
X-YC-Signature: HMAC-SHA256(secret, timestamp + method + path + body)
X-YC-Key: API key
```

### 6.2 `services/internationalPaymentService.js` 🔧 SKELETON BUILT

**Location**: `/services/internationalPaymentService.js`  
**Status**: Skeleton built, awaiting Yellow Card sandbox credentials

Orchestration flow:
```
1. validateUser()         → KYC tier 2+, not sanctioned
2. validateBeneficiary()  → Active international account exists
3. checkLimits()          → Per-txn, daily, monthly
4. getValrQuote()         → ZAR→USDC rate from VALR
5. buildYcQuote()         → USDC→local fiat rate from Yellow Card
6. executeValrSwap()      → Buy USDC on VALR
7. createDisbursement()   → POST to Yellow Card
8. postLedger()           → Double-entry accounting
9. createTransaction()    → Record in transactions table
10. return()              → Transaction ID + status
```

### 6.3 `controllers/internationalPaymentController.js` 🔧 TO BUILD

**Location**: `/controllers/internationalPaymentController.js`

Endpoints:
```
GET  /api/v1/moolahmove/channels?country=MW   → Available payout channels
GET  /api/v1/moolahmove/quote                 → Get send quote
POST /api/v1/moolahmove/send                  → Execute payment
GET  /api/v1/moolahmove/transactions          → User's MoolahMove history
POST /api/v1/webhooks/yellowcard              → Yellow Card webhook receiver
```

### 6.4 `routes/moolahMove.js` 🔧 TO BUILD

**Location**: `/routes/moolahMove.js`

---

## 7. Frontend Changes Required

### 7.1 `AddAccountModal.tsx` ✅ BUILT

Added third tab: **"International"** (Globe icon, orange/amber colour)

Fields:
- Country (dropdown, populated from Yellow Card channels)
- Payment Method (dropdown: Mobile Money / Bank Transfer)
- Provider (dropdown: Airtel Money / M-Pesa / etc.)
- Account Number / Mobile Number
- Account Holder Name

Stores `serviceType: 'international'` via `beneficiaryService.addServiceToBeneficiary()`.

### 7.2 `MoolaMoveOverlay.tsx` 🔧 TO BUILD

**Location**: `mymoolah-wallet-frontend/components/overlays/MoolaMoveOverlay.tsx`

Steps:
1. **Beneficiary** — Select existing or add new international recipient
2. **Amount** — Enter ZAR amount
3. **Accept Quote modal** — Simple modal (no PIN, no SMS, no biometric):
   - You send: R525.00 (R500 + R25 fee)
   - Rate: R18.44 / USD (countdown timer)
   - Recipient gets: ~$27.12 USD
   - Delivered via: Airtel Money, Malawi
   - Disclaimer: "Final local currency set by recipient's provider"
   - Buttons: [Cancel] [Accept & Send]
4. **Processing** — "Sending..." spinner (auto, no user action)
5. **Success** — "Payment sent ✓" + "We'll notify you when your family receives it"

**Key UX decisions:**
- No SMS PIN — quote acceptance is sufficient authorisation
- Quote in USD, not local currency — protects MMTP from FX liability
- Local currency shown as indicative only with clear disclaimer
- Rate countdown (30s) creates urgency without friction

### 7.3 `TransactPage.tsx` 🔧 TO BUILD (minor addition)

Add MoolahMove service card:
```typescript
{
  id: 'moolahmove',
  title: 'MoolahMove',
  description: 'Send money internationally',
  icon: <Globe className="w-6 h-6" />,
  available: true,
  badge: 'New',
  kycRequired: 2
}
```

---

## 8. Compliance & Security

### Travel Rule (FATF)
Every MoolahMove transaction must carry:
- **Sender**: name, ID number, country, date of birth (from KYC)
- **Recipient**: name, account number, country
- **Purpose**: family_support | gift | payment | education | medical | other

Yellow Card's `customerDetails` payload accepts this data. Your existing KYC system provides it.

### Sanctions Screening
- Pre-check recipient country against OFAC/UN/EU sanctions list
- Blocked countries: CU, IR, KP, SY, RU (same as USDC blocked list)
- High-risk countries: Enhanced due diligence, lower limits

### KYC Requirements
- **Sender**: Tier 2 KYC minimum (international passport + POA — already required)
- **Recipient**: Name + account number (collected at beneficiary creation)

### Transaction Limits (Recommended)
| Limit | Amount |
|-------|--------|
| Per transaction | R5,000 |
| Daily | R15,000 |
| Monthly | R50,000 |
| New beneficiary (first 24h) | R2,000 |

---

## 9. Environment Variables

### Local Development (`.env`)
```env
# Yellow Card API
YELLOW_CARD_API_URL=https://sandbox.yellowcard.engineering
YELLOW_CARD_API_KEY=sandbox_key_from_portal
YELLOW_CARD_API_SECRET=sandbox_secret_from_portal
YELLOW_CARD_WEBHOOK_SECRET=webhook_secret_from_portal

# MoolahMove Feature Flags
MOOLAHMOVE_ENABLED=true
MOOLAHMOVE_MIN_KYC_TIER=2
MOOLAHMOVE_FEE_PERCENT=5
MOOLAHMOVE_FEE_VAT_INCLUSIVE=true

# Limits (ZAR)
MOOLAHMOVE_LIMIT_PER_TXN=5000
MOOLAHMOVE_LIMIT_DAILY=15000
MOOLAHMOVE_LIMIT_MONTHLY=50000
MOOLAHMOVE_NEW_BENEFICIARY_LIMIT=2000

# Blocked countries (OFAC/UN/EU)
MOOLAHMOVE_BLOCKED_COUNTRIES=CU,IR,KP,SY,RU,UA-43,UA-14,UA-09
```

### Staging/Production (Google Secret Manager)
```bash
gcloud secrets create yellowcard-api-key-staging --data-file=- <<< "key"
gcloud secrets create yellowcard-api-secret-staging --data-file=- <<< "secret"
gcloud secrets create yellowcard-webhook-secret-staging --data-file=- <<< "webhook_secret"
```

---

## 10. Implementation Phases

### Phase 0 — NOW (No Yellow Card needed) ✅ COMPLETE
- [x] `AddAccountModal.tsx` — International tab added
- [x] `yellowCardService.js` — Skeleton with all methods
- [x] `internationalPaymentService.js` — Skeleton with orchestration
- [x] This implementation plan document

### Phase 1 — Yellow Card Onboarding (Weeks 1–4)
- [ ] Email `paymentsapi@yellowcard.io` — request intro call
- [ ] Complete KYB (Know Your Business) submission
- [ ] Receive sandbox API credentials
- [ ] Test `GET /channels` — verify Malawi, Kenya, Zimbabwe channels
- [ ] Test `POST /disbursements` — sandbox disbursement
- [ ] Test webhook delivery

### Phase 2 — Backend Integration (Weeks 3–5, parallel with KYB)
- [ ] Complete `yellowCardService.js` with real endpoint calls
- [ ] Complete `internationalPaymentService.js` orchestration
- [ ] Build `internationalPaymentController.js`
- [ ] Build `routes/moolahMove.js`
- [ ] Register routes in `server.js`
- [ ] Database migration: `international_services` JSONB on beneficiaries
- [ ] Database migration: Yellow Card float ledger account
- [ ] Webhook handler: `POST /api/v1/webhooks/yellowcard`
- [ ] Unit tests: fee calculation, limit validation, compliance checks
- [ ] Integration tests: full flow with Yellow Card sandbox

### Phase 3 — Frontend (Weeks 4–6)
- [ ] Build `MoolaMoveOverlay.tsx` (5-step flow)
- [ ] Add MoolahMove service to `TransactPage.tsx`
- [ ] Update `TransactionHistoryPage.tsx` — MoolahMove transaction display
- [ ] Push notification integration for delivery confirmation
- [ ] UAT with real users (Malawi corridor first)

### Phase 4 — Production Go-Live (Week 6+)
- [ ] Yellow Card KYB approved
- [ ] Production credentials in Google Secret Manager
- [ ] Pre-fund Yellow Card treasury (minimum $1,000 USDC recommended)
- [ ] Soft launch: Malawi corridor only
- [ ] Monitor: webhook delivery rate, disbursement success rate
- [ ] Expand: Kenya, Zimbabwe, Zambia
- [ ] Full launch: All 20 Yellow Card countries

---

## 11. Webhook Handler Design

Yellow Card sends signed webhooks for disbursement status updates.

**Endpoint**: `POST /api/v1/webhooks/yellowcard`  
**Authentication**: HMAC-SHA256 signature verification (no JWT required)

```javascript
// Webhook payload structure (Yellow Card)
{
  "event": "disbursement.completed",  // or .processing, .failed
  "data": {
    "id": "YC-DISBURSEMENT-ID",
    "sequenceId": "MMTP-TXN-ID",      // Our idempotency key → links to our transaction
    "status": "completed",
    "amount": "35420",
    "currency": "MWK",
    "completedAt": "2026-02-24T10:15:00Z"
  }
}
```

**Handler logic**:
1. Verify HMAC-SHA256 signature
2. Find transaction by `sequenceId` (our transaction ID)
3. Update `metadata.yellowCardStatus` and `status`
4. Post ledger entry if `completed`
5. Send push notification to SA user
6. Respond `200 OK` within 5 seconds (Yellow Card retries on failure)

---

## 12. Key Contacts

| Contact | Details |
|---------|---------|
| Yellow Card Sales | paymentsapi@yellowcard.io |
| Yellow Card Docs | docs.yellowcard.engineering |
| Yellow Card Portal | portal.yellowcard.engineering |
| VALR Support | support@valr.com |
| VALR API Docs | docs.valr.com |

---

## 13. Files Created / Modified

| File | Status | Description |
|------|--------|-------------|
| `docs/MOOLAH_MOVE_IMPLEMENTATION_PLAN.md` | ✅ New | This document |
| `services/yellowCardService.js` | ✅ New | Yellow Card API service skeleton |
| `services/internationalPaymentService.js` | ✅ New | Orchestration service skeleton |
| `mymoolah-wallet-frontend/components/overlays/shared/AddAccountModal.tsx` | ✅ Modified | Added International tab |
| `controllers/internationalPaymentController.js` | 🔧 Phase 2 | API controller |
| `routes/moolahMove.js` | 🔧 Phase 2 | Express routes |
| `mymoolah-wallet-frontend/components/overlays/MoolaMoveOverlay.tsx` | 🔧 Phase 3 | Consumer UI overlay |

---

*Document maintained by AI Agent. Update after each implementation phase.*  
*Last updated: February 24, 2026*
