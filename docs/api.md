# MyMoolah API Documentation

## Overview
The MyMoolah API provides authentication and wallet management functionality for the South African fintech platform.

## Base URL
- **Local Development**: `http://localhost:3000`
- **Cloud Development**: `https://your-codespace-url:3000`

## Authentication
All API requests (except registration and login) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication Endpoints

#### Register User
**POST** `/api/v1/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "createdAt": "2025-01-XX"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

#### Login User
**POST** `/api/v1/auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Protected Routes (Future Implementation)

#### Get User Profile
**GET** `/api/v1/user/profile`

Returns the current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "createdAt": "2025-01-XX"
  }
}
```

#### Update User Profile
**PUT** `/api/v1/user/profile`

Updates the current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.doe@example.com",
    "updatedAt": "2025-01-XX"
  }
}
```

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details (optional)"
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

## Data Models

### User Model
```json
{
  "id": "integer (auto-increment)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, unique)",
  "password": "string (hashed, required)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Security

### Password Requirements
- Minimum 6 characters
- Stored as bcrypt hash (salt rounds: 10)

### JWT Token
- Algorithm: HS256
- Expiration: 24 hours
- Secret: Environment variable `JWT_SECRET`

### Input Validation
- Email format validation
- Required field validation
- Password strength validation

## Rate Limiting
Currently not implemented. Future implementation planned.

## Testing

### Test Scripts
- `test-server.js`: Server connectivity test
- `test-auth.js`: Authentication endpoint tests
- `test-database.js`: Database connectivity test

### Example cURL Commands

#### Register User
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "securepassword123"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "securepassword123"
  }'
```

#### Protected Route (with token)
```bash
curl -X GET http://localhost:3001/api/v1/user/profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Future Endpoints

### Wallet Management
- `POST /api/v1/wallets` - Create wallet
- `GET /api/v1/wallets` - List user wallets
- `GET /api/v1/wallets/:id` - Get wallet details
- `PUT /api/v1/wallets/:id` - Update wallet

### Transactions
- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/transactions` - List transactions
- `GET /api/v1/transactions/:id` - Get transaction details

### Balances
- `GET /api/v1/balances` - Get account balances
- `GET /api/v1/balances/:walletId` - Get wallet balance

## Versioning
Current API version: v1

API versioning is handled through URL path: `/api/v1/` 