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

---

## **🎫 Voucher Management API**

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
GET /api/v1/vouchers/balance
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalBalance": "17773.00",
    "totalOriginalValue": "25000.00",
    "totalRedeemed": "7227.00",
    "voucherCount": 55,
    "redemptionRate": "28.9"
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
  "voucher_code": "MMVOUCHER_1754321424055_abc123",
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
  "data": {
    "balance": "15000.00",
    "currency": "ZAR",
    "last_updated": "2025-08-04T14:15:13.040Z"
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
        "type": "credit",
        "amount": "1000.00",
        "description": "Voucher redemption",
        "createdAt": "2025-08-04T14:15:13.040Z"
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

---

## **👤 User Management API**

### **User Login**
```http
POST /api/v1/auth/login
```

**Request Body**:
```json
{
  "mobile_number": "0821234567",
  "password": "securepassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "mobile_number": "0821234567",
      "full_name": "André User",
      "email": "andre@example.com"
    }
  }
}
```

### **User Registration**
```http
POST /api/v1/auth/register
```

**Request Body**:
```json
{
  "mobile_number": "0821234567",
  "password": "securepassword123",
  "full_name": "André User",
  "email": "andre@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "mobile_number": "0821234567",
      "full_name": "André User",
      "email": "andre@example.com"
    }
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

**Last Updated**: August 4, 2025  
**API Version**: v1.2.1  
**Status**: Production Ready 