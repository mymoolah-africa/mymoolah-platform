# MyMoolah Partner API Integration Guide

**Version**: 1.0.0  
**Last Updated**: November 12, 2025  
**Status**: Production Ready  
**Standards**: Mojaloop 1.0, ISO 20022, Banking-Grade Security

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Request/Response Formats](#requestresponse-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Webhooks](#webhooks)
9. [Testing](#testing)
10. [Production Deployment](#production-deployment)
11. [Support](#support)

---

## 🎯 Overview

The MyMoolah Partner API enables third-party platforms (like Zapper, 1 Voucher, OTT, etc.) to integrate with MyMoolah to sell MMVouchers to their customers. This API follows **Mojaloop standards** and **ISO 20022 banking standards** for secure, reliable financial transactions.

### Key Features

- **RESTful API**: Standard HTTP/HTTPS REST API
- **Banking-Grade Security**: TLS 1.3, JWT authentication, rate limiting
- **Mojaloop Compliant**: Follows Mojaloop 1.0 standards
- **Real-Time Processing**: Immediate voucher issuance
- **Webhook Support**: Event notifications for transaction status
- **Comprehensive Error Handling**: Detailed error codes and messages

### Supported Environments

- **UAT (User Acceptance Testing)**: `https://uat-api.mymoolah.com`
- **Production**: `https://api.mymoolah.com`

> **Note**: Staging environment is for internal use only. Partners should use UAT for testing and Production for live operations.

---

## 🚀 Getting Started

### Prerequisites

1. **Partner Account**: Contact MyMoolah to create your partner account
2. **API Credentials**: You will receive:
   - Partner ID (`partner_id`)
   - API Key (`api_key`)
   - API Secret (`api_secret`)
   - Webhook Secret (`webhook_secret`)
3. **Technical Requirements**:
   - HTTPS endpoint for webhooks
   - TLS 1.2+ support
   - JSON request/response handling

### Registration Process

1. Contact MyMoolah Business Development: `partners@mymoolah.com`
2. Provide:
   - Company name and registration details
   - Technical contact information
   - Webhook endpoint URL
   - Expected transaction volume
3. Receive credentials for UAT environment
4. Complete UAT integration and testing
5. Request Production credentials after UAT approval

---

## 🔐 Authentication

MyMoolah Partner API uses **OAuth 2.0 Client Credentials** flow for authentication, following Mojaloop standards.

### Authentication Flow

1. **Obtain Access Token**: Exchange API credentials for JWT access token
2. **Use Access Token**: Include token in `Authorization` header for all API requests
3. **Token Refresh**: Tokens expire after 1 hour; refresh as needed

### Step 1: Get Access Token

**Endpoint**: `POST /api/v1/partner/auth/token`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "grant_type": "client_credentials",
  "client_id": "your_partner_id",
  "client_secret": "your_api_secret"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "voucher:issue voucher:query"
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "invalid_client",
  "error_description": "Invalid client credentials"
}
```

### Step 2: Use Access Token

Include the access token in all subsequent API requests:

**Request Header**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Token Refresh

Tokens expire after 1 hour. Implement automatic token refresh:

```javascript
// Pseudo-code example
let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }
  
  const response = await fetch('https://api.mymoolah.com/api/v1/partner/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: PARTNER_ID,
      client_secret: API_SECRET
    })
  });
  
  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
  
  return accessToken;
}
```

---

## 📡 API Endpoints

### Base URLs

- **UAT**: `https://uat-api.mymoolah.com/api/v1/partner`
- **Production**: `https://api.mymoolah.com/api/v1/partner`

### Endpoint: Issue MMVoucher

Create a new MyMoolah voucher for a customer.

**Endpoint**: `POST /vouchers/issue`

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
X-Request-ID: {unique_request_id}
X-Correlation-ID: {correlation_id}
```

**Request Body**:
```json
{
  "amount": 100.00,
  "currency": "ZAR",
  "customer": {
    "msisdn": "27825571055",
    "name": "John Doe",
    "email": "john.doe@example.com"
  },
  "metadata": {
    "partner_reference": "ZAPPER-ORDER-12345",
    "description": "Voucher purchase via Zapper",
    "merchant_id": "ZAPPER-MERCHANT-001"
  },
  "expiry_days": 365
}
```

**Request Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | decimal | Yes | Voucher amount (5.00 - 4000.00 ZAR) |
| `currency` | string | Yes | Currency code (must be "ZAR") |
| `customer.msisdn` | string | Yes | Customer mobile number (E.164 format: 27825571055) |
| `customer.name` | string | No | Customer full name |
| `customer.email` | string | No | Customer email address |
| `metadata.partner_reference` | string | Yes | Your unique order/reference ID |
| `metadata.description` | string | No | Transaction description |
| `metadata.merchant_id` | string | No | Your merchant/store identifier |
| `expiry_days` | integer | No | Voucher expiry in days (default: 365, max: 730) |

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Voucher issued successfully",
  "data": {
    "voucher_code": "1234567890123456",
    "voucher_id": "VOUCHER-12345",
    "amount": 100.00,
    "currency": "ZAR",
    "status": "active",
    "expires_at": "2026-11-12T18:00:00.000Z",
    "created_at": "2025-11-12T18:00:00.000Z",
    "transaction_id": "TXN-1762974300000-abc123",
    "partner_reference": "ZAPPER-ORDER-12345"
  },
  "timestamp": "2025-11-12T18:00:00.000Z"
}
```

**Error Responses**:

**400 Bad Request** - Invalid request:
```json
{
  "success": false,
  "error": "INVALID_REQUEST",
  "error_code": "VALIDATION_ERROR",
  "message": "Voucher value must be between 5.00 and 4000.00",
  "details": {
    "field": "amount",
    "reason": "Amount exceeds maximum allowed value"
  },
  "timestamp": "2025-11-12T18:00:00.000Z"
}
```

**401 Unauthorized** - Invalid token:
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "error_code": "INVALID_TOKEN",
  "message": "Invalid or expired access token"
}
```

**402 Payment Required** - Insufficient balance:
```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "error_code": "WALLET_INSUFFICIENT_FUNDS",
  "message": "Customer wallet has insufficient balance",
  "details": {
    "required": 100.00,
    "available": 50.00
  }
}
```

**404 Not Found** - Customer not found:
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "error_code": "CUSTOMER_NOT_FOUND",
  "message": "Customer wallet not found for MSISDN: 27825571055"
}
```

**429 Too Many Requests** - Rate limit exceeded:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "error_code": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded. Please retry after 60 seconds",
  "retry_after": 60
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "error_code": "SERVER_ERROR",
  "message": "An unexpected error occurred. Please contact support.",
  "support_reference": "SUPPORT-20251112-001"
}
```

### Endpoint: Query Voucher Status

Get the current status and details of a voucher.

**Endpoint**: `GET /vouchers/{voucher_code}`

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer {access_token}
X-Request-ID: {unique_request_id}
```

**Path Parameters**:
- `voucher_code`: The 16-digit voucher code

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "voucher_code": "1234567890123456",
    "voucher_id": "VOUCHER-12345",
    "amount": 100.00,
    "balance": 75.50,
    "currency": "ZAR",
    "status": "active",
    "expires_at": "2026-11-12T18:00:00.000Z",
    "created_at": "2025-11-12T18:00:00.000Z",
    "redemption_count": 1,
    "customer": {
      "msisdn": "27825571055",
      "name": "John Doe"
    }
  },
  "timestamp": "2025-11-12T18:00:00.000Z"
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "error_code": "VOUCHER_NOT_FOUND",
  "message": "Voucher not found: 1234567890123456"
}
```

### Endpoint: Query by Partner Reference

Get voucher details using your partner reference ID.

**Endpoint**: `GET /vouchers/partner/{partner_reference}`

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer {access_token}
X-Request-ID: {unique_request_id}
```

**Path Parameters**:
- `partner_reference`: Your unique reference ID used during issuance

**Response**: Same as Query Voucher Status

---

## 📨 Request/Response Formats

### Request Headers

All requests must include:

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token from authentication |
| `Content-Type` | Yes | `application/json` |
| `X-Request-ID` | Yes | Unique request identifier (UUID recommended) |
| `X-Correlation-ID` | No | Correlation ID for tracking across systems |
| `X-API-Version` | No | API version (default: `1.0`) |

### Response Headers

All responses include:

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-Request-ID` | Echo of request ID |
| `X-RateLimit-Limit` | Rate limit per window |
| `X-RateLimit-Remaining` | Remaining requests in window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

### Date/Time Format

All timestamps use **ISO 8601** format with UTC timezone:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2025-11-12T18:00:00.000Z`

### Amount Format

All monetary amounts:
- Format: Decimal with 2 decimal places
- Currency: ZAR (South African Rand)
- Example: `100.00`

### MSISDN Format

Mobile numbers must be in **E.164** format:
- Format: Country code + number (no spaces, dashes, or plus sign)
- South Africa: `27` + 9-digit number
- Example: `27825571055` (not `+27 82 557 1055` or `0825571055`)

---

## ⚠️ Error Handling

### Error Response Structure

All error responses follow this structure:

```json
{
  "success": false,
  "error": "ERROR_TYPE",
  "error_code": "SPECIFIC_ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "field_name",
    "reason": "Specific reason for error"
  },
  "timestamp": "2025-11-12T18:00:00.000Z",
  "request_id": "request-uuid"
}
```

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `INSUFFICIENT_BALANCE` | 402 | Customer wallet has insufficient funds |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate request) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Retry Logic

Implement exponential backoff for retries:

- **5xx errors**: Retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
- **429 errors**: Retry after `retry_after` seconds
- **4xx errors (except 429)**: Do not retry (client error)
- **Idempotency**: Use `X-Request-ID` to ensure idempotent requests

### Idempotency

All voucher issuance requests are **idempotent**. If you send the same request (same `X-Request-ID` and `partner_reference`) within 24 hours, you will receive the same voucher details without creating a duplicate.

---

## 🚦 Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| Voucher Issuance | 100 requests | 15 minutes |
| Voucher Query | 200 requests | 15 minutes |

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702406400
```

### Handling Rate Limits

When rate limit is exceeded (429 status):

1. Check `X-RateLimit-Reset` header
2. Wait until reset time
3. Retry request
4. Consider implementing request queuing for high-volume scenarios

---

## 🔔 Webhooks

MyMoolah can send webhook notifications for voucher events.

### Webhook Events

| Event | Description | When Sent |
|-------|-------------|-----------|
| `voucher.issued` | Voucher successfully issued | Immediately after issuance |
| `voucher.redeemed` | Voucher redeemed by customer | When voucher is redeemed |
| `voucher.expired` | Voucher expired | When voucher expires |
| `voucher.cancelled` | Voucher cancelled | When voucher is cancelled |

### Webhook Payload

```json
{
  "event": "voucher.issued",
  "timestamp": "2025-11-12T18:00:00.000Z",
  "data": {
    "voucher_code": "1234567890123456",
    "voucher_id": "VOUCHER-12345",
    "partner_reference": "ZAPPER-ORDER-12345",
    "amount": 100.00,
    "status": "active",
    "transaction_id": "TXN-1762974300000-abc123"
  }
}
```

### Webhook Security

Webhooks are signed using **HMAC-SHA256**. Verify signature:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// In your webhook handler
const signature = req.headers['x-mymoolah-signature'];
const isValid = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### Webhook Endpoint Requirements

- **HTTPS only** (TLS 1.2+)
- **Response time**: < 5 seconds
- **Response format**: JSON with `{ "received": true }`
- **Status code**: 200 OK

### Webhook Retry Policy

MyMoolah will retry failed webhooks:
- **Retries**: 3 attempts
- **Intervals**: 1 minute, 5 minutes, 30 minutes
- **Timeout**: 10 seconds per attempt

---

## 🧪 Testing

### UAT Environment

**Base URL**: `https://uat-api.mymoolah.com/api/v1/partner`

**Test Credentials**: Provided after partner registration

**Test Scenarios**:

1. **Successful Issuance**:
   - Amount: R50.00
   - Valid MSISDN: `27825571055`
   - Expected: 201 Created with voucher code

2. **Insufficient Balance**:
   - Amount: R1000.00
   - MSISDN with low balance
   - Expected: 402 Payment Required

3. **Invalid Amount**:
   - Amount: R5000.00 (exceeds max)
   - Expected: 400 Bad Request

4. **Invalid MSISDN**:
   - MSISDN: `0825571055` (wrong format)
   - Expected: 400 Bad Request

5. **Duplicate Request**:
   - Same `X-Request-ID` and `partner_reference`
   - Expected: Same voucher (idempotent)

### Test Data

**Test MSISDNs** (UAT only):
- `27825571055` - Active wallet with balance
- `27824560585` - Active wallet with balance
- `27821234567` - New customer (will be created)

**Test Amounts**:
- Minimum: R5.00
- Maximum: R4000.00
- Recommended test: R50.00, R100.00, R500.00

### Postman Collection

Request a Postman collection from MyMoolah for easy testing.

---

## 🚀 Production Deployment

### Pre-Production Checklist

- [ ] UAT integration completed and tested
- [ ] All test scenarios passing
- [ ] Webhook endpoint configured and tested
- [ ] Error handling implemented
- [ ] Rate limiting handled
- [ ] Token refresh logic implemented
- [ ] Logging and monitoring in place
- [ ] Production credentials received
- [ ] Production webhook URL registered

### Production Credentials

After UAT approval, you will receive:
- Production Partner ID
- Production API Key
- Production API Secret
- Production Webhook Secret
- Production Base URL

### Go-Live Process

1. **Switch to Production Base URL**: `https://api.mymoolah.com`
2. **Update Credentials**: Use production API credentials
3. **Test First Transaction**: Issue a small test voucher
4. **Monitor**: Watch for errors and webhook delivery
5. **Scale Gradually**: Increase transaction volume over time

### Production Monitoring

Monitor these metrics:
- API response times
- Error rates
- Webhook delivery success rate
- Token refresh frequency
- Rate limit usage

---

## 📞 Support

### Technical Support

- **Email**: `api-support@mymoolah.com`
- **Response Time**: 24 hours (business days)
- **Emergency**: `+27 XX XXX XXXX` (for critical production issues)

### Documentation

- **API Documentation**: `https://docs.mymoolah.com/api`
- **Status Page**: `https://status.mymoolah.com`
- **Changelog**: `https://docs.mymoolah.com/api/changelog`

### Partner Portal

Access your partner dashboard at:
- **UAT**: `https://uat-partners.mymoolah.com`
- **Production**: `https://partners.mymoolah.com`

Features:
- Transaction history
- API usage statistics
- Webhook logs
- Credential management

---

## 📝 Appendix

### A. Complete Request Example

```bash
curl -X POST https://api.mymoolah.com/api/v1/partner/vouchers/issue \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "amount": 100.00,
    "currency": "ZAR",
    "customer": {
      "msisdn": "27825571055",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "metadata": {
      "partner_reference": "ZAPPER-ORDER-12345",
      "description": "Voucher purchase via Zapper",
      "merchant_id": "ZAPPER-MERCHANT-001"
    },
    "expiry_days": 365
  }'
```

### B. Complete Response Example

```json
{
  "success": true,
  "message": "Voucher issued successfully",
  "data": {
    "voucher_code": "1234567890123456",
    "voucher_id": "VOUCHER-12345",
    "amount": 100.00,
    "currency": "ZAR",
    "status": "active",
    "expires_at": "2026-11-12T18:00:00.000Z",
    "created_at": "2025-11-12T18:00:00.000Z",
    "transaction_id": "TXN-1762974300000-abc123",
    "partner_reference": "ZAPPER-ORDER-12345"
  },
  "timestamp": "2025-11-12T18:00:00.000Z"
}
```

### C. Error Response Examples

**Validation Error**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "error_code": "INVALID_AMOUNT",
  "message": "Voucher value must be between 5.00 and 4000.00",
  "details": {
    "field": "amount",
    "value": 5000.00,
    "reason": "Amount exceeds maximum allowed value of 4000.00"
  },
  "timestamp": "2025-11-12T18:00:00.000Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Insufficient Balance**:
```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "error_code": "WALLET_INSUFFICIENT_FUNDS",
  "message": "Customer wallet has insufficient balance",
  "details": {
    "required": 100.00,
    "available": 50.00,
    "shortfall": 50.00
  },
  "timestamp": "2025-11-12T18:00:00.000Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-12 | Initial release |

---

**Document Status**: ✅ Production Ready  
**Next Review**: 2026-02-12

