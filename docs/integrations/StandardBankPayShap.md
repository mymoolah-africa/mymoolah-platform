# Standard Bank PayShap Integration - Architecture Proposal

**Date**: November 26, 2025 (updated 2026-02-12)  
**Status**: ✅ **IMPLEMENTATION COMPLETE** – UAT ready; awaiting OneHub credentials  
**Integration Type**: PayShap RPP/RTP via Standard Bank TPP Rails  
**Replaces**: Peach Payments PayShap Integration (archived 2025-11-26)

**Implementation**: See `docs/SBSA_PAYSHAP_UAT_GUIDE.md` for UAT setup and checklist.

### **Business Model (vs Peach)**

- **SBSA** = sponsor bank; the **MyMoolah SBSA bank account** is the main current account (revenue account)
- **No prefunded float** – all monies flow through the MM SBSA main account
- **Deposit notification**: Reference (CID) = MSISDN → wallet to credit
- **Ledger**: Uses `LEDGER_ACCOUNT_BANK` (1100-01-01), not a separate float

---

## 📋 **EXECUTIVE SUMMARY**

MyMoolah Treasury Platform (MMTP) will integrate with Standard Bank's PayShap rails to replace the archived Peach Payments integration. Standard Bank is MMTP's TPP (Third Party Provider) sponsor bank, providing API credentials and endpoints for PayShap payment processing.

### **Integration Scope (Phase 1 – pending SBSA API package)**
1. **Deposit Notification (Credit) Endpoint**: SBSA notifies when a deposit hits the MMTP T-PPP bank account; resolve reference → wallet/float; credit if valid, error if not found.
2. **PayShap Outbound & Request Money**: Turn on PayShap API to:
   - Initiate payments from wallet/float → third-party bank accounts.
   - Handle Request Money from third-party banks into wallet/float.

### **Key Benefits**
- Direct integration with sponsor bank (Standard Bank)
- Reuse existing frontend components (Peach integration frontend already in place)
- Banking-grade security and compliance
- Mojaloop-compliant architecture
- High-performance async processing

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Integration Components**

```
┌─────────────────────────────────────────────────────────────┐
│                    Standard Bank API                         │
│  (PayShap Rails via TPP Account)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS / TLS 1.3
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              MyMoolah Treasury Platform                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Notification Endpoint (Webhook)                    │    │
│  │  POST /api/v1/standardbank/notification           │    │
│  │  - Signature Validation                            │    │
│  │  - Reference Resolution                            │    │
│  │  - Async Processing                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  RPP Endpoint (Send Money)                         │    │
│  │  POST /api/v1/standardbank/payshap/rpp            │    │
│  │  - Wallet Debit                                    │    │
│  │  - Bank Account Credit                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  RTP Endpoint (Request Money)                      │    │
│  │  POST /api/v1/standardbank/payshap/rtp            │    │
│  │  - Request Creation                                │    │
│  │  - MSISDN Reference                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Reference Resolver                                │    │
│  │  - MSISDN → Wallet                                 │    │
│  │  - Float Account Number → Float Account           │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔔 **1. NOTIFICATION ENDPOINT (Webhook) — Deposit Credits**

### **Purpose**
Receive real-time transaction notifications from Standard Bank when transactions occur on the MMTP TPP bank account (MyMoolah Treasury).

### **Endpoint Specification**
```
POST /api/v1/standardbank/notification
Content-Type: application/json
X-Signature: <HMAC-SHA256 signature>
```

### **Transaction Flow**

```
Standard Bank → POST Notification → MMTP Backend
                                      │
                                      ├─ Validate Signature
                                      ├─ Check Idempotency
                                      ├─ Resolve Reference Number
                                      ├─ Validate Account Exists
                                      ├─ Queue Async Processing
                                      └─ Return 200 OK (immediate)
```

### **Reference Number Resolution**

The notification payload will contain a reference number that must be resolved to either:
1. **Wallet User**: MSISDN (phone number) - format: `0[6-8]XXXXXXXX`
2. **Supplier Float Account**: `floatAccountNumber` (e.g., `SUP-FLASH-001`)
3. **Client Float Account**: `floatAccountNumber` (e.g., `CLI-SPORTSBET-001`)
4. **Service Provider Float Account**: `floatAccountNumber` (e.g., `SP-MERCHANT-001`)
5. **Reseller Float Account**: `floatAccountNumber` (e.g., `RES-AGENT-001`)

### **Resolution Logic**

```javascript
// Pseudo-code for reference resolution
function resolveReference(referenceNumber) {
  // Step 1: Check if MSISDN format (wallet user)
  if (isMSISDNFormat(referenceNumber)) {
    const user = await User.findOne({ phoneNumber: normalizeMSISDN(referenceNumber) });
    if (user) {
      const wallet = await Wallet.findOne({ userId: user.id });
      return { type: 'wallet', account: wallet, userId: user.id };
    }
  }
  
  // Step 2: Check float account prefixes
  const prefix = extractPrefix(referenceNumber);
  switch(prefix) {
    case 'SUP':
      return await resolveSupplierFloat(referenceNumber);
    case 'CLI':
      return await resolveClientFloat(referenceNumber);
    case 'SP':
      return await resolveServiceProviderFloat(referenceNumber);
    case 'RES':
      return await resolveResellerFloat(referenceNumber);
  }
  
  // Step 3: Account not found
  return { type: 'not_found', error: 'Account not found' };
}
```

### **Security Requirements**

1. **Webhook Signature Validation**
   - Algorithm: HMAC-SHA256 (or Standard Bank specified)
   - Header: `X-Signature` (or Standard Bank specified)
   - Secret: Stored in environment variables (encrypted)

2. **IP Allowlist**
   - Only accept requests from Standard Bank IP addresses
   - Configured in firewall/load balancer

3. **Idempotency**
   - Check `transactionId` against database
   - Prevent duplicate processing
   - Return 200 OK if already processed

4. **Rate Limiting**
   - Prevent abuse
   - Standard rate limits for webhook endpoints

### **Processing Flow**

```javascript
// Async processing queue (high performance)
1. Receive webhook → Validate signature → Return 200 OK immediately
2. Queue notification for async processing
3. Resolve reference number
4. Validate account exists
5. Credit account (wallet or float)
6. Create transaction record
7. Update ledger
8. Send notification to user (if applicable)
9. Log audit trail
```

### **Error Handling**

- **Invalid Signature**: Return 401 Unauthorized
- **Account Not Found**: Return 404 Not Found (with proper error message)
- **Duplicate Transaction**: Return 200 OK (already processed)
- **Processing Error**: Log error, retry mechanism, alert monitoring

---

## 💸 **2. RPP ENDPOINT (Send Money from Wallet to Bank Account) — PayShap Outbound**

### **Purpose**
Initiate PayShap RPP (Rapid Payments Programme) payment from a user's wallet to a standard bank account.

### **Endpoint Specification**
```
POST /api/v1/standardbank/payshap/rpp
Authorization: Bearer <JWT>
Content-Type: application/json
```

### **Request Payload**

```json
{
  "amount": "100.00",
  "currency": "ZAR",
  "bankAccountNumber": "1234567890",
  "bankCode": "250655",
  "bankName": "Standard Bank",
  "description": "Payment description",
  "reference": "Optional payment reference"
}
```

### **Processing Flow**

```
1. Authenticate user (JWT)
2. Validate request payload
3. Check wallet balance (sufficient funds)
4. Debit wallet (optimistic locking)
5. Call Standard Bank RPP API
6. Store transaction record (status: processing)
7. Return response with transaction ID
8. Webhook callback updates final status
```

### **Validation Rules**

- Amount must be positive (> 0)
- Wallet must have sufficient balance
- Bank account number must be valid format
- Bank code must be valid South African bank code
- User must be authenticated

### **Transaction States**

- `initiated` - Request created, awaiting Standard Bank processing
- `processing` - Payment submitted to Standard Bank
- `completed` - Payment successful
- `failed` - Payment failed (with reason)
- `cancelled` - Payment cancelled

### **Ledger Integration**

- Debit user's wallet immediately (optimistic locking)
- Create transaction record
- Update general ledger
- Create audit trail

---

## 💰 **3. RTP ENDPOINT (Request Money from Bank Account to Wallet) — PayShap Request Money**

### **Purpose**
Initiate PayShap RTP (Request to Pay) to request money from a bank account to a user's wallet.

### **Endpoint Specification**
```
POST /api/v1/standardbank/payshap/rtp
Authorization: Bearer <JWT>
Content-Type: application/json
```

### **Request Payload**

```json
{
  "amount": "250.00",
  "currency": "ZAR",
  "description": "Request money description",
  "payerAccountNumber": "0987654321",
  "payerBankCode": "210554",
  "payerBankName": "First National Bank",
  "expiryMinutes": 60
}
```

### **MSISDN Reference**

The user's MSISDN (phone number) will be automatically included in the RTP request to Standard Bank. This allows Standard Bank to include the MSISDN in the payment notification, enabling automatic wallet allocation.

### **Processing Flow**

```
1. Authenticate user (JWT)
2. Get user's MSISDN (phoneNumber)
3. Validate request payload
4. Call Standard Bank RTP API (with MSISDN reference)
5. Store transaction record (status: pending)
6. Return response with request ID
7. Webhook callback updates status when payer accepts/rejects
```

### **Transaction States**

- `pending` - Request created, awaiting payer acceptance
- `accepted` - Payer accepted request, payment processing
- `completed` - Payment successful
- `rejected` - Payer rejected request
- `expired` - Request expired
- `cancelled` - Request cancelled

### **Wallet Allocation**

When Standard Bank sends notification for RTP payment:
1. Extract MSISDN from notification payload
2. Resolve MSISDN to user wallet
3. Credit wallet automatically
4. Create transaction record
5. Send notification to user

---

## 🔐 **SECURITY ARCHITECTURE**

### **Authentication**

1. **API Endpoints (RPP/RTP)**
   - JWT authentication required
   - Token validation middleware
   - User context extraction

2. **Webhook Endpoint**
   - Signature validation (HMAC-SHA256)
   - IP allowlist (Standard Bank IPs only)
   - No user authentication (system-to-system)

### **Data Protection**

1. **Encryption**
   - TLS 1.3 for all API communications
   - Encrypted storage for credentials
   - PII redaction in logs

2. **Input Validation**
   - Sanitize all inputs
   - Validate formats (MSISDN, account numbers, amounts)
   - Type checking and range validation

3. **Audit Logging**
   - Complete transaction trail
   - PII redaction
   - Compliance-ready logging

### **Compliance**

- **Mojaloop Standards**: FSPIOP-compliant architecture
- **ISO 20022**: Banking message format compliance
- **Banking Regulations**: South African banking standards
- **PCI DSS**: Payment card industry compliance (if applicable)

---

## ⚡ **PERFORMANCE ARCHITECTURE**

### **Async Processing**

- **Notification Queue**: Process webhooks asynchronously
- **Database Operations**: Optimized queries with indexes
- **Caching**: Account lookups cached (Redis)
- **Connection Pooling**: Database connection pooling

### **Scalability**

- **Horizontal Scaling**: Stateless API design
- **Load Balancing**: Multiple backend instances
- **Database Partitioning**: Transaction table partitioning (if needed)
- **Rate Limiting**: Prevent abuse and ensure fair usage

### **Performance Targets**

- **API Response Time**: < 200ms (95th percentile)
- **Webhook Processing**: < 500ms (async queue)
- **Database Queries**: < 50ms (with indexes)
- **Throughput**: > 1,000 requests/second

---

## 📊 **DATABASE SCHEMA**

### **Standard Bank Transaction Model**

```javascript
// models/StandardBankTransaction.js
{
  id: INTEGER (PK, auto-increment),
  transactionId: STRING (unique), // Standard Bank transaction ID
  merchantTransactionId: STRING (unique), // Our internal transaction ID
  type: ENUM('notification', 'rpp', 'rtp'),
  direction: ENUM('credit', 'debit'),
  amount: DECIMAL(15,2),
  currency: STRING(3), // Default: 'ZAR'
  referenceNumber: STRING, // MSISDN or floatAccountNumber
  accountType: ENUM('wallet', 'supplier_float', 'client_float', 'service_provider_float', 'reseller_float'),
  accountId: INTEGER, // User ID or Float Account ID
  userId: INTEGER (nullable), // User ID if wallet transaction
  walletId: STRING (nullable), // Wallet ID if wallet transaction
  status: ENUM('initiated', 'processing', 'pending', 'completed', 'failed', 'rejected', 'expired', 'cancelled'),
  standardBankReference: STRING, // Standard Bank reference number
  bankAccountNumber: STRING (nullable), // For RPP/RTP
  bankCode: STRING (nullable), // Bank code
  bankName: STRING (nullable), // Bank name
  description: TEXT (nullable),
  rawRequest: JSONB, // Full request payload
  rawResponse: JSONB, // Full response payload
  webhookReceivedAt: DATE (nullable),
  processedAt: DATE (nullable),
  createdAt: DATE,
  updatedAt: DATE
}

// Indexes
- transactionId (unique)
- merchantTransactionId (unique)
- referenceNumber
- accountType + accountId
- status
- createdAt
```

---

## 📁 **PROPOSED FILE STRUCTURE**

```
/integrations/standardbank/
  ├── client.js                    # Standard Bank API client
  │   ├── getAccessToken()         # OAuth/API authentication
  │   ├── initiateRpp()            # RPP payment initiation
  │   └── initiateRtp()            # RTP request initiation
  │
  ├── webhookValidator.js          # Webhook signature validation
  │   ├── validateSignature()      # HMAC-SHA256 validation
  │   └── validateIP()             # IP allowlist check
  │
  └── referenceResolver.js         # Reference number resolution
      ├── resolveMSISDN()          # MSISDN → Wallet
      ├── resolveSupplierFloat()   # Reference → Supplier Float
      ├── resolveClientFloat()     # Reference → Client Float
      ├── resolveServiceProviderFloat() # Reference → SP Float
      └── resolveResellerFloat()   # Reference → Reseller Float

/controllers/
  └── standardbankController.js    # Main controller
      ├── handleNotification()     # Webhook handler
      ├── initiatePayShapRpp()     # RPP endpoint
      ├── initiatePayShapRtp()     # RTP endpoint
      └── getTransactionStatus()   # Status check

/routes/
  └── standardbank.js              # API routes
      ├── POST /notification       # Webhook endpoint
      ├── POST /payshap/rpp        # RPP endpoint
      └── POST /payshap/rtp        # RTP endpoint

/models/
  └── StandardBankTransaction.js   # Transaction model

/services/
  └── standardbankNotificationProcessor.js  # Async notification processing
      ├── processNotification()    # Process webhook notification
      ├── creditWallet()            # Credit user wallet
      └── creditFloatAccount()     # Credit float account

/migrations/
  └── YYYYMMDDHHMMSS_create_standard_bank_transactions.js
```

---

## ❓ **QUESTIONS FOR STANDARD BANK**

### **API Authentication**

1. What authentication method does Standard Bank use?
   - OAuth 2.0?
   - API Keys?
   - Certificate-based authentication?
   - Other?

2. How do we obtain API credentials?
   - Client ID / Client Secret?
   - API Key / API Secret?
   - Certificate files?

3. Token refresh mechanism?
   - How long are tokens valid?
   - Automatic refresh?
   - Refresh endpoint?

### **Webhook Security**

1. What signature algorithm is used?
   - HMAC-SHA256?
   - RSA-SHA256?
   - Other?

2. What header contains the signature?
   - `X-Signature`?
   - `X-StandardBank-Signature`?
   - Other?

3. How is the signature calculated?
   - Full request body?
   - Specific fields only?
   - Include timestamp?

4. IP allowlist?
   - What IP addresses will Standard Bank use?
   - Static IPs or dynamic ranges?
   - How do we configure allowlist?

### **Reference Number Format**

1. What format should we use for MSISDN references?
   - Format: `0[6-8]XXXXXXXX`?
   - Include country code: `+27[6-8]XXXXXXXX`?
   - Other format?

2. What format for float account references?
   - Prefix-based: `SUP-XXX-001`?
   - Numeric only?
   - Other format?

3. Maximum reference number length?
   - Character limit?
   - Validation rules?

### **Transaction Payload**

1. What is the exact JSON structure for notification payload?
   - Required fields?
   - Optional fields?
   - Field names and types?

2. What fields are included in notification?
   - Transaction ID?
   - Amount?
   - Reference number?
   - Timestamp?
   - Status?
   - Other metadata?

3. Error response format?
   - Error code structure?
   - Error message format?
   - Retry mechanism?

### **RPP/RTP Endpoints**

1. What are the base URLs?
   - Production URL?
   - Sandbox/UAT URL?
   - Environment-specific URLs?

2. What is the request/response format?
   - JSON structure?
   - Required fields?
   - Optional fields?

3. Error handling?
   - HTTP status codes?
   - Error response format?
   - Retry logic?

4. Transaction status updates?
   - Webhook callbacks?
   - Polling mechanism?
   - Both?

### **Integration Details**

1. Testing environment?
   - Sandbox/UAT available?
   - Test credentials?
   - Test scenarios?

2. Documentation?
   - API documentation URL?
   - Integration guide?
   - Support contact?

3. Go-live process?
   - Approval process?
   - Production credentials?
   - Cutover procedure?

---

## 🚀 **IMPLEMENTATION PLAN**

### **Phase 1: Foundation** (After Standard Bank Approval)

1. **Create Integration Structure**
   - Create `/integrations/standardbank/` directory
   - Create base files (client.js, webhookValidator.js, referenceResolver.js)
   - Set up environment variables

2. **Database Schema**
   - Create `StandardBankTransaction` model
   - Create migration file
   - Add indexes for performance

3. **Reference Resolver**
   - Implement MSISDN → Wallet resolution
   - Implement float account resolution
   - Add validation and error handling

### **Phase 2: Notification Endpoint**

1. **Webhook Endpoint**
   - Create `/api/v1/standardbank/notification` endpoint
   - Implement signature validation
   - Implement idempotency check
   - Add IP allowlist validation

2. **Async Processing**
   - Create notification processor service
   - Implement async queue
   - Add error handling and retry logic

3. **Account Credit Logic**
   - Implement wallet credit logic
   - Implement float account credit logic
   - Add ledger integration

### **Phase 3: RPP Endpoint**

1. **RPP Implementation**
   - Create `/api/v1/standardbank/payshap/rpp` endpoint
   - Implement Standard Bank API client
   - Add wallet debit logic
   - Add transaction tracking

2. **Frontend Integration**
   - Wire existing frontend to new endpoint
   - Update API service calls
   - Test end-to-end flow

### **Phase 4: RTP Endpoint**

1. **RTP Implementation**
   - Create `/api/v1/standardbank/payshap/rtp` endpoint
   - Implement Standard Bank API client
   - Add MSISDN reference handling
   - Add transaction tracking

2. **Frontend Integration**
   - Wire existing frontend to new endpoint
   - Update API service calls
   - Test end-to-end flow

### **Phase 5: Testing & Validation**

1. **Unit Tests**
   - Test reference resolver
   - Test webhook validation
   - Test API client methods

2. **Integration Tests**
   - Test notification endpoint
   - Test RPP endpoint
   - Test RTP endpoint

3. **End-to-End Tests**
   - Test complete payment flows
   - Test error scenarios
   - Test performance

### **Phase 6: Documentation & Deployment**

1. **Documentation**
   - API documentation
   - Integration guide
   - Troubleshooting guide

2. **Deployment**
   - Deploy to staging
   - Test in staging environment
   - Deploy to production

---

## 📝 **ENVIRONMENT VARIABLES**

```bash
# Standard Bank API Configuration
STANDARDBANK_API_URL=https://api.standardbank.co.za
STANDARDBANK_API_KEY=<api_key>
STANDARDBANK_API_SECRET=<api_secret>
STANDARDBANK_CLIENT_ID=<client_id>
STANDARDBANK_CLIENT_SECRET=<client_secret>

# Webhook Configuration
STANDARDBANK_WEBHOOK_SECRET=<webhook_secret>
STANDARDBANK_WEBHOOK_IPS=<comma_separated_ips>

# Environment
STANDARDBANK_ENVIRONMENT=production|sandbox
STANDARDBANK_ENABLE_TEST_MODE=false
```

---

## 🔄 **MIGRATION FROM PEACH PAYMENTS**

### **Frontend Changes**

- **Minimal Changes Required**: Frontend already supports PayShap RPP/RTP
- **API Endpoint Updates**: Change API base URL from `/api/v1/peach` to `/api/v1/standardbank`
- **Response Format**: May need minor adjustments based on Standard Bank API format

### **Backend Changes**

- **New Integration**: Create Standard Bank integration (parallel to Peach)
- **Route Updates**: Add new routes for Standard Bank endpoints
- **Controller Updates**: Create new controller or adapt existing Peach controller
- **Database**: New transaction model for Standard Bank transactions

### **Data Migration**

- **No Data Migration Required**: Peach transactions remain in database
- **Historical Data**: Preserved for compliance and audit purposes
- **New Transactions**: Use Standard Bank integration going forward

---

## 📚 **RELATED DOCUMENTATION**

- `docs/integrations/PeachPayments.md` - Archived Peach Payments integration (reference)
- `docs/archive/PEACH_ARCHIVAL_RECORD.md` - Peach Payments archival record
- `docs/BANKING_GRADE_ARCHITECTURE.md` - Banking-grade architecture standards
- `docs/MOJALOOP_COMPLIANCE.md` - Mojaloop compliance requirements

---

## ✅ **APPROVAL CHECKLIST**

- [ ] Standard Bank API credentials received
- [ ] API documentation reviewed
- [ ] Webhook security details confirmed
- [ ] Reference number format confirmed
- [ ] Testing environment access granted
- [ ] Integration approval received
- [ ] Go-live date confirmed

---

**Last Updated**: November 26, 2025  
**Status**: 📋 **PROPOSAL - AWAITING STANDARD BANK APPROVAL**  
**Next Steps**: Awaiting Standard Bank API credentials, documentation, and integration approval

