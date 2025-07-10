# MyMoolah API Documentation

## Overview
MyMoolah platform provides a comprehensive API for wallet management, user authentication, and financial transactions. All endpoints are RESTful and return JSON responses.

## Base URL
- **Local Development**: `http://localhost:5050`
- **Cloud Development**: `http://localhost:5050` (Codespaces)

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## API Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/register
Register a new user and create a wallet.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 36,
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "walletId": "WAL1752181186955qbqux6",
      "balance": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/v1/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 36,
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "walletId": "WAL1752181186955qbqux6",
      "balance": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Wallet Endpoints

All wallet endpoints require JWT authentication.

#### GET /api/v1/wallets/:id
Get wallet details by ID.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet retrieved successfully",
  "data": {
    "wallet_id": 1,
    "account_number": "WAL1752170631502a47uel",
    "user_id": 7,
    "balance": 165,
    "status": "active",
    "created_at": "2025-07-10 18:03:51",
    "updated_at": "2025-07-10 21:00:27"
  }
}
```

#### GET /api/v1/wallets/:id/balance
Get wallet balance.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet balance retrieved successfully",
  "data": {
    "wallet_id": 1,
    "balance": 165,
    "currency": "ZAR"
  }
}
```

#### POST /api/v1/wallets/:id/credit
Credit wallet with funds.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet credited successfully",
  "data": {
    "wallet_id": 1,
    "new_balance": 265,
    "amount_credited": 100,
    "transaction_id": 16
  }
}
```

#### POST /api/v1/wallets/:id/debit
Debit wallet (spend funds).

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet debited successfully",
  "data": {
    "wallet_id": 1,
    "new_balance": 215,
    "amount_debited": 50,
    "transaction_id": 17
  }
}
```

#### GET /api/v1/wallets/:id/transactions
Get wallet transaction history.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet transactions retrieved successfully",
  "data": {
    "wallet_id": 1,
    "transactions": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "transactions": [
        {
          "id": 17,
          "walletId": "WAL1752170631502a47uel",
          "type": "debit",
          "amount": 50,
          "description": "Wallet debit",
          "status": "completed",
          "createdAt": "2025-07-10 21:05:30"
        }
      ]
    }
  }
}
```

### Data Management Endpoints

#### GET /api/v1/users
List all users (no authentication required).

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "walletId": "WAL1752170631502a47uel",
        "createdAt": "2025-07-10 17:42:18"
      }
    ]
  }
}
```

#### GET /api/v1/transactions
List all transactions (no authentication required).

**Response:**
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": 17,
        "walletId": "WAL1752170631502a47uel",
        "type": "debit",
        "amount": 50,
        "description": "Wallet debit",
        "status": "completed",
        "createdAt": "2025-07-10 21:05:30"
      }
    ]
  }
}
```

#### GET /api/v1/kyc
List all KYC records (no authentication required).

**Response:**
```json
{
  "success": true,
  "message": "KYC records retrieved successfully",
  "data": {
    "kyc": [
      {
        "id": 1,
        "userId": 1,
        "documentType": "ID Card",
        "documentNumber": "ID123456789",
        "status": "approved",
        "submittedAt": "2025-07-10 20:59:32",
        "reviewerNotes": "Document verified successfully",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    ]
  }
}
```

### Other Endpoints

#### GET /api/v1/vouchers
List all vouchers (returns empty array).

**Response:**
```json
{
  "vouchers": []
}
```

#### GET /api/v1/notifications
Get notifications (requires user_id parameter).

**Query Parameters:**
- `user_id` (required): User ID to get notifications for

**Response:**
```json
{
  "error": "user_id required"
}
```

## Error Responses

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
  "message": "Invalid amount"
}
```

### Database Error
```json
{
  "success": false,
  "error": "Database error",
  "details": "Error message"
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Wallet not found"
}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **General API endpoints**: 100 requests per minute

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

**Last Updated**: July 10, 2025  
**API Version**: 1.0  
**Status**: ✅ All endpoints tested and working 