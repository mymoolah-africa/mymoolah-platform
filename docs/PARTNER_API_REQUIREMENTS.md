# MyMoolah Partner API - Implementation Requirements

**Date**: November 12, 2025  
**Status**: Requirements Document  
**Priority**: High - Required for Partner Integrations

---

## 📋 Overview

This document outlines what needs to be implemented on MyMoolah's side to enable partner integrations (Zapper, 1 Voucher, OTT, etc.) to sell MMVouchers via API.

---

## ✅ What Already Exists

### 1. Core Voucher Issuance
- ✅ Voucher creation endpoint (`POST /api/v1/vouchers/issue`)
- ✅ Voucher query endpoint (`GET /api/v1/vouchers/code/:voucher_code`)
- ✅ Database schema for vouchers
- ✅ Wallet debit logic
- ✅ Transaction recording

### 2. Authentication Infrastructure
- ✅ JWT token system
- ✅ Middleware for authentication (`middleware/auth.js`)
- ✅ User-based authentication

### 3. Security Features
- ✅ Rate limiting
- ✅ Input validation
- ✅ TLS 1.3 support
- ✅ CORS configuration

---

## ❌ What's Missing (Required for Partner API)

### 1. Partner Authentication System

**Status**: ❌ NOT IMPLEMENTED

**Required**:
- Partner account management (database table)
- Partner API credentials (API keys/secrets)
- OAuth 2.0 Client Credentials flow endpoint
- Partner-specific JWT token generation
- Partner authentication middleware

**Implementation Needed**:
1. Create `partners` table:
   ```sql
   CREATE TABLE partners (
     id SERIAL PRIMARY KEY,
     partner_id VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255) NOT NULL,
     api_key VARCHAR(255) UNIQUE NOT NULL,
     api_secret_hash VARCHAR(255) NOT NULL,
     webhook_secret VARCHAR(255),
     webhook_url TEXT,
     payment_model VARCHAR(50) DEFAULT 'float_based',
     status VARCHAR(50) DEFAULT 'active',
     environment VARCHAR(50) DEFAULT 'uat',
     rate_limit_per_minute INTEGER DEFAULT 100,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```
   
   -- payment_model values: 'direct_payment' (e.g., Zapper) or 'float_based' (default)

2. Create `partner_auth` endpoint:
   - `POST /api/v1/partner/auth/token`
   - Accepts `client_id` and `client_secret`
   - Returns JWT token with partner scope

3. Create `partnerAuthMiddleware`:
   - Validates partner JWT tokens
   - Checks partner status (active/inactive)
   - Enforces partner-specific rate limits

**Files to Create**:
- `models/Partner.js`
- `controllers/partnerAuthController.js`
- `routes/partnerAuth.js`
- `middleware/partnerAuth.js`

---

### 2. Partner-Specific Voucher Issuance Endpoint

**Status**: ❌ NOT IMPLEMENTED

**Required**:
- Dedicated partner endpoint: `POST /api/v1/partner/vouchers/issue`
- Customer lookup/creation by MSISDN
- Partner reference tracking
- Different authentication (partner JWT, not user JWT)

**Implementation Needed**:
1. Create `partnerVoucherController.js`:
   - `issueVoucherForPartner()` function
   - Accepts partner JWT token
   - Looks up customer by MSISDN (creates if doesn't exist)
   - Issues voucher on behalf of customer
   - Returns voucher details
   - **Payment Flow Model Support**:
     - **Direct Payment Model** (e.g., Zapper): Customer payment processed by partner before API call. No wallet balance check required.
     - **Float-Based Model**: Check customer wallet balance before issuance. Return 402 if insufficient.

2. Customer auto-creation logic:
   - If customer doesn't exist, create minimal user account
   - Create wallet for new customer
   - Handle KYC requirements (may need to be deferred)

3. Partner reference tracking:
   - Store `partner_reference` in voucher metadata
   - Enable query by partner reference

4. Payment flow model configuration:
   - Add `payment_model` field to `partners` table (`direct_payment` or `float_based`)
   - Check partner's payment model before processing voucher issuance
   - Skip wallet balance check for Direct Payment partners

**Files to Create/Modify**:
- `controllers/partnerVoucherController.js` (NEW)
- `routes/partnerVouchers.js` (NEW)
- `services/customerService.js` (NEW - for customer lookup/creation)

---

### 3. Partner Query Endpoints

**Status**: ❌ NOT IMPLEMENTED

**Required**:
- `GET /api/v1/partner/vouchers/{voucher_code}`
- `GET /api/v1/partner/vouchers/partner/{partner_reference}`

**Implementation Needed**:
1. Query by voucher code (partner-authenticated)
2. Query by partner reference
3. Return voucher status, balance, expiry

**Files to Create/Modify**:
- `controllers/partnerVoucherController.js` (add query methods)

---

### 4. Webhook System

**Status**: ❌ NOT IMPLEMENTED

**Required**:
- Webhook delivery service
- Webhook signature generation (HMAC-SHA256)
- Webhook retry logic
- Webhook event types:
  - `voucher.issued`
  - `voucher.redeemed`
  - `voucher.expired`
  - `voucher.cancelled`

**Implementation Needed**:
1. Create `services/webhookService.js`:
   - Queue webhook events
   - Sign payloads with HMAC-SHA256
   - Deliver webhooks with retry logic
   - Log webhook delivery status

2. Integrate webhook triggers:
   - After voucher issuance
   - After voucher redemption
   - After voucher expiry
   - After voucher cancellation

3. Create webhook delivery queue:
   - Use Redis or database queue
   - Retry failed webhooks (3 attempts: 1min, 5min, 30min)
   - Timeout: 10 seconds per attempt

**Files to Create**:
- `services/webhookService.js`
- `models/WebhookDelivery.js`
- `jobs/webhookDeliveryJob.js`

---

### 5. Partner Management System

**Status**: ❌ NOT IMPLEMENTED

**Required**:
- Partner registration/onboarding
- Partner credential management
- Partner dashboard/portal
- Partner usage analytics

**Implementation Needed**:
1. Admin endpoints for partner management:
   - `POST /api/v1/admin/partners` - Create partner
   - `GET /api/v1/admin/partners` - List partners
   - `PUT /api/v1/admin/partners/{partner_id}` - Update partner
   - `POST /api/v1/admin/partners/{partner_id}/credentials` - Regenerate credentials

2. Partner portal (optional, can be manual initially):
   - Partner login
   - View transactions
   - View API usage stats
   - Manage webhook URL

**Files to Create**:
- `controllers/adminPartnerController.js`
- `routes/adminPartners.js`

---

### 6. Environment Configuration

**Status**: ⚠️ PARTIALLY IMPLEMENTED

**Required**:
- Separate UAT and Production base URLs
- Environment-specific credentials
- Environment-specific rate limits

**Implementation Needed**:
1. Update `server.js` to support partner routes:
   ```javascript
   const partnerAuthRoutes = require('./routes/partnerAuth');
   const partnerVoucherRoutes = require('./routes/partnerVouchers');
   app.use('/api/v1/partner', partnerAuthRoutes);
   app.use('/api/v1/partner', partnerVoucherRoutes);
   ```

2. Environment variables:
   ```
   PARTNER_API_ENABLED=true
   PARTNER_UAT_BASE_URL=https://uat-api.mymoolah.com
   PARTNER_PROD_BASE_URL=https://api.mymoolah.com
   ```

---

### 7. Documentation & Testing

**Status**: ✅ DOCUMENTATION CREATED, ❌ TESTING NEEDED

**Required**:
- ✅ API documentation (created: `PARTNER_API_INTEGRATION_GUIDE.md`)
- ❌ OpenAPI/Swagger specification for partner API
- ❌ Postman collection for partners
- ❌ Integration test suite
- ❌ UAT test environment setup

**Implementation Needed**:
1. Create OpenAPI spec: `docs/partner-api-openapi.yaml`
2. Create Postman collection: `docs/partner-api.postman_collection.json`
3. Create integration tests: `tests/partner-api.test.js`
4. Set up UAT environment with test partners

---

## 🎯 Implementation Priority

### Phase 1: Core Functionality (Week 1)
1. ✅ Partner authentication system
2. ✅ Partner voucher issuance endpoint
3. ✅ Partner query endpoints
4. ✅ Basic error handling

### Phase 2: Webhooks & Events (Week 2)
1. ✅ Webhook service
2. ✅ Webhook delivery queue
3. ✅ Webhook signature generation
4. ✅ Webhook retry logic

### Phase 3: Management & Monitoring (Week 3)
1. ✅ Partner management endpoints
2. ✅ Usage analytics
3. ✅ Rate limiting per partner
4. ✅ Logging and monitoring

### Phase 4: Testing & Documentation (Week 4)
1. ✅ Integration tests
2. ✅ UAT environment setup
3. ✅ Postman collection
4. ✅ OpenAPI specification

---

## 🔧 Technical Implementation Details

### Database Migrations Needed

1. **Partners Table**:
   ```sql
   CREATE TABLE partners (
     id SERIAL PRIMARY KEY,
     partner_id VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255) NOT NULL,
     api_key VARCHAR(255) UNIQUE NOT NULL,
     api_secret_hash VARCHAR(255) NOT NULL,
     webhook_secret VARCHAR(255),
     webhook_url TEXT,
     status VARCHAR(50) DEFAULT 'active',
     environment VARCHAR(50) DEFAULT 'uat',
     rate_limit_per_minute INTEGER DEFAULT 100,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Webhook Deliveries Table**:
   ```sql
   CREATE TABLE webhook_deliveries (
     id SERIAL PRIMARY KEY,
     partner_id INTEGER REFERENCES partners(id),
     event_type VARCHAR(100) NOT NULL,
     payload JSONB NOT NULL,
     signature VARCHAR(255) NOT NULL,
     status VARCHAR(50) DEFAULT 'pending',
     attempts INTEGER DEFAULT 0,
     last_attempt_at TIMESTAMP,
     delivered_at TIMESTAMP,
     error_message TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Partner Transactions Table** (for analytics):
   ```sql
   CREATE TABLE partner_transactions (
     id SERIAL PRIMARY KEY,
     partner_id INTEGER REFERENCES partners(id),
     voucher_id INTEGER REFERENCES vouchers(id),
     partner_reference VARCHAR(255) NOT NULL,
     amount DECIMAL(15,2) NOT NULL,
     status VARCHAR(50) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

### Code Structure

```
controllers/
  ├── partnerAuthController.js      (NEW)
  ├── partnerVoucherController.js   (NEW)
  └── adminPartnerController.js     (NEW)

routes/
  ├── partnerAuth.js                (NEW)
  ├── partnerVouchers.js            (NEW)
  └── adminPartners.js              (NEW)

middleware/
  ├── partnerAuth.js                (NEW)
  └── partnerRateLimit.js           (NEW)

services/
  ├── webhookService.js             (NEW)
  ├── customerService.js            (NEW)
  └── partnerService.js             (NEW)

models/
  ├── Partner.js                    (NEW)
  ├── WebhookDelivery.js            (NEW)
  └── PartnerTransaction.js         (NEW)
```

---

## 🧪 Testing Requirements

### Unit Tests
- Partner authentication
- Voucher issuance logic
- Customer lookup/creation
- Webhook signature generation

### Integration Tests
- End-to-end voucher issuance flow
- Webhook delivery
- Error scenarios
- Rate limiting

### UAT Test Scenarios
1. Successful voucher issuance
2. Insufficient balance handling
3. Invalid MSISDN format
4. Duplicate partner reference (idempotency)
5. Webhook delivery success
6. Webhook delivery failure and retry
7. Rate limit enforcement

---

## 📊 Monitoring & Analytics

### Metrics to Track
- Partner API request volume
- Success/failure rates
- Average response times
- Webhook delivery success rate
- Partner-specific error rates

### Alerts
- High error rate (> 5%)
- Webhook delivery failures (> 10%)
- Rate limit violations
- Unusual transaction patterns

---

## 🔒 Security Considerations

### API Key Security
- Store API secrets as hashed values (bcrypt)
- Never return secrets in API responses
- Rotate secrets periodically
- Implement secret expiration

### Rate Limiting
- Per-partner rate limits
- Global rate limits
- Burst protection
- Rate limit headers in responses

### Webhook Security
- HMAC-SHA256 signatures
- Timestamp validation (prevent replay attacks)
- IP whitelisting (optional)
- Webhook secret rotation

---

## 📝 Next Steps

1. **Review Requirements**: Review this document with the team
2. **Create Database Migrations**: Set up partners and webhook tables
3. **Implement Authentication**: Build partner auth system
4. **Build Voucher Endpoint**: Create partner voucher issuance
5. **Implement Webhooks**: Build webhook delivery service
6. **Testing**: Create test suite and UAT environment
7. **Documentation**: Finalize API documentation
8. **Deploy to UAT**: Deploy for partner testing
9. **Production Deployment**: Deploy to production after UAT approval

---

## 📞 Questions & Support

For questions about implementation:
- Technical Lead: [Contact]
- API Team: api-dev@mymoolah.com
- Documentation: docs@mymoolah.com

---

**Document Status**: Requirements Complete  
**Next Review**: After Phase 1 Implementation


