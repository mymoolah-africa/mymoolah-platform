# Secure Token Implementation for MyMoolah Platform

## Overview

This document describes the implementation of secure token generation and validation for the MyMoolah platform, based on the Mercury payment system specifications. The secure token ensures that payloads sent by clients are not altered in-flight and provides cryptographic integrity verification.

## Purpose

The secure token ensures that the payload sent by the client is the same as the payload received by the Payments Hub. Should the message be altered while in-flight (after being sent but before it is received by Payments Hub), the secure token validation will fail, and the payload will be rejected.

## Secure Token Generation Process

### Algorithm Overview

1. **Remove secureToken field** from the payload
2. **Convert to string** and add opening brace
3. **Remove quotes and spaces** from the string
4. **Prepend subscriber key** to the trimmed payload
5. **Generate HMAC-SHA256 hash** using the subscriber key
6. **Return hexadecimal hash** as the secure token

### Implementation Details

```javascript
// Step 1: Remove secureToken from payload
const payloadWithoutToken = this.removeSecureTokenFromPayload(requestBody);

// Step 2: Convert to string and remove quotes/spaces
let requestBodyString = JSON.stringify(payloadWithoutToken);
requestBodyString = requestBodyString.replace(/"/g, '').replace(/\s/g, '');

// Step 3: Prepend subscriber key
const sourceString = this.subscriberKey + requestBodyString;

// Step 4: Generate hash
const hash = this.getHash(sourceString, this.subscriberKey);
```

### Example Process

**Input Payload:**
```json
{
  "secureToken": "1afb5f939144b3dae699f062f6fb6c38148d446f259fb8c01f0d44df94ce7346",
  "subscriberID": "902",
  "primaryHostReference": "2023083100001",
  "creationDateTime": "2023-10-03T11:27:53.015708",
  "transactionIdentifier": "54000001"
}
```

**Step 1 - Remove secureToken:**
```json
{
  "subscriberID": "902",
  "primaryHostReference": "2023083100001",
  "creationDateTime": "2023-10-03T11:27:53.015708",
  "transactionIdentifier": "54000001"
}
```

**Step 2 - Convert to string:**
```
{"subscriberID":"902","primaryHostReference":"2023083100001","creationDateTime":"2023-10-03T11:27:53.015708","transactionIdentifier":"54000001"}
```

**Step 3 - Remove quotes and spaces:**
```
{subscriberID:902,primaryHostReference:2023083100001,creationDateTime:2023-10-03T11:27:53.015708,transactionIdentifier:54000001}
```

**Step 4 - Prepend subscriber key:**
```
@tcjAwn$5B9Aet91{subscriberID:902,primaryHostReference:2023083100001,creationDateTime:2023-10-03T11:27:53.015708,transactionIdentifier:54000001}
```

**Step 5 - Generate hash:**
```
344ff3499b9e44d0eac45add6ad88f9b055a844c7ed07222c5a79f7212e4b7ad
```

## API Endpoints

### 1. Credit Transfer Request
- **Endpoint:** `POST /api/v1/mercury/credit-transfer`
- **Purpose:** Process credit transfer requests between accounts
- **Required Fields:** All credit transfer fields including payer/payee details
- **Response Codes:** ECL8070000-ECL8070023

### 2. List All Banks Request
- **Endpoint:** `POST /api/v1/mercury/list-banks`
- **Purpose:** Retrieve list of all available banks
- **Required Fields:** subscriberID, creationDateTime, transactionIdentifier
- **Response Codes:** ECL8060000-ECL8060022

### 3. Payment Status Request
- **Endpoint:** `POST /api/v1/mercury/payment-status`
- **Purpose:** Check status of a payment transaction
- **Required Fields:** All payment status fields including original transaction details
- **Response Codes:** ECL8110000-ECL8110022

### 4. Payment Status Report
- **Endpoint:** `POST /api/v1/mercury/payment-status-report`
- **Purpose:** Send payment status reports to clients
- **Required Fields:** All status report fields including transaction status
- **Response Codes:** ECL7080000-ECL7080021

## Validation Functions

### Field Validation

1. **UETR Validation**
   - Pattern: `[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}`
   - Example: `a1182b47-12ec-3655-8a94-8bb3d95bea55`

2. **BICFI Validation**
   - Pattern: `[A-Z0-9]{4,4}[A-Z]{2,2}[A-Z0-9]{2,2}([A-Z0-9]{3,3}){0,1}`
   - Example: `ABSAZAJJ`

3. **Email Validation**
   - Pattern: Standard email format
   - Example: `test@example.com`

4. **Mobile Number Validation**
   - Pattern: `\+[0-9]{1,3}-[0-9()+\-]{1,30}`
   - Example: `+27-717654321`

5. **Creation DateTime Validation**
   - Pattern: `yyyy-MM-ddThh:mm:ss.SSSSSS`
   - Example: `2023-10-03T11:27:53.015708`

6. **Transaction Type Validation**
   - Valid values: `PBPX` (Pay by Proxy), `PBAC` (Pay by Account)

7. **Transaction Status Validation**
   - Valid values: `ACCP`, `RJCT`, `ACCC`, `PDNG`, `CANC`

8. **Proxy Type Validation**
   - Valid values: `MBNO` (Mobile Number), `CUST` (Custom)

## Error Handling

### Response Code Format
- **Format:** `ECLABBCCCC`
- **ECL:** Fixed prefix
- **A:** Service indicator (8=Processor API, 9=Host, 7=Client)
- **BB:** Message type indicator (07=Credit Transfer, 06=List Banks, 11=Payment Status, 08=Status Report)
- **CCCC:** Unique response code

### Common Error Codes

#### Credit Transfer (ECL807xxxx)
- `ECL8070000`: SUCCESS
- `ECL8070001`: ERROR_INVALID_FIELD_TYPE
- `ECL8070002`: ERROR_INVALID_FIELD_LENGTH
- `ECL8070003`: ERROR_INVALID_FIELD_VALUE
- `ECL8070004`: ERROR_REQUIRED_DATA_MISSING
- `ECL8070005`: ERROR_INTERNAL_SYSTEM_ERROR
- `ECL8070006`: ERROR_CRYPTOGRAPHY
- `ECL8070021`: ERROR_DUPLICATE_TRANSACTION
- `ECL8070022`: ERROR_INVALID_SUBSCRIBER_ID
- `ECL8070023`: ERROR_PAYEE_ACCOUNT_DETAILS_CDV_FAILED

#### List Banks (ECL806xxxx)
- `ECL8060000`: SUCCESS
- `ECL8060001`: ERROR_INVALID_FIELD_TYPE
- `ECL8060002`: ERROR_INVALID_FIELD_LENGTH
- `ECL8060003`: ERROR_INVALID_FIELD_VALUE
- `ECL8060004`: ERROR_REQUIRED_DATA_MISSING
- `ECL8060005`: ERROR_INTERNAL_SYSTEM_ERROR
- `ECL8060006`: ERROR_CRYPTOGRAPHY
- `ECL8060021`: ERROR_DUPLICATE_TRANSACTION
- `ECL8060022`: ERROR_INVALID_SUBSCRIBER_ID

#### Payment Status (ECL811xxxx)
- `ECL8110000`: SUCCESS
- `ECL8110001`: ERROR_INVALID_FIELD_TYPE
- `ECL8110002`: ERROR_INVALID_FIELD_LENGTH
- `ECL8110003`: ERROR_INVALID_FIELD_VALUE
- `ECL8110004`: ERROR_REQUIRED_DATA_MISSING
- `ECL8110005`: ERROR_INTERNAL_SYSTEM_ERROR
- `ECL8110006`: ERROR_CRYPTOGRAPHY
- `ECL8110021`: ERROR_DUPLICATE_TRANSACTION
- `ECL8110022`: ERROR_INVALID_SUBSCRIBER_ID

## Usage Examples

### Credit Transfer Request
```javascript
const SecureTokenService = require('./services/secureTokenService');
const secureTokenService = new SecureTokenService('@tcjAwn$5B9Aet91');

const creditTransferRequest = {
    "subscriberID": "910",
    "primaryHostReference": "2023083100001",
    "secondaryHostReference": "78602467923",
    "creationDateTime": "2023-10-03T11:27:53.015708",
    "transactionIdentifier": "1A66C164-0EDA-4170-8D13-FBF9E495B680",
    "transactionUETR": "a1182b47-12ec-3655-8a94-8bb3d95bea55",
    "transactionType": "PBAC",
    "transactionAmount": 100.00,
    "transactionReference": "Payment for services",
    "payerDetails": { "partyName": "John Doe" },
    "payerAccountDetail": {
        "partyAccountIdentification": "1234567890",
        "partyAccountType": "1",
        "partyAccountName": "John Doe"
    },
    "payeeDetails": { "partyName": "Jane Smith" },
    "payeeAccountDetail": {
        "partyAccountIdentification": "0987654321",
        "partyAccountType": "2",
        "partyAccountBank": "ABSAZAJJ",
        "partyAccountName": "Jane Smith"
    }
};

// Generate secure token
const secureToken = secureTokenService.generateCreditTransferToken(creditTransferRequest);

// Add token to payload
const payloadWithToken = {
    secureToken,
    ...creditTransferRequest
};

// Send to API
const response = await axios.post('/api/v1/mercury/credit-transfer', payloadWithToken);
```

### List Banks Request
```javascript
const listBanksRequest = {
    "subscriberID": "910",
    "creationDateTime": "2023-10-03T11:27:53.015708",
    "transactionIdentifier": "54000001"
};

const secureToken = secureTokenService.generateListBanksToken(listBanksRequest);
const payloadWithToken = { secureToken, ...listBanksRequest };

const response = await axios.post('/api/v1/mercury/list-banks', payloadWithToken);
```

## Security Considerations

1. **Subscriber Key Protection**
   - The subscriber key must be kept secure and not exposed in client-side code
   - Use environment variables for key storage
   - Rotate keys regularly

2. **Token Validation**
   - Always validate tokens on both client and server side
   - Check token expiration if implemented
   - Log validation failures for security monitoring

3. **Payload Integrity**
   - Ensure no modification of payload between generation and validation
   - Use HTTPS for all API communications
   - Implement request/response logging for audit trails

4. **Error Handling**
   - Don't expose internal system details in error messages
   - Log security-related errors for monitoring
   - Implement rate limiting to prevent abuse

## Testing

### Test Scripts
- `test-secure-token.js`: Tests secure token generation and validation
- `test-mercury-api.js`: Tests API endpoints with secure tokens

### Running Tests
```bash
# Test secure token functionality
node test-secure-token.js

# Test API endpoints
node test-mercury-api.js
```

### Example Test Output
```
=== MyMoolah Secure Token Service Test ===

1. Testing Credit Transfer Request Token Generation:
Generated Token: 1afb5f939144b3dae699f062f6fb6c38148d446f259fb8c01f0d44df94ce7346
Token validation: PASS

=== All Tests Completed Successfully ===
```

## Configuration

### Environment Variables
```bash
# Subscriber key for secure token generation
SECURE_TOKEN_SUBSCRIBER_KEY=@tcjAwn$5B9Aet91

# API configuration
PORT=5050
NODE_ENV=development
```

### Service Configuration
```javascript
// Initialize with custom subscriber key
const secureTokenService = new SecureTokenService(process.env.SECURE_TOKEN_SUBSCRIBER_KEY);

// Initialize middleware with custom key
const secureTokenMiddleware = new SecureTokenMiddleware(process.env.SECURE_TOKEN_SUBSCRIBER_KEY);
```

## Integration with MyMoolah Platform

The secure token implementation integrates seamlessly with the existing MyMoolah platform:

1. **Authentication Integration**: Works alongside existing JWT authentication
2. **Rate Limiting**: Respects existing rate limiting middleware
3. **Logging**: Integrates with existing logging system
4. **Error Handling**: Follows existing error handling patterns
5. **Database**: Can store transaction records for audit trails

## Future Enhancements

1. **Token Expiration**: Add expiration timestamps to tokens
2. **Key Rotation**: Implement automatic key rotation
3. **Audit Logging**: Enhanced logging for security monitoring
4. **Performance Optimization**: Cache frequently used tokens
5. **Monitoring**: Add metrics for token validation success/failure rates

## Compliance

This implementation follows the Mercury payment system specifications and ensures:

1. **Data Integrity**: Cryptographic verification of payload integrity
2. **Security**: HMAC-SHA256 hashing for secure token generation
3. **Standards Compliance**: Follows ISO 20022 and local payment standards
4. **Audit Trail**: Complete logging of all secure token operations
5. **Error Handling**: Comprehensive error handling and reporting 