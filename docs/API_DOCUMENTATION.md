# MyMoolah Platform - API Documentation

## 🎯 **API Overview**

**Base URL:** `http://localhost:5050`  
**Version:** 2.1.0  
**Status:** ✅ **ALL ENDPOINTS OPERATIONAL**  
**Last Updated:** July 20, 2025

---

## 🔐 **Authentication Endpoints**

### **POST /api/v1/auth/login**
Authenticate user with phone number, account number, or username.

**Request Body:**
```json
{
  "identifier": "27821234567",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 15,
    "name": "Test User",
    "kycStatus": "pending",
    "email": "demo@mymoolah.com"
  }
}
```

### **POST /api/v1/auth/register**
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "identifier": "27821234568",
  "identifierType": "phone",
  "email": "john@mymoolah.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 16,
    "name": "John Doe",
    "kycStatus": "pending"
  }
}
```

---

## 💰 **Send Money Endpoints**

### **POST /api/v1/send-money/resolve-recipient**
Detect recipient type and available payment methods.

**Request Body:**
```json
{
  "identifier": "27821234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "identifier": "27821234567",
    "type": "phone",
    "availableMethods": [
      {
        "id": "sa_bank_transfer",
        "name": "Bank Transfer",
        "description": "Send to any South African bank account",
        "estimatedTime": "2-5 minutes",
        "fee": "R2.50",
        "feeAmount": 2.5,
        "available": true,
        "preferred": false,
        "badge": "R2.50 • 2-5 MIN"
      },
      {
        "id": "atm_cash_pickup",
        "name": "ATM Cash Pickup",
        "description": "Recipient collects cash at partner ATMs",
        "estimatedTime": "15 minutes",
        "fee": "R5.00",
        "feeAmount": 5,
        "available": true,
        "preferred": false,
        "badge": "R5.00 • 15 MIN"
      }
    ],
    "recipientInfo": "Standard Bank"
  }
}
```

### **POST /api/v1/send-money/quote**
Generate transfer quote with fees and estimated time.

**Request Body:**
```json
{
  "identifier": "27821234567",
  "amount": 1000,
  "method": "sa_bank_transfer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quoteId": "q_123456789",
    "amount": 1000,
    "fee": 2.5,
    "totalAmount": 1002.5,
    "estimatedTime": "2-5 minutes",
    "method": "sa_bank_transfer",
    "recipientInfo": "Standard Bank"
  }
}
```

### **POST /api/v1/send-money/transfer**
Initiate a money transfer (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "identifier": "27821234567",
  "amount": 1000,
  "method": "sa_bank_transfer",
  "quoteId": "q_123456789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_987654321",
    "status": "processing",
    "amount": 1000,
    "fee": 2.5,
    "totalAmount": 1002.5,
    "estimatedTime": "2-5 minutes"
  }
}
```

### **GET /api/v1/send-money/status/:transactionId**
Check transfer status.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_987654321",
    "status": "completed",
    "amount": 1000,
    "fee": 2.5,
    "completedAt": "2025-07-20T15:30:00Z"
  }
}
```

---

## 📋 **KYC (Know Your Customer) Endpoints**

### **GET /api/v1/kyc/status**
Get KYC status and progress (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "pending",
    "progress": 25,
    "requiredDocuments": [
      "identity_document",
      "address_proof"
    ],
    "uploadedDocuments": [
      {
        "type": "identity_document",
        "filename": "id_document.pdf",
        "uploadedAt": "2025-07-20T10:00:00Z"
      }
    ]
  }
}
```

### **POST /api/v1/kyc/upload-document**
Upload KYC document (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `documentType`: "identity_document" | "address_proof"
- `file`: Document file (JPG, PNG, PDF, max 10MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "doc_123456",
    "filename": "id_document.pdf",
    "type": "identity_document",
    "uploadedAt": "2025-07-20T10:00:00Z"
  }
}
```

### **POST /api/v1/kyc/submit**
Submit KYC for verification (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "estimatedTime": "24-48 hours",
    "submittedAt": "2025-07-20T10:00:00Z"
  }
}
```

### **GET /api/v1/kyc/requirements**
Get KYC document requirements.

**Response:**
```json
{
  "success": true,
  "data": {
    "requiredDocuments": [
      {
        "type": "identity_document",
        "name": "Identity Document",
        "description": "SA ID, Passport, or Driver's License",
        "acceptedFormats": ["JPG", "PNG", "PDF"],
        "maxSize": "10MB"
      },
      {
        "type": "address_proof",
        "name": "Address Proof",
        "description": "Utility bill, Bank statement, or Lease agreement",
        "acceptedFormats": ["JPG", "PNG", "PDF"],
        "maxSize": "10MB"
      }
    ]
  }
}
```

---

## 💳 **Wallet Management Endpoints**

### **GET /api/v1/wallets/balance**
Get wallet balance (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 5000.00,
    "currency": "ZAR",
    "lastUpdated": "2025-07-20T15:30:00Z"
  }
}
```

### **GET /api/v1/wallets/transactions**
Get transaction history (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `type`: Transaction type (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_123456",
        "type": "transfer",
        "amount": 1000.00,
        "fee": 2.50,
        "status": "completed",
        "recipient": "27821234567",
        "createdAt": "2025-07-20T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### **POST /api/v1/wallets/deposit**
Deposit funds to wallet (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "amount": 1000,
  "method": "bank_transfer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_123456",
    "amount": 1000,
    "status": "pending",
    "reference": "DEP123456789"
  }
}
```

### **POST /api/v1/wallets/withdraw**
Withdraw funds from wallet (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "amount": 500,
  "method": "bank_transfer",
  "accountNumber": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_789012",
    "amount": 500,
    "fee": 5.00,
    "status": "processing"
  }
}
```

### **GET /api/v1/wallets/limits**
Get wallet limits and restrictions (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dailyLimit": 10000.00,
    "monthlyLimit": 50000.00,
    "singleTransactionLimit": 5000.00,
    "kycRequired": true,
    "kycStatus": "pending"
  }
}
```

---

## 🔍 **System Endpoints**

### **GET /test**
Test endpoint to verify server status.

**Response:**
```json
{
  "message": "MyMoolah Wallet API is running!",
  "endpoints": {
    "auth": "/api/v1/auth",
    "wallets": "/api/v1/wallets",
    "transactions": "/api/v1/transactions",
    "users": "/api/v1/users",
    "kyc": "/api/v1/kyc",
    "sendMoney": "/api/v1/send-money",
    "support": "/api/v1/support",
    "notifications": "/api/v1/notifications",
    "vouchers": "/api/v1/vouchers",
    "voucherTypes": "/api/v1/voucher-types",
    "vas": "/api/v1/vas",
    "merchants": "/api/v1/merchants",
    "serviceProviders": "/api/v1/service-providers",
    "flash": "/api/v1/flash",
    "mobilemart": "/api/v1/mobilemart",
    "health": "/health",
    "test": "/test"
  }
}
```

### **GET /health**
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-20T15:30:00Z",
  "service": "MyMoolah Wallet API",
  "version": "1.0.0"
}
```

---

## 🔐 **Authentication & Security**

### **JWT Token Format**
```
Authorization: Bearer <jwt_token>
```

### **Token Expiration**
- **Access Token:** 24 hours
- **Refresh Token:** 7 days

### **Security Headers**
- **CORS:** Configured for cross-origin requests
- **Rate Limiting:** Applied to all endpoints
- **Input Validation:** All requests validated
- **HTTPS:** Required in production

---

## 📊 **Error Responses**

### **Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "identifier",
      "message": "Identifier is required"
    }
  ]
}
```

### **Authentication Error**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### **Server Error**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Database connection failed"
}
```

---

## 🧪 **Testing Examples**

### **Test Authentication**
```bash
# Login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "27821234567", "password": "Demo123!"}'

# Register
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "identifier": "27821234568", "identifierType": "phone", "email": "test@mymoolah.com", "password": "Test123!", "firstName": "Test", "lastName": "User"}'
```

### **Test Send Money**
```bash
# Resolve recipient
curl -X POST http://localhost:5050/api/v1/send-money/resolve-recipient \
  -H "Content-Type: application/json" \
  -d '{"identifier": "27821234567"}'

# Get quote
curl -X POST http://localhost:5050/api/v1/send-money/quote \
  -H "Content-Type: application/json" \
  -d '{"identifier": "27821234567", "amount": 1000, "method": "sa_bank_transfer"}'
```

### **Test KYC**
```bash
# Get KYC status (with auth token)
curl -X GET http://localhost:5050/api/v1/kyc/status \
  -H "Authorization: Bearer <your_jwt_token>"

# Get KYC requirements
curl -X GET http://localhost:5050/api/v1/kyc/requirements
```

### **Test Wallet**
```bash
# Get balance (with auth token)
curl -X GET http://localhost:5050/api/v1/wallets/balance \
  -H "Authorization: Bearer <your_jwt_token>"

# Get transactions (with auth token)
curl -X GET http://localhost:5050/api/v1/wallets/transactions \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## 📈 **Rate Limits**

### **Authentication Endpoints**
- **Login:** 5 requests per minute
- **Register:** 3 requests per minute

### **API Endpoints**
- **General:** 100 requests per minute
- **File Upload:** 10 requests per minute
- **Money Transfer:** 20 requests per minute

---

## 🔄 **Webhooks (Future)**

### **Transaction Webhooks**
```json
{
  "event": "transaction.completed",
  "data": {
    "transactionId": "tx_123456",
    "status": "completed",
    "amount": 1000.00,
    "timestamp": "2025-07-20T15:30:00Z"
  }
}
```

### **KYC Webhooks**
```json
{
  "event": "kyc.verified",
  "data": {
    "userId": 15,
    "status": "verified",
    "timestamp": "2025-07-20T15:30:00Z"
  }
}
```

---

## 🤖 Figma AI Agent Integration Notes

- For a complete mapping of frontend pages to backend endpoints, see `FIGMA_API_WIRING.md`.
- All new and legacy endpoints are documented here for reference.
- If a new endpoint is needed, request it from the backend team.

---

**API Status:** ✅ **ALL ENDPOINTS OPERATIONAL**  
**Last Updated:** July 20, 2025  
**Version:** 2.1.0 