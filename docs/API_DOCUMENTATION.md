# MyMoolah Platform - API Documentation

## 🎉 **CURRENT STATUS: DASHBOARD INTEGRATION COMPLETE - ALL ENDPOINTS WORKING**

**Last Updated:** July 29, 2025  
**Base URL:** `http://localhost:3001/api/v1`  
**Health Check:** `http://localhost:3001/health`

---

## **OVERVIEW**

The MyMoolah API provides comprehensive financial services including user management, wallet operations, KYC verification, voucher management, and payment processing. All endpoints are fully functional and tested with real data from SQLite database.

### **Dashboard Integration Status**
- ✅ **Wallet Balance:** Real-time balance from database
- ✅ **Recent Transactions:** Last 5 transactions with contextual icons
- ✅ **Active Vouchers:** Voucher count and value display
- ✅ **Clean Console:** Production-ready output with no errors

### **Authentication**
- **Method:** JWT (JSON Web Tokens)
- **Header:** `Authorization: Bearer <token>`
- **Protected Routes:** Marked with 🔒

### **Response Format**
All API responses follow a consistent JSON format:
```json
{
  "success": true/false,
  "message": "Human-readable message",
  "data": { /* response data */ },
  "error": "Error details (if applicable)"
}
```

---

## **DASHBOARD ENDPOINTS (NEW - JULY 29, 2025)**

### **Get Wallet Balance** 🔒
```http
GET /wallets/balance
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING - REAL DATA**  
**Response:** Current wallet balance with available, pending, and total amounts
```json
{
  "success": true,
  "message": "Wallet balance retrieved successfully",
  "data": {
    "available": 5204.50,
    "pending": 0,
    "total": 5204.50,
    "currency": "ZAR",
    "lastUpdated": "2025-07-29T18:39:58.000Z"
  }
}
```

### **Get Recent Transactions** 🔒
```http
GET /wallets/transactions?limit=5
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING - REAL DATA**  
**Response:** Last 5 transactions with contextual categorization
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": 1,
        "type": "credit",
        "amount": 5000,
        "description": "Initial deposit",
        "createdAt": "2025-07-29T18:39:58.000Z"
      },
      {
        "id": 2,
        "type": "debit",
        "amount": 245.50,
        "description": "Woolworths Sandton",
        "createdAt": "2025-07-29T17:40:08.000Z"
      }
    ]
  }
}
```

### **Get Active Vouchers** 🔒
```http
GET /vouchers/active
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING - REAL DATA**  
**Response:** Active vouchers with count and total value
```json
{
  "success": true,
  "message": "Active vouchers retrieved successfully",
  "data": [
    {
      "id": 1,
      "voucherId": "VOUCHER001",
      "type": "grocery",
      "amount": 100,
      "description": "Woolworths Voucher",
      "status": "active",
      "expiryDate": "2025-12-31T23:59:59.000Z"
    }
  ]
}
```

---

## **HEALTH & TESTING ENDPOINTS**

### **Health Check**
```http
GET /health
```
**Status:** ✅ **WORKING**  
**Response:** Server health status

### **Test Endpoint**
```http
GET /test
```
**Status:** ✅ **WORKING**  
**Response:** List of all available endpoints

---

## **AUTHENTICATION ENDPOINTS**

### **User Registration**
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "27821234567",
  "password": "SecurePassword123!"
}
```
**Status:** ✅ **WORKING**  
**Response:** User account created with JWT token

### **User Login**
```http
POST /auth/login
Content-Type: application/json

{
  "phoneNumber": "27821234567",
  "password": "SecurePassword123!"
}
```
**Status:** ✅ **WORKING**  
**Response:** JWT token for authenticated requests

---

## **USER MANAGEMENT ENDPOINTS**

### **Get All Users**
```http
GET /users
```
**Status:** ✅ **WORKING**  
**Response:** Returns 5 demo users with complete data
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "email": "john.doe@mymoolah.com",
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "27821234567",
        "balance": 5000,
        "status": "active",
        "createdAt": "2025-07-29 16:29:01.087 +00:00",
        "updatedAt": "2025-07-29 16:29:01.087 +00:00"
      }
    ]
  }
}
```

### **Get User by ID**
```http
GET /users/:id
```
**Status:** ✅ **WORKING**  
**Response:** Specific user details

### **Update User Profile**
```http
PUT /users/:id
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "27821234567"
}
```
**Status:** ✅ **WORKING**  
**Response:** Updated user profile

### **Get User Statistics**
```http
GET /users/stats
```
**Status:** ✅ **WORKING**  
**Response:** User analytics and statistics

---

## **WALLET MANAGEMENT ENDPOINTS**

### **Get All Wallets**
```http
GET /wallets
```
**Status:** ✅ **WORKING**  
**Response:** Returns 5 demo wallets with realistic balances
```json
{
  "success": true,
  "message": "Wallets retrieved successfully",
  "data": {
    "wallets": [
      {
        "id": 1,
        "userId": 1,
        "walletId": "WAL20250729123456JOHN",
        "balance": 5000,
        "status": "active",
        "account_number": "27821234567",
        "created_at": "2025-07-29 16:29:01.093 +00:00",
        "updated_at": "2025-07-29 16:29:01.093 +00:00"
      }
    ]
  }
}
```

### **Get Wallet Balance** 🔒
```http
GET /wallets/balance
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING**  
**Response:** Current wallet balance and details

### **Credit Wallet** 🔒
```http
POST /wallets/credit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000,
  "description": "Bank deposit"
}
```
**Status:** ✅ **WORKING**  
**Response:** Updated balance and transaction details

### **Debit Wallet** 🔒
```http
POST /wallets/debit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500,
  "description": "Payment for services"
}
```
**Status:** ✅ **WORKING**  
**Response:** Updated balance and transaction details

### **Send Money** 🔒
```http
POST /wallets/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverEmail": "jane.smith@example.com",
  "amount": 200,
  "description": "Money transfer"
}
```
**Status:** ✅ **WORKING**  
**Response:** Transfer confirmation and transaction details

---

## **TRANSACTION MANAGEMENT ENDPOINTS**

### **Get All Transactions**
```http
GET /transactions
```
**Status:** ✅ **WORKING**  
**Response:** Returns 7 demo transactions with different types
```json
[
  {
    "id": 1,
    "walletId": "WAL20250729123456JOHN",
    "type": "transfer",
    "amount": 500,
    "description": "Transfer to Jane Smith",
    "status": "completed",
    "createdAt": "2025-07-25 10:30:00.000 +00:00",
    "updatedAt": "2025-07-25 10:30:00.000 +00:00"
  }
]
```

### **Get Transaction History** 🔒
```http
GET /transactions/history
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING**  
**Response:** User's transaction history with pagination

### **Get Transaction Summary** 🔒
```http
GET /transactions/summary
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING**  
**Response:** Transaction analytics and summaries

---

## **KYC MANAGEMENT ENDPOINTS**

### **Get All KYC Records**
```http
GET /kyc
```
**Status:** ✅ **WORKING**  
**Response:** Returns 5 demo KYC records with verification statuses
```json
{
  "success": true,
  "message": "KYC records retrieved successfully",
  "data": {
    "kyc": [
      {
        "id": 1,
        "userId": 1,
        "documentType": "identity_document",
        "documentNumber": "ID123456789",
        "status": "verified",
        "submittedAt": "2025-07-15 10:00:00.000 +00:00",
        "reviewedAt": "2025-07-16 14:30:00.000 +00:00",
        "reviewerNotes": "Documents verified successfully",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@mymoolah.com"
      }
    ]
  }
}
```

### **Submit KYC** 🔒
```http
POST /kyc/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "nationality": "South African",
  "address": "123 Main Street, Johannesburg",
  "city": "Johannesburg",
  "postalCode": "2000"
}
```
**Status:** ✅ **WORKING**  
**Response:** KYC submission confirmation

### **Upload KYC Document** 🔒
```http
POST /kyc/upload-document
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "documentType": "identity",
  "document": <file>
}
```
**Status:** ✅ **WORKING**  
**Response:** Document upload confirmation

### **Get KYC Status** 🔒
```http
GET /kyc/status
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING**  
**Response:** Current KYC verification status

---

## **VOUCHER MANAGEMENT ENDPOINTS**

### **Get All Vouchers**
```http
GET /vouchers
```
**Status:** ✅ **WORKING**  
**Response:** Returns 6 demo vouchers with different types
```json
{
  "success": true,
  "message": "Vouchers retrieved successfully",
  "data": {
    "vouchers": [
      {
        "id": 1,
        "voucherId": "VOUCH20250729123456",
        "userId": 1,
        "type": "airtime",
        "amount": 100,
        "description": "MTN Airtime Voucher",
        "status": "active",
        "expiryDate": "2025-12-31 23:59:59.000 +00:00",
        "createdAt": "2025-07-25 10:00:00.000 +00:00",
        "updatedAt": "2025-07-25 10:00:00.000 +00:00",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@mymoolah.com"
      }
    ]
  }
}
```

### **Issue Voucher** 🔒
```http
POST /vouchers/issue
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "airtime",
  "amount": 100,
  "description": "MTN Airtime Voucher"
}
```
**Status:** ✅ **WORKING**  
**Response:** Voucher creation confirmation

### **Redeem Voucher**
```http
POST /vouchers/redeem
Content-Type: application/json

{
  "voucherCode": "VOUCH20250729123456"
}
```
**Status:** ✅ **WORKING**  
**Response:** Voucher redemption confirmation

### **Get Active Vouchers** 🔒
```http
GET /vouchers/active
Authorization: Bearer <token>
```
**Status:** ✅ **WORKING**  
**Response:** User's active vouchers

---

## **PAYMENT INTEGRATION ENDPOINTS**

### **Flash Payment Processing**
```http
POST /flash/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000,
  "recipientNumber": "27821234567",
  "description": "Payment via Flash"
}
```
**Status:** ✅ **WORKING**  
**Response:** Flash payment confirmation

### **MobileMart Services**
```http
POST /mobilemart/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceType": "airtime",
  "provider": "MTN",
  "amount": 50,
  "recipientNumber": "27821234567"
}
```
**Status:** ✅ **WORKING**  
**Response:** MobileMart purchase confirmation

---

## **ERROR HANDLING**

### **Standard Error Response**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "details": "Additional error context"
}
```

### **Common HTTP Status Codes**
- **200:** Success
- **201:** Created
- **400:** Bad Request (validation errors)
- **401:** Unauthorized (authentication required)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found
- **409:** Conflict (duplicate data)
- **500:** Internal Server Error

### **Validation Error Response**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "value": ""
    }
  ]
}
```

---

## **RATE LIMITING**

### **Limits**
- **Authentication Endpoints:** 5 requests per minute
- **Wallet Operations:** 10 requests per minute
- **KYC Operations:** 3 requests per minute
- **General Endpoints:** 20 requests per minute

### **Rate Limit Response**
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## **TESTING**

### **Dummy Data Available**
- **5 Demo Users:** John Doe, Jane Smith, Mike Wilson, Sarah Jones, Demo User
- **5 Demo Wallets:** Balances ranging from R750 to R10,000
- **7 Demo Transactions:** Different types and statuses
- **5 Demo KYC Records:** Different verification statuses
- **6 Demo Vouchers:** Different types (airtime, data, gift cards)

### **Test Credentials**
```json
{
  "phoneNumber": "27821234567",
  "password": "Demo123!"
}
```

### **Testing Commands**
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test users endpoint
curl http://localhost:3001/api/v1/users

# Test wallets endpoint
curl http://localhost:3001/api/v1/wallets

# Test transactions endpoint
curl http://localhost:3001/api/v1/transactions

# Test KYC endpoint
curl http://localhost:3001/api/v1/kyc

# Test vouchers endpoint
curl http://localhost:3001/api/v1/vouchers
```

---

## **SECURITY**

### **Authentication**
- JWT tokens with configurable expiration
- Secure password hashing with bcrypt
- Token refresh mechanism
- Automatic token invalidation on logout

### **Input Validation**
- Express-validator for all inputs
- SQL injection prevention
- XSS protection
- CSRF protection

### **Data Protection**
- Encrypted sensitive data
- Secure transmission (HTTPS in production)
- Audit logging for all operations
- Data retention policies

---

**Last Updated:** July 29, 2025  
**Status:** All Endpoints Tested and Working  
**Next Update:** Frontend Integration Documentation 