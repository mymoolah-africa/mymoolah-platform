# EasyPay Integration Status - Brief Summary

**Date**: February 2, 2026  
**From**: MyMoolah Treasury Platform  
**To**: EasyPay Integration Team  
**Subject**: Integration Status and Required Actions

---

## CURRENT STATUS

MyMoolah has completed all development work for the EasyPay integration. All APIs, frontend components, database infrastructure, and documentation are ready and deployed to Staging.

**MyMoolah Integration Status: 95% Complete**

**Remaining 5%**: Awaiting EasyPay credentials and implementation of settlement callbacks.

---

## SERVICES INTEGRATED

### 1. Top-up at EasyPay
Users create a 14-digit PIN in MyMoolah app, pay cash at EasyPay cashier, wallet credited instantly.
- Amount range: R50 - R4,000
- Fee: R2.50 (MyMoolah deducts from gross amount)
- Wallet behavior: NOT debited on creation, CREDITED on settlement

### 2. Cash-out at EasyPay
Users create a cash-out PIN (wallet debited), visit EasyPay cashier, receive cash.
- Amount range: R50 - R3,000
- Fee: R8.00 (charged to user upfront)
- Wallet behavior: DEBITED on creation (amount + fee)

### 3. Standalone EasyPay Voucher
Users create vouchers for payment at EasyPay merchants (online or in-store).
- Amount range: R50 - R3,000
- Fee: R2.50
- Wallet behavior: DEBITED on creation

All three services use 14-digit PINs starting with '9'.

---

## WHAT MYMOOLAH HAS COMPLETED

**Backend APIs (Ready)**
- 3 settlement endpoints (top-up, cash-out, standalone voucher)
- Authentication middleware (X-API-Key validation)
- Error handling and idempotency support
- Reconciliation infrastructure

**Frontend (Ready)**
- Top-up overlay (create PIN, display to user)
- Cash-out overlay (create PIN, debit wallet)
- Standalone voucher integration

**Infrastructure (Ready)**
- Database schema and migrations deployed
- Float accounts funded (R50,000 each)
- SFTP server configured (34.35.137.166)
- Staging environment deployed
- Monitoring and alerting configured

**Documentation (Ready)**
- Complete API integration guide (1,396 lines)
- OpenAPI specification
- Postman collection
- Testing scenarios

---

## WHAT MYMOOLAH NEEDS FROM EASYPAY

### 1. API Credentials (CRITICAL - BLOCKING)

**Required:**
- UAT API Key (for testing)
- Staging API Key (for pre-production testing)
- Production API Key (for go-live)

**Format**: 64+ character secure random string

**Usage**: EasyPay includes this in `X-API-Key` header when calling MyMoolah settlement endpoints

**Send To**: integrations@mymoolah.africa (secure channel)

**Why Needed**: Without API keys, EasyPay cannot call MyMoolah's settlement endpoints to notify when:
- User pays cash for top-up (wallet never credited)
- User withdraws cash (voucher never marked as redeemed)

**Current Blocker**: Integration cannot be tested end-to-end without API keys

---

### 2. IP Address Confirmation (CRITICAL)

**Required:**
- All source IP addresses that will call MyMoolah APIs
- Format: CIDR notation (e.g., 20.164.206.68/32 for single IP)

**Already Provided:**
- 20.164.206.68 (Azure IP)

**Verification Needed:**
1. Is 20.164.206.68 the only IP that will call MyMoolah APIs?
2. Are there separate IPs for UAT, Staging, and Production?
3. Should MyMoolah whitelist any additional IP ranges?

**Send To**: integrations@mymoolah.africa

**Why Needed**: MyMoolah infrastructure uses IP whitelisting for security. Unlisted IPs will be blocked.

---

### 3. SFTP Credentials for Reconciliation (HIGH PRIORITY)

**Required from EasyPay:**
1. SSH Public Key (id_ed25519.pub or id_rsa.pub)
2. Source IP addresses for SFTP connections (CIDR format)
3. Technical contact (name, email, phone)

**MyMoolah SFTP Server Details:**
```
Host: 34.35.137.166
Port: 22
Username: easypay
Authentication: SSH key-based (no password)
```

**Purpose**: Daily reconciliation file exchange

**File Format**: CSV file named `easypay_recon_YYYYMMDD.csv`

**Upload Schedule**: Daily between 00:00-06:00 SAST

**Send To**: integrations@mymoolah.africa

**Why Needed**: Automated financial reconciliation, discrepancy detection, compliance reporting

---

## WHAT EASYPAY NEEDS TO IMPLEMENT

### 1. Settlement API Integration (HIGH PRIORITY)

**EasyPay terminal/POS system must call MyMoolah endpoints when users redeem PINs:**

**Top-up Settlement** (when user pays cash):
```
POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/topup/settlement

Headers:
  X-API-Key: {your_api_key}
  X-Idempotency-Key: {unique_per_transaction}
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

**Cash-out Settlement** (when user withdraws cash):
```
POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/cashout/settlement

Headers:
  X-API-Key: {your_api_key}
  X-Idempotency-Key: {unique_per_transaction}
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

**Standalone Voucher Settlement** (when user pays with voucher):
```
POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/voucher/settlement

Headers:
  X-API-Key: {your_api_key}
  X-Idempotency-Key: {unique_per_transaction}
  Content-Type: application/json

Body:
  {
    "easypay_code": "9506312345678",
    "settlement_amount": 200.00,
    "merchant_id": "EP_MERCHANT_12345",
    "transaction_id": "EP_TXN_789012"
  }
```

**Response Handling:**
- Success: HTTP 200 with settlement confirmation
- Error: HTTP 400/404/500 with error details
- Implement retry logic for network failures (use same idempotency key)

---

### 2. Reconciliation File Generation (HIGH PRIORITY)

**EasyPay must generate daily CSV files and upload to MyMoolah SFTP server:**

**File Format:**
```csv
transaction_id,easypay_code,transaction_type,merchant_id,terminal_id,cashier_id,transaction_timestamp,gross_amount,settlement_status,merchant_name,receipt_number
EP_TXN_001,9123412345678,topup,EP_MERCHANT_001,EP_TERMINAL_001,CASHIER_789,2026-01-16T13:40:33+02:00,100.00,settled,Pick n Pay,RCP-001234
EP_TXN_002,9123498765432,cashout,EP_MERCHANT_001,EP_TERMINAL_002,CASHIER_456,2026-01-16T14:00:00+02:00,500.00,settled,Checkers,RCP-567890
```

**Upload Command:**
```bash
sftp easypay@34.35.137.166 << EOF
cd /home/easypay
put easypay_recon_20260116.csv
bye
EOF
```

**Schedule**: Upload daily between 00:00-06:00 SAST for previous day's transactions

---

## PRODUCTION ENDPOINTS

**UAT/Staging (Current Testing)**:
```
https://staging.mymoolah.africa/api/v1
```

**Production (When Live)**:
```
https://api-mm.mymoolah.africa/api/v1
```

---

## TIMELINE TO GO-LIVE

**Week 1-2**: 
- EasyPay provides: API keys, SSH public key, IP addresses
- MyMoolah configures: API keys in Secret Manager, SFTP account, IP whitelist
- Begin UAT testing

**Week 3-4**:
- Complete UAT testing (7 test scenarios)
- Verify idempotency, error handling, reconciliation
- UAT sign-off

**Week 5-6**:
- Deploy to Staging
- Integration testing in pre-production environment
- Load testing

**Week 7-8**:
- Production deployment
- Go-live with monitoring
- Post-launch support

---

## IMMEDIATE NEXT STEPS (THIS WEEK)

**EasyPay Action Items:**

1. **Generate and Send API Keys**
   - UAT key, Staging key, Production key
   - Email to: integrations@mymoolah.africa
   - Format: 64+ character secure random strings

2. **Provide SFTP Credentials**
   - Generate SSH key pair: `ssh-keygen -t ed25519 -C "easypay-recon@easypay.co.za"`
   - Send public key (id_ed25519.pub) to integrations@mymoolah.africa
   - Provide source IP addresses for SFTP connections

3. **Confirm IP Addresses**
   - Verify 20.164.206.68 will be used for all environments
   - Or provide separate IPs for UAT/Staging/Production
   - Provide any additional IP ranges needed

**MyMoolah Action Items (upon receiving above):**

1. Add API keys to Google Secret Manager (24 hours)
2. Configure SFTP account with EasyPay public key (24 hours)
3. Verify IP whitelist configuration (24 hours)
4. Provide test PINs and test accounts for UAT testing

---

## TESTING REQUIREMENTS

Once credentials are received, EasyPay must test:

**Test Scenarios:**
1. Successful top-up (user pays R100, wallet credited R97.50)
2. Successful cash-out (user withdraws R500, PIN marked redeemed)
3. Invalid PIN (verify error response)
4. Amount mismatch (verify rejection)
5. Idempotency (retry same request, verify no duplicate)
6. Expired PIN (verify rejection)
7. Missing/invalid API key (verify authentication error)

**Success Criteria:**
- All 7 scenarios pass
- Error handling verified
- Idempotency working
- Reconciliation file generated and uploaded successfully

---

## CONTACT INFORMATION

**MyMoolah Integration Support:**

Email: integrations@mymoolah.africa  
Phone: +27 21 140 7030  
Emergency: +27 82 557 1055

**For Immediate Action:**

Send email to integrations@mymoolah.africa with subject "EasyPay Integration - Credentials Request" including:
1. UAT, Staging, and Production API keys
2. SSH public key for SFTP
3. Source IP addresses (CIDR notation)
4. Expected UAT testing start date
5. Technical contact information

---

## APPENDIX: KEY INFORMATION

**PIN Format**: 14 digits starting with '9' (Luhn validated)

**API Authentication**: X-API-Key header (required for all settlement calls)

**Idempotency**: X-Idempotency-Key header (prevents duplicate processing)

**SFTP Reconciliation**: Daily CSV upload between 00:00-06:00 SAST

**Support**: Available 24/7 for production issues

**Documentation**: Complete API guide available upon request (1,396 lines)

---

**END OF BRIEF**

For complete technical details, request the full API Integration Guide from integrations@mymoolah.africa
