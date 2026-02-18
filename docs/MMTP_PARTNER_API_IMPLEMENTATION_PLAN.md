# MyMoolah Treasury Platform - Partner API Documentation Implementation Plan

**Created**: February 12, 2026  
**Author**: AI Agent (Claude Opus 4.5)  
**Status**: Implementation Plan  
**Version**: 1.0.0  
**Compliance**: OpenAPI 3.1, Mojaloop FSPIOP, ISO 20022, PSD2/Open Banking

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Objectives](#2-objectives)
3. [Technical Architecture](#3-technical-architecture)
4. [API Credential System](#4-api-credential-system)
5. [Endpoint Inventory](#5-endpoint-inventory)
6. [Documentation Structure](#6-documentation-structure)
7. [Security Requirements](#7-security-requirements)
8. [Implementation Phases](#8-implementation-phases)
9. [Deliverables](#9-deliverables)
10. [Appendix: Response Codes](#10-appendix-response-codes)

---

## 1. Executive Summary

### 1.1 Purpose
Create comprehensive, banking-grade API documentation for the **MyMoolah Treasury Platform (MMTP) Partner API**, enabling third-party clients to integrate with MMTP to:
- Purchase VAS products (airtime, data, electricity, vouchers, bill payments)
- Process payments via PayShap (Request to Pay, Request Payment)
- Access QR payment services
- Manage beneficiaries and transactions

### 1.2 Reference Model
This documentation follows the structure and quality standards of the **Flash Partner API V4** documentation, adapted for MMTP's banking-grade Mojaloop-compliant architecture.

### 1.3 Key Differentiators
| Feature | Flash API | MMTP Partner API |
|---------|-----------|------------------|
| Specification Format | PDF | **OpenAPI 3.1 + PDF + Redoc** |
| Authentication | OAuth 2.0 Bearer (API Key) | **OAuth 2.0 Bearer (JWT HS512)** |
| Compliance | Standard | **Mojaloop FSPIOP + ISO 20022** |
| Security | TLS | **TLS 1.3 + mTLS option** |
| Idempotency | Reference-based | **Reference-based + UUID** |
| Rate Limiting | Not documented | **Multi-tier (100/min client, 1000/min global)** |

---

## 2. Objectives

### 2.1 Primary Goals
1. **Client Enablement**: Enable third-party clients to integrate with MMTP for VAS purchases and payment services
2. **Banking-Grade Compliance**: Meet Mojaloop FSPIOP, ISO 20022, and PSD2/Open Banking standards
3. **Developer Experience**: Provide interactive Swagger UI (sandbox only) and static Redoc (production-facing)
4. **Multi-Format Delivery**: OpenAPI 3.1 spec, PDF document, interactive portal

### 2.2 Success Criteria
- [ ] Complete OpenAPI 3.1 specification covering all client-facing endpoints
- [ ] PDF documentation matching Flash API quality/structure
- [ ] Sandbox environment with test credentials
- [ ] Production credential delivery process documented
- [ ] <200ms API response time
- [ ] 99.9% uptime SLA documented

---

## 3. Technical Architecture

### 3.1 Environment URLs

| Environment | Base URL | Token URL | Purpose |
|-------------|----------|-----------|---------|
| **Sandbox** | `https://staging.mymoolah.africa` | `https://staging.mymoolah.africa/api/v1/auth/token` | Partner integration testing with test credentials |
| **Production** | `https://api-mm.mymoolah.africa` | `https://api-mm.mymoolah.africa/api/v1/auth/token` | Live transactions |

> **Note**: The Sandbox environment uses the same infrastructure as staging but with segregated test credentials. Partners receive sandbox credentials (`sk_test_*`) that connect to test float accounts with no real money movement.

### 3.2 API Version
- **Current Version**: v1 (`/api/v1/`)
- **Versioning Strategy**: URL path versioning (future: `/api/v2/`)

### 3.3 Rate Limiting Tiers

| Tier | Limit | Scope |
|------|-------|-------|
| Global | 1,000 requests/minute | All clients combined |
| Client | 100 requests/minute | Per API key |
| Endpoint | 30 requests/minute | High-risk endpoints (purchases) |
| Auth | 5 requests/minute | Token generation |

---

## 4. API Credential System

### 4.1 Credential Components

Similar to Flash, MMTP API credentials consist of:

| Component | Description | Example |
|-----------|-------------|---------|
| **Client ID** | Unique identifier for the partner | `mmtp_client_abc123` |
| **Client Secret** | Secret key for token generation | `sk_live_...` or `sk_test_...` |
| **Account Number** | Partner's MMTP account identifier | `MMTP-2026-001234` |
| **Base URL** | Environment-specific API endpoint | `https://api-mm.mymoolah.africa` |

### 4.2 Credential Types

| Type | Prefix | Usage | Distribution |
|------|--------|-------|--------------|
| **Test/Sandbox** | `sk_test_` | Development and UAT | Published in documentation, developer portal |
| **Production** | `sk_live_` | Live transactions | Encrypted delivery via secure channel |

### 4.3 Test Credentials (Published)

```
Environment: Sandbox
Base URL: https://staging.mymoolah.africa
Client ID: mmtp_test_client
Client Secret: sk_test_xxxxxxxxxxxxxxxxxxxx
Account Number: MMTP-TEST-000001
```

> **Important**: Sandbox credentials use isolated test float accounts. No real money is debited or credited. Test transactions are clearly marked in the system.

### 4.4 Production Credential Delivery

Production credentials are **NEVER published** in documentation. Delivery process:

1. Partner completes KYB (Know Your Business) verification
2. Partner signs API agreement and accepts terms
3. MMTP generates production credentials
4. Credentials delivered via:
   - Encrypted email (PGP/GPG)
   - Secure portal download (one-time link, 24-hour expiry)
   - In-person delivery for high-value partners
5. Partner confirms receipt and activates credentials
6. First transaction triggers compliance review

---

## 5. Endpoint Inventory

### 5.1 Authentication Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| POST | `/api/v1/auth/token` | Generate OAuth 2.0 access token |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/revoke` | Revoke access token |

### 5.2 Account Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| GET | `/api/v1/partner/account` | Get partner account details |
| GET | `/api/v1/partner/balance` | Get partner float balance |
| GET | `/api/v1/partner/transactions` | List partner transactions |

### 5.3 Product Catalog Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| GET | `/api/v1/products` | List all available products |
| GET | `/api/v1/products/categories` | List product categories |
| GET | `/api/v1/products/types` | List product types |
| GET | `/api/v1/products/{productId}` | Get product by ID |
| GET | `/api/v1/products/search` | Search products |
| GET | `/api/v1/products/featured` | Get featured products |

### 5.4 VAS Purchase Endpoints (Overlay Services)

#### 5.4.1 Airtime & Data

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| GET | `/api/v1/overlay/airtime-data/catalog` | Get airtime/data product catalog |
| POST | `/api/v1/overlay/airtime-data/purchase` | Purchase airtime or data |

**Request Parameters (Purchase)**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reference | String | Yes | Unique client reference (idempotency key) |
| accountNumber | String | Yes | Partner account number |
| productId | String | Yes | MMTP product identifier |
| variantId | String | Yes | Product variant (network + amount) |
| amount | Integer | Yes | Amount in cents (ZAR) |
| mobileNumber | String | Yes | Recipient mobile (E.164 format: +27...) |
| metadata | Object | No | Custom key-value pairs |

#### 5.4.2 Electricity (Prepaid Utilities)

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| GET | `/api/v1/overlay/electricity/catalog` | Get electricity providers |
| POST | `/api/v1/overlay/electricity/lookup` | Lookup meter number (prevend) |
| POST | `/api/v1/overlay/electricity/purchase` | Purchase electricity token |

**Request Parameters (Lookup)**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reference | String | Yes | Unique client reference |
| accountNumber | String | Yes | Partner account number |
| meterNumber | String | Yes | Electricity meter number |
| amount | Integer | Yes | Amount in cents (ZAR) |
| isFBE | Boolean | No | Free Basic Electricity (default: false) |

**Request Parameters (Purchase)**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reference | String | Yes | Unique client reference |
| accountNumber | String | Yes | Partner account number |
| meterNumber | String | Yes | Electricity meter number |
| amount | Integer | Yes | Amount in cents (ZAR) |
| isFBE | Boolean | No | Free Basic Electricity (default: false) |
| metadata | Object | No | Custom key-value pairs |

#### 5.4.3 Bill Payments

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| GET | `/api/v1/overlay/bills/categories` | Get bill payment categories |
| GET | `/api/v1/overlay/bills/search` | Search billers |
| POST | `/api/v1/overlay/bills/lookup` | Lookup biller account |
| POST | `/api/v1/overlay/bills/pay` | Pay bill |

### 5.5 Voucher Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| POST | `/api/v1/vouchers/issue` | Issue voucher (partner float) |
| POST | `/api/v1/vouchers/redeem` | Redeem voucher |
| GET | `/api/v1/vouchers/code/{voucher_code}` | Get voucher by code |
| POST | `/api/v1/vouchers/{voucherId}/cancel` | Cancel voucher |

### 5.6 PayShap Endpoints (Standard Bank)

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| POST | `/api/v1/standardbank/payshap/rpp` | Request Payment (outbound) |
| POST | `/api/v1/standardbank/payshap/rtp` | Request to Pay (inbound request) |
| POST | `/api/v1/standardbank/notification` | Payment notification webhook |
| GET | `/api/v1/standardbank/payshap/status/{transactionId}` | Get transaction status |

### 5.7 Send Money / P2P Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| POST | `/api/v1/send-money/resolve-recipient` | Resolve recipient by MSISDN |
| POST | `/api/v1/send-money/quote` | Get transfer quote |
| POST | `/api/v1/send-money/transfer` | Execute transfer |
| GET | `/api/v1/send-money/status/{transactionId}` | Get transfer status |

### 5.8 QR Payment Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| POST | `/api/v1/qr/scan` | Decode and validate QR code |
| POST | `/api/v1/qr/payment/initiate` | Initiate QR payment |
| POST | `/api/v1/qr/payment/confirm` | Confirm QR payment |
| GET | `/api/v1/qr/payment/status/{paymentId}` | Get payment status |
| GET | `/api/v1/qr/merchants` | List supported QR merchants |

### 5.9 Beneficiary Management Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| GET | `/api/v1/beneficiaries` | List beneficiaries |
| POST | `/api/v1/beneficiaries` | Add beneficiary |
| PUT | `/api/v1/beneficiaries/{id}` | Update beneficiary |
| DELETE | `/api/v1/beneficiaries/{id}` | Delete beneficiary |
| GET | `/api/v1/beneficiaries/search` | Search beneficiaries |

### 5.10 Transaction History Endpoints

| HTTP Method | Endpoint | Description |
|-------------|----------|-------------|
| GET | `/api/v1/transactions` | List transactions |
| GET | `/api/v1/transactions/{id}` | Get transaction by ID |

### 5.11 Webhook/Callback Endpoints (Partner Implements)

Partners must implement these endpoints to receive callbacks:

| HTTP Method | Endpoint (Partner's URL) | Description |
|-------------|--------------------------|-------------|
| POST | `/webhook/mmtp/transaction` | Transaction status updates |
| POST | `/webhook/mmtp/payment` | Payment confirmations |
| POST | `/webhook/mmtp/payshap` | PayShap notifications |

---

## 6. Documentation Structure

### 6.1 Document Outline (Matching Flash API Structure)

```
MMTP Partner API Documentation

1. OVERVIEW
   1.1 Authentication
       1.1.1 Generating an Access Token
       1.1.2 Authenticating an API Call
   1.2 Error Handling
       1.2.1 Response Codes
       1.2.2 Idempotent Requests
       1.2.3 Reversals

2. API REFERENCE
   2.1 Base URLs
   2.2 Accounts
   2.3 Airtime & Data
   2.4 Electricity (Prepaid Utilities)
   2.5 Bill Payments
   2.6 Vouchers
   2.7 PayShap
   2.8 Send Money
   2.9 QR Payments
   2.10 Beneficiaries
   2.11 Transactions

3. EXAMPLE REQUESTS AND RESPONSES

4. PRODUCT CODES & BILLER CODES

5. RESPONSE CODES

6. WEBHOOKS & CALLBACKS

7. CHANGE LOG
```

### 6.2 File Structure

```
/mymoolah/docs/partner-api/
├── MMTP_PARTNER_API_V1.md           # Main documentation (Markdown)
├── MMTP_PARTNER_API_V1.pdf          # PDF export
├── openapi/
│   ├── mmtp-partner-api-v1.yaml     # OpenAPI 3.1 specification
│   └── schemas/                      # Reusable JSON schemas
│       ├── common.yaml
│       ├── auth.yaml
│       ├── products.yaml
│       ├── transactions.yaml
│       └── errors.yaml
├── examples/
│   ├── authentication.md
│   ├── airtime-purchase.md
│   ├── electricity-purchase.md
│   ├── bill-payment.md
│   └── payshap.md
└── postman/
    └── MMTP_Partner_API.postman_collection.json
```

---

## 7. Security Requirements

### 7.1 Authentication Flow

```
┌─────────────┐                              ┌─────────────┐
│   Partner   │                              │    MMTP     │
│   Client    │                              │     API     │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  POST /api/v1/auth/token                   │
       │  Authorization: Basic {client_credentials} │
       │ ──────────────────────────────────────────>│
       │                                            │
       │  200 OK                                    │
       │  {access_token, expires_in: 3600, ...}     │
       │ <──────────────────────────────────────────│
       │                                            │
       │  GET /api/v1/products                      │
       │  Authorization: Bearer {access_token}      │
       │ ──────────────────────────────────────────>│
       │                                            │
       │  200 OK                                    │
       │  {products: [...]}                         │
       │ <──────────────────────────────────────────│
       │                                            │
```

### 7.2 Security Controls

| Control | Implementation |
|---------|----------------|
| Transport | TLS 1.3 mandatory (mTLS optional for high-value partners) |
| Authentication | OAuth 2.0 client credentials flow |
| Token Algorithm | JWT HS512 with 1-hour expiry |
| Rate Limiting | Multi-tier (global, client, endpoint) |
| Input Validation | Server-side validation on all inputs |
| Output Encoding | JSON with proper escaping |
| Logging | All requests logged with PII redaction |
| IP Whitelisting | Optional for production partners |

### 7.3 Required Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Accept` | `application/json` | Yes |
| `Authorization` | `Bearer {access_token}` | Yes (except token endpoint) |
| `X-Request-ID` | UUID v4 | Recommended (for tracing) |
| `X-Idempotency-Key` | Unique string | Required for POST requests |

---

## 8. Implementation Phases

### Phase 1: OpenAPI Specification (Week 1-2)

**Tasks**:
1. Create base OpenAPI 3.1 structure
2. Define authentication schemas
3. Document all client-facing endpoints
4. Create reusable component schemas
5. Add request/response examples
6. Validate spec against OpenAPI linter

**Deliverables**:
- [ ] `mmtp-partner-api-v1.yaml` (complete OpenAPI spec)
- [ ] Automated CI validation

### Phase 2: Markdown Documentation (Week 2-3)

**Tasks**:
1. Write overview section (auth, error handling, idempotency)
2. Document each endpoint with parameters and examples
3. Create response code reference
4. Document webhooks/callbacks
5. Add product/biller code tables

**Deliverables**:
- [ ] `MMTP_PARTNER_API_V1.md` (complete Markdown documentation)
- [ ] Example request/response files

### Phase 3: PDF Generation & Review (Week 3)

**Tasks**:
1. Convert Markdown to PDF (matching Flash API style)
2. Add branding and professional formatting
3. Internal review and corrections
4. Legal review of terms and disclaimers

**Deliverables**:
- [ ] `MMTP_PARTNER_API_V1.pdf` (print-ready PDF)

### Phase 4: Interactive Documentation (Week 4)

**Tasks**:
1. Deploy Redoc for production-facing docs
2. Deploy Swagger UI for sandbox environment only
3. Create Postman collection
4. Test all endpoints via interactive docs

**Deliverables**:
- [ ] Redoc deployment at `https://docs.mymoolah.africa/partner-api`
- [ ] Swagger UI at `https://staging.mymoolah.africa/api/v1/docs` (sandbox only, requires auth)
- [ ] Postman collection

### Phase 5: Partner Onboarding (Ongoing)

**Tasks**:
1. Create partner onboarding guide
2. Set up sandbox credentials distribution
3. Establish production credential delivery process
4. Create support channels (email, portal)

**Deliverables**:
- [ ] Partner onboarding guide
- [ ] Credential management process
- [ ] Support SLA documentation

---

## 9. Deliverables

### 9.1 Documentation Deliverables

| Deliverable | Format | Location | Audience |
|-------------|--------|----------|----------|
| OpenAPI Specification | YAML | `/docs/partner-api/openapi/` | Developers |
| Markdown Documentation | MD | `/docs/partner-api/` | Developers |
| PDF Documentation | PDF | `/docs/partner-api/` | Business, Compliance |
| Postman Collection | JSON | `/docs/partner-api/postman/` | Developers |
| Redoc Portal | HTML | `https://docs.mymoolah.africa/partner-api` | All |
| Swagger UI (Sandbox) | HTML | `https://staging.mymoolah.africa/api/v1/docs` | Developers |

### 9.2 System Deliverables

| Deliverable | Description |
|-------------|-------------|
| Partner Auth Service | OAuth 2.0 token generation for partners |
| Partner Account Model | Database model for partner accounts |
| API Key Management | Generate, rotate, revoke partner credentials |
| Rate Limiting | Multi-tier rate limiting for partner APIs |
| Webhook Delivery | Reliable webhook delivery with retries |
| Audit Logging | Complete audit trail for partner transactions |

### 9.3 Process Deliverables

| Deliverable | Description |
|-------------|-------------|
| Partner Onboarding Guide | Step-by-step integration guide |
| KYB Process | Know Your Business verification checklist |
| Credential Delivery SOP | Secure credential delivery procedure |
| Support Runbook | Partner support procedures |
| SLA Documentation | Uptime, response time, support guarantees |

---

## 10. Appendix: Response Codes

### 10.1 Success Codes

| Code | HTTP Status | Message |
|------|-------------|---------|
| 0 | 200 | Success |

### 10.2 Authentication Errors

| Code | HTTP Status | Message |
|------|-------------|---------|
| 1001 | 401 | Invalid credentials |
| 1002 | 401 | Token expired |
| 1003 | 401 | Token revoked |
| 1004 | 403 | Insufficient permissions |
| 1005 | 429 | Rate limit exceeded |

### 10.3 Validation Errors

| Code | HTTP Status | Message |
|------|-------------|---------|
| 2001 | 400 | Invalid request format |
| 2002 | 400 | Missing required field |
| 2003 | 400 | Invalid field value |
| 2004 | 400 | Amount out of range |
| 2005 | 400 | Invalid mobile number format |
| 2006 | 400 | Invalid meter number |
| 2007 | 400 | Reference too long (max 50 chars) |

### 10.4 Business Errors

| Code | HTTP Status | Message |
|------|-------------|---------|
| 3001 | 402 | Insufficient balance |
| 3002 | 404 | Product not found |
| 3003 | 404 | Account not found |
| 3004 | 409 | Duplicate transaction (idempotency) |
| 3005 | 422 | Meter lookup failed |
| 3006 | 422 | Purchase failed |
| 3007 | 422 | Reversal not allowed |
| 3008 | 422 | Transaction already processed |
| 3009 | 422 | Voucher already redeemed |
| 3010 | 422 | Voucher expired |
| 3011 | 422 | Voucher cancelled |

### 10.5 System Errors

| Code | HTTP Status | Message |
|------|-------------|---------|
| 5001 | 500 | Internal server error |
| 5002 | 502 | Supplier unavailable |
| 5003 | 503 | Service temporarily unavailable |
| 5004 | 504 | Supplier timeout |

---

## Summary

This implementation plan provides a comprehensive roadmap for creating MMTP's Partner API documentation. The documentation will:

1. **Match Flash API quality** - Same professional structure and detail level
2. **Exceed Flash API standards** - OpenAPI 3.1, interactive docs, Postman collection
3. **Meet banking/Mojaloop compliance** - FSPIOP, ISO 20022, TLS 1.3, mTLS
4. **Separate test vs. production credentials** - Test credentials published, production delivered securely
5. **Provide multiple formats** - YAML spec, Markdown, PDF, interactive portal

**Next Steps**:
1. Review and approve this implementation plan
2. Begin Phase 1 (OpenAPI Specification)
3. Set up sandbox environment for partner testing
4. Identify pilot partners for beta testing

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-12 | AI Agent | Initial implementation plan |

---

*For questions about this implementation plan, contact: integrations@mymoolah.africa*
