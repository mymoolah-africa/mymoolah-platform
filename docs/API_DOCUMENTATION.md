# MyMoolah Platform - API Documentation

## **📋 API Overview**

**Base URL**: `http://localhost:3001` (development)

**Authentication**: JWT Bearer Token

**Content-Type**: `application/json`

---

## **🔐 Authentication**

### **Headers Required**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### **Token Management**
- **Login**: `POST /api/v1/auth/login`
- **Register**: `POST /api/v1/auth/register`
- **Refresh**: `POST /api/v1/auth/refresh`

Login uses mobile number as the identifier plus password.

Request:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "+27825571055",
  "password": "Password123!"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "<JWT>",
  "user": {
    "id": 1,
    "phone": "+27825571055",
    "firstName": "Andre",
    "lastName": "Test",
    "kycStatus": "not_started"
  }
}
```

---

## **🎫 Voucher Management API**

### **Voucher Display Logic (Updated August 5, 2025)**

**Business Rules:**
- **All vouchers are MMVouchers** (16 digits)
- **EasyPay is a "type" of MMVoucher** (different purchase method)
- **Process**: Create EasyPay → Settle → Activate MMVoucher
- **MMVouchers only exist after settlement** (cannot be "Pending")

**Display Logic:**
```javascript
// Pending EasyPay Voucher
{
  "status": "pending_payment",
  "easyPayCode": "9 1234 1385 1948 7",  // Only EasyPay shown
  "voucherCode": null
}

// Active EasyPay Voucher  
{
  "status": "active",
  "voucherCode": "1093 2371 6105 6632",  // MMVoucher as main
  "easyPayCode": "9 1234 1385 1948 7"    // EasyPay as sub
}

// Regular MMVoucher
{
  "status": "active", 
  "voucherCode": "1234 5678 9012 3456",  // 16-digit MMVoucher
  "easyPayCode": null
}
```

### **Get All Vouchers**
```http
GET /api/v1/vouchers/
```

**Response**:
```json
{
  "success": true,
  "data": {
    "vouchers": [
      {
        "id": 1,
        "voucherCode": "MMVOUCHER_1754321424055_abc123",
        "easyPayCode": "91234388661929",
        "originalAmount": "500.00",
        "balance": "250.00",
        "status": "active",
        "voucherType": "easypay_active",
        "expiresAt": "2026-08-04T14:15:13.040Z",
        "createdAt": "2025-08-04T14:15:13.040Z",
        "updatedAt": "2025-08-04T14:15:13.040Z"
      }
    ]
  }
}
```

### **Get Active Vouchers**
```http
GET /api/v1/vouchers/active
```

**Response**: Same as above, filtered for `status = 'active'`

### **Get Redeemed Vouchers**
```http
GET /api/v1/vouchers/redeemed
```

**Response**: Same as above, filtered for `status = 'redeemed'`

### **Get Voucher Balance Summary**
```http
GET /api/v1/vouchers/balance-summary
```

**Response**:
```json
{
  "success": true,
  "data": {
    "active": { "count": 3, "value": "2600.00" },
    "pending": { "count": 2, "value": "1000.00" },
    "redeemed": { "count": 4, "value": "1500.00" },
    "total": { "count": 9, "value": "5100.00" }
  }
}
```

### **Issue New Voucher**
```http
POST /api/v1/vouchers/issue
```

**Request Body**:
```json
{
  "original_amount": 500,
  "issued_to": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Voucher issued successfully",
  "data": {
    "id": 1,
    "voucherCode": "MMVOUCHER_1754321424055_abc123",
    "originalAmount": "500.00",
    "balance": "500.00",
    "status": "active",
    "expiresAt": "2025-09-04T14:15:13.040Z"
  }
}
```

### **Issue EasyPay Voucher**
```http
POST /api/v1/vouchers/easypay/issue
```

**Request Body**:
```json
{
  "original_amount": 500,
  "issued_to": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "EasyPay voucher created successfully",
  "data": {
    "easypay_code": "91234388661929",
    "amount": "500.00",
    "expires_at": "2025-08-08T14:15:13.040Z",
    "sms_sent": false
  }
}
```

### **Process EasyPay Settlement**
```http
POST /api/v1/vouchers/easypay/settlement
```

**Request Body**:
```json
{
  "easypay_code": "91234388661929",
  "settlement_amount": 500,
  "merchant_id": "MERCHANT123",
  "transaction_id": "TX123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "EasyPay voucher settled successfully",
  "data": {
    "easypay_code": "91234388661929",
    "mm_voucher_code": "MMVOUCHER_1754321424055_abc123",
    "status": "active"
  }
}
```

### **Redeem Voucher**
```http
POST /api/v1/vouchers/redeem
```

**Request Body**:
```json
{
  "voucher_code": "1093237161056632",
  "amount": 250,
  "redeemer_id": "user123",
  "merchant_id": "MERCHANT123",
  "service_provider_id": "SP123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Voucher redeemed successfully",
  "data": {
    "voucher_id": 1,
    "redeemed_amount": "250.00",
    "remaining_balance": "250.00",
    "redemption_count": 1
  }
}
```

Important rules (2025‑08‑11):
- Only 16‑digit MMVoucher codes can be redeemed.
- 14‑digit EasyPay codes are display/settlement only and are rejected by the API with
  `400` and message: "EasyPay codes (14 digits) cannot be redeemed. Use the 16‑digit MMVoucher code."

Cancellation and Expiration rules (2025‑08‑12):
- Cancelling a pending EasyPay voucher refunds the full `originalAmount` to the wallet and creates a refund transaction.
- Pending EasyPay vouchers that expire are auto‑refunded.
- Expired active MMVouchers refund the remaining balance to the wallet.

### **Get Voucher by Code**
```http
GET /api/v1/vouchers/code/{voucher_code}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "voucherCode": "MMVOUCHER_1754321424055_abc123",
    "easyPayCode": "91234388661929",
    "originalAmount": "500.00",
    "balance": "250.00",
    "status": "active",
    "voucherType": "easypay_active",
    "expiresAt": "2026-08-04T14:15:13.040Z"
  }
}
```

### **Get Voucher Redemptions**
```http
GET /api/v1/vouchers/{voucher_id}/redemptions
```

**Response**:
```json
{
  "success": true,
  "data": {
    "voucher_id": 1,
    "voucher_code": "MMVOUCHER_1754321424055_abc123",
    "redemption_count": 1,
    "max_redemptions": 1,
    "status": "active"
  }
}
```

### Cancel EasyPay Voucher
```http
POST /api/v1/vouchers/:voucherId/cancel
Authorization: Bearer <token>
```

**Description**: Cancel a pending EasyPay voucher and refund the full amount to the user's wallet.

**Parameters**:
- `voucherId` (path): The ID of the voucher to cancel

**Response**:
```json
{
  "success": true,
  "message": "EasyPay voucher cancelled successfully",
  "data": {
    "voucherId": "123",
    "easyPayCode": "91234604263339",
    "originalAmount": 130.00,
    "refundAmount": 130.00,
    "newWalletBalance": 11530.00,
    "cancelledAt": "2025-08-05T22:57:00.000Z",
    "transactionId": "TXN-1234567890-abc123"
  }
}
```

**Business Rules**:
- Only pending EasyPay vouchers can be cancelled
- Expired vouchers cannot be cancelled (auto-refunded)
- Settled vouchers cannot be cancelled
- Full refund is processed immediately
- Complete audit trail is maintained

---

## **💰 Wallet Management API**

### **Get Wallet Balance**
```http
GET /api/v1/wallets/balance
```

**Response**:
```json
{
  "success": true,
  "message": "Balance retrieved successfully",
  "data": {
    "walletId": "WAL-1755007499196",
    "balance": 15000.00,
    "currency": "ZAR",
    "status": "active"
  }
}
```

### **Get Wallet Transactions**
```http
GET /api/v1/wallets/transactions?page=1&limit=10
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "transactionId": "TXN-1755008423028",
        "type": "deposit",
        "amount": 1000.00,
        "description": "Initial Deposit",
        "currency": "ZAR",
        "createdAt": "2025-08-12T14:20:23.028Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "itemsPerPage": 10,
      "totalItems": 25,
      "totalPages": 3
    }
  }
}
```

### **User Settings**
```http
GET /api/v1/settings
```

**Response**:
```json
{
  "success": true,
  "message": "User settings retrieved successfully",
  "data": {
    "settings": {
      "userId": 1,
      "quickAccessServices": ["send_money", "vouchers"],
      "showBalance": true,
      "language": "en",
      "displayCurrency": "ZAR"
    },
    "enabledServices": ["send_money", "vouchers"]
  }
}
```

---

## **👤 User Management API**

### **User Login**
See the Authentication section above for the updated request/response using `identifier` and `password`.

### **User Registration**
```http
POST /api/v1/auth/register
```

**Request Body**:
```json
{
  "name": "Andre Test",
  "email": "andre@example.com",
  "phoneNumber": "+27825571055",
  "password": "Password123!",
  "idNumber": "8001015009087",
  "idType": "south_african_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully.",
  "token": "<JWT>",
  "user": {
    "id": 1,
    "phone": "+27825571055",
    "firstName": "Andre",
    "lastName": "Test",
    "kycStatus": "not_started"
  }
}
```

---

## **🔧 Payment Integration APIs**

### **Flash Payment Processing**
```http
POST /api/v1/flash/process
```

### **MobileMart Payment Processing**
```http
POST /api/v1/mobilemart/process
```

### **EasyPay Network Integration**
```http
POST /billpayment/v1/easypay/process
```

---

## **📊 Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## **🔒 Error Responses**

### **Standard Error Format**
```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### **Common Error Codes**
- `INVALID_VOUCHER_CODE`: Invalid voucher code format
- `VOUCHER_NOT_FOUND`: Voucher does not exist
- `INSUFFICIENT_BALANCE`: Voucher balance too low for redemption
- `VOUCHER_EXPIRED`: Voucher has expired
- `INVALID_AMOUNT`: Amount is outside allowed range
- `AUTHENTICATION_FAILED`: Invalid credentials
- `UNAUTHORIZED`: Missing or invalid token

---

## **📋 Request/Response Examples**

### **Voucher Status Values**
- `pending`: Voucher created but not yet active (EasyPay pending payment)
- `active`: Voucher can be used (including partially redeemed)
- `redeemed`: Voucher fully redeemed (balance = 0)
- `expired`: Voucher has expired
- `cancelled`: Voucher was cancelled

### **Voucher Type Values**
- `standard`: Standard MyMoolah voucher
- `premium`: Premium MyMoolah voucher
- `business`: Business MyMoolah voucher
- `easypay_pending`: EasyPay voucher waiting for payment
- `easypay_active`: EasyPay voucher that has been settled

### **EasyPay Number Format**
- **Format**: 14 digits with Luhn algorithm validation
- **Example**: `91234388661929`
- **Display**: `9 1234 3886 1929` (formatted with spaces)

### **MM Voucher Code Format**
- **Format**: `MMVOUCHER_{timestamp}_{random}`
- **Example**: `MMVOUCHER_1754321424055_abc123`
- **Display**: `1754 3214 2405 5abc 123` (formatted in groups)

---

## **🔗 Related Documentation**
- [Project Status](./PROJECT_STATUS.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Security Compliance](./SECURITY_COMPLIANCE_CERTIFICATE.md)

---

**Last Updated**: August 12, 2025  
**API Version**: v1.3.0  
**Status**: Production Ready 

## Ledger API
Base Path: `/api/v1/ledger`

### POST `/accounts`
Create a ledger account.
Request body:
```json
{ "code": "1000", "name": "Cash", "type": "asset", "normalSide": "debit" }
```
Response: `{ success, message, data }`

### POST `/journal-entries`
Post a balanced journal entry.
Request body:
```json
{
  "reference": "TEST-001",
  "description": "Sale for cash",
  "lines": [
    { "accountCode": "1000", "dc": "debit", "amount": 100.00 },
    { "accountCode": "4000", "dc": "credit", "amount": 100.00 }
  ]
}
```
Response: `{ success, message, data }`

### GET `/trial-balance`
Returns trial balance totals and account-level balances.
Response: `{ success, message, data: { balances: [...], totals: { debits, credits } } }` 