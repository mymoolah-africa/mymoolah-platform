# EasyPay Integration - Status Summary

**Report Date**: February 2, 2026  
**Last Updated**: January 17, 2026  
**Current Version**: 1.0  
**Overall Status**: 95% Complete - Awaiting EasyPay Credentials

---

## PARTNER BRIEF (For EasyPay / External Stakeholders)

**Status**: 95% complete. MyMoolah has completed all development. Remaining 5%: Awaiting EasyPay API credentials and settlement callback implementation.

**3 Services Integrated**: (1) Top-up at EasyPay (R50–R4,000, fee R2.50), (2) Cash-out at EasyPay (R50–R3,000, fee R8.00), (3) Standalone EasyPay Voucher (R50–R3,000, fee R2.50). All use 14-digit PINs starting with '9'.

**MyMoolah Completed**: Backend APIs, frontend, database, float accounts (R50k each), SFTP (34.35.137.166), documentation.

**EasyPay Must Provide**: (1) API keys (UAT/Staging/Production), (2) IP addresses for whitelisting, (3) SSH public key for SFTP reconciliation.

**EasyPay Must Implement**: Settlement API calls to MyMoolah when users redeem PINs (top-up, cash-out, voucher); daily CSV reconciliation file upload.

**Contact**: integrations@mymoolah.africa

---

## EXECUTIVE SUMMARY

MyMoolah has completed comprehensive EasyPay integration development including three core services:
1. Top-up at EasyPay (cash-in to wallet)
2. Cash-out at EasyPay (cash-out from wallet)
3. Standalone EasyPay Vouchers (payment at EasyPay merchants)

All backend APIs, frontend components, database schema, reconciliation infrastructure, and documentation are complete and tested in UAT. Integration is production-ready and awaiting EasyPay credentials and IP whitelisting to enable bidirectional API communication.

---

## CURRENT IMPLEMENTATION STATUS

### 1. Top-up at EasyPay (COMPLETE)

**Purpose**: Users create a 14-digit PIN in MyMoolah app, visit EasyPay cashier, pay cash, wallet credited instantly.

**Status**: Fully Implemented

**Components:**
- Frontend: TopupEasyPayOverlay.tsx (complete)
- Backend: Settlement endpoint (complete)
- Database: Voucher tables and migrations (complete)
- Float Account: easypay_topup (R50,000 initial balance)
- Ledger Code: 1200-10-02

**Fee Structure:**
- Provider Fee: R2.00 (to EasyPay)
- MM Margin: R0.50 (MyMoolah revenue)
- Total Fee: R2.50 deducted from gross amount
- Customer receives: Gross amount - R2.50

**Transaction Display:**
- Recent Transactions: Shows gross amount (R100.00)
- Transaction History: Shows net amount (R97.50) + Fee (R2.50) separately

**Voucher Lifecycle:**
- Status: pending_payment (created) → redeemed (paid at store) → expired (96 hours)
- Wallet Behavior: NOT debited on creation, credited on settlement (gross - fees)

**API Endpoint (for EasyPay to call):**
```
POST /api/v1/vouchers/easypay/topup/settlement
```

**Current Status:**
- MyMoolah side: COMPLETE
- EasyPay side: NEEDS IMPLEMENTATION

---

### 2. Cash-out at EasyPay (COMPLETE)

**Purpose**: Users create a cash-out voucher in MyMoolah app (wallet debited), visit EasyPay cashier, show PIN, receive cash.

**Status**: Fully Implemented

**Components:**
- Frontend: CashoutEasyPayOverlay.tsx (complete)
- Backend: Settlement endpoint (complete)
- Database: Voucher tables and migrations (complete)
- Float Account: easypay_cashout (R50,000 initial balance)
- Ledger Code: 1200-10-03

**Fee Structure:**
- User Fee: R8.00 (VAT Inclusive) - charged to customer
- Provider Fee: R5.00 (VAT Exclusive) - paid to EasyPay
- VAT on Provider Fee: R0.75 (15%)
- Total to EasyPay: R5.75 (VAT Inclusive)
- MM Revenue: R8.00 - R5.75 = R2.25

**Transaction Display:**
- Recent Transactions: Shows total (voucher amount + R8.00 fee)
- Transaction History: Shows voucher amount and R8.00 fee separately

**Voucher Lifecycle:**
- Status: pending_payment (wallet debited) → redeemed (cashed out) → expired/cancelled (wallet refunded)
- Wallet Behavior: Debited on creation (amount + R8.00 fee), refunded if expired/cancelled

**API Endpoint (for EasyPay to call):**
```
POST /api/v1/vouchers/easypay/cashout/settlement
```

**Current Status:**
- MyMoolah side: COMPLETE
- EasyPay side: NEEDS IMPLEMENTATION

---

### 3. Standalone EasyPay Voucher (COMPLETE)

**Purpose**: Users create EasyPay vouchers for use as payment at EasyPay merchants (online or in-store).

**Status**: Fully Implemented

**Components:**
- Frontend: Integrated into digital vouchers overlay
- Backend: Settlement endpoint (complete)
- Database: Voucher tables and migrations (complete)
- Float Account: Uses easypay_cashout float

**Fee Structure:**
- Transaction Fee: R2.50
- Wallet debited: Voucher amount + R2.50 on creation
- Refunded: Voucher amount + R2.50 if cancelled/expired

**Voucher Lifecycle:**
- Status: active (wallet debited) → redeemed (used at merchant) → expired/cancelled (wallet refunded)
- Cannot be redeemed in MyMoolah wallet (only at EasyPay merchants)

**API Endpoint (for EasyPay to call):**
```
POST /api/v1/vouchers/easypay/voucher/settlement
```

**Current Status:**
- MyMoolah side: COMPLETE
- EasyPay side: NEEDS IMPLEMENTATION

---

## WHAT IS STILL NEEDED FROM EASYPAY

### Priority 1: API Credentials (CRITICAL)

**What MyMoolah Needs:**

1. **EasyPay Production API Key**
   - Format: Secure random string (64+ characters recommended)
   - Used for: Authenticating EasyPay settlement callbacks to MyMoolah API
   - Delivery: Via secure channel to integrations@mymoolah.africa
   - Storage: Google Cloud Secret Manager

2. **EasyPay Staging/UAT API Key** (for testing)
   - Format: Secure random string (64+ characters)
   - Used for: UAT and Staging testing
   - Delivery: Via secure channel
   - Storage: Local .env for UAT, Secret Manager for Staging

**Current Status**: 
- MyMoolah has placeholder API key: `your_easypay_api_key_here_change_in_production`
- NOT production-ready
- BLOCKING: EasyPay cannot call MyMoolah settlement endpoints without valid API key

**Action Required**: EasyPay Integration Team to provide API keys for UAT, Staging, and Production environments

---

### Priority 2: IP Whitelisting (CRITICAL)

**What MyMoolah Needs:**

**EasyPay IP Addresses** in CIDR notation:
- Example: `20.164.206.68/32` (single IP)
- Example: `20.164.206.0/24` (subnet)

**Where Needed:**
- UAT/Staging: Required for testing settlement callbacks
- Production: Required for live settlement callbacks

**Configuration:**
- Google Cloud Load Balancer level (infrastructure)
- Setup time: 24 hours after receiving IP addresses

**Current Status**:
- EasyPay provided one IP: `20.164.206.68`
- Status: UNKNOWN if configured in MyMoolah infrastructure
- Confirmation needed from MyMoolah Infrastructure Team

**Action Required**: 
1. Verify if 20.164.206.68 is whitelisted
2. Provide additional IPs if needed
3. Confirm whitelist is active in all environments

---

### Priority 3: SFTP Access for Reconciliation (HIGH)

**What MyMoolah Needs from EasyPay:**

1. **SSH Public Key**
   - Format: ED25519 or RSA 4096-bit
   - File: id_ed25519.pub or id_rsa.pub
   - Used for: Passwordless SFTP authentication

2. **Source IP Addresses for SFTP**
   - Format: CIDR notation
   - Used for: SFTP connection whitelisting

3. **Technical Contact**
   - Name, Email, Phone
   - For: SFTP setup coordination and support

**MyMoolah SFTP Server:**
```
Host: 34.35.137.166
Port: 22
Username: easypay
Authentication: SSH public key only
Home Directory: /home/easypay
```

**Reconciliation File Format:**
- Filename: easypay_recon_YYYYMMDD.csv
- Upload Schedule: Daily, 00:00-06:00 SAST
- CSV columns: transaction_id, easypay_code, transaction_type, merchant_id, terminal_id, cashier_id, transaction_timestamp, gross_amount, settlement_status, merchant_name, receipt_number

**Current Status**:
- MyMoolah SFTP server: READY
- EasyPay SSH key: NOT RECEIVED
- EasyPay IP addresses: NOT RECEIVED
- Reconciliation adapter: IMPLEMENTED but inactive

**Action Required**: EasyPay to provide SSH public key and source IP addresses

---

### Priority 4: Settlement API Implementation (HIGH)

**What EasyPay Needs to Implement:**

**EasyPay must call these MyMoolah endpoints when users redeem PINs:**

1. **Top-up Settlement:**
   ```
   POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/topup/settlement
   Headers:
     X-API-Key: {easypay_api_key}
     X-Idempotency-Key: {unique_key}
     Content-Type: application/json
   Body:
     {
       "easypay_code": "9123412345678",
       "settlement_amount": 100.00,
       "merchant_id": "EP_MERCHANT_12345",
       "transaction_id": "EP_TXN_123456",
       "terminal_id": "EP_TERMINAL_001",
       "timestamp": "2026-01-16T13:40:33+02:00"
     }
   ```

2. **Cash-out Settlement:**
   ```
   POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/cashout/settlement
   Headers:
     X-API-Key: {easypay_api_key}
     X-Idempotency-Key: {unique_key}
     Content-Type: application/json
   Body:
     {
       "easypay_code": "9123498765432",
       "settlement_amount": 500.00,
       "merchant_id": "EP_MERCHANT_12345",
       "transaction_id": "EP_TXN_654321",
       "terminal_id": "EP_TERMINAL_002",
       "timestamp": "2026-01-16T14:00:00+02:00"
     }
   ```

3. **Standalone Voucher Settlement:**
   ```
   POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/voucher/settlement
   Headers:
     X-API-Key: {easypay_api_key}
     X-Idempotency-Key: {unique_key}
     Content-Type: application/json
   Body:
     {
       "easypay_code": "9506312345678",
       "settlement_amount": 200.00,
       "merchant_id": "EP_MERCHANT_12345",
       "transaction_id": "EP_TXN_789012"
     }
   ```

**Current Status**:
- MyMoolah settlement endpoints: IMPLEMENTED and READY
- EasyPay terminal integration: UNKNOWN
- Testing: BLOCKED (no API key)

**Action Required**: EasyPay to implement settlement callback logic in their terminal/POS system

---

## MYMOOLAH IMPLEMENTATION - COMPLETE DETAILS

### Backend Components (100% Complete)

**1. EasyPay Controller** (controllers/easyPayController.js)
- Endpoints: 4 implemented
  - ping: Health check
  - infoRequest: Bill information lookup
  - authorisationRequest: Payment authorization
  - paymentNotification: Payment confirmation
- Status: COMPLETE

**2. Voucher Controller** (controllers/voucherController.js)
- Top-up creation endpoint: COMPLETE
- Top-up settlement endpoint: COMPLETE
- Cash-out creation endpoint: COMPLETE
- Cash-out settlement endpoint: COMPLETE
- Standalone voucher creation: COMPLETE
- Standalone voucher settlement: COMPLETE
- Cancel/expiry handlers: COMPLETE

**3. EasyPay Routes** (routes/easypay.js)
- All 4 EasyPay receiver API endpoints exposed
- Status: COMPLETE

**4. Authentication Middleware** (middleware/easypayAuth.js)
- X-API-Key validation: COMPLETE
- JWT fallback for UAT: COMPLETE
- Constant-time comparison: COMPLETE
- Status: COMPLETE

**5. Reconciliation Adapter** (services/reconciliation/adapters/EasyPayAdapter.js)
- CSV parsing: COMPLETE
- Transaction matching: COMPLETE
- Discrepancy detection: COMPLETE
- Status: IMPLEMENTED (inactive - awaiting SFTP setup)

---

### Frontend Components (100% Complete)

**1. Top-up at EasyPay Overlay** (TopupEasyPayOverlay.tsx)
- Amount selection (R50-R4000)
- Pricing display
- PIN display with formatting (x xxxx xxxx xxxx x)
- Copy PIN button
- Simulate button (UAT only)
- Status: COMPLETE

**2. Cash-out at EasyPay Overlay** (CashoutEasyPayOverlay.tsx)
- Amount selection (R50-R3000)
- Wallet balance display
- Fee breakdown (R8.00 flat fee)
- PIN display with copy button
- Error handling
- Status: COMPLETE

**3. Standalone Voucher**
- Integrated into digital vouchers overlay
- Badge display (EPVoucher blue badge)
- Redemption validation
- Status: COMPLETE

---

### Database Schema (100% Complete)

**Tables:**
- vouchers: Stores all EasyPay vouchers
- transactions: Wallet ledger entries
- supplier_floats: EasyPay float accounts

**Voucher Types (ENUM):**
- easypay_topup: Top-up vouchers (pending_payment → redeemed)
- easypay_topup_active: Active top-up vouchers
- easypay_cashout: Cash-out vouchers (pending_payment → redeemed)
- easypay_cashout_active: Active cash-out vouchers
- easypay_standalone: Standalone vouchers (active → redeemed)

**Float Accounts:**
- EasyPay Top-up Float: 1200-10-02 (R50,000 initial)
- EasyPay Cash-out Float: 1200-10-03 (R50,000 initial)

**Migrations:**
- 20250814_create_easypay_tables.js: Initial tables (COMPLETE)
- 20260115_transform_easypay_to_topup.js: Top-up transformation (COMPLETE)
- 20260116_add_easypay_cashout.js: Cash-out implementation (COMPLETE)
- 20260116_check_and_fund_easypay_topup_float.js: Float funding (COMPLETE)
- 20260116_add_easypay_reconciliation_config.js: Recon setup (COMPLETE)
- 20260117_add_easypay_voucher_type.js: Standalone voucher (COMPLETE)

---

### Documentation (100% Complete)

**API Documentation:**
- EasyPay_API_Integration_Guide.md (1,396 lines): COMPLETE
  - All endpoints documented
  - Request/response schemas
  - Error handling reference
  - Security specifications
  - Testing guide with scenarios
  - SFTP reconciliation specs
  - Production deployment guide

**Configuration Guides:**
- EASYPAY_CASHOUT_ENV_SETUP.md: Environment setup (COMPLETE)
- EASYPAY_CASHOUT_DEPLOYMENT.md: Deployment procedures (COMPLETE)
- EASYPAY_VOUCHER_EXPIRY_AUDIT.md: Expiry handling (COMPLETE)

**OpenAPI Specification:**
- EasyPay_API_OpenAPI.yaml: Machine-readable API spec (COMPLETE)
- Postman Collection: EasyPay BillPayment Receiver API (COMPLETE)

---

## WHAT IS STILL NEEDED - DETAILED BREAKDOWN

### FROM EASYPAY (Action Items for EasyPay)

#### 1. API Credentials (CRITICAL - BLOCKING)

**Required:**
- UAT API Key (for testing)
- Staging API Key (for pre-production)
- Production API Key (for live environment)

**Format**: 64+ character secure random string

**Usage**: EasyPay includes in X-API-Key header when calling MyMoolah settlement endpoints

**Where to Send**: integrations@mymoolah.africa (secure channel)

**Current Blocker**: Without API keys, EasyPay cannot call MyMoolah settlement endpoints, meaning:
- Top-up PINs created but wallets never credited (EasyPay can't notify MyMoolah)
- Cash-out PINs created but never marked as redeemed (EasyPay can't notify MyMoolah)
- Integration cannot be tested end-to-end

---

#### 2. IP Address Whitelist Information (CRITICAL)

**Required:**
- All source IP addresses that will call MyMoolah APIs
- Format: CIDR notation (e.g., 20.164.206.68/32)
- Separate IPs for UAT, Staging, Production (if different)

**Already Provided:**
- 20.164.206.68 (Azure IP)

**Verification Needed:**
- Is this IP whitelisted in MyMoolah infrastructure?
- Are there additional IPs needed?
- Different IPs for different environments?

**Where to Send**: integrations@mymoolah.africa

**Current Status**: UNKNOWN if 20.164.206.68 is actually whitelisted

---

#### 3. SFTP Credentials for Reconciliation (HIGH)

**Required from EasyPay:**
1. **SSH Public Key** (id_ed25519.pub or id_rsa.pub)
2. **Source IP addresses** for SFTP connections (CIDR notation)
3. **Technical contact** (name, email, phone) for SFTP coordination

**MyMoolah Provides:**
- SFTP Host: 34.35.137.166
- Port: 22
- Username: easypay
- Authentication: SSH key-based (no password)

**Purpose**:
- Daily reconciliation file exchange
- Automated discrepancy detection
- Financial reconciliation reporting

**File Format**: CSV with specified schema (documented in API guide)

**Current Status**:
- MyMoolah SFTP server: READY and ACTIVE
- Waiting for: EasyPay SSH public key
- Blocking: Cannot set up SFTP account without key

---

#### 4. Settlement API Implementation (HIGH)

**Required: EasyPay to Implement**

**EasyPay Terminal/POS System Must:**
1. Capture MyMoolah 14-digit PINs when users present them
2. Call MyMoolah settlement endpoints with required data
3. Handle MyMoolah API responses (success/error)
4. Display confirmation to cashier and customer
5. Implement retry logic with idempotency
6. Generate daily reconciliation CSV files

**Endpoints to Call:**
- Top-up: POST /api/v1/vouchers/easypay/topup/settlement
- Cash-out: POST /api/v1/vouchers/easypay/cashout/settlement
- Standalone: POST /api/v1/vouchers/easypay/voucher/settlement

**Required Headers:**
- X-API-Key: {easypay_api_key}
- X-Idempotency-Key: {unique_per_transaction}
- Content-Type: application/json

**Current Status**:
- MyMoolah endpoints: LIVE and TESTED
- EasyPay terminal integration: UNKNOWN
- End-to-end testing: BLOCKED (no API key)

---

### FROM MYMOOLAH (Internal Action Items)

#### 1. Verify IP Whitelist Configuration (MEDIUM)

**Action**: Confirm 20.164.206.68 is whitelisted in Google Cloud Load Balancer

**Responsible**: MyMoolah Infrastructure Team

**Verification**:
```bash
# Check if IP is whitelisted
gcloud compute security-policies describe mymoolah-security-policy \
  --project=mymoolah-db
```

**Status**: PENDING VERIFICATION

---

#### 2. Generate and Share Test Credentials (MEDIUM)

**Action**: Generate UAT/Staging API keys for EasyPay testing

**Command:**
```bash
./scripts/generate-easypay-api-keys.sh
```

**Delivery**: Send to EasyPay Integration Team via secure channel

**Status**: Can be done when EasyPay is ready for testing

---

#### 3. Monitor First Transactions (LOW)

**Action**: Set up enhanced monitoring for EasyPay settlement endpoints

**Alerts:**
- Authentication failures
- Settlement errors
- Amount mismatches
- Idempotency conflicts

**Status**: Monitoring infrastructure ready, will activate when testing begins

---

## INTEGRATION FLOW - COMPLETE PICTURE

### Top-up at EasyPay (How It Works)

**Step 1: User Creates Top-up Request** (MyMoolah App)
- User selects "Top-up at EasyPay"
- Enters amount (R50-R4000)
- MyMoolah generates 14-digit PIN
- Displays PIN to user
- Wallet NOT debited yet (user hasn't paid)

**Step 2: User Pays at EasyPay** (EasyPay Terminal)
- User goes to EasyPay cashier
- Shows PIN + pays cash (R100)
- EasyPay terminal captures PIN

**Step 3: EasyPay Calls MyMoolah** (NEEDS IMPLEMENTATION)
- EasyPay terminal calls MyMoolah settlement API
- Headers: X-API-Key, X-Idempotency-Key
- Body: PIN, amount, merchant details
- MyMoolah validates and credits wallet (R100 - R2.50 = R97.50)

**Step 4: Confirmation** (EasyPay Terminal)
- MyMoolah returns success
- EasyPay prints receipt for customer
- Customer's MyMoolah wallet credited instantly

**Current Gap**: Step 3 (EasyPay calling MyMoolah) - NEEDS EasyPay IMPLEMENTATION

---

### Cash-out at EasyPay (How It Works)

**Step 1: User Creates Cash-out Voucher** (MyMoolah App)
- User selects "Cash-out at EasyPay"
- Enters amount (R50-R3000)
- MyMoolah debits wallet (amount + R8.00 fee)
- Generates 14-digit PIN
- Displays PIN to user

**Step 2: User Withdraws at EasyPay** (EasyPay Terminal)
- User goes to EasyPay cashier
- Shows PIN
- EasyPay terminal captures PIN

**Step 3: EasyPay Calls MyMoolah** (NEEDS IMPLEMENTATION)
- EasyPay terminal calls MyMoolah settlement API
- Headers: X-API-Key, X-Idempotency-Key
- Body: PIN, amount, merchant details
- MyMoolah validates and marks as redeemed

**Step 4: Cash Dispensed** (EasyPay Terminal)
- MyMoolah returns success
- EasyPay cashier hands cash to customer
- EasyPay prints receipt

**Current Gap**: Step 3 (EasyPay calling MyMoolah) - NEEDS EasyPay IMPLEMENTATION

---

## CLARIFICATION: TOP-UP VS CASH-OUT VOUCHERS

### Are They the Same Thing?

**ANSWER: NO - They Are Different**

**Top-up Voucher (14-digit PIN starting with 9)**:
- Purpose: Cash IN to wallet
- Wallet Behavior: NOT debited on creation, CREDITED on settlement
- User pays cash at store → wallet credited
- Amount range: R50-R4000
- Fee: R2.50 (deducted from gross)
- Status flow: pending_payment → redeemed
- Expiry: 96 hours, NO wallet refund (wallet was never debited)

**Cash-out Voucher (14-digit PIN starting with 9)**:
- Purpose: Cash OUT from wallet
- Wallet Behavior: DEBITED on creation (amount + R8 fee), NO credit on settlement
- Wallet already debited → user receives cash at store
- Amount range: R50-R3000
- Fee: R8.00 (charged upfront)
- Status flow: pending_payment → redeemed
- Expiry: 96 hours, wallet REFUNDED (amount + fee)

**Key Differences:**

| Aspect | Top-up | Cash-out |
|--------|--------|----------|
| Purpose | Add money to wallet | Withdraw money from wallet |
| Wallet Debit | On settlement (credit) | On creation |
| User Gives | Cash to cashier | PIN to cashier |
| User Gets | Wallet credit | Cash |
| Fee | R2.50 (deducted from gross) | R8.00 (charged upfront) |
| Expiry Refund | NO (nothing was debited) | YES (refund amount + fee) |
| Cancel Refund | NO (nothing was debited) | YES (refund amount + fee) |

**PIN Format**: Both use same 14-digit format starting with '9', but different prefixes:
- Top-up: 912341... (topup prefix)
- Cash-out: 912349... (cashout prefix)
- Standalone: 950631... (standalone prefix)

---

## ENVIRONMENT STATUS

### UAT/Codespaces

**Status**: READY for testing

**Configuration:**
- Database: Complete with sample data
- Float Accounts: Funded (R50,000 each)
- Frontend: All overlays working
- Backend: All endpoints live
- API Key: Placeholder (works with JWT for simulation)

**Can Test:**
- Create top-up PIN (simulated)
- Create cash-out PIN (simulated)
- Create standalone voucher (simulated)
- Simulate settlement (JWT-authenticated)
- Cancel/expiry scenarios

**Cannot Test:**
- Real EasyPay terminal integration
- Real settlement callbacks from EasyPay
- IP whitelist validation

---

### Staging

**Status**: READY for deployment

**Requirements:**
- Migrations: Run in Staging database (READY)
- Environment Variables: Add to Secret Manager (READY)
- API Endpoints: Deployed (READY)
- IP Whitelist: Configure 20.164.206.68 (PENDING)

**Can Test (once API key received):**
- End-to-end top-up flow
- End-to-end cash-out flow
- Standalone voucher flow
- Real settlement callbacks from EasyPay
- Error scenarios
- Idempotency handling

---

### Production

**Status**: AWAITING Go-Live

**Requirements:**
- All Staging tests passed
- Production API key from EasyPay
- Production IP whitelist configured
- SFTP reconciliation active
- Monitoring and alerting configured

---

## TECHNICAL SPECIFICATIONS

### API Endpoints (MyMoolah Provides to EasyPay)

**Base URL**: `https://staging.mymoolah.africa/api/v1`

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| /vouchers/easypay/topup/settlement | POST | Settle top-up, credit wallet | READY |
| /vouchers/easypay/cashout/settlement | POST | Settle cash-out, mark redeemed | READY |
| /vouchers/easypay/voucher/settlement | POST | Settle standalone voucher | READY |
| /billpayment/v1/ping | GET | Health check | READY |
| /billpayment/v1/infoRequest | POST | Bill info lookup | READY |
| /billpayment/v1/authorisationRequest | POST | Payment auth | READY |
| /billpayment/v1/paymentNotification | POST | Payment confirmation | READY |

**Authentication**: X-API-Key header (required)

**Response Format**: JSON with success/error structure

---

## NEXT STEPS - PRIORITY ORDER

### Immediate (Week 1)

**1. EasyPay Provides API Credentials**
- Generate API keys for UAT, Staging, Production
- Send to integrations@mymoolah.africa via secure channel
- ETA: 1-2 business days

**2. EasyPay Provides SFTP Public Key**
- Generate SSH key pair (ED25519 or RSA 4096)
- Send public key to integrations@mymoolah.africa
- Provide source IP addresses for SFTP
- ETA: 1-2 business days

**3. MyMoolah Configures Access**
- Add EasyPay API keys to Secret Manager
- Verify IP whitelist for 20.164.206.68
- Configure SFTP account with EasyPay public key
- ETA: 24 hours after receiving credentials

**4. Begin UAT Testing**
- EasyPay implements settlement callback logic
- Test with UAT credentials
- Verify end-to-end flows
- ETA: 1-2 weeks

---

### Short-term (Week 2-4)

**5. Complete UAT Sign-off**
- Test all 7 scenarios from API guide
- Verify idempotency handling
- Test error scenarios
- Complete reconciliation test
- ETA: 2-3 weeks

**6. Deploy to Staging**
- Run migrations in Staging database
- Configure Staging API keys
- Deploy Staging environment
- ETA: 1 day

**7. Staging Integration Testing**
- End-to-end testing in Staging
- Load testing (100 TPS)
- Security testing
- ETA: 1 week

---

### Medium-term (Month 2)

**8. Production Readiness**
- UAT sign-off report
- Security audit
- Capacity planning
- Monitoring setup
- ETA: 2 weeks

**9. Production Deployment**
- Production credentials
- Production migration
- Go-live
- ETA: Coordinated launch date

---

## BLOCKERS

### Critical Blockers (Must Resolve Before Testing)

**1. No API Credentials from EasyPay**
- Impact: Cannot test settlement callbacks
- Owner: EasyPay Integration Team
- Resolution: Provide UAT API key
- ETA: Unknown

**2. IP Whitelist Unconfirmed**
- Impact: EasyPay callbacks may be blocked
- Owner: MyMoolah Infrastructure Team + EasyPay
- Resolution: Verify 20.164.206.68 is whitelisted
- ETA: 24 hours

**3. No SFTP Credentials from EasyPay**
- Impact: Cannot set up reconciliation
- Owner: EasyPay Integration Team
- Resolution: Provide SSH public key
- ETA: Unknown

---

### High Priority (Required for Production)

**4. EasyPay Terminal Integration**
- Impact: Cannot process real transactions
- Owner: EasyPay Development Team
- Resolution: Implement settlement callback logic in POS/terminal system
- ETA: Unknown (depends on EasyPay development schedule)

**5. Reconciliation File Generation**
- Impact: Cannot reconcile transactions
- Owner: EasyPay Development Team
- Resolution: Implement CSV file generation and SFTP upload
- ETA: Unknown

---

## RECOMMENDATIONS

### For EasyPay Integration Team

**Immediate Actions:**
1. Generate API keys for all three environments (UAT, Staging, Production)
2. Send API keys to integrations@mymoolah.africa via secure channel
3. Generate SSH key pair for SFTP access
4. Provide SSH public key and source IPs to MyMoolah
5. Confirm which IP addresses will call MyMoolah APIs

**Week 1-2:**
1. Implement settlement callback logic in terminal/POS system
2. Configure API endpoints in EasyPay systems
3. Implement idempotency handling
4. Set up error handling and retry logic
5. Begin UAT testing with MyMoolah

**Week 3-4:**
1. Implement reconciliation CSV file generation
2. Set up automated SFTP uploads
3. Complete UAT sign-off checklist
4. Request production credentials

---

### For MyMoolah Team

**Immediate:**
1. Verify IP 20.164.206.68 is whitelisted in infrastructure
2. Prepare UAT test accounts and PINs for EasyPay
3. Generate test API keys when EasyPay is ready

**Upon Receiving EasyPay Credentials:**
1. Add API keys to Secret Manager
2. Configure SFTP account with EasyPay public key
3. Provide test PINs to EasyPay for testing
4. Support EasyPay during UAT testing

---

## SUMMARY - QUICK STATUS

### What MyMoolah Has COMPLETED:

- Backend APIs (3 settlement endpoints): COMPLETE
- Frontend Components (3 overlays): COMPLETE
- Database Schema (6 migrations): COMPLETE
- Float Accounts (2 accounts, R50k each): COMPLETE
- Documentation (1,396+ lines): COMPLETE
- Reconciliation Adapter: COMPLETE
- Authentication Middleware: COMPLETE
- SFTP Server: READY
- Error Handling: COMPLETE
- Testing in UAT: POSSIBLE (simulation mode)

**MyMoolah Integration: 95% Complete**

---

### What MyMoolah Is WAITING FOR:

- EasyPay API Credentials (UAT, Staging, Production): PENDING
- EasyPay SSH Public Key (for SFTP): PENDING
- EasyPay Source IP Confirmation: PENDING
- EasyPay Terminal Integration: PENDING
- End-to-End Testing: BLOCKED

**Waiting on EasyPay: 5 Critical Items**

---

## CONTACT INFORMATION

**MyMoolah Integration Support:**
- Email: integrations@mymoolah.africa
- Phone: +27 21 140 7030
- Emergency: +27 82 557 1055

**To Unblock Integration:**
Email integrations@mymoolah.africa with:
1. UAT/Staging/Production API keys
2. SSH public key for SFTP
3. Source IP addresses (CIDR notation)
4. Expected testing timeline

---

**Report End**

This summary provides a complete overview of EasyPay integration status. The integration is technically complete on MyMoolah's side and awaiting EasyPay credentials and implementation to enable bidirectional communication.
