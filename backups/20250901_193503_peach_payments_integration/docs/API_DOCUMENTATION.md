## Recent Updates (2025-08-20)

- `GET /api/v1/vouchers/balance-summary`: Logic confirmed to use multiple queries with status rules (active + pending_payment contributes to active total). Cross-user redemption rules clarified and documented in `VOUCHER_BUSINESS_LOGIC.md`.
- `GET /api/v1/wallets/balance`: Used by front-end header badges (Vouchers, Send Money, QR Payment). Response consumed with thousands separators in UI.
- `GET /api/v1/wallets/transactions`: Keyset pagination active with trimmed payloads.

# MyMoolah Treasury Platform - API Documentation

**Last Updated**: August 30, 2025  
**Version**: 2.3.0 - Complete Flash Commercial Terms & Product Variants  
**Status**: ✅ **PRODUCTION READY**

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