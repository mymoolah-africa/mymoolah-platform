# Zapper Integration Requirements - MMVoucher Sales

**Date**: November 12, 2025  
**Recipient**: Zapper Technical Team  
**From**: MyMoolah Treasury Platform  
**Subject**: API Integration Requirements for MMVoucher Sales

---

## 📋 Executive Summary

MyMoolah is pleased to provide this integration guide for Zapper to sell MMVouchers through the Zapper payment platform. This document outlines the technical requirements, API specifications, and integration steps needed to enable MMVoucher sales in both UAT and Production environments.

---

## 🎯 Integration Overview

### Business Case

Zapper customers will be able to purchase MyMoolah vouchers (MMVouchers) through the Zapper app, similar to how they currently purchase 1 Voucher, OTT, and other digital products. The integration will enable:

1. **Real-Time Voucher Issuance**: Instant voucher creation when customers purchase
2. **Seamless Customer Experience**: Vouchers delivered directly to customer's MyMoolah wallet
3. **Secure Transactions**: Banking-grade security and Mojaloop compliance
4. **Webhook Notifications**: Real-time event notifications for transaction status

### Integration Flow

**Important**: Zapper processes customer payments directly through their payment gateway. MyMoolah API is called **only after** payment is successfully processed.

```
Zapper Customer → Zapper App → Customer Pays with Linked Card → Zapper Payment Gateway
                                                                      ↓
                                                              Payment Success?
                                                                      ↓
                                                              Yes → Zapper Backend → MyMoolah Partner API → MMVoucher Issued
                                                                      ↓
                                                              Customer Wallet Credited
                                                                      ↓
                                                              Webhook Notification → Zapper
                                                                      
                                                              No → Payment Failed (API not called)
```

**Key Points**:
- Customer payment is processed by Zapper **before** API call to MyMoolah
- If card payment fails, MyMoolah API is **not called**
- MyMoolah API assumes payment has been successfully processed when called
- No pre-funded float account required for Zapper
- Voucher is issued immediately upon successful API call

---

## 🔐 Authentication & Credentials

### UAT Environment

**Base URL**: `https://uat-api.mymoolah.com/api/v1/partner`

**Credentials** (will be provided after registration):
- Partner ID: `partner_zapper_uat`
- API Key: `[Provided separately]`
- API Secret: `[Provided separately]`
- Webhook Secret: `[Provided separately]`

### Production Environment

**Base URL**: `https://api.mymoolah.com/api/v1/partner`

**Credentials** (will be provided after UAT approval):
- Partner ID: `partner_zapper_prod`
- API Key: `[Provided separately]`
- API Secret: `[Provided separately]`
- Webhook Secret: `[Provided separately]`

### Authentication Method

OAuth 2.0 Client Credentials flow:

1. Exchange credentials for JWT token: `POST /auth/token`
2. Use token in all API requests: `Authorization: Bearer {token}`
3. Token expires after 1 hour (implement auto-refresh)

---

## 📡 API Endpoints

### 1. Authentication

**Endpoint**: `POST /auth/token`

**Request**:
```json
{
  "grant_type": "client_credentials",
  "client_id": "partner_zapper_uat",
  "client_secret": "your_api_secret"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "voucher:issue voucher:query"
}
```

### 2. Issue Voucher

**Endpoint**: `POST /vouchers/issue`

**Request**:
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

### 3. Query Voucher

**Endpoint**: `GET /vouchers/{voucher_code}`

**Response**:
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

### 4. Query by Partner Reference

**Endpoint**: `GET /vouchers/partner/{partner_reference}`

Use this to query vouchers using your own reference ID (e.g., `ZAPPER-ORDER-12345`).

---

## 🔔 Webhooks

MyMoolah will send webhook notifications to your configured endpoint for voucher events.

### Webhook Endpoint Requirements

- **URL**: Provide HTTPS endpoint (TLS 1.2+)
- **Response Time**: < 5 seconds
- **Response Format**: `{ "received": true }`
- **Status Code**: 200 OK

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
```

**Header**: `X-MyMoolah-Signature`

### Webhook Retry Policy

- **Retries**: 3 attempts
- **Intervals**: 1 minute, 5 minutes, 30 minutes
- **Timeout**: 10 seconds per attempt

---

## 📋 Integration Checklist

### Pre-Integration

- [ ] Review API documentation
- [ ] Set up webhook endpoint (HTTPS)
- [ ] Implement HMAC signature verification
- [ ] Prepare test environment

### UAT Integration

- [ ] Receive UAT credentials from MyMoolah
- [ ] Implement OAuth 2.0 authentication
- [ ] Implement voucher issuance endpoint
- [ ] Implement voucher query endpoints
- [ ] Test webhook reception
- [ ] Complete UAT test scenarios
- [ ] Submit UAT test results to MyMoolah

### Production Integration

- [ ] Receive Production credentials from MyMoolah
- [ ] Update API base URL to production
- [ ] Update credentials to production
- [ ] Test first production transaction
- [ ] Monitor webhook delivery
- [ ] Go live with gradual rollout

---

## 🧪 Testing

### Payment Flow Testing

**Important**: Since Zapper processes customer payments before calling MyMoolah API, test scenarios should simulate the post-payment state:

1. **Simulate successful card payment** → Call MyMoolah API → Verify voucher issued
2. **Simulate failed card payment** → Verify MyMoolah API is not called (handled by Zapper)
3. **Test API call after payment success** → Verify voucher issuance works correctly

### UAT Test Scenarios

1. **Successful Voucher Issuance (Post-Payment)**
   - **Scenario**: Customer card payment succeeds → Zapper calls API
   - Amount: R50.00
   - Valid MSISDN: `27825571055`
   - Expected: 201 Created with voucher code
   - **Note**: Customer wallet balance is not checked (payment already processed by Zapper)

2. **Customer Wallet Balance (Not Applicable for Zapper)**
   - **Scenario**: This test is for float-based partners only
   - For Zapper: Customer pays with card, so wallet balance is irrelevant
   - **Skip this test for Zapper integration**

3. **Invalid Amount**
   - Amount: R5000.00 (exceeds max)
   - Expected: 400 Bad Request
   - **Note**: This validation happens at MyMoolah API level

4. **Invalid MSISDN Format**
   - MSISDN: `0825571055` (wrong format)
   - Expected: 400 Bad Request

5. **Duplicate Request (Idempotency)**
   - Same `X-Request-ID` and `partner_reference`
   - Expected: Same voucher (idempotent)
   - **Use Case**: If Zapper retries API call due to network issues

6. **New Customer Creation**
   - MSISDN: `27821234567` (new customer)
   - Expected: Customer account created automatically, voucher issued
   - **Note**: MyMoolah will create customer account if it doesn't exist

### Test Data

**Test MSISDNs** (UAT only):
- `27825571055` - Active wallet with balance
- `27824560585` - Active wallet with balance
- `27821234567` - New customer (will be created)

**Test Amounts**:
- Minimum: R5.00
- Maximum: R4000.00
- Recommended: R50.00, R100.00, R500.00

---

## ⚠️ Error Handling

### Common Error Codes

| Error Code | HTTP Status | Description | Action |
|------------|-------------|-------------|--------|
| `VALIDATION_ERROR` | 400 | Invalid request data | Fix request and retry |
| `UNAUTHORIZED` | 401 | Invalid/expired token | Refresh token |
| `INSUFFICIENT_BALANCE` | 402 | Customer has insufficient funds | Inform customer |
| `NOT_FOUND` | 404 | Resource not found | Check request parameters |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `SERVER_ERROR` | 500 | Internal server error | Retry with exponential backoff |

### Retry Logic

- **5xx errors**: Retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
- **429 errors**: Retry after `retry_after` seconds
- **4xx errors (except 429)**: Do not retry (client error)

---

## 🚦 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| Voucher Issuance | 100 requests | 15 minutes |
| Voucher Query | 200 requests | 15 minutes |

Rate limit headers included in all responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## 📞 Support & Contact

### Technical Support

- **Email**: `api-support@mymoolah.com`
- **Response Time**: 24 hours (business days)
- **Emergency**: `+27 XX XXX XXXX` (for critical production issues)

### Documentation

- **API Documentation**: `https://docs.mymoolah.com/api/partner`
- **OpenAPI Spec**: `https://docs.mymoolah.com/api/partner/openapi.yaml`
- **Status Page**: `https://status.mymoolah.com`

### Partner Portal

- **UAT**: `https://uat-partners.mymoolah.com`
- **Production**: `https://partners.mymoolah.com`

---

## 📝 Next Steps

1. **Review Documentation**: Review `PARTNER_API_INTEGRATION_GUIDE.md`
2. **Request Credentials**: Contact `partners@mymoolah.com` for UAT credentials
3. **Set Up Webhook**: Configure HTTPS webhook endpoint
4. **Begin Integration**: Start with UAT environment
5. **Complete Testing**: Run all UAT test scenarios
6. **Request Production**: Request production credentials after UAT approval

---

## 📎 Attachments

1. **Partner API Integration Guide**: `PARTNER_API_INTEGRATION_GUIDE.md`
2. **OpenAPI Specification**: `partner-api-openapi.yaml`
3. **Implementation Requirements**: `PARTNER_API_REQUIREMENTS.md`

---

**Document Status**: Ready for Integration  
**Version**: 1.0.0  
**Last Updated**: November 12, 2025

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-12 | Initial release |

---

**We look forward to a successful integration with Zapper!**

For any questions or clarifications, please contact:
- **Business Development**: `partners@mymoolah.com`
- **Technical Support**: `api-support@mymoolah.com`

