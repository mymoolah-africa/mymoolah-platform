# Flash API Integration - MyMoolah Treasury Platform

## Overview

This document describes the Flash Partner API v4 integration for the MyMoolah Treasury Platform. The integration provides full access to Flash services including 1Voucher, Gift Vouchers, Cash Out PIN, Cellular services, and Prepaid Utilities.

## Environment Configuration

### Required Environment Variables

Add the following variables to your `.env` file:

```bash
# Flash API Configuration
FLASH_API_URL=https://api.flashswitch.flash-group.com
FLASH_CONSUMER_KEY=your_flash_consumer_key_here
FLASH_CONSUMER_SECRET=your_flash_consumer_secret_here
```

### Getting Flash API Credentials

1. Contact Flash Integrations Team at `integrations@flash-group.com`
2. Request API credentials for both Sandbox and Production environments
3. You will receive:
   - Consumer Key (API Key)
   - Consumer Secret
   - Base URL for the environment

## Authentication

The Flash integration uses OAuth 2.0 Client Credentials Grant for authentication:

- **Token Endpoint**: `https://api.flashswitch.flash-group.com/token`
- **Token Expiry**: 3600 seconds (1 hour)
- **Auto-refresh**: Tokens are automatically refreshed 5 minutes before expiry
- **Retry Logic**: Failed requests due to expired tokens are automatically retried once

## API Endpoints

### Health Check
```
GET /api/v1/flash/health
```

### Account Management
```
GET /api/v1/flash/accounts/:accountNumber/products
GET /api/v1/flash/accounts/:accountNumber/products/:productCode
```

### 1Voucher Operations
```
POST /api/v1/flash/1voucher/purchase
POST /api/v1/flash/1voucher/disburse
POST /api/v1/flash/1voucher/redeem
POST /api/v1/flash/1voucher/refund
```

### Gift Vouchers
```
POST /api/v1/flash/gift-vouchers/purchase
```

### Cash Out PIN
```
POST /api/v1/flash/cash-out-pin/purchase
POST /api/v1/flash/cash-out-pin/cancel
```

### Cellular Services
```
POST /api/v1/flash/cellular/pinless/purchase
```

### Eezi Vouchers
```
POST /api/v1/flash/eezi-voucher/purchase
```

### Prepaid Utilities
```
POST /api/v1/flash/prepaid-utilities/lookup
POST /api/v1/flash/prepaid-utilities/purchase
```

## Request/Response Format

### Standard Request Format
All POST requests follow this structure:
```json
{
  "reference": "unique_transaction_reference",
  "accountNumber": "merchant_account_number",
  "amount": 1000,
  "metadata": {
    "storeId": "store123",
    "terminalId": "term456"
  }
}
```

### Standard Response Format
```json
{
  "success": true,
  "data": {
    "transaction": {
      "responseCode": 0,
      "responseMessage": "Success",
      "accountNumber": "ACC123",
      "reference": "REF456",
      "amount": 1000,
      "transactionDate": "2024-01-15T10:30:00Z",
      "transactionId": "TXN789",
      "voucher": {
        "amount": 1000,
        "expiryDate": "2024-12-31T23:59:59Z",
        "pin": "1234567890123456",
        "serialNumber": "SN123456789",
        "content": {
          "redemptionInstructions": "Redeem at any participating store",
          "termsAndConditions": "Standard terms apply"
        }
      }
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Field Validation

### Reference
- **Format**: Alphanumeric characters, hyphens (-), dots (.), equals (=)
- **Example**: `MM_1705312200000_abc123`

### Account Number
- **Format**: Alphanumeric characters only
- **Example**: `ACC123456789`

### Amount
- **Format**: Positive integer in cents
- **Example**: `1000` (represents R10.00)

### Mobile Number
- **Format**: 11 digits, 27 country code, no leading 0
- **Example**: `27123456789`

### PIN (for 1Voucher redemption)
- **Format**: Exactly 16 digits
- **Example**: `1234567890123456`

### Metadata
- **Max Properties**: 9
- **Property Name**: Max 10 characters
- **Property Value**: Max 43 characters
- **Example**: `{"storeId": "store123", "terminalId": "term456"}`

## Error Handling

### HTTP Status Codes
- `200`: Success (check `responseCode` in body)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication failed)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal Server Error

### Flash API Error Response
```json
{
  "success": false,
  "error": "Flash API Error: Invalid account number (Code: 1001)",
  "message": "Failed to purchase 1Voucher"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Amount must be a positive integer in cents"
}
```

## Idempotency

All Flash API endpoints support idempotency:
- Use the same `reference` for retries
- Original response is returned for 30 minutes
- Useful for handling network timeouts

## Usage Examples

### 1. Purchase a 1Voucher
```bash
curl -X POST http://localhost:5050/api/v1/flash/1voucher/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "MM_1705312200000_abc123",
    "accountNumber": "ACC123456789",
    "amount": 1000,
    "metadata": {
      "storeId": "store123",
      "terminalId": "term456"
    }
  }'
```

### 2. Redeem a 1Voucher
```bash
curl -X POST http://localhost:5050/api/v1/flash/1voucher/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "MM_1705312200000_def456",
    "accountNumber": "ACC123456789",
    "pin": "1234567890123456",
    "amount": 1000,
    "mobileNumber": "27123456789"
  }'
```

### 3. Purchase Cellular Recharge
```bash
curl -X POST http://localhost:5050/api/v1/flash/cellular/pinless/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "MM_1705312200000_ghi789",
    "subAccountNumber": "SUB123456789",
    "amount": 5000,
    "productCode": 123,
    "mobileNumber": "27123456789"
  }'
```

### 4. Health Check
```bash
curl http://localhost:5050/api/v1/flash/health
```

## Testing

### Sandbox Environment
1. Use sandbox credentials in `.env`
2. Test all endpoints with sandbox data
3. Verify responses match expected format

### Production Environment
1. Switch to production credentials
2. Test with small amounts first
3. Monitor logs for any issues

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check `FLASH_CONSUMER_KEY` and `FLASH_CONSUMER_SECRET`
   - Verify credentials are for the correct environment

2. **Invalid Reference Format**
   - Ensure reference contains only allowed characters
   - Use unique references for each transaction

3. **Amount Validation Error**
   - Amount must be positive integer in cents
   - Example: R10.00 = 1000 cents

4. **Mobile Number Format Error**
   - Must be 11 digits with 27 country code
   - No leading 0 after country code

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Token Management**: Tokens are automatically managed and refreshed
3. **Idempotency**: Use unique references to prevent duplicate transactions
4. **Validation**: All inputs are validated before sending to Flash API
5. **Error Handling**: Sensitive information is not logged

## Support

For Flash API issues:
- Contact: `integrations@flash-group.com`
- Include transaction reference and error details
- Provide logs if available

For MyMoolah integration issues:
- Check server logs for detailed error messages
- Verify environment configuration
- Test with health check endpoint first 