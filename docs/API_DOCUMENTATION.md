# MyMoolah Platform - API Documentation

## 🎯 **CURRENT STATUS: TRANSACTION SORTING & DATE RANGE FILTER FIXES COMPLETED**

**Last Updated:** January 30, 2025  
**API Base URL:** `http://localhost:3001/api/v1`

---

## **AUTHENTICATION**

### **JWT Token Authentication**
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### **Token Storage**
- Frontend stores tokens in `localStorage.getItem('token')`
- Tokens are automatically included in API requests
- Token expiration is handled gracefully

---

## **CORE API ENDPOINTS**

### **🔐 Authentication Endpoints**

#### **POST `/api/v1/auth/register`**
**Description:** Register a new user account

**Request Body:**
```json
{
  "phoneNumber": "0825571055",
  "password": "SecurePassword123!",
  "firstName": "Andre",
  "lastName": "Botes",
  "email": "andre@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "phoneNumber": "0825571055",
      "firstName": "Andre",
      "lastName": "Botes",
      "email": "andre@example.com",
      "accountNumber": "ACC001234567",
      "status": "active",
      "createdAt": "2025-07-29T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### **POST `/api/v1/auth/login`**
**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "phoneNumber": "0825571055",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "phoneNumber": "0825571055",
      "firstName": "Andre",
      "lastName": "Botes",
      "email": "andre@example.com",
      "accountNumber": "ACC001234567",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### **👥 User Management Endpoints**

#### **GET `/api/v1/users`**
**Description:** Get all users (demo data)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "phoneNumber": "0825571055",
      "firstName": "Andre",
      "lastName": "Botes",
      "email": "andre@example.com",
      "accountNumber": "ACC001234567",
      "balance": 10000.00,
      "status": "active",
      "kycStatus": "verified",
      "createdAt": "2025-07-29T10:00:00.000Z"
    },
    {
      "id": 2,
      "phoneNumber": "0831234567",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "accountNumber": "ACC001234568",
      "balance": 5000.00,
      "status": "active",
      "kycStatus": "verified",
      "createdAt": "2025-07-29T10:00:00.000Z"
    }
  ]
}
```

#### **GET `/api/v1/users/stats`**
**Description:** Get user statistics and analytics

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 5,
    "activeUsers": 5,
    "verifiedUsers": 4,
    "pendingKYC": 1,
    "totalBalance": 25000.00,
    "averageBalance": 5000.00
  }
}
```

---

### **💰 Wallet Management Endpoints**

#### **GET `/api/v1/wallets`**
**Description:** Get all wallets (demo data)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "accountNumber": "ACC001234567",
      "balance": 10000.00,
      "currency": "ZAR",
      "status": "active",
      "createdAt": "2025-07-29T10:00:00.000Z"
    },
    {
      "id": 2,
      "userId": 2,
      "accountNumber": "ACC001234568",
      "balance": 5000.00,
      "currency": "ZAR",
      "status": "active",
      "createdAt": "2025-07-29T10:00:00.000Z"
    }
  ]
}
```

#### **GET `/api/v1/wallets/balance`**
**Description:** Get current user's wallet balance

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 10000.00,
    "currency": "ZAR",
    "accountNumber": "ACC001234567",
    "status": "active"
  }
}
```

#### **GET `/api/v1/wallets/transactions`**
**Description:** Get user's transaction history with pagination

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "transactionId": "TXN001",
        "type": "transfer",
        "amount": 500.00,
        "currency": "ZAR",
        "senderWalletId": "ACC001234567",
        "receiverWalletId": "ACC001234568",
        "description": "Transfer to Jane Smith",
        "status": "completed",
        "fee": 5.00,
        "createdAt": "2025-07-29T10:00:00.000Z",
        "updatedAt": "2025-07-29T10:00:00.000Z"
      },
      {
        "id": 2,
        "transactionId": "TXN002",
        "type": "deposit",
        "amount": 1000.00,
        "currency": "ZAR",
        "senderWalletId": null,
        "receiverWalletId": "ACC001234567",
        "description": "Bank deposit",
        "status": "completed",
        "fee": 0.00,
        "createdAt": "2025-07-29T09:00:00.000Z",
        "updatedAt": "2025-07-29T09:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 2,
      "itemsPerPage": 50
    }
  }
}
```

---

### **📊 Transaction Management Endpoints**

#### **GET `/api/v1/transactions`**
**Description:** Get all transactions (demo data)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "transactionId": "TXN001",
      "type": "transfer",
      "amount": 500.00,
      "currency": "ZAR",
      "senderWalletId": "ACC001234567",
      "receiverWalletId": "ACC001234568",
      "description": "Transfer to Jane Smith",
      "status": "completed",
      "fee": 5.00,
      "createdAt": "2025-07-29T10:00:00.000Z"
    },
    {
      "id": 2,
      "transactionId": "TXN002",
      "type": "deposit",
      "amount": 1000.00,
      "currency": "ZAR",
      "senderWalletId": null,
      "receiverWalletId": "ACC001234567",
      "description": "Bank deposit",
      "status": "completed",
      "fee": 0.00,
      "createdAt": "2025-07-29T09:00:00.000Z"
    }
  ]
}
```

#### **GET `/api/v1/transactions/history`**
**Description:** Get complete transaction history

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "summary": {
      "totalTransactions": 7,
      "totalAmount": 3500.00,
      "completedTransactions": 6,
      "pendingTransactions": 1
    }
  }
}
```

---

### **🆔 KYC Management Endpoints**

#### **GET `/api/v1/kyc`**
**Description:** Get KYC records (demo data)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "documentType": "id_card",
      "documentNumber": "8001015009087",
      "status": "verified",
      "verifiedAt": "2025-07-29T10:00:00.000Z",
      "verifiedBy": "system",
      "createdAt": "2025-07-29T10:00:00.000Z"
    },
    {
      "id": 2,
      "userId": 2,
      "documentType": "passport",
      "documentNumber": "A12345678",
      "status": "verified",
      "verifiedAt": "2025-07-29T10:00:00.000Z",
      "verifiedBy": "system",
      "createdAt": "2025-07-29T10:00:00.000Z"
    }
  ]
}
```

#### **POST `/api/v1/kyc/submit`**
**Description:** Submit KYC documents

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "documentType": "id_card",
  "documentNumber": "8001015009087",
  "documentFile": "base64_encoded_file"
}
```

**Response:**
```json
{
  "success": true,
  "message": "KYC documents submitted successfully",
  "data": {
    "kycId": 1,
    "status": "pending",
    "submittedAt": "2025-07-29T10:00:00.000Z"
  }
}
```

---

### **🎫 Voucher Management Endpoints**

#### **GET `/api/v1/vouchers`**
**Description:** Get all vouchers (demo data)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "typeId": 1,
      "typeName": "airtime",
      "amount": 50.00,
      "currency": "ZAR",
      "status": "active",
      "redeemedAmount": 0.00,
      "expiryDate": "2025-12-31T23:59:59.000Z",
      "createdAt": "2025-07-29T10:00:00.000Z"
    },
    {
      "id": 2,
      "userId": 1,
      "typeId": 2,
      "typeName": "data",
      "amount": 100.00,
      "currency": "ZAR",
      "status": "active",
      "redeemedAmount": 0.00,
      "expiryDate": "2025-12-31T23:59:59.000Z",
      "createdAt": "2025-07-29T10:00:00.000Z"
    }
  ]
}
```

#### **GET `/api/v1/vouchers/active`**
**Description:** Get active vouchers for current user

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "vouchers": [...],
    "summary": {
      "totalVouchers": 6,
      "totalValue": 450.00,
      "activeVouchers": 5,
      "expiredVouchers": 1
    }
  }
}
```

---

### **🏥 Health & Monitoring Endpoints**

#### **GET `/health`**
**Description:** Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-29T10:00:00.000Z",
  "uptime": 3600,
  "version": "2.0.2"
}
```

#### **GET `/test`**
**Description:** Test endpoint for debugging

**Response:**
```json
{
  "message": "MyMoolah API is running!",
  "timestamp": "2025-07-29T10:00:00.000Z",
  "environment": "development"
}
```

---

## **FRONTEND INTEGRATION PATTERNS**

### **TransactionHistoryPage Integration**

#### **Data Fetching:**
```typescript
const fetchTransactions = async (page = 1) => {
  try {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/v1/wallets/transactions?page=${page}&limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (data.success) {
      const transformedTransactions = data.data.transactions.map((tx: any) => ({
        id: tx.id.toString(),
        transactionId: tx.transactionId,
        type: tx.type,
        amount: parseFloat(tx.amount),
        currency: tx.currency || 'ZAR',
        recipient: tx.receiverWalletId || tx.recipient,
        sender: tx.senderWalletId || tx.sender,
        description: tx.description || 'Transaction',
        status: tx.status,
        timestamp: tx.createdAt,
        reference: tx.transactionId,
        fee: parseFloat(tx.fee || 0),
        method: tx.type === 'transfer' ? 'MyMoolah Internal' : 'Bank Transfer',
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt
      }));
      setTransactions(transformedTransactions);
      setPagination(data.data.pagination);
    }
  } catch (err) {
    setError('Failed to load transaction history');
  } finally {
    setLoading(false);
  }
};
```

#### **Error Handling:**
```typescript
if (error) {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ 
        backgroundColor: '#fef2f2', 
        border: '1px solid #fecaca', 
        borderRadius: '8px', 
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
        <span style={{ color: '#dc2626' }}>{error}</span>
      </div>
      <button onClick={() => fetchTransactions()} style={{...}}>
        Try Again
      </button>
    </div>
  );
}
```

---

## **ERROR RESPONSES**

### **Standard Error Format:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2025-07-29T10:00:00.000Z"
}
```

### **Common Error Codes:**
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `INTERNAL_ERROR`: Server error
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## **RATE LIMITING**

- **Authentication endpoints:** 5 requests per minute
- **Data endpoints:** 100 requests per minute
- **Health endpoints:** No limit

---

## **SECURITY**

### **Authentication:**
- JWT tokens with 24-hour expiration
- Secure token storage in localStorage
- Automatic token refresh mechanism

### **Input Validation:**
- All inputs validated on server-side
- SQL injection prevention
- XSS protection

### **Data Protection:**
- Sensitive data encrypted at rest
- HTTPS required for all communications
- Regular security audits

---

**Last Updated:** July 29, 2025  
**Status:** TransactionHistoryPage fully integrated with real backend data 