# MyMoolah API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:5050`  
**API Base**: `http://localhost:5050/api/v1`  
**Last Updated**: July 12, 2025

## 📋 API Overview

The MyMoolah API provides comprehensive digital wallet functionality with secure authentication, transaction processing, and complete user management. All endpoints are RESTful and return JSON responses.

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Response Format
All API responses follow this standard format:
```json
{
  "success": true/false,
  "message": "Response message",
  "data": { /* response data */ },
  "error": "Error details (if applicable)"
}
```

## 🔐 Authentication Endpoints

### Register User
**POST** `/api/v1/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": 12345,
    "email": "john.doe@example.com",
    "message": "Registration successful. Please complete KYC."
  }
}
```

### Login User
**POST** `/api/v1/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 12345,
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

### Logout User
**POST** `/api/v1/auth/logout`

Logout user and invalidate token.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Get User Profile
**GET** `/api/v1/auth/profile`

Get current user profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 12345,
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "createdAt": "2025-07-12T10:00:00.000Z"
  }
}
```

## 💰 Wallet Management Endpoints

### Get Wallet Details
**GET** `/api/v1/wallets/:id`

Get wallet information and balance.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "WAL123456",
    "userId": 12345,
    "balance": 1000.50,
    "currency": "USD",
    "status": "active",
    "createdAt": "2025-07-12T10:00:00.000Z",
    "updatedAt": "2025-07-12T15:30:00.000Z"
  }
}
```

### Create Wallet
**POST** `/api/v1/wallets`

Create a new wallet for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currency": "USD",
  "initialBalance": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet created successfully",
  "data": {
    "id": "WAL123456",
    "userId": 12345,
    "balance": 0,
    "currency": "USD",
    "status": "active",
    "createdAt": "2025-07-12T10:00:00.000Z"
  }
}
```

### Credit Wallet
**PUT** `/api/v1/wallets/:id/credit`

Add funds to wallet.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "amount": 500.00,
  "description": "Deposit from bank account"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet credited successfully",
  "data": {
    "walletId": "WAL123456",
    "previousBalance": 1000.50,
    "newBalance": 1500.50,
    "amount": 500.00,
    "transactionId": "TXN789012"
  }
}
```

### Debit Wallet
**PUT** `/api/v1/wallets/:id/debit`

Deduct funds from wallet.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "amount": 100.00,
  "description": "Payment to merchant"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet debited successfully",
  "data": {
    "walletId": "WAL123456",
    "previousBalance": 1500.50,
    "newBalance": 1400.50,
    "amount": 100.00,
    "transactionId": "TXN789013"
  }
}
```

### Get Wallet Balance
**GET** `/api/v1/wallets/:id/balance`

Get current wallet balance.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "walletId": "WAL123456",
    "balance": 1400.50,
    "currency": "USD",
    "lastUpdated": "2025-07-12T15:30:00.000Z"
  }
}
```

## 💳 Transaction Endpoints

### Get All Transactions
**GET** `/api/v1/transactions`

Get transaction history for authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `type` (optional): Transaction type (credit/debit)
- `status` (optional): Transaction status

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "TXN789012",
        "walletId": "WAL123456",
        "type": "credit",
        "amount": 500.00,
        "description": "Deposit from bank account",
        "status": "completed",
        "createdAt": "2025-07-12T15:30:00.000Z"
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

### Create Transaction
**POST** `/api/v1/transactions`

Create a new transaction.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "walletId": "WAL123456",
  "type": "debit",
  "amount": 100.00,
  "description": "Payment to merchant",
  "recipientId": "MER456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": "TXN789013",
    "walletId": "WAL123456",
    "type": "debit",
    "amount": 100.00,
    "description": "Payment to merchant",
    "status": "pending",
    "createdAt": "2025-07-12T16:00:00.000Z"
  }
}
```

### Get Transaction Details
**GET** `/api/v1/transactions/:id`

Get specific transaction details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "TXN789013",
    "walletId": "WAL123456",
    "type": "debit",
    "amount": 100.00,
    "description": "Payment to merchant",
    "status": "completed",
    "recipientId": "MER456789",
    "createdAt": "2025-07-12T16:00:00.000Z",
    "updatedAt": "2025-07-12T16:01:00.000Z"
  }
}
```

### Update Transaction Status
**PUT** `/api/v1/transactions/:id/status`

Update transaction status.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction status updated successfully",
  "data": {
    "id": "TXN789013",
    "status": "completed",
    "updatedAt": "2025-07-12T16:01:00.000Z"
  }
}
```

## 👤 User Management Endpoints

### Get All Users
**GET** `/api/v1/users`

Get list of all users (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 12345,
        "email": "john.doe@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "status": "active",
        "createdAt": "2025-07-12T10:00:00.000Z"
      }
    ]
  }
}
```

### User Registration
**POST** `/api/v1/users/register`

Register a new user (alternative to auth/register).

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": 12346,
  "message": "Registration successful. Please complete KYC."
}
```

## 🆔 KYC (Know Your Customer) Endpoints

### Get All KYC Records
**GET** `/api/v1/kyc`

Get all KYC records (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kycRecords": [
      {
        "id": 1,
        "userId": 12345,
        "status": "pending",
        "documentType": "passport",
        "submittedAt": "2025-07-12T11:00:00.000Z"
      }
    ]
  }
}
```

### Submit KYC Document
**POST** `/api/v1/kyc/submit`

Submit KYC document for verification.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "documentType": "passport",
  "documentNumber": "A12345678",
  "documentImage": "base64-encoded-image-data"
}
```

**Response:**
```json
{
  "success": true,
  "message": "KYC document submitted successfully",
  "data": {
    "kycId": 1,
    "status": "pending",
    "submittedAt": "2025-07-12T11:00:00.000Z"
  }
}
```

### Get KYC Status
**GET** `/api/v1/kyc/status/:userId`

Get KYC status for specific user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 12345,
    "status": "pending",
    "documentType": "passport",
    "submittedAt": "2025-07-12T11:00:00.000Z",
    "reviewedAt": null
  }
}
```

### Update KYC Status
**POST** `/api/v1/kyc/review`

Update KYC status (admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "kycId": 1,
  "status": "approved",
  "notes": "Document verified successfully"
}
```

**Response:**
```json
{
  "success": true,
  "message": "KYC status updated successfully",
  "data": {
    "kycId": 1,
    "status": "approved",
    "reviewedAt": "2025-07-12T12:00:00.000Z"
  }
}
```

## 🆘 Support Endpoints

### Get Support Tickets
**GET** `/api/v1/support/tickets`

Get all support tickets.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": 1,
        "userId": 12345,
        "subject": "Wallet issue",
        "status": "open",
        "priority": "medium",
        "createdAt": "2025-07-12T13:00:00.000Z"
      }
    ]
  }
}
```

### Create Support Ticket
**POST** `/api/v1/support/tickets`

Create a new support ticket.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "subject": "Wallet issue",
  "description": "I cannot access my wallet",
  "priority": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "id": 1,
    "subject": "Wallet issue",
    "status": "open",
    "priority": "medium",
    "createdAt": "2025-07-12T13:00:00.000Z"
  }
}
```

## 🔔 Notification Endpoints

### Get Notifications
**GET** `/api/v1/notifications`

Get user notifications.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "userId": 12345,
        "type": "transaction",
        "title": "Payment received",
        "message": "You received $100.00",
        "read": false,
        "createdAt": "2025-07-12T14:00:00.000Z"
      }
    ]
  }
}
```

## 🎫 Voucher Endpoints

### Get Vouchers
**GET** `/api/v1/vouchers`

Get available vouchers.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vouchers": [
      {
        "id": 1,
        "code": "WELCOME2025",
        "type": "discount",
        "value": 10.00,
        "validUntil": "2025-12-31T23:59:59.000Z",
        "status": "active"
      }
    ]
  }
}
```

### Get Voucher Types
**GET** `/api/v1/voucher-types`

Get voucher types configuration.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "voucherTypes": [
      {
        "id": 1,
        "name": "Discount",
        "description": "Percentage or fixed amount discount",
        "isActive": true
      }
    ]
  }
}
```

## 🏪 Merchant Endpoints

### Get Merchants
**GET** `/api/v1/merchants`

Get registered merchants.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "MER456789",
        "name": "Sample Store",
        "category": "retail",
        "status": "active"
      }
    ]
  }
}
```

## 🔧 Service Provider Endpoints

### Get Service Providers
**GET** `/api/v1/service-providers`

Get service providers.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "serviceProviders": [
      {
        "id": 1,
        "name": "Payment Gateway",
        "type": "payment",
        "status": "active"
      }
    ]
  }
}
```

## 🔌 VAS (Value Added Services) Endpoints

### Get VAS Services
**GET** `/api/v1/vas`

Get value added services.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": 1,
        "name": "Bill Payment",
        "description": "Pay utility bills",
        "status": "active"
      }
    ]
  }
}
```

## 🏥 Health Check Endpoints

### Health Check
**GET** `/health`

Check server health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-12T18:50:55.677Z",
  "service": "MyMoolah Wallet API",
  "version": "1.0.0"
}
```

### Test Endpoint
**GET** `/test`

Test API functionality.

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
    "support": "/api/v1/support",
    "notifications": "/api/v1/notifications",
    "vouchers": "/api/v1/vouchers",
    "voucherTypes": "/api/v1/voucher-types",
    "vas": "/api/v1/vas",
    "merchants": "/api/v1/merchants",
    "serviceProviders": "/api/v1/service-providers",
    "health": "/health",
    "test": "/test"
  }
}
```

## 🚫 Temporarily Disabled Endpoints

The following endpoints have been temporarily disabled due to integration issues:

### EasyPay Integration
- `POST /billpayment/v1/bills/:easyPayNumber` - Get bill details
- `POST /billpayment/v1/payments` - Process bill payment
- `GET /billpayment/v1/bills` - List bills

### Mercury Integration
- All Mercury endpoints are temporarily disabled

### EasyPay Vouchers
- All EasyPay voucher endpoints are temporarily disabled

## ⚠️ Error Responses

### Authentication Error
```json
{
  "success": false,
  "message": "Access token required"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Endpoint not found",
  "availableEndpoints": {
    "auth": "/api/v1/auth",
    "wallets": "/api/v1/wallets",
    "transactions": "/api/v1/transactions"
  }
}
```

### Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Database connection failed"
}
```

## 📊 Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute
- **Wallet operations**: 10 requests per minute
- **Transaction endpoints**: 20 requests per minute
- **Other endpoints**: 30 requests per minute

## 🔒 Security

### Authentication
- JWT-based authentication
- Token expiration: 24 hours
- Secure token storage

### Data Protection
- All sensitive data is encrypted
- HTTPS required for production
- Input validation and sanitization

### CORS Configuration
- Configured for cross-origin requests
- Specific origins allowed
- Secure headers implemented

## 📝 Testing

### Test the API
```bash
# Health check
curl http://localhost:5050/health

# Test endpoint
curl http://localhost:5050/test

# Register user
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📚 Additional Resources

- [Setup Guide](./SETUP_GUIDE.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Security Guide](./SECURITY.md)

---

**MyMoolah API v1.0.0** - Comprehensive digital wallet API with secure authentication and transaction processing. 