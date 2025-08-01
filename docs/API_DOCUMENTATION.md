# MyMoolah API Documentation

**Version:** 1.0.0  
**Last Updated:** July 30, 2025  
**Base URL:** `http://localhost:3001/api/v1`

---

## 📋 **Table of Contents**

1. [Authentication](#authentication)
2. [Wallet Management](#wallet-management)
3. [Voucher Management](#voucher-management)
4. [Transaction Management](#transaction-management)
5. [KYC Services](#kyc-services)
6. [Payment Processing](#payment-processing)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## 🔐 **Authentication**

### **POST /auth/register**
Register a new user account.

**Request Body:**
```json
{
  "mobileNumber": "+27123456789",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": 1,
    "mobileNumber": "+27123456789",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "createdAt": "2025-07-30T10:00:00.000Z"
  }
}
```

### **POST /auth/login**
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "mobileNumber": "+27123456789",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": 1,
      "mobileNumber": "+27123456789",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

### **POST /auth/verify**
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": 1,
    "mobileNumber": "+27123456789"
  }
}
```

---

## 💳 **Wallet Management**

### **GET /wallets/balance**
Get current wallet balance.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": 1250.75,
    "currency": "ZAR",
    "lastUpdated": "2025-07-30T10:00:00.000Z"
  }
}
```

### **POST /wallets/deposit**
Deposit funds into wallet.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "amount": 500.00,
  "currency": "ZAR",
  "description": "Bank transfer deposit"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Deposit successful",
  "data": {
    "transactionId": "TXN_123456789",
    "amount": 500.00,
    "newBalance": 1750.75,
    "timestamp": "2025-07-30T10:00:00.000Z"
  }
}
```

### **POST /wallets/withdraw**
Withdraw funds from wallet.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "amount": 200.00,
  "currency": "ZAR",
  "description": "ATM withdrawal"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Withdrawal successful",
  "data": {
    "transactionId": "TXN_987654321",
    "amount": 200.00,
    "newBalance": 1550.75,
    "timestamp": "2025-07-30T10:00:00.000Z"
  }
}
```

---

## 🎫 **Voucher Management**

### **GET /vouchers/active**
Get all active vouchers for the user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vouchers": [
      {
        "voucherId": "VCH_001",
        "brand": "EasyPay",
        "amount": 100.00,
        "currency": "ZAR",
        "expiryDate": "2025-08-30T00:00:00.000Z",
        "status": "active",
        "createdAt": "2025-07-30T10:00:00.000Z"
      },
      {
        "voucherId": "VCH_002",
        "brand": "Standard",
        "amount": 250.00,
        "currency": "ZAR",
        "expiryDate": "2025-09-15T00:00:00.000Z",
        "status": "active",
        "createdAt": "2025-07-30T10:00:00.000Z"
      }
    ],
    "totalVouchers": 2
  }
}
```

### **GET /vouchers/balance**
Get voucher balance summary.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalBalance": 9025.00,
    "currency": "ZAR",
    "totalVouchers": 13,
    "activeVouchers": 13,
    "expiredVouchers": 0,
    "brandBreakdown": {
      "EasyPay": {
        "count": 5,
        "totalAmount": 3500.00
      },
      "Standard": {
        "count": 4,
        "totalAmount": 2800.00
      },
      "Premium": {
        "count": 3,
        "totalAmount": 2025.00
      },
      "Business": {
        "count": 1,
        "totalAmount": 700.00
      }
    }
  }
}
```

### **POST /vouchers/issue**
Issue a new voucher.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "brand": "EasyPay",
  "amount": 100.00,
  "currency": "ZAR",
  "expiryDate": "2025-08-30T00:00:00.000Z",
  "description": "Promotional voucher"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Voucher issued successfully",
  "data": {
    "voucherId": "VCH_003",
    "brand": "EasyPay",
    "amount": 100.00,
    "currency": "ZAR",
    "expiryDate": "2025-08-30T00:00:00.000Z",
    "status": "active",
    "createdAt": "2025-07-30T10:00:00.000Z"
  }
}
```

### **POST /vouchers/redeem**
Redeem a voucher.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "voucherId": "VCH_001",
  "amount": 100.00
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Voucher redeemed successfully",
  "data": {
    "voucherId": "VCH_001",
    "redeemedAmount": 100.00,
    "remainingAmount": 0.00,
    "status": "redeemed",
    "redeemedAt": "2025-07-30T10:00:00.000Z"
  }
}
```

---

## 💸 **Transaction Management**

### **GET /wallets/transactions**
Get transaction history.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `type` (optional): Transaction type (deposit, withdrawal, transfer)
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "transactionId": "TXN_123456789",
        "type": "deposit",
        "amount": 500.00,
        "currency": "ZAR",
        "description": "Bank transfer deposit",
        "status": "completed",
        "timestamp": "2025-07-30T10:00:00.000Z",
        "balanceAfter": 1750.75
      },
      {
        "transactionId": "TXN_987654321",
        "type": "withdrawal",
        "amount": 200.00,
        "currency": "ZAR",
        "description": "ATM withdrawal",
        "status": "completed",
        "timestamp": "2025-07-30T09:30:00.000Z",
        "balanceAfter": 1550.75
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

---

## 📋 **KYC Services**

### **POST /kyc/upload**
Upload KYC documents.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
FormData:
- documentType: "id_card" | "passport" | "proof_of_address"
- documentFile: <file>
- description: "South African ID card"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "documentId": "DOC_123456789",
    "documentType": "id_card",
    "status": "pending",
    "uploadedAt": "2025-07-30T10:00:00.000Z"
  }
}
```

### **GET /kyc/status**
Get KYC verification status.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "kycStatus": "verified",
    "documents": [
      {
        "documentId": "DOC_123456789",
        "documentType": "id_card",
        "status": "verified",
        "verifiedAt": "2025-07-30T10:00:00.000Z"
      },
      {
        "documentId": "DOC_987654321",
        "documentType": "proof_of_address",
        "status": "verified",
        "verifiedAt": "2025-07-30T10:00:00.000Z"
      }
    ],
    "lastUpdated": "2025-07-30T10:00:00.000Z"
  }
}
```

### **POST /kyc/verify**
Verify uploaded documents using OpenAI OCR.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "documentId": "DOC_123456789"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Document verification completed",
  "data": {
    "documentId": "DOC_123456789",
    "verificationResult": {
      "isValid": true,
      "confidence": 0.95,
      "extractedData": {
        "documentNumber": "8001015009087",
        "fullName": "John Doe",
        "dateOfBirth": "1980-01-01",
        "nationality": "South African"
      }
    },
    "verifiedAt": "2025-07-30T10:00:00.000Z"
  }
}
```

---

## 💳 **Payment Processing**

### **POST /flash/pay**
Process Flash payment.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "amount": 150.00,
  "currency": "ZAR",
  "recipientMobile": "+27123456789",
  "description": "Payment to John Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "FLASH_123456789",
    "amount": 150.00,
    "currency": "ZAR",
    "recipientMobile": "+27123456789",
    "status": "completed",
    "timestamp": "2025-07-30T10:00:00.000Z"
  }
}
```

### **POST /mobilemart/purchase**
Purchase airtime or data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "serviceType": "airtime",
  "provider": "Vodacom",
  "amount": 50.00,
  "recipientMobile": "+27123456789",
  "description": "Airtime purchase"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Purchase completed successfully",
  "data": {
    "transactionId": "MM_123456789",
    "serviceType": "airtime",
    "provider": "Vodacom",
    "amount": 50.00,
    "recipientMobile": "+27123456789",
    "status": "completed",
    "timestamp": "2025-07-30T10:00:00.000Z"
  }
}
```

---

## ⚠️ **Error Handling**

### **Error Response Format**
All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### **Common Error Codes**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_001` | 401 | Invalid credentials |
| `AUTH_002` | 401 | Token expired |
| `AUTH_003` | 403 | Insufficient permissions |
| `VAL_001` | 400 | Validation error |
| `DB_001` | 500 | Database error |
| `INT_001` | 500 | Internal server error |
| `NOT_FOUND` | 404 | Resource not found |
| `INSUFFICIENT_FUNDS` | 400 | Insufficient wallet balance |
| `VOUCHER_EXPIRED` | 400 | Voucher has expired |
| `VOUCHER_ALREADY_REDEEMED` | 400 | Voucher already redeemed |

### **Example Error Response**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient funds in wallet",
    "details": {
      "currentBalance": 100.00,
      "requestedAmount": 200.00,
      "shortfall": 100.00
    }
  }
}
```

---

## 🚦 **Rate Limiting**

### **Rate Limits**
- **Authentication endpoints:** 5 requests per minute
- **Wallet operations:** 10 requests per minute
- **Voucher operations:** 20 requests per minute
- **Transaction queries:** 30 requests per minute
- **KYC operations:** 3 requests per minute
- **Payment processing:** 5 requests per minute

### **Rate Limit Response**
When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60,
      "limit": 10,
      "window": "1 minute"
    }
  }
}
```

**Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

---

## 🔧 **Development & Testing**

### **Environment Variables**
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mymoolah
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# OpenAI Configuration (for KYC)
OPENAI_API_KEY=your_openai_api_key

# Flash Integration
FLASH_API_KEY=your_flash_api_key
FLASH_API_URL=https://api.flash.com

# MobileMart Integration
MOBILEMART_API_KEY=your_mobilemart_api_key
MOBILEMART_API_URL=https://api.mobilemart.com
```

### **Testing Endpoints**
```bash
# Test authentication
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "+27123456789", "password": "password123"}'

# Test wallet balance
curl -X GET http://localhost:3001/api/v1/wallets/balance \
  -H "Authorization: Bearer <jwt_token>"

# Test voucher balance
curl -X GET http://localhost:3001/api/v1/vouchers/balance \
  -H "Authorization: Bearer <jwt_token>"
```

---

## 📚 **Additional Resources**

- [Security Guide](./SECURITY.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Mojaloop Integration](./mojaloop-integration.md)

---

**MyMoolah API Documentation** - Version 1.0.0  
**Last Updated:** July 30, 2025 