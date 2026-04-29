**Last Updated**: April 26, 2026
**Version**: 3.0.1 - VAT pass-through accounting API notes
**Status**: ✅ **PRODUCTION LIVE** ✅ **API api-mm.mymoolah.africa** ✅ **WALLET wallet.mymoolah.africa** ✅ **VAT PASS-THROUGH POLICY FORMALISED** ✅ **WALLET-BANK EFT UAT API** ✅ **PAYSHAP RPP INSTANT PAYMENT** ✅ **EEZIAIRTIME PIN & COPY** ✅ **EASYPAY** ✅ **RECONCILIATION LIVE** ✅ **REFERRAL SYSTEM LIVE** ✅ **OTP SYSTEM LIVE** ✅ **MOBILEMART INTEGRATED** ✅ **ELECTRICITY SUPPLIER COMPARISON**

---

## Recent Updates

**For full change history**, see [CHANGELOG.md](./CHANGELOG.md) and [AGENT_HANDOVER.md](./AGENT_HANDOVER.md).

### v3.0.0 — Wallet-to-bank EFT H2H API (April 25, 2026)
New `/api/v1/wallet-bank-payments` endpoints quote and submit consumer wallet-to-bank payments. EFT is the default rail; PayShap RPP is available through the Instant Payment option. Requires migration `20260425110000_create_wallet_bank_payments_and_fee_policies.js` before UAT testing. The migration is now hardened for partial reruns and was confirmed successful for UAT and staging in Codespaces.

### v3.0.1 — VAT pass-through accounting policy (April 26, 2026)
API-facing payment flows now follow the canonical policy in `docs/VAT_ACCOUNTING_STRATEGY.md`: supplier, bank, client, and merchant pass-through fees are not MMTP revenue and must not create MMTP VAT control or TaxTransaction records. API responses may expose fee breakdowns for transparency, but accounting writes split pass-through amounts to clearing/payable accounts and MMTP-owned revenue to revenue + VAT control.

### Website / MMAP integration boundary (April 25, 2026)
`www.mymoolah.africa` SEO, public content, FAQs, and website AI support should be managed in the separate website project/Claude Code. MMTP APIs documented here remain the source of truth for secure wallet, MMAP, auth, audit, and payment integration contracts consumed by that website.

### v2.89.0 — Disbursement Client Management API (April 7, 2026)
New `/api/v1/disbursement-clients` endpoints for corporate client onboarding, KYB document management, fee configuration, and beneficiary file parsing. See [Disbursement Client API](#disbursement-client-management) section below.

---

## 🚀 **API OVERVIEW**

The MyMoolah Treasury Platform provides a comprehensive REST API built on **banking-grade standards** and **Mojaloop compliance**. The API is designed to handle **millions of transactions** with enterprise-grade security, performance, and reliability.

### **API Standards**
- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Format**: All requests and responses in JSON format
- **Authentication**: JWT-based secure authentication
- **Rate Limiting**: API abuse prevention with configurable limits
- **Versioning**: API versioning for backward compatibility
- **Documentation**: OpenAPI 3.0 specification available

### Codespaces Base URL (dev)
In Codespaces, the frontend runs on the 3000 forwarded URL and the backend on a forwarded host (3001 or 5050). Set:

```
VITE_API_BASE_URL=https://<your-backend-forwarded-host>
```

Ensure `CORS_ORIGINS` (backend) includes `https://<your-3000-forwarded-host>`.

---

## 💸 **WALLET-BANK PAYMENT API**

### **Overview**
Wallet-bank payment endpoints support consumer wallet-to-bank transfers. EFT is the default H2H rail. Instant Payment uses existing PayShap RPP rails and applies existing RPP fee logic.

### **Quote Wallet-Bank Payment**
```http
POST /api/v1/wallet-bank-payments/quote
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request**
```json
{
  "beneficiaryAccountId": 123,
  "amount": 100.00,
  "rail": "eft"
}
```

**Rail values**
- `eft` — SBSA H2H EFT, default bank-payment rail.
- `payshap` — Instant Payment via PayShap RPP.

**Response**
```json
{
  "success": true,
  "data": {
    "rail": "eft",
    "amount": 100,
    "feeAmount": 2,
    "totalDebit": 102,
    "currency": "ZAR",
    "settlementEstimate": {
      "cutoffSast": "15:00",
      "requestedExecutionDate": "2026-04-25",
      "estimatedReceiverAvailabilityDate": "2026-04-28",
      "message": "Receiver should receive funds by Tuesday, 28 April 2026."
    },
    "beneficiary": {
      "id": 123,
      "name": "Beneficiary Name",
      "bankName": "Standard Bank",
      "accountNumberLast4": "1234",
      "branchCode": "051001"
    }
  }
}
```

### **Submit Wallet-Bank Payment**
```http
POST /api/v1/wallet-bank-payments/submit
Authorization: Bearer <jwt_token>
X-Idempotency-Key: <uuid>
Content-Type: application/json
```

**Request**
```json
{
  "beneficiaryAccountId": 123,
  "amount": 100.00,
  "rail": "eft",
  "reference": "Rent Apr"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "paymentId": "WB-EFT-...",
    "status": "processing",
    "rail": "eft",
    "amount": 100,
    "feeAmount": 2,
    "totalDebit": 102,
    "settlementEstimate": {
      "message": "Receiver should receive funds by Tuesday, 28 April 2026."
    }
  }
}
```

### **Security and Operational Notes**
- Endpoints require JWT auth and KYC verification.
- Submit is protected by the platform idempotency middleware.
- Routes are covered by the financial transaction rate limiter.
- EFT submissions snapshot fee policy and settlement estimate in `wallet_bank_payments`.
- Pain.002 NACK/rejection responses reverse/refund wallet-bank EFTs.
- UAT launch fee policy: `WALLET_BANK_EFT_UAT_FLAT_R2` (`R2.00`).
- Production should remain disabled with `WALLET_BANK_EFT_ENABLED=false` until SBSA Penny #2 FINAUD and inbound R10 validation are confirmed.

---

## 🔐 **AUTHENTICATION & SECURITY**

### **Authentication Methods**

#### **JWT Token Authentication**
```http
Authorization: Bearer <jwt_token>
```

#### **API Key Authentication (for supplier integrations)**
```http
X-API-Key: <encrypted_api_key>
```

### **Security Features**
- **TLS 1.3**: End-to-end encryption for all API calls
- **Rate Limiting**: Configurable rate limits per endpoint
- **Input Validation**: Comprehensive data validation and sanitization
- **SQL Injection Protection**: Parameterized queries and input sanitization
- **XSS Protection**: Cross-site scripting prevention
- **CORS Configuration**: Configurable cross-origin resource sharing

---

## 📊 **PRODUCT CATALOG API**

### **Core Product Endpoints**

#### **1. Get All Products**
```http
GET /api/v1/products
```

**Description**: Retrieves all active products with their variants from all suppliers.

**Query Parameters**:
- `category` (optional): Filter by product category
- `type` (optional): Filter by product type
- `supplier` (optional): Filter by supplier
- `page` (optional): Page number for pagination
- `limit` (optional): Number of products per page
- `search` (optional): Search products by name or description

**Response Example**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "MTN Airtime",
        "description": "MTN mobile airtime recharge",
        "category": "airtime",
        "type": "prepaid",
        "is_active": true,
        "variants": [
          {
            "id": 1,
            "name": "MTN Airtime R10",
            "price": 1000,
            "commission_rate": 2.5,
            "supplier": {
              "id": 1,
              "name": "Flash",
              "commission_structure": "dynamic"
            }
          },
          {
            "id": 2,
            "name": "MTN Airtime R10",
            "price": 1000,
            "commission_rate": 2.0,
            "supplier": {
              "id": 2,
              "name": "MobileMart",
              "commission_structure": "fixed"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 172,
      "pages": 9
    }
  }
}
```

#### **2. Get Product by ID**
```http
GET /api/v1/products/:id
```

**Description**: Retrieves a specific product with all its variants and supplier information.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "MTN Airtime",
      "description": "MTN mobile airtime recharge",
      "category": "airtime",
      "type": "prepaid",
      "is_active": true,
      "variants": [...],
      "metadata": {
        "network": "MTN",
        "country": "ZA",
        "currency": "ZAR"
      }
    }
  }
}
```

#### **3. Search Products**
```http
GET /api/v1/products/search?q=<search_query>
```

**Description**: Full-text search across product names, descriptions, and metadata.

**Query Parameters**:
- `q` (required): Search query string
- `category` (optional): Filter by category
- `supplier` (optional): Filter by supplier
- `min_price` (optional): Minimum price filter
- `max_price` (optional): Maximum price filter

#### **4. Get Products by Category**
```http
GET /api/v1/products/category/:category
```

**Description**: Retrieves all products in a specific category.

**Available Categories**:
- `airtime`: Mobile airtime products
- `data`: Mobile data packages
- `electricity`: Electricity vouchers
- `vouchers`: Digital vouchers and gift cards
- `bill_payment`: Bill payment services
- `cash_out`: Cash withdrawal services
- `international`: International services

#### **5. Get Product Variants**
```http
GET /api/v1/products/:id/variants
```

**Description**: Retrieves all variants for a specific product with supplier comparison.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "variants": [
      {
        "id": 1,
        "name": "MTN Airtime R10",
        "price": 1000,
        "commission_rate": 2.5,
        "commission_amount": 25,
        "supplier": {
          "id": 1,
          "name": "Flash",
          "rating": 4.8,
          "success_rate": 99.5
        },
        "metadata": {
          "flash_product_id": "MTN_AIR_10",
          "availability": true,
          "processing_time": "instant"
        }
      }
    ],
    "comparison": {
      "best_commission": 2.5,
      "best_supplier": "Flash",
      "price_range": {
        "min": 1000,
        "max": 1000
      }
    }
  }
}
```

### **Product Purchase Endpoints**

#### **1. Purchase Product**
```http
POST /api/v1/products/purchase
```

**Description**: Purchases a product variant from the selected supplier.

**Request Body**:
```json
{
  "variant_id": 1,
  "user_id": 123,
  "quantity": 1,
  "payment_method": "wallet",
  "recipient_phone": "+27123456789",
  "metadata": {
    "purchase_reason": "personal_use",
    "location": "Johannesburg"
  }
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ORD_20250830_001",
      "status": "processing",
      "product": {
        "name": "MTN Airtime R10",
        "price": 1000,
        "commission": 25
      },
      "supplier": "Flash",
      "estimated_completion": "2025-08-30T10:00:00Z",
      "tracking_id": "FLASH_12345"
    }
  }
}
```

#### **2. Get Order Status**
```http
GET /api/v1/orders/:order_id
```

**Description**: Retrieves the current status of a product purchase order.

#### **3. Cancel Order**
```http
POST /api/v1/orders/:order_id/cancel
```

**Description**: Cancels a pending order if possible.

---

## 🌍 **INTERNATIONAL SERVICES API**

### **International Airtime & Data Services**

#### **1. Get International Services**
```http
GET /api/v1/services/international
```

**Description**: Retrieves available international airtime and data services.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "international_airtime": [
      {
        "id": 1,
        "name": "International Airtime",
        "description": "Top-up international numbers",
        "countries": ["US", "UK", "DE", "FR", "AU"],
        "networks": ["AT&T", "Vodafone", "T-Mobile", "Orange", "Telstra"],
        "status": "coming_soon",
        "estimated_launch": "2025-Q4"
      }
    ],
    "international_data": [
      {
        "id": 2,
        "name": "International Data",
        "description": "Global data roaming packages",
        "countries": ["US", "UK", "DE", "FR", "AU"],
        "packages": [
          {
            "name": "1GB Global Data",
            "price": 5000,
            "validity": "30 days",
            "coverage": "160+ countries"
          }
        ],
        "status": "coming_soon",
        "estimated_launch": "2025-Q4"
      }
    ]
  }
}
```

#### **2. Get International Coverage**
```http
GET /api/v1/services/international/coverage
```

**Description**: Retrieves international service coverage by country and network.

#### **3. Get International Pricing**
```http
GET /api/v1/services/international/pricing
```

**Description**: Retrieves international service pricing and commission structures.

---

## 🔄 **CATALOG SYNCHRONIZATION API**

### **Supplier Catalog Management**

#### **1. Sync Flash Products**
```http
POST /api/v1/admin/catalog/sync/flash
```

**Description**: Synchronizes product catalog with Flash supplier (admin only).

**Response Example**:
```json
{
  "success": true,
  "data": {
    "sync_status": "completed",
    "products_updated": 167,
    "new_products": 0,
    "price_updates": 12,
    "commission_updates": 5,
    "sync_timestamp": "2025-08-30T09:00:00Z"
  }
}
```

#### **2. Sync MobileMart Products**
```http
POST /api/v1/admin/catalog/sync/mobilemart
```

**Description**: Synchronizes product catalog with MobileMart supplier (admin only).

#### **3. Sync All Suppliers**
```http
POST /api/v1/admin/catalog/sync/all
```

**Description**: Synchronizes product catalog with all active suppliers (admin only).

#### **4. Get Sync Status**
```http
GET /api/v1/admin/catalog/sync/status
```

**Description**: Retrieves the status of recent catalog synchronization operations (admin only).

---

## 🔌 **MOBILEMART FULCRUM API**

### **MobileMart Fulcrum Integration**

MyMoolah integrates with **MobileMart Fulcrum API** for VAS (Value Added Services) including airtime, data, vouchers, bill payments, and prepaid utilities.

#### **Configuration**
- **Base URL**: `https://uat.fulcrumswitch.com` (UAT) or `https://fulcrumswitch.com` (PROD)
- **OAuth Endpoint**: `/connect/token`
- **API Version**: v1
- **Authentication**: OAuth 2.0 Client Credentials

#### **1. Health Check**
```http
GET /api/v1/mobilemart/health
```

**Description**: Checks MobileMart integration health status.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "token_valid": true,
    "api_url": "https://uat.fulcrumswitch.com/api/v1",
    "timestamp": "2025-11-05T12:00:00Z"
  }
}
```

#### **2. Get Products by VAS Type**
```http
GET /api/v1/mobilemart/products/:vasType
```

**Description**: Retrieves available products for a specific VAS type from MobileMart.

**VAS Types**:
- `airtime` - Mobile airtime (pinned and pinless)
- `data` - Mobile data packages (pinned and pinless)
- `voucher` - Pinned vouchers
- `billpayment` - Bill payment services
- `prepaidutility` - Prepaid electricity (electricity)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "vasType": "airtime",
    "products": [
      {
        "merchantProductId": "MTN_AIR_10",
        "name": "MTN Airtime R10",
        "amount": 10.00,
        "currency": "ZAR",
        "network": "MTN",
        "type": "pinless"
      }
    ]
  }
}
```

#### **3. Purchase Product**
```http
POST /api/v1/mobilemart/purchase/:vasType
```

**Description**: Purchases a product from MobileMart.

**Request Body**:
```json
{
  "merchantProductId": "MTN_AIR_10",
  "mobileNumber": "+27123456789",
  "amount": 10.00,
  "requestId": "unique-request-id"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "transactionId": "MM_123456789",
      "requestId": "unique-request-id",
      "status": "completed",
      "amount": 10.00,
      "timestamp": "2025-11-05T12:00:00Z"
    }
  }
}
```

#### **Error Codes**
MobileMart Fulcrum API returns standard error codes:
- `1000` - ProductDoesNotExist
- `1001` - AmountInvalid (upstream provider rejection — automatic failover to next supplier)
- `1002` - CannotSourceProduct (upstream supply issue — automatic failover to next supplier)
- `1006` - UserNotAuthenticated
- `1008` - MerchantCreditLimitReached
- `1013` - MobileNumberInvalid (terminal — no failover)
- `1016` - ConsumerAccountError

**Failover behaviour (v2.97.0+):** All non-terminal errors trigger automatic failover to alternative suppliers. The response includes `triedSuppliers` and `failoverUsed` fields when failover was attempted. Only if ALL suppliers fail does the error reach the client.

---

## 💰 **SUPPLIER PRICING API**

### **Commission & Pricing Management**

#### **1. Get Supplier Pricing**
```http
GET /api/v1/admin/suppliers/:supplier_id/pricing
```

**Description**: Retrieves pricing and commission structure for a specific supplier (admin only).

#### **2. Update Commission Rates**
```http
PUT /api/v1/admin/suppliers/:supplier_id/commission
```

**Description**: Updates commission rates for a specific supplier (admin only).

#### **3. Get Commission Comparison**
```http
GET /api/v1/admin/suppliers/commission/comparison
```

**Description**: Compares commission rates across all suppliers (admin only).

---

## 📱 **WALLET & TRANSACTION API**

### **Wallet Management**

#### **1. Get Wallet Balance**
```http
GET /api/v1/wallet/balance
```

**Description**: Retrieves current wallet balance and transaction history.

#### **2. Get Transaction History**
```http
GET /api/v1/wallet/transactions
```

**Description**: Retrieves wallet transaction history with filtering options.

### **Transaction Management**

#### **1. Get Transaction by ID**
```http
GET /api/v1/transactions/:transaction_id
```

**Description**: Retrieves detailed information about a specific transaction.

#### **2. Get Transactions by Type**
```http
GET /api/v1/transactions/type/:type
```

**Description**: Retrieves transactions filtered by type (airtime, data, electricity, etc.).

---

## ⚡ **ELECTRICITY OVERLAY API**

### **Electricity Purchase Flow**

The electricity overlay allows users to purchase prepaid electricity tokens. The system uses commission-based supplier selection via the `v_best_offers` materialized view to automatically route each purchase to the supplier (Flash or MobileMart) paying the highest commission.

**Flow**: Select beneficiary → Fetch catalog → Enter amount → Confirm → Purchase → Token displayed

#### **1. Get Electricity Catalog**
```http
GET /api/v1/overlay/electricity/catalog?beneficiaryId=:id
```

**Description**: Returns the electricity product catalog for a beneficiary's meter. The response includes the winning supplier (highest commission), dynamic minimum/maximum amounts, and suggested denominations. Products are sorted by commission (best first).

**Query Parameters**:
- `beneficiaryId` (required if no `meterNumber`): User's saved electricity beneficiary ID
- `meterNumber` (required if no `beneficiaryId`): Meter number for direct lookup

**Response Example**:
```json
{
  "success": true,
  "data": {
    "beneficiary": {
      "id": 42,
      "label": "Home Electricity",
      "identifier": "04285639987",
      "meterType": "City of Cape Town"
    },
    "meterValid": true,
    "providers": ["MOBILEMART", "FLASH"],
    "minAmount": 30,
    "maxAmount": 2000,
    "suggestedAmounts": [30, 50, 100, 200, 500, 1000, 2000],
    "products": [
      {
        "id": "1234",
        "supplierProductId": "ELEC_COCT",
        "name": "Electricity",
        "minAmount": 30,
        "maxAmount": 2000,
        "commission": 0.85,
        "supplier": "Flash",
        "supplierCode": "FLASH",
        "description": ""
      }
    ]
  }
}
```

**Important**: The `products[0].id` is the `ProductVariant` ID of the winning supplier. The frontend must send this as `productId` in the purchase request to enable commission-based routing.

#### **2. Purchase Electricity**
```http
POST /api/v1/overlay/electricity/purchase
```

**Description**: Purchases a prepaid electricity token. If `productId` is provided, the backend resolves the supplier from the `ProductVariant` record. If omitted (backward compatibility), the backend falls back to environment variable-based supplier selection.

**Request Body**:
```json
{
  "beneficiaryId": 42,
  "amount": 50,
  "idempotencyKey": "elec-uuid-v4-here",
  "acceptTerms": true,
  "productId": "1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `beneficiaryId` | integer | Yes | Saved electricity beneficiary ID |
| `amount` | number | Yes | Amount in ZAR (min: R10 Flash / R30 MobileMart, max: R2000) |
| `idempotencyKey` | string | Yes | UUID v4 for idempotent purchase |
| `acceptTerms` | boolean | Yes | Must be `true` |
| `productId` | string | No | ProductVariant ID from catalog. Enables commission-based supplier routing. |

**Supplier Routing Logic**:
1. If `productId` is provided → resolve `ProductVariant` → use that supplier
2. If supplier's circuit breaker is OPEN → failover to alternative supplier
3. If `productId` is absent or variant not found → fall back to env-var routing

**Success Response** (`200`):
```json
{
  "success": true,
  "data": {
    "transactionId": "txn-uuid",
    "token": "58302326064655072709",
    "units": 7.3,
    "unitType": "kWh",
    "amount": 50,
    "supplier": "MOBILEMART",
    "meterNumber": "04285639987"
  }
}
```

**Error Responses**:
- `400`: Invalid amount, missing fields, or amount below supplier minimum
- `402`: Insufficient wallet balance
- `404`: Beneficiary not found
- `409`: Duplicate idempotency key
- `500`: Supplier API error
- `504`: Supplier API timeout (after retry)

**Ledger Journal Entries** (per purchase):
1. **Face value**: DR `2100-01-01` (Client Float) / CR `1200-10-04` or `1200-10-05` (Flash or MobileMart Float)
2. **Commission**: DR `2200-01-01` (Commission Clearing) / CR `4000-10-01` (Commission Revenue)
3. **VAT on commission**: DR `2200-01-01` (Commission Clearing) / CR `2300-10-01` (VAT Control)

---

## 🎫 **VOUCHER API**

### **EasyPay — Bill Payment Receiver V5 (Phase 1 cash-in)**

The **EasyPay switch** calls MMTP on **`/billpayment/v1/*`** (canonical) or **`/api/v1/easypay/*`** (alias). **Wallet credit** occurs on **`POST .../paymentNotification`** after successful POS payment.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/billpayment/v1/ping` | Health |
| POST | `/billpayment/v1/infoRequest` | Bill lookup |
| POST | `/billpayment/v1/authorisationRequest` | Pre-auth |
| POST | `/billpayment/v1/paymentNotification` | Finalise payment; credit wallet + ledger |

**Auth**: `Authorization: SessionToken {token}` (token = `EASYPAY_API_KEY`), or `X-API-Key`; UAT may allow Bearer for simulation — see `middleware/easypayAuth.js`.

**Spec**: `integrations/easypay/EasypayReceiverV5.yaml`. **Partner questions / recon**: `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md`. **Guide**: `docs/integrations/EasyPay_API_Integration_Guide.md` v1.1.0.

---

### **EasyPay Top-up — issue PIN (app API)**

#### **1. Create Top-up Request**
```http
POST /api/v1/vouchers/easypay/issue
```

**Description**: Creates EasyPay top-up **Voucher** + **Bill** (`userId` set) for V5 lookup. No wallet debit — user pays at EasyPay; wallet is credited when **`paymentNotification`** is received (not via this endpoint).

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "original_amount": 100.00,
  "issued_to": "self",
  "description": "Top-up at EasyPay"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "EasyPay top-up request created successfully",
  "data": {
    "easypay_code": "91234754101297",
    "amount": 100.00,
    "expires_at": "2026-02-15T14:53:00.000Z",
    "sms_sent": false,
    "wallet_balance": 500.00,
    "voucher_id": 123
  }
}
```

**Notes**:
- Amount range: R50 - R4000
- Voucher expires 30 days after creation
- Wallet balance remains unchanged (no debit on creation)
- Requires DB migration `20260409_01_add_userId_to_bills` (`bills.userId`)
- User must pay at EasyPay store; **V5** completes the flow via **`/billpayment/v1/paymentNotification`**

#### **2. Legacy settlement-style callback (confirm with EasyPay)**
```http
POST /api/v1/vouchers/easypay/topup/settlement
```
(There is also `POST /api/v1/vouchers/easypay/settlement` in routes — treat both as **legacy** until EasyPay confirms E1 in the partner checklist.)

**Description**: Older MMTP-documented callback shape. **Phase 1 production** should use **V5** above. Confirm with EasyPay whether this route is still used by any switch flow — see **EasyPay_V5_PARTNER_QA_CHECKLIST.md** (E1).

**Authentication**: API Key (EasyPay integration)

**Request Body**:
```json
{
  "easypay_code": "91234754101297",
  "settlement_amount": "100.00",
  "merchant_id": "MERCHANT123",
  "transaction_id": "EP-TXN-123456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "EasyPay top-up settled successfully",
  "data": {
    "easypay_code": "91234754101297",
    "gross_amount": 100.00,
    "net_amount": 97.50,
    "fee_applied": 2.50,
    "status": "completed",
    "settlement_transaction_id": "STL-..."
  }
}
```

**Transaction behaviour (if this legacy path is still active)**:
- May differ from **V5** `paymentNotification` (which credits **gross** then debits **pass-through** fee per `easyPayDepositService.js`).

**V5 fee model** (current production path): R5.50 excl. VAT + cash handling % + VAT; MMTP margin zero — see `env.template` `EASYPAY_TOPUP_*` and partner checklist §B.

#### **3. Cancel Top-up Voucher**
```http
DELETE /api/v1/vouchers/easypay/:voucherId
```

**Description**: Cancels a pending top-up voucher. No wallet credit occurs (wallet was never debited).

**Authentication**: Required (JWT Bearer token)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Top-up voucher cancelled successfully",
  "data": {
    "voucherId": 123,
    "easyPayCode": "91234754101297",
    "originalAmount": 100.00,
    "refundAmount": 0,
    "note": "Top-up vouchers do not require refund as wallet was never debited",
    "cancelledAt": "2026-01-15T15:00:00.000Z"
  }
}
```

**Notes**:
- Only pending top-up vouchers can be cancelled
- No wallet credit on cancellation (wallet was never debited)
- Voucher status changes to `cancelled`

---

## 📺 **WATCH TO EARN API**

### **Watch to Earn Endpoints**

The Watch to Earn API allows users to earn wallet credits by watching video advertisements. Merchants prepay into ad float accounts, and users earn R2.00-R3.00 per ad view.

#### **1. Get Available Ads**
```http
GET /api/v1/ads/available
```

**Description**: Retrieves all available video ads that the user can watch to earn credits.

**Authentication**: Required (JWT Bearer token)

**Rate Limiting**: 10 requests/hour

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "00000000-0001-0000-0000-000000000001",
      "title": "Capitec Bank Savings",
      "description": "Open a savings account with zero monthly fees",
      "videoUrl": "https://storage.googleapis.com/...",
      "thumbnailUrl": "https://storage.googleapis.com/...",
      "durationSeconds": 15,
      "adType": "reach",
      "rewardPerView": 2.00,
      "costPerView": 6.00
    },
    {
      "id": "00000000-0002-0000-0000-000000000002",
      "title": "Takealot Black Friday",
      "description": "Biggest sale of the year! Free delivery on orders over R500.",
      "videoUrl": "https://storage.googleapis.com/...",
      "thumbnailUrl": "https://storage.googleapis.com/...",
      "durationSeconds": 15,
      "adType": "engagement",
      "rewardPerView": 3.00,
      "costPerView": 15.00
    }
  ]
}
```

**Notes**:
- UAT/Staging: All ads visible, re-watching allowed
- Production: Ads disappear after viewing (one-view-per-ad fraud prevention)

#### **2. Start Ad View**
```http
POST /api/v1/ads/:campaignId/start
```

**Description**: Starts tracking an ad view session. Creates a view record with status 'started'.

**Authentication**: Required (JWT Bearer token)

**Rate Limiting**: 5 ads/hour

**Idempotency**: Supported (X-Idempotency-Key header)

**Path Parameters**:
- `campaignId` (UUID): Campaign ID from available ads

**Request Body**:
```json
{
  "idempotencyKey": "unique-key-123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "00000000-0001-0000-0000-000000000010",
    "campaignId": "00000000-0001-0000-0000-000000000001",
    "userId": 1,
    "status": "started",
    "startedAt": "2026-01-20T16:00:00.000Z"
  }
}
```

**Notes**:
- UAT/Staging: Deletes old view record if user re-watches same ad
- Production: Returns error if user already watched ad

#### **3. Complete Ad View**
```http
POST /api/v1/ads/:campaignId/complete
```

**Description**: Completes an ad view and credits the user's wallet. Requires watching 95%+ of video duration.

**Authentication**: Required (JWT Bearer token)

**Rate Limiting**: 5 ads/hour

**Idempotency**: Supported (X-Idempotency-Key header)

**Path Parameters**:
- `campaignId` (UUID): Campaign ID

**Request Body**:
```json
{
  "viewId": "00000000-0001-0000-0000-000000000010",
  "watchDuration": 14,
  "idempotencyKey": "unique-key-123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "You earned R2.00!",
  "data": {
    "viewId": "00000000-0001-0000-0000-000000000010",
    "rewardAmount": 2.00,
    "transactionId": "AD_VIEW_1737388800000_abc123",
    "walletBalance": 150.00
  }
}
```

**Error Responses**:
- `400 Bad Request`: Video not watched completely (required: 95%+ of duration)
- `400 Bad Request`: View not found or already completed
- `400 Bad Request`: Merchant has insufficient ad budget
- `500 Internal Server Error`: Database or transaction error

**Notes**:
- Atomic transaction: debits merchant ad float, credits user wallet, updates view record
- Creates transaction history entry with type 'receive'
- Posts to ledger (async, non-blocking)

#### **4. Record Engagement (Engagement Ads Only)**
```http
POST /api/v1/ads/:campaignId/engage
```

**Description**: Records user engagement (lead capture) for Engagement ads. Sends user details to merchant and credits R1.00 bonus.

**Authentication**: Required (JWT Bearer token)

**Rate Limiting**: 10 engagements/day

**Idempotency**: Supported (X-Idempotency-Key header)

**Path Parameters**:
- `campaignId` (UUID): Campaign ID (must be Engagement ad type)

**Request Body**:
```json
{
  "viewId": "00000000-0001-0000-0000-000000000010",
  "name": "John Doe",
  "phone": "+27821234567",
  "email": "john@example.com",
  "idempotencyKey": "unique-key-123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Engagement recorded! You earned R1.00 bonus!",
  "data": {
    "engagementId": "00000000-0001-0000-0000-000000000020",
    "bonusAmount": 1.00,
    "leadSent": true,
    "deliveryMethod": "email"
  }
}
```

**Notes**:
- Only works for Engagement ad types
- Sends lead to merchant via email or webhook (configured in campaign)
- Credits R1.00 bonus to user wallet (in addition to R2.00 view reward)

#### **5. Get Ad View History**
```http
GET /api/v1/ads/history
```

**Description**: Retrieves user's ad view history with rewards earned.

**Authentication**: Required (JWT Bearer token)

**Query Parameters**:
- `limit` (optional, default: 50): Number of records to return
- `offset` (optional, default: 0): Pagination offset

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "00000000-0001-0000-0000-000000000010",
      "campaignId": "00000000-0001-0000-0000-000000000001",
      "campaignTitle": "Capitec Bank Savings",
      "status": "completed",
      "rewardAmount": 2.00,
      "watchDurationSeconds": 14,
      "completedAt": "2026-01-20T16:00:15.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

### **Watch to Earn Business Rules**

1. **Rate Limiting**:
   - 5 ads/hour per user
   - 10 engagements/day per user

2. **Watch Duration**:
   - Must watch 95%+ of video duration to earn reward
   - Server-side verification (client-reported duration validated)

3. **Fraud Prevention**:
   - Production: One view per user per campaign (unique constraint)
   - UAT/Staging: Re-watching allowed for testing

4. **Financial Model**:
   - Reach ads: Merchant pays R6.00, user earns R2.00, MM revenue R4.00
   - Engagement ads: Merchant pays R15.00, user earns R3.00 (R2.00 view + R1.00 bonus), MM revenue R12.00

5. **Prefunded Float**:
   - Merchants prepay into ad float account (separate from voucher balance)
   - Ad views debited from merchant ad float balance
   - Campaign paused when merchant has insufficient balance

---

### **Voucher Management**

#### **1. Get User Vouchers**
```http
GET /api/v1/vouchers
```

**Description**: Retrieves all vouchers for the authenticated user.

**Authentication**: Required (JWT Bearer token)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "voucherType": "easypay_topup",
      "status": "pending_payment",
      "easyPayCode": "91234754101297",
      "originalAmount": 100.00,
      "balance": 0,
      "expiresAt": "2026-01-19T14:53:00.000Z"
    }
  ]
}
```

#### **2. Get Voucher Balance Summary**
```http
GET /api/v1/vouchers/balance-summary
```

**Description**: Retrieves voucher balance summary (excludes top-up vouchers from active assets).

**Authentication**: Required (JWT Bearer token)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "activeValue": 360.00,
    "pendingValue": 0,
    "totalValue": 360.00,
    "activeCount": 1,
    "pendingCount": 1
  }
}
```

**Notes**:
- `activeValue` excludes top-up vouchers (user hasn't paid yet)
- Top-up vouchers are tracked separately

---

## 📷 **QR CODE PAYMENT API**

### **QR Code Scanning & Payment**

#### **1. Validate QR Code**
```http
POST /api/v1/qr/validate
```

**Description**: Validates a scanned QR code and retrieves merchant and payment information.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "qrCode": "ZAPPER_woolworths_R125.50"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "woolworths_001",
      "name": "Woolworths",
      "category": "retail"
    },
    "paymentDetails": {
      "amount": 125.50,
      "currency": "ZAR",
      "reference": "REF123456"
    },
    "valid": true
  }
}
```

#### **2. Initiate QR Payment**
```http
POST /api/v1/qr/payment
```

**Description**: Initiates a payment from a validated QR code.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "qrCode": "ZAPPER_woolworths_R125.50",
  "amount": 125.50,
  "walletId": "user_wallet_123",
  "reference": "REF123456"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "paymentId": "PAY_20250109_001",
    "status": "completed",
    "merchant": {
      "name": "Woolworths",
      "id": "woolworths_001"
    },
    "amount": 125.50,
    "transactionId": "TXN_20250109_001",
    "timestamp": "2025-01-09T12:00:00Z"
  }
}
```

#### **3. Get Featured Merchants**
```http
GET /api/v1/qr/merchants/featured
```

**Description**: Retrieves featured merchants that accept QR code payments.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "woolworths_001",
        "name": "Woolworths",
        "category": "retail",
        "logo": "https://example.com/woolworths-logo.png",
        "description": "Premium retail store"
      }
    ]
  }
}
```

### **QR Code Scanning Features**
- **Cross-Browser Camera Support**: iOS Safari, Android Chrome, Desktop Chrome
- **Continuous Real-Time Scanning**: Automatic QR code detection every 100ms
- **Opera Mini Fallback**: Graceful fallback with upload option guidance
- **Enhanced Upload Detection**: 6 detection strategies for QR codes with logo overlays
- **Mobile-Optimized**: Proper touch handling and responsive UI

---

## 🔐 **USER MANAGEMENT API**

### **Authentication**

#### **1. User Login**
```http
POST /api/v1/auth/login
```

**Description**: Authenticates user and returns JWT token.

#### **2. User Registration**
```http
POST /api/v1/auth/register
```

**Description**: Registers a new user account.

#### **3. Refresh Token**
```http
POST /api/v1/auth/refresh
```

**Description**: Refreshes expired JWT token.

#### **4. Forgot Password (Request OTP)**
```http
POST /api/v1/auth/forgot-password
```

**Description**: Requests OTP for password reset. OTP sent via SMS to registered phone.

**Request Body**:
```json
{
  "phoneNumber": "0821234567"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If an account exists with this phone number, an OTP will be sent.",
  "expiresInMinutes": 10
}
```

#### **5. Reset Password (Verify OTP)**
```http
POST /api/v1/auth/reset-password
```

**Description**: Resets password after OTP verification.

**Request Body**:
```json
{
  "phoneNumber": "0821234567",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

#### **6. Request Phone Change (Authenticated)**
```http
POST /api/v1/auth/request-phone-change
```

**Description**: Requests OTP to change phone number. OTP sent to new phone.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "newPhoneNumber": "0829876543"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent to new phone number. Please verify to complete the change.",
  "expiresInMinutes": 10
}
```

#### **7. Verify Phone Change (Authenticated)**
```http
POST /api/v1/auth/verify-phone-change
```

**Description**: Completes phone number change after OTP verification.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "newPhoneNumber": "0829876543",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Phone number changed successfully.",
  "newPhoneNumber": "+27829876543"
}
```

### **User Profile**

#### **1. Get User Profile**
```http
GET /api/v1/users/profile
```

**Description**: Retrieves current user profile information.

#### **2. Update User Profile**
```http
PUT /api/v1/users/profile
```

**Description**: Updates user profile information.

---

## 📊 **ANALYTICS & REPORTING API**

### **Business Intelligence**

#### **1. Get Sales Analytics**
```http
GET /api/v1/admin/analytics/sales
```

**Description**: Retrieves sales analytics and performance metrics (admin only).

#### **2. Get Commission Analytics**
```http
GET /api/v1/admin/analytics/commission
```

**Description**: Retrieves commission analytics and revenue metrics (admin only).

#### **3. Get Supplier Performance**
```http
GET /api/v1/admin/analytics/suppliers
```

**Description**: Retrieves supplier performance metrics (admin only).

---

## 🚨 **ERROR HANDLING**

### **Standard Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "phone_number",
        "message": "Phone number must be valid South African format"
      }
    ]
  }
}
```

### **Common Error Codes**
- `AUTHENTICATION_ERROR`: Invalid or expired authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND`: Requested resource not found
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `SUPPLIER_ERROR`: External supplier API error
- `INTERNAL_ERROR`: Internal server error

---

## 📈 **PERFORMANCE & LIMITS**

### **API Limits**
- **Rate Limiting**: 1000 requests per hour per user
- **Response Time**: < 200ms average response time
- **Payload Size**: Maximum 10MB per request
- **Pagination**: Maximum 100 items per page

### **Performance Metrics**
- **Uptime**: 99.9% target availability
- **Error Rate**: < 0.1% target error rate
- **Throughput**: Designed for millions of transactions
- **Scalability**: Horizontal scaling ready

---

## 💰 **REFERRAL SYSTEM API**

### **Referral Program Endpoints**

The referral system provides a complete API for managing multi-level referral programs with 3-level commission structure (5%, 3%, 2%) and no caps.

#### **1. Get My Referral Code**
```http
GET /api/v1/referrals/my-code
```

**Description**: Retrieves the authenticated user's unique referral code.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "referralCode": "ABC123"
}
```

#### **2. Send Referral Invite**
```http
POST /api/v1/referrals/send-invite
```

**Description**: Sends a referral invitation via SMS in the specified language.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "phoneNumber": "+27123456789",
  "language": "en"
}
```

**Supported Languages**: `en`, `af`, `zu`, `xh`, `st`, `tn`, `nso`, `ve`, `ts`, `ss`, `nr`

**Response Example**:
```json
{
  "success": true,
  "message": "Referral invitation sent successfully"
}
```

#### **3. Get Referral Stats**
```http
GET /api/v1/referrals/stats
```

**Description**: Retrieves the authenticated user's referral statistics.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "stats": {
    "totalEarnedCents": 50000,
    "totalPaidCents": 30000,
    "pendingCents": 20000,
    "monthEarnedCents": 15000,
    "monthPaidCents": 10000,
    "directReferrals": 5,
    "totalNetwork": 25
  }
}
```

#### **4. Get My Earnings**
```http
GET /api/v1/referrals/earnings
```

**Description**: Retrieves the authenticated user's referral earnings for the current month.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "earnings": [
    {
      "id": 1,
      "transactionId": 123,
      "earnerUserId": 5,
      "level": 1,
      "earnedAmountCents": 400,
      "status": "pending",
      "createdAt": "2025-12-29T10:00:00Z"
    }
  ]
}
```

#### **5. Get My Network**
```http
GET /api/v1/referrals/network
```

**Description**: Retrieves the authenticated user's direct referral network.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "network": [
    {
      "userId": 10,
      "referralCode": "XYZ789",
      "activatedAt": "2025-12-28T15:30:00Z",
      "totalTransactions": 5,
      "totalEarnedCents": 2000
    }
  ]
}
```

#### **6. Get Pending Earnings**
```http
GET /api/v1/referrals/pending
```

**Description**: Retrieves pending referral earnings that will be paid in the next payout batch.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "pendingEarnings": {
    "totalCents": 20000,
    "count": 15,
    "nextPayoutDate": "2025-12-30T02:00:00Z"
  }
}
```

### **Referral System Features**
- **3-Level Commission**: 5% (1st), 3% (2nd), 2% (3rd) - no caps
- **Monthly Caps**: R10K (1st), R5K (2nd), R2.5K (3rd), R1K (4th)
- **Activation**: After first transaction
- **Payouts**: Daily batch processing at 2:00 AM SAST
- **SMS Integration**: 11-language support via MyMobileAPI
- **Fraud Prevention**: KYC verification, velocity limits, phone verification

---

## 🏦 **RECONCILIATION SYSTEM API**

### **Overview**
The Reconciliation System provides automated, banking-grade transaction reconciliation with multiple suppliers (MobileMart, Flash, etc.). The system compares internal transactions with supplier reports, identifies discrepancies, auto-resolves 80% of issues, and provides comprehensive reporting.

**Base Path**: `/api/v1/reconciliation`  
**Authentication**: JWT required (admin role)  
**Status**: ✅ **Live in UAT**

### **Key Features**
- Multi-supplier support with extensible adapters
- Exact + fuzzy matching (>99% match rate)
- Self-healing auto-resolution
- Immutable audit trail
- Real-time alerting
- Excel/JSON reporting

---

### **1. Trigger Reconciliation**

#### **Manual Reconciliation Trigger**
```http
POST /api/v1/reconciliation/trigger
```

**Description**: Manually trigger a reconciliation run for a specific supplier.

**Request Body**:
```json
{
  "supplierCode": "MMART",
  "filePath": "gs://mymoolah-sftp-inbound/mobilemart/FULCRUM.MERCHANT.MYMOOLAH.RECON.20260113120000.txt",
  "runType": "manual"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "reconRunId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "supplier": "MobileMart",
    "startedAt": "2026-01-13T10:30:00Z"
  }
}
```

---

### **2. List Reconciliation Runs**

```http
GET /api/v1/reconciliation/runs?supplier=MMART&status=completed&limit=20
```

**Query Parameters**:
- `supplier` (optional): Filter by supplier code
- `status` (optional): Filter by status (`processing`, `completed`, `failed`)
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `limit` (optional): Results per page (default: 20)
- `offset` (optional): Pagination offset

**Response Example**:
```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "supplierCode": "MMART",
        "fileName": "FULCRUM.MERCHANT.MYMOOLAH.RECON.20260113120000.txt",
        "status": "completed",
        "summary": {
          "totalExternal": 1250,
          "totalInternal": 1248,
          "matched": 1245,
          "matchRate": 99.76,
          "discrepancies": {
            "missing_internal": 2,
            "amount_mismatch": 1,
            "total": 3
          },
          "autoResolved": 2,
          "manualReview": 1
        },
        "startedAt": "2026-01-13T10:30:00Z",
        "completedAt": "2026-01-13T10:32:15Z",
        "durationMs": 135000
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 87
    }
  }
}
```

---

### **3. Get Run Details**

```http
GET /api/v1/reconciliation/runs/:id
```

**Description**: Get detailed information about a specific reconciliation run, including all transactions and discrepancies.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "run": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "supplierCode": "MMART",
      "status": "completed",
      "summary": { /* ... */ },
      "transactions": [
        {
          "externalRef": "MM20260113-001234",
          "internalRef": "TXN-20260113-ABCD",
          "matchType": "exact",
          "confidence": 1.0,
          "status": "matched",
          "amount": 5000,
          "timestamp": "2026-01-13T08:15:00Z"
        }
      ],
      "discrepancies": [
        {
          "id": "disc-001",
          "type": "amount_mismatch",
          "severity": "high",
          "externalRef": "MM20260113-001235",
          "internalRef": "TXN-20260113-ABCE",
          "expected": 10000,
          "actual": 10050,
          "difference": 50,
          "autoResolved": false,
          "requiresManualReview": true
        }
      ]
    }
  }
}
```

---

### **4. Resolve Discrepancy**

```http
POST /api/v1/reconciliation/runs/:id/discrepancies/:discrepancyId/resolve
```

**Description**: Manually resolve a discrepancy that requires manual review.

**Request Body**:
```json
{
  "resolution": "accepted",
  "notes": "Verified with supplier - correct amount is R100.50 (50 cent rounding difference)",
  "adjustmentAction": "update_internal"
}
```

**Possible Resolutions**:
- `accepted`: Accept the discrepancy (no action)
- `adjusted`: Adjust internal records
- `disputed`: Dispute with supplier
- `refund_issued`: Refund processed
- `commission_adjusted`: Commission recalculated

**Response Example**:
```json
{
  "success": true,
  "data": {
    "discrepancyId": "disc-001",
    "resolution": "accepted",
    "resolvedBy": "admin@mymoolah.africa",
    "resolvedAt": "2026-01-13T11:00:00Z",
    "auditTrailId": "audit-12345"
  }
}
```

---

### **5. List Suppliers**

```http
GET /api/v1/reconciliation/suppliers
```

**Description**: Get all configured suppliers and their reconciliation settings.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "suppliers": [
      {
        "code": "MMART",
        "name": "MobileMart",
        "is_active": true,
        "sftp_config": {
          "host": "34.35.137.166",
          "port": 22,
          "username": "mobilemart",
          "path": "/home/mobilemart/"
        },
        "file_config": {
          "format": "csv",
          "delimiter": ",",
          "encoding": "UTF-8",
          "adapter": "MobileMartAdapter"
        },
        "schedule": {
          "frequency": "daily",
          "time": "06:00",
          "timezone": "Africa/Johannesburg"
        },
        "lastRunAt": "2026-01-13T06:00:00Z",
        "lastRunStatus": "completed"
      }
    ]
  }
}
```

---

### **6. Create/Update Supplier**

```http
POST /api/v1/reconciliation/suppliers
```

**Description**: Create a new supplier configuration or update an existing one.

**Request Body**:
```json
{
  "code": "FLASH",
  "name": "Flash Mobile",
  "is_active": true,
  "sftp_config": {
    "host": "sftp.flash.co.za",
    "port": 22,
    "username": "mymoolah",
    "path": "/reconciliation/"
  },
  "file_config": {
    "format": "csv",
    "delimiter": "|",
    "encoding": "UTF-8",
    "adapter": "FlashAdapter"
  },
  "schedule": {
    "frequency": "daily",
    "time": "07:00",
    "timezone": "Africa/Johannesburg"
  }
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "supplier": {
      "code": "FLASH",
      "name": "Flash Mobile",
      "is_active": true,
      "createdAt": "2026-01-13T12:00:00Z"
    }
  }
}
```

---

### **7. Reconciliation Analytics**

```http
GET /api/v1/reconciliation/analytics?startDate=2026-01-01&endDate=2026-01-13
```

**Query Parameters**:
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `supplier` (optional): Filter by supplier code
- `groupBy` (optional): Group by `day`, `week`, `month`, `supplier`

**Response Example**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRuns": 13,
      "totalTransactions": 16250,
      "totalMatched": 16198,
      "totalDiscrepancies": 52,
      "overallMatchRate": 99.68,
      "autoResolvedRate": 82.69,
      "averageDurationMs": 128000
    },
    "bySupplier": [
      {
        "supplier": "MobileMart",
        "runs": 13,
        "transactions": 16250,
        "matched": 16198,
        "matchRate": 99.68,
        "discrepancies": 52,
        "autoResolved": 43
      }
    ],
    "trends": [
      {
        "date": "2026-01-13",
        "runs": 1,
        "matchRate": 99.76,
        "discrepancies": 3
      }
    ]
  }
}
```

---

### **Audit Trail**
Every reconciliation action is logged in the immutable audit trail with:
- Event type and timestamp
- User/system actor
- Before/after states
- SHA-256 event chaining (blockchain-style without blockchain)
- Full traceability for compliance

---

### **Error Responses**

**Reconciliation In Progress**:
```json
{
  "success": false,
  "error": {
    "code": "RECON_IN_PROGRESS",
    "message": "A reconciliation run is already in progress for this supplier",
    "details": {
      "runId": "550e8400-e29b-41d4-a716-446655440000",
      "startedAt": "2026-01-13T10:30:00Z"
    }
  }
}
```

**Invalid File Format**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "File does not match expected format",
    "details": {
      "expected": "CSV with header row",
      "actual": "Missing required columns: transaction_ref, amount"
    }
  }
}
```

---

### **Documentation**
- **Framework**: `docs/RECONCILIATION_FRAMEWORK.md`
- **Quick Start**: `docs/RECONCILIATION_QUICK_START.md`
- **Session Log**: `docs/session_logs/2026-01-13_recon_system_implementation.md`

---

## DISBURSEMENT CLIENT MANAGEMENT

Corporate client onboarding, KYB compliance, and fee configuration for the bulk disbursement platform.

**Base Path**: `/api/v1/disbursement-clients`  
**Authentication**: JWT Bearer token required  
**Rate Limits**: 100 req/15min (reads), 30 req/15min (writes)

### List Clients
```
GET /api/v1/disbursement-clients?page=1&limit=20&status=active&kyb_status=verified
```
**Response**: `{ success: true, data: { clients: [...], pagination: { total, page, limit, totalPages } } }`

### Get Client Detail
```
GET /api/v1/disbursement-clients/:clientId
```
**Response**: Client with associated fees (current only), notification preferences, and KYB document count by status.

### Create Client
```
POST /api/v1/disbursement-clients
Content-Type: application/json

{
  "client_code": "ACME01",
  "company_name": "Acme Corp (Pty) Ltd",
  "contact_email": "payroll@acme.co.za",
  "entity_type": "company",
  "registration_number": "2020/123456/07",
  "contact_name": "Jane Smith",
  "contact_phone": "0821234567",
  "float_limit": 500000.00
}
```
**Validation**: `client_code` alphanumeric max 20, `company_name` required, `contact_email` valid email.  
**Response**: `{ success: true, data: { id, client_code, api_key, ... } }` (API key auto-generated)

### Update Client
```
PATCH /api/v1/disbursement-clients/:clientId
Content-Type: application/json

{ "status": "active", "float_limit": 1000000.00 }
```
**Updatable fields**: company_name, contact_name, contact_email, contact_phone, status, float_limit, white_label_slug, white_label_config, notification_channels.

### Upload KYB Document
```
POST /api/v1/disbursement-clients/:clientId/kyb-documents
Content-Type: application/json

{
  "document_type": "cor15",
  "entity_type": "company",
  "original_filename": "acme_cor15.pdf"
}
```
**Document types**: cor15, id_document, proof_of_address, trust_deed, partnership_agreement, npo_certificate, bank_confirmation, tax_clearance.  
**Note**: Triggers async GPT-4o OCR analysis via kybComplianceService.

### Review KYB Document
```
PATCH /api/v1/disbursement-clients/:clientId/kyb-documents/:docId
Content-Type: application/json

{ "status": "verified" }
```
**Status values**: verified, rejected. If rejected, include `rejection_reason`.  
**Auto-verify**: When all required documents for the entity type are verified, client `kyb_status` auto-updates to `verified`.

### List Fee Configs
```
GET /api/v1/disbursement-clients/:clientId/fees
```
Returns current (effective_to IS NULL) and historical fee configurations.

### Create Fee Config
```
POST /api/v1/disbursement-clients/:clientId/fees
Content-Type: application/json

{
  "rail": "eft",
  "fee_type": "flat",
  "flat_fee_cents": 500,
  "percentage_fee": 0,
  "min_fee_cents": 0,
  "max_fee_cents": null
}
```
**Rails**: eft, payshap, wallet (wallet is always free in feeEngine).  
**Fee types**: flat, percentage, flat_plus_percentage.  
**Note**: Creating a new fee auto-expires the current fee for the same client+rail.

### Parse Beneficiary File
```
POST /api/v1/disbursement-clients/:clientId/upload-beneficiaries
Content-Type: application/json

{ "file_path": "/tmp/beneficiaries.csv", "file_type": "csv" }
```
**Response**: `{ success: true, data: { beneficiaries: [...], warnings: [...], errors: [...] } }`  
**Supported formats**: CSV, Excel (.xlsx), Pain.001 XML.  
**Note**: Does NOT create a run — returns parsed data for portal preview.

---

## 🔧 **DEVELOPMENT & TESTING**

### **Development Environment**
- **Base URL**: `http://localhost:3001/api/v1`
- **Authentication**: Use test JWT tokens
- **Database**: Test database with sample data
- **Logging**: Detailed request/response logging

### **Testing Endpoints**
- **Health Check**: `GET /api/v1/health`
- **API Status**: `GET /api/v1/status`
- **Test Data**: `POST /api/v1/test/seed-data`

---

## 📚 **RELATED DOCUMENTATION**

- [Architecture Documentation](./architecture.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Security Documentation](./SECURITY.md)
- [Performance Documentation](./PERFORMANCE.md)
- [Testing Guide](./TESTING_GUIDE.md)

---

## 🆘 **SUPPORT & CONTACT**

### **API Support**
- **Documentation**: This comprehensive API documentation
- **OpenAPI Spec**: Available at `/api/v1/docs`
- **Postman Collection**: Available for import
- **Issue Tracking**: GitHub issues for bug reports

### **Contact Information**
- **Development Team**: MyMoolah Development Team
- **Email**: dev@mymoolah.com
- **Documentation**: Updated regularly with each release

---

*This API documentation is maintained by the MyMoolah Development Team and updated regularly to reflect the current API state.* 