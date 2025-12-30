**Last Updated**: December 30, 2025 (11:15 SAST)  
**Version**: 2.4.39 - SMS Integration Fixed & Referral Tested
**Status**: ✅ **SMS INTEGRATION WORKING** ✅ **REFERRAL SMS SENDING** ✅ **OTP SYSTEM LIVE** ✅ **MOBILEMART INTEGRATION UPDATED**

---

## Recent Updates

### 2025-12-30 (11:15) - SMS Integration Fix & Referral Testing
- **SMS Endpoint Fixed**: Corrected from `/bulksms` to `/bulkmessages`
- **Referral SMS Tested**: Successfully sent to HD and Leonie via MyMobileAPI
- **Multi-User Validation**: Andre, Leonie, HD login and referral flows tested
- **Environment**: UAT using `REFERRAL_SKIP_VALIDATION=true` for testing

### 2025-12-30 - OTP-Based Password Reset & Phone Change
- **Password Reset Flow**: OTP-based secure password reset without authentication
- **Phone Number Change**: OTP verification to change mobile number (authenticated)
- **OTP Infrastructure**: Secure 6-digit OTPs with bcrypt hashing, 10-min expiry
- **Rate Limiting**: Max 3 OTPs per phone per hour
- **Multi-Language SMS**: 11 South African language templates

### 2025-12-29 - Multi-Level Referral System
- **Referral API Endpoints**: 6 new endpoints for referral program management
- **SMS Integration**: MyMobileAPI integration for 11-language referral invitations
- **Transaction Hooks**: Automatic referral earnings calculation on all transactions
- **Daily Payouts**: Batch processing engine for referral earnings

### 2025-11-05 - MobileMart Fulcrum Integration
- **MobileMart Fulcrum Integration**: Updated with correct API endpoints and structure
- **OAuth Endpoint**: Discovered correct endpoint `/connect/token`
- **API Structure**: Updated to match MobileMart Fulcrum documentation
- **Base URL**: Corrected to `fulcrumswitch.com`
- **Wallet Balance Reconciliation**: Fixed balance calculation to exclude internal accounting transactions

---

## 🚀 **API OVERVIEW**

The MyMoolah Treasury Platform provides a comprehensive REST API built on **banking-grade standards** and **Mojaloop compliance**. The API is designed to handle **millions of transactions** with enterprise-grade security, performance, and reliability.

### **API Standards**
- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Format**: All requests and responses in JSON format
- **Authentication**: JWT-based secure authentication
- **Rate Limiting**: API abuse prevention with configurable limits
- **Versioning**: API versioning for backward compatibility
- **Documentation**: OpenAPI 3.0 specification available

### Codespaces Base URL (dev)
In Codespaces, the frontend runs on the 3000 forwarded URL and the backend on a forwarded host (3001 or 5050). Set:

```
VITE_API_BASE_URL=https://<your-backend-forwarded-host>
```

Ensure `CORS_ORIGINS` (backend) includes `https://<your-3000-forwarded-host>`.

---

## 🔐 **AUTHENTICATION & SECURITY**

### **Authentication Methods**

#### **JWT Token Authentication**
```http
Authorization: Bearer <jwt_token>
```

#### **API Key Authentication (for supplier integrations)**
```http
X-API-Key: <encrypted_api_key>
```

### **Security Features**
- **TLS 1.3**: End-to-end encryption for all API calls
- **Rate Limiting**: Configurable rate limits per endpoint
- **Input Validation**: Comprehensive data validation and sanitization
- **SQL Injection Protection**: Parameterized queries and input sanitization
- **XSS Protection**: Cross-site scripting prevention
- **CORS Configuration**: Configurable cross-origin resource sharing

---

## 📊 **PRODUCT CATALOG API**

### **Core Product Endpoints**

#### **1. Get All Products**
```http
GET /api/v1/products
```

**Description**: Retrieves all active products with their variants from all suppliers.

**Query Parameters**:
- `category` (optional): Filter by product category
- `type` (optional): Filter by product type
- `supplier` (optional): Filter by supplier
- `page` (optional): Page number for pagination
- `limit` (optional): Number of products per page
- `search` (optional): Search products by name or description

**Response Example**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "MTN Airtime",
        "description": "MTN mobile airtime recharge",
        "category": "airtime",
        "type": "prepaid",
        "is_active": true,
        "variants": [
          {
            "id": 1,
            "name": "MTN Airtime R10",
            "price": 1000,
            "commission_rate": 2.5,
            "supplier": {
              "id": 1,
              "name": "Flash",
              "commission_structure": "dynamic"
            }
          },
          {
            "id": 2,
            "name": "MTN Airtime R10",
            "price": 1000,
            "commission_rate": 2.0,
            "supplier": {
              "id": 2,
              "name": "MobileMart",
              "commission_structure": "fixed"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 172,
      "pages": 9
    }
  }
}
```

#### **2. Get Product by ID**
```http
GET /api/v1/products/:id
```

**Description**: Retrieves a specific product with all its variants and supplier information.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "MTN Airtime",
      "description": "MTN mobile airtime recharge",
      "category": "airtime",
      "type": "prepaid",
      "is_active": true,
      "variants": [...],
      "metadata": {
        "network": "MTN",
        "country": "ZA",
        "currency": "ZAR"
      }
    }
  }
}
```

#### **3. Search Products**
```http
GET /api/v1/products/search?q=<search_query>
```

**Description**: Full-text search across product names, descriptions, and metadata.

**Query Parameters**:
- `q` (required): Search query string
- `category` (optional): Filter by category
- `supplier` (optional): Filter by supplier
- `min_price` (optional): Minimum price filter
- `max_price` (optional): Maximum price filter

#### **4. Get Products by Category**
```http
GET /api/v1/products/category/:category
```

**Description**: Retrieves all products in a specific category.

**Available Categories**:
- `airtime`: Mobile airtime products
- `data`: Mobile data packages
- `electricity`: Electricity vouchers
- `vouchers`: Digital vouchers and gift cards
- `bill_payment`: Bill payment services
- `cash_out`: Cash withdrawal services
- `international`: International services

#### **5. Get Product Variants**
```http
GET /api/v1/products/:id/variants
```

**Description**: Retrieves all variants for a specific product with supplier comparison.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "variants": [
      {
        "id": 1,
        "name": "MTN Airtime R10",
        "price": 1000,
        "commission_rate": 2.5,
        "commission_amount": 25,
        "supplier": {
          "id": 1,
          "name": "Flash",
          "rating": 4.8,
          "success_rate": 99.5
        },
        "metadata": {
          "flash_product_id": "MTN_AIR_10",
          "availability": true,
          "processing_time": "instant"
        }
      }
    ],
    "comparison": {
      "best_commission": 2.5,
      "best_supplier": "Flash",
      "price_range": {
        "min": 1000,
        "max": 1000
      }
    }
  }
}
```

### **Product Purchase Endpoints**

#### **1. Purchase Product**
```http
POST /api/v1/products/purchase
```

**Description**: Purchases a product variant from the selected supplier.

**Request Body**:
```json
{
  "variant_id": 1,
  "user_id": 123,
  "quantity": 1,
  "payment_method": "wallet",
  "recipient_phone": "+27123456789",
  "metadata": {
    "purchase_reason": "personal_use",
    "location": "Johannesburg"
  }
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ORD_20250830_001",
      "status": "processing",
      "product": {
        "name": "MTN Airtime R10",
        "price": 1000,
        "commission": 25
      },
      "supplier": "Flash",
      "estimated_completion": "2025-08-30T10:00:00Z",
      "tracking_id": "FLASH_12345"
    }
  }
}
```

#### **2. Get Order Status**
```http
GET /api/v1/orders/:order_id
```

**Description**: Retrieves the current status of a product purchase order.

#### **3. Cancel Order**
```http
POST /api/v1/orders/:order_id/cancel
```

**Description**: Cancels a pending order if possible.

---

## 🌍 **INTERNATIONAL SERVICES API**

### **International Airtime & Data Services**

#### **1. Get International Services**
```http
GET /api/v1/services/international
```

**Description**: Retrieves available international airtime and data services.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "international_airtime": [
      {
        "id": 1,
        "name": "International Airtime",
        "description": "Top-up international numbers",
        "countries": ["US", "UK", "DE", "FR", "AU"],
        "networks": ["AT&T", "Vodafone", "T-Mobile", "Orange", "Telstra"],
        "status": "coming_soon",
        "estimated_launch": "2025-Q4"
      }
    ],
    "international_data": [
      {
        "id": 2,
        "name": "International Data",
        "description": "Global data roaming packages",
        "countries": ["US", "UK", "DE", "FR", "AU"],
        "packages": [
          {
            "name": "1GB Global Data",
            "price": 5000,
            "validity": "30 days",
            "coverage": "160+ countries"
          }
        ],
        "status": "coming_soon",
        "estimated_launch": "2025-Q4"
      }
    ]
  }
}
```

#### **2. Get International Coverage**
```http
GET /api/v1/services/international/coverage
```

**Description**: Retrieves international service coverage by country and network.

#### **3. Get International Pricing**
```http
GET /api/v1/services/international/pricing
```

**Description**: Retrieves international service pricing and commission structures.

---

## 🔄 **CATALOG SYNCHRONIZATION API**

### **Supplier Catalog Management**

#### **1. Sync Flash Products**
```http
POST /api/v1/admin/catalog/sync/flash
```

**Description**: Synchronizes product catalog with Flash supplier (admin only).

**Response Example**:
```json
{
  "success": true,
  "data": {
    "sync_status": "completed",
    "products_updated": 167,
    "new_products": 0,
    "price_updates": 12,
    "commission_updates": 5,
    "sync_timestamp": "2025-08-30T09:00:00Z"
  }
}
```

#### **2. Sync MobileMart Products**
```http
POST /api/v1/admin/catalog/sync/mobilemart
```

**Description**: Synchronizes product catalog with MobileMart supplier (admin only).

#### **3. Sync All Suppliers**
```http
POST /api/v1/admin/catalog/sync/all
```

**Description**: Synchronizes product catalog with all active suppliers (admin only).

#### **4. Get Sync Status**
```http
GET /api/v1/admin/catalog/sync/status
```

**Description**: Retrieves the status of recent catalog synchronization operations (admin only).

---

## 🔌 **MOBILEMART FULCRUM API**

### **MobileMart Fulcrum Integration**

MyMoolah integrates with **MobileMart Fulcrum API** for VAS (Value Added Services) including airtime, data, vouchers, bill payments, and prepaid utilities.

#### **Configuration**
- **Base URL**: `https://uat.fulcrumswitch.com` (UAT) or `https://fulcrumswitch.com` (PROD)
- **OAuth Endpoint**: `/connect/token`
- **API Version**: v1
- **Authentication**: OAuth 2.0 Client Credentials

#### **1. Health Check**
```http
GET /api/v1/mobilemart/health
```

**Description**: Checks MobileMart integration health status.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "token_valid": true,
    "api_url": "https://uat.fulcrumswitch.com/api/v1",
    "timestamp": "2025-11-05T12:00:00Z"
  }
}
```

#### **2. Get Products by VAS Type**
```http
GET /api/v1/mobilemart/products/:vasType
```

**Description**: Retrieves available products for a specific VAS type from MobileMart.

**VAS Types**:
- `airtime` - Mobile airtime (pinned and pinless)
- `data` - Mobile data packages (pinned and pinless)
- `voucher` - Pinned vouchers
- `billpayment` - Bill payment services
- `prepaidutility` - Prepaid electricity (electricity)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "vasType": "airtime",
    "products": [
      {
        "merchantProductId": "MTN_AIR_10",
        "name": "MTN Airtime R10",
        "amount": 10.00,
        "currency": "ZAR",
        "network": "MTN",
        "type": "pinless"
      }
    ]
  }
}
```

#### **3. Purchase Product**
```http
POST /api/v1/mobilemart/purchase/:vasType
```

**Description**: Purchases a product from MobileMart.

**Request Body**:
```json
{
  "merchantProductId": "MTN_AIR_10",
  "mobileNumber": "+27123456789",
  "amount": 10.00,
  "requestId": "unique-request-id"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "transactionId": "MM_123456789",
      "requestId": "unique-request-id",
      "status": "completed",
      "amount": 10.00,
      "timestamp": "2025-11-05T12:00:00Z"
    }
  }
}
```

#### **Error Codes**
MobileMart Fulcrum API returns standard error codes:
- `1000` - ProductDoesNotExist
- `1001` - AmountInvalid
- `1002` - CannotSourceProduct
- `1006` - UserNotAuthenticated
- `1008` - MerchantCreditLimitReached

---

## 💰 **SUPPLIER PRICING API**

### **Commission & Pricing Management**

#### **1. Get Supplier Pricing**
```http
GET /api/v1/admin/suppliers/:supplier_id/pricing
```

**Description**: Retrieves pricing and commission structure for a specific supplier (admin only).

#### **2. Update Commission Rates**
```http
PUT /api/v1/admin/suppliers/:supplier_id/commission
```

**Description**: Updates commission rates for a specific supplier (admin only).

#### **3. Get Commission Comparison**
```http
GET /api/v1/admin/suppliers/commission/comparison
```

**Description**: Compares commission rates across all suppliers (admin only).

---

## 📱 **WALLET & TRANSACTION API**

### **Wallet Management**

#### **1. Get Wallet Balance**
```http
GET /api/v1/wallet/balance
```

**Description**: Retrieves current wallet balance and transaction history.

#### **2. Get Transaction History**
```http
GET /api/v1/wallet/transactions
```

**Description**: Retrieves wallet transaction history with filtering options.

### **Transaction Management**

#### **1. Get Transaction by ID**
```http
GET /api/v1/transactions/:transaction_id
```

**Description**: Retrieves detailed information about a specific transaction.

#### **2. Get Transactions by Type**
```http
GET /api/v1/transactions/type/:type
```

**Description**: Retrieves transactions filtered by type (airtime, data, electricity, etc.).

---

## 📷 **QR CODE PAYMENT API**

### **QR Code Scanning & Payment**

#### **1. Validate QR Code**
```http
POST /api/v1/qr/validate
```

**Description**: Validates a scanned QR code and retrieves merchant and payment information.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "qrCode": "ZAPPER_woolworths_R125.50"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "woolworths_001",
      "name": "Woolworths",
      "category": "retail"
    },
    "paymentDetails": {
      "amount": 125.50,
      "currency": "ZAR",
      "reference": "REF123456"
    },
    "valid": true
  }
}
```

#### **2. Initiate QR Payment**
```http
POST /api/v1/qr/payment
```

**Description**: Initiates a payment from a validated QR code.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "qrCode": "ZAPPER_woolworths_R125.50",
  "amount": 125.50,
  "walletId": "user_wallet_123",
  "reference": "REF123456"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "paymentId": "PAY_20250109_001",
    "status": "completed",
    "merchant": {
      "name": "Woolworths",
      "id": "woolworths_001"
    },
    "amount": 125.50,
    "transactionId": "TXN_20250109_001",
    "timestamp": "2025-01-09T12:00:00Z"
  }
}
```

#### **3. Get Featured Merchants**
```http
GET /api/v1/qr/merchants/featured
```

**Description**: Retrieves featured merchants that accept QR code payments.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "woolworths_001",
        "name": "Woolworths",
        "category": "retail",
        "logo": "https://example.com/woolworths-logo.png",
        "description": "Premium retail store"
      }
    ]
  }
}
```

### **QR Code Scanning Features**
- **Cross-Browser Camera Support**: iOS Safari, Android Chrome, Desktop Chrome
- **Continuous Real-Time Scanning**: Automatic QR code detection every 100ms
- **Opera Mini Fallback**: Graceful fallback with upload option guidance
- **Enhanced Upload Detection**: 6 detection strategies for QR codes with logo overlays
- **Mobile-Optimized**: Proper touch handling and responsive UI

---

## 🔐 **USER MANAGEMENT API**

### **Authentication**

#### **1. User Login**
```http
POST /api/v1/auth/login
```

**Description**: Authenticates user and returns JWT token.

#### **2. User Registration**
```http
POST /api/v1/auth/register
```

**Description**: Registers a new user account.

#### **3. Refresh Token**
```http
POST /api/v1/auth/refresh
```

**Description**: Refreshes expired JWT token.

#### **4. Forgot Password (Request OTP)**
```http
POST /api/v1/auth/forgot-password
```

**Description**: Requests OTP for password reset. OTP sent via SMS to registered phone.

**Request Body**:
```json
{
  "phoneNumber": "0821234567"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If an account exists with this phone number, an OTP will be sent.",
  "expiresInMinutes": 10
}
```

#### **5. Reset Password (Verify OTP)**
```http
POST /api/v1/auth/reset-password
```

**Description**: Resets password after OTP verification.

**Request Body**:
```json
{
  "phoneNumber": "0821234567",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

#### **6. Request Phone Change (Authenticated)**
```http
POST /api/v1/auth/request-phone-change
```

**Description**: Requests OTP to change phone number. OTP sent to new phone.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "newPhoneNumber": "0829876543"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent to new phone number. Please verify to complete the change.",
  "expiresInMinutes": 10
}
```

#### **7. Verify Phone Change (Authenticated)**
```http
POST /api/v1/auth/verify-phone-change
```

**Description**: Completes phone number change after OTP verification.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "newPhoneNumber": "0829876543",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Phone number changed successfully.",
  "newPhoneNumber": "+27829876543"
}
```

### **User Profile**

#### **1. Get User Profile**
```http
GET /api/v1/users/profile
```

**Description**: Retrieves current user profile information.

#### **2. Update User Profile**
```http
PUT /api/v1/users/profile
```

**Description**: Updates user profile information.

---

## 📊 **ANALYTICS & REPORTING API**

### **Business Intelligence**

#### **1. Get Sales Analytics**
```http
GET /api/v1/admin/analytics/sales
```

**Description**: Retrieves sales analytics and performance metrics (admin only).

#### **2. Get Commission Analytics**
```http
GET /api/v1/admin/analytics/commission
```

**Description**: Retrieves commission analytics and revenue metrics (admin only).

#### **3. Get Supplier Performance**
```http
GET /api/v1/admin/analytics/suppliers
```

**Description**: Retrieves supplier performance metrics (admin only).

---

## 🚨 **ERROR HANDLING**

### **Standard Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "phone_number",
        "message": "Phone number must be valid South African format"
      }
    ]
  }
}
```

### **Common Error Codes**
- `AUTHENTICATION_ERROR`: Invalid or expired authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND`: Requested resource not found
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `SUPPLIER_ERROR`: External supplier API error
- `INTERNAL_ERROR`: Internal server error

---

## 📈 **PERFORMANCE & LIMITS**

### **API Limits**
- **Rate Limiting**: 1000 requests per hour per user
- **Response Time**: < 200ms average response time
- **Payload Size**: Maximum 10MB per request
- **Pagination**: Maximum 100 items per page

### **Performance Metrics**
- **Uptime**: 99.9% target availability
- **Error Rate**: < 0.1% target error rate
- **Throughput**: Designed for millions of transactions
- **Scalability**: Horizontal scaling ready

---

## 💰 **REFERRAL SYSTEM API**

### **Referral Program Endpoints**

The referral system provides a complete API for managing multi-level referral programs with 4-level commission structure and monthly earning caps.

#### **1. Get My Referral Code**
```http
GET /api/v1/referrals/my-code
```

**Description**: Retrieves the authenticated user's unique referral code.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "referralCode": "ABC123"
}
```

#### **2. Send Referral Invite**
```http
POST /api/v1/referrals/send-invite
```

**Description**: Sends a referral invitation via SMS in the specified language.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "phoneNumber": "+27123456789",
  "language": "en"
}
```

**Supported Languages**: `en`, `af`, `zu`, `xh`, `st`, `tn`, `nso`, `ve`, `ts`, `ss`, `nr`

**Response Example**:
```json
{
  "success": true,
  "message": "Referral invitation sent successfully"
}
```

#### **3. Get Referral Stats**
```http
GET /api/v1/referrals/stats
```

**Description**: Retrieves the authenticated user's referral statistics.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "stats": {
    "totalEarnedCents": 50000,
    "totalPaidCents": 30000,
    "pendingCents": 20000,
    "monthEarnedCents": 15000,
    "monthPaidCents": 10000,
    "directReferrals": 5,
    "totalNetwork": 25
  }
}
```

#### **4. Get My Earnings**
```http
GET /api/v1/referrals/earnings
```

**Description**: Retrieves the authenticated user's referral earnings for the current month.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "earnings": [
    {
      "id": 1,
      "transactionId": 123,
      "earnerUserId": 5,
      "level": 1,
      "earnedAmountCents": 400,
      "status": "pending",
      "createdAt": "2025-12-29T10:00:00Z"
    }
  ]
}
```

#### **5. Get My Network**
```http
GET /api/v1/referrals/network
```

**Description**: Retrieves the authenticated user's direct referral network.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "network": [
    {
      "userId": 10,
      "referralCode": "XYZ789",
      "activatedAt": "2025-12-28T15:30:00Z",
      "totalTransactions": 5,
      "totalEarnedCents": 2000
    }
  ]
}
```

#### **6. Get Pending Earnings**
```http
GET /api/v1/referrals/pending
```

**Description**: Retrieves pending referral earnings that will be paid in the next payout batch.

**Authentication**: Required (JWT token)

**Response Example**:
```json
{
  "success": true,
  "pendingEarnings": {
    "totalCents": 20000,
    "count": 15,
    "nextPayoutDate": "2025-12-30T02:00:00Z"
  }
}
```

### **Referral System Features**
- **4-Level Commission**: 4% (1st), 3% (2nd), 2% (3rd), 1% (4th)
- **Monthly Caps**: R10K (1st), R5K (2nd), R2.5K (3rd), R1K (4th)
- **Activation**: After first transaction
- **Payouts**: Daily batch processing at 2:00 AM SAST
- **SMS Integration**: 11-language support via MyMobileAPI
- **Fraud Prevention**: KYC verification, velocity limits, phone verification

---

## 🔧 **DEVELOPMENT & TESTING**

### **Development Environment**
- **Base URL**: `http://localhost:3001/api/v1`
- **Authentication**: Use test JWT tokens
- **Database**: Test database with sample data
- **Logging**: Detailed request/response logging

### **Testing Endpoints**
- **Health Check**: `GET /api/v1/health`
- **API Status**: `GET /api/v1/status`
- **Test Data**: `POST /api/v1/test/seed-data`

---

## 📚 **RELATED DOCUMENTATION**

- [Architecture Documentation](./architecture.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Security Documentation](./SECURITY.md)
- [Performance Documentation](./PERFORMANCE.md)
- [Testing Guide](./TESTING_GUIDE.md)

---

## 🆘 **SUPPORT & CONTACT**

### **API Support**
- **Documentation**: This comprehensive API documentation
- **OpenAPI Spec**: Available at `/api/v1/docs`
- **Postman Collection**: Available for import
- **Issue Tracking**: GitHub issues for bug reports

### **Contact Information**
- **Development Team**: MyMoolah Development Team
- **Email**: dev@mymoolah.com
- **Documentation**: Updated regularly with each release

---

*This API documentation is maintained by the MyMoolah Development Team and updated regularly to reflect the current API state.* 