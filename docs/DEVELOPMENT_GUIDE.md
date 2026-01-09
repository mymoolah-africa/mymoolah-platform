# MyMoolah Treasury Platform - Development Guide

**Last Updated**: December 30, 2025 (18:30 SAST)  
**Version**: 2.4.40 - Staging Deployment Complete & Referral Tested  
**Status**: ✅ **SMS INTEGRATION WORKING** ✅ **REFERRAL SMS SENDING** ✅ **OTP SYSTEM COMPLETE** ✅ **UAT DEPLOYED**

---

## 🚀 **DEVELOPMENT OVERVIEW**

Welcome to the MyMoolah Treasury Platform development guide! This platform is built on **banking-grade standards** and **Mojaloop compliance**, designed to handle **millions of transactions** with enterprise-grade security and performance.

### **Platform Architecture**
- **Multi-Supplier Integration**: Unified product catalog across Flash, MobileMart, dtMercury, and Peach
- **Product Variants System**: Advanced multi-supplier product management with automatic supplier selection
- **Banking-Grade Security**: ISO 27001 compliant with end-to-end encryption
- **Mojaloop Compliance**: FSPIOP standards for financial services interoperability
- **Microservices Architecture**: Scalable, maintainable service-oriented design

### **Development & Deployment Workflow**
- **MANDATORY SEQUENCE (2025-12-06 reinforcement)**: Local changes → `git commit` → `git push origin main` → Codespaces `git pull origin main` → run tests → build (no-cache) + deploy to staging.
- **Development Environment**: GitHub Codespaces (UAT credentials, test accounts)
- **Staging Environment**: Google Cloud Services Staging (Production credentials, test accounts) - **Recommended**
- **Production Environment**: Google Cloud Services Production (Production credentials, real customers)
- **See:** `DEVELOPMENT_DEPLOYMENT_WORKFLOW.md` for complete workflow documentation

---

## 🏗️ **PRODUCT CATALOG ARCHITECTURE**

### **Core System Design**

The MyMoolah platform uses a **sophisticated multi-supplier product catalog system** that automatically handles supplier selection based on commission rates and availability.

#### **Database Schema Overview**

##### **Core Tables**
1. **`products`**: Base product definitions
2. **`product_variants`**: Supplier-specific product variants
3. **`suppliers`**: Supplier information and integration details
4. **`orders`**: Product purchase orders
5. **`transactions`**: Financial transaction records

##### **Key Relationships**
- **Product → Product Variants**: One-to-many relationship
- **Supplier → Product Variants**: One-to-many relationship
- **Product Variants → Orders**: One-to-many relationship
- **Orders → Transactions**: One-to-one relationship

#### **Product Variants System**

The **Product Variants System** is the core innovation that enables:
- **Multi-Supplier Support**: Single product can have variants from multiple suppliers
- **Automatic Supplier Selection**: System automatically chooses best supplier based on commission rates
- **Dynamic Pricing**: Real-time price updates from suppliers
- **Commission Optimization**: Automatic selection of highest commission rates for users

#### **Example Product Structure**
```
Base Product: "MTN Airtime"
├── Variant 1: Flash Supplier
│   ├── Name: "MTN Airtime R10"
│   ├── Price: R10.00
│   ├── Commission: 2.5%
│   └── Supplier: Flash
├── Variant 2: MobileMart Supplier
│   ├── Name: "MTN Airtime R10"
│   ├── Price: R10.00
│   ├── Commission: 2.0%
│   └── Supplier: MobileMart
└── Variant 3: dtMercury Supplier
    ├── Name: "MTN Airtime R10"
    ├── Price: R10.00
    ├── Commission: 3.0%
    └── Supplier: dtMercury
```

### **Automatic Supplier Selection Algorithm**

The system automatically selects the **best supplier** for each transaction based on:
1. **Commission Rate Priority**: Higher commission rates preferred
2. **Availability**: Supplier must have stock/availability
3. **Performance**: Historical success rate of supplier
4. **Cost**: Lowest cost to user while maximizing commission

## 🔌 **MOBILEMART FULCRUM INTEGRATION**

### **MobileMart Fulcrum API Integration**

The platform integrates with **MobileMart Fulcrum API** for VAS (Value Added Services) including airtime, data, vouchers, bill payments, and prepaid utilities.

#### **API Configuration**

**Base URLs:**
- **UAT**: `https://uat.fulcrumswitch.com`
- **PROD**: `https://fulcrumswitch.com`

**OAuth Endpoint:**
- **Token Endpoint**: `/connect/token` (IdentityServer4/OpenIddict pattern)
- **Grant Type**: OAuth 2.0 Client Credentials
- **Token Validity**: 2 hours (7200 seconds)

**API Structure:**
- **Version**: v1
- **Products**: `/api/v1/{vasType}/products`
- **Purchase**: `/api/v1/{vasType}/purchase` or `/api/v1/{vasType}/pay`

#### **VAS Types Supported**

1. **Airtime** (`airtime`)
   - Pinned and Pinless airtime
   - Endpoint: `/api/v1/airtime/products`

2. **Data** (`data`)
   - Pinned and Pinless data packages
   - Endpoint: `/api/v1/data/products`

3. **Voucher** (`voucher`)
   - Pinned vouchers
   - Endpoint: `/api/v1/voucher/products`

4. **Bill Payment** (`billpayment`)
   - Bill payment services with prevend
   - Endpoint: `/api/v1/billpayment/products`
   - Purchase: `/api/v1/billpayment/pay`

5. **Prepaid Utility** (`prepaidutility`)
   - Prepaid electricity with prevend
   - Endpoint: `/api/v1/prepaidutility/products`
   - Maps from `electricity` VAS type

#### **Authentication Service**

The `MobileMartAuthService` handles:
- OAuth 2.0 token generation
- Token caching and refresh
- Automatic token renewal before expiry
- Error handling and retry logic

**Example Usage:**
```javascript
const MobileMartAuthService = require('./services/mobilemartAuthService');
const authService = new MobileMartAuthService();

// Get access token (automatically cached and refreshed)
const token = await authService.getAccessToken();

// Make authenticated request
const response = await authService.makeAuthenticatedRequest(
  'GET',
  '/airtime/products'
);
```

#### **VAS Type Normalization**

The `MobileMartController` includes a `normalizeVasType()` method that maps common VAS types to MobileMart Fulcrum naming:

```javascript
normalizeVasType(vasType) {
  const mapping = {
    'airtime': 'airtime',
    'data': 'data',
    'voucher': 'voucher',
    'billpayment': 'billpayment',
    'bill_payment': 'billpayment',
    'electricity': 'prepaidutility',
    'prepaidutility': 'prepaidutility',
    'utility': 'prepaidutility'
  };
  return mapping[vasType.toLowerCase()] || vasType.toLowerCase();
}
```

#### **Error Handling**

MobileMart Fulcrum API returns standard error codes:
- `1000` - ProductDoesNotExist
- `1001` - AmountInvalid
- `1002` - CannotSourceProduct
- `1006` - UserNotAuthenticated
- `1008` - MerchantCreditLimitReached

#### **Environment Variables**

```env
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=your_client_id
MOBILEMART_CLIENT_SECRET=your_client_secret
MOBILEMART_API_URL=https://uat.fulcrumswitch.com  # Optional (auto-detected)
MOBILEMART_TOKEN_URL=/connect/token  # Optional (default)
```

#### **Current Status**

- ✅ **OAuth Endpoint**: Discovered (`/connect/token`)
- ✅ **API Structure**: Updated to match documentation
- ✅ **Base URL**: Corrected to `fulcrumswitch.com`
- ✅ **VAS Type Mapping**: Implemented
- ⚠️ **Credentials**: Awaiting verification from MobileMart support

---

## 🔒 **BANKING-GRADE CONCURRENCY CONTROL**

### **Optimistic Locking Architecture**

The platform implements **optimistic locking** for high-volume transaction processing, following industry standards used by major financial institutions (Stripe, PayPal, Square).

#### **Why Optimistic Locking?**

**Traditional Approach (Pessimistic Locking)**:
- Uses `SELECT FOR UPDATE` to lock rows
- Blocks concurrent reads
- Can cause deadlocks
- Poor scalability for high-volume systems

**Banking-Grade Approach (Optimistic Locking)**:
- No blocking locks
- Allows concurrent reads
- Deadlock-free
- Scales to millions of transactions
- Industry-standard for financial systems

#### **Implementation Details**

**Payment Request Versioning**:
```javascript
// PaymentRequest model includes version column
{
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Optimistic locking version number'
  }
}
```

**Atomic Update Pattern**:
```javascript
// Fetch payment request
const pr = await PaymentRequest.findOne({ 
  where: { id, status: ['requested', 'viewed'] }
});

// Atomic update with version check
const [updateCount] = await PaymentRequest.update(
  { 
    status: 'approved',
    version: sequelize.literal('version + 1')
  },
  {
    where: {
      id: pr.id,
      version: pr.version, // Optimistic lock check
      status: ['requested', 'viewed']
    }
  }
);

// If updateCount is 0, another request already processed it
if (updateCount === 0) {
  return res.status(409).json({ 
    message: 'Request already processed' 
  });
}
```

**Database Constraints**:
```sql
-- Unique index prevents duplicate approvals
CREATE UNIQUE INDEX idx_payment_requests_unique_approved
ON payment_requests(id)
WHERE status = 'approved';

-- Unique index prevents duplicate transactions
CREATE UNIQUE INDEX idx_transactions_unique_payment_request
ON transactions((metadata->>'requestId'))
WHERE metadata->>'requestId' IS NOT NULL
  AND status = 'completed';
```

#### **Three-Layer Defense**

1. **Application Layer**: Optimistic locking with version checks
2. **Database Layer**: Unique constraints prevent duplicates
3. **Idempotency Layer**: Payment request ID in transaction metadata

#### **Error Handling**

**409 Conflict Responses**:
- Duplicate transaction attempt
- Payment request already processed
- Concurrent update detected

**Transaction Rollback**:
- All operations rolled back on error
- No partial updates
- ACID compliance maintained

#### **Transaction Filtering**

The platform filters internal accounting transactions from user-facing transaction history:

**Filtered Transaction Types:**
- `vat_payable` - VAT payable to SARS
- `mymoolah_revenue` - Platform revenue
- `zapper_float_credit` - Zapper float credits
- `float_credit` - General float credits
- `revenue` - Revenue transactions

**Filter Implementation:**
- **Location**: `controllers/walletController.js` (lines 475-520)
- **Method**: Backend filtering before sending to frontend
- **Pattern Matching**: Transaction type + description pattern matching
- **Database Preservation**: All filtered transactions remain in database

**Filtered Out:**
- VAT payable transactions
- MyMoolah revenue transactions
- Zapper float credit transactions

**Displayed to Users:**
- Zapper payment transactions
- Transaction fees
- All other customer-facing transactions

See `docs/TRANSACTION_FILTER.md` for complete documentation.

---

#### **Reconciliation Scripts**

**Identify Duplicates**:
```bash
node scripts/reconcile-wallet-transactions.js \
  "DATABASE_URL" \
  "USER1_PHONE" \
  "USER2_PHONE"
```

**Cleanup Duplicates**:
```bash
node scripts/cleanup-duplicate-transactions.js \
  "DATABASE_URL"
```

#### **Best Practices**

1. **Always use transactions**: Wrap operations in database transactions
2. **Check update count**: Verify atomic update succeeded
3. **Handle conflicts**: Return 409 Conflict for concurrent updates
4. **Idempotency keys**: Include payment request ID in transaction metadata
5. **Database constraints**: Rely on database-level enforcement

---

## 📷 **QR CODE SCANNING ARCHITECTURE**

### **Cross-Browser Camera Support**

The QR code scanning system provides **comprehensive cross-browser camera support** with graceful fallbacks for browsers that don't support camera access.

#### **Browser Compatibility**
- **iOS Safari**: Full support with HTTPS requirement detection
- **Android Chrome**: Optimized for low-end devices with lower resolution
- **Desktop Chrome**: Full feature support
- **Opera Mini**: Graceful fallback with upload option guidance

#### **Camera Scanning Implementation**

**Key Components**:
- `QRPaymentPage.tsx`: Main QR scanning page component
- `browserSupport.ts`: Browser detection utility
- `jsQR` library: QR code detection library

**Camera Scanning Flow**:
1. **User clicks "Scan with Camera"**
2. **Camera initialization**:
   - Check Opera Mini (early exit)
   - Check `navigator.mediaDevices` availability
   - Check `getUserMedia` support
   - Render video element in DOM first (iOS Safari requirement)
   - Request camera permissions
   - Attach stream to video element
   - Start continuous scanning loop

3. **Continuous Scanning**:
   - Scan every 100ms (10 times/second)
   - Draw video frame to hidden canvas
   - Use jsQR to detect QR codes
   - Auto-process when QR code detected

4. **QR Code Processing**:
   - Validate QR code with backend API
   - Display merchant and payment information
   - Initiate payment flow

#### **QR Code Upload Implementation**

**Upload Detection Strategies**:
1. **Original Image**: Direct detection from uploaded image
2. **Inverted Colors**: For white-on-black QR codes
3. **Grayscale with Enhanced Contrast**: Improved detection for unclear images
4. **High Contrast (B&W)**: Pure black and white conversion
5. **Scaled Down**: For large images (performance optimization)
6. **Scaled Up**: For small images (sharp edges, no smoothing)

**Image Processing**:
- Uses HTML5 Canvas for image manipulation
- Multiple detection attempts with different strategies
- Handles QR codes with logo overlays
- Automatic retry with different strategies

#### **Error Handling**

**Camera Access Errors**:
- `OPERA_MINI_NO_CAMERA`: Opera Mini specific error
- `CAMERA_API_NOT_AVAILABLE_HTTP`: iOS Safari on HTTP
- `NotAllowedError`: Permission denied
- `NotFoundError`: No camera found
- `NotReadableError`: Camera in use
- `OverconstrainedError`: Camera constraints not supported

**QR Detection Errors**:
- No QR code found: Provides troubleshooting steps
- Invalid QR code: Shows validation error
- Processing failure: Shows API error message

#### **Mobile UX Considerations**

**Touch Handling**:
- Proper `onTouchStart` handlers for mobile
- `touchAction: 'manipulation'` for better touch response
- Disabled states with visual feedback

**Video Element Requirements**:
- iOS Safari: Video element must be in DOM before attaching stream
- Android: Lower resolution for better performance
- Desktop: Full resolution support

**HTTPS Requirements**:
- iOS Safari requires HTTPS for camera access (except localhost)
- Informational banners (not blocking) for HTTP access
- Graceful fallback to upload option

---

## 🔧 **DEVELOPMENT SETUP**

### **Prerequisites**
- **Node.js**: Version 18.20.8 or higher
- **PostgreSQL**: Version 15.4 or higher
- **Redis**: Version 7.0 or higher (for caching)
- **Git**: Latest version
- **Docker**: For containerized development (optional)

### **Environment Setup**

#### **1. Clone Repository**
```bash
git clone <repository-url>
cd mymoolah
```

#### **2. Install Dependencies**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd mymoolah-wallet-frontend
npm install
cd ..
```

#### **3. Environment Configuration**
```bash
# Copy environment template
cp env.template .env

# Configure environment variables
nano .env
```

**Required Environment Variables**:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mymoolah_dev
DB_USER=mymoolah_user
DB_PASSWORD=secure_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Supplier API Keys (encrypted)
FLASH_API_KEY=encrypted_flash_api_key
MOBILEMART_API_KEY=encrypted_mobilemart_api_key
DTMERCURY_API_KEY=encrypted_dtmercury_api_key
PEACH_API_KEY=encrypted_peach_api_key

# Server Configuration
PORT=3001
NODE_ENV=development
```

#### **4. Database Setup**
```bash
# Create database
createdb mymoolah_dev

# Run migrations
npx sequelize-cli db:migrate

# Seed initial data
npx sequelize-cli db:seed:all
```

#### **5. Start Development Servers**
```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend development server
cd mymoolah-wallet-frontend
npm run dev

# Terminal 3: Start Redis (if not running as service)
redis-server
```

---

## 🗄️ **DATABASE DEVELOPMENT**

### **Working with Migrations**

#### **Creating New Migrations**
```bash
# Create new migration
npx sequelize-cli migration:generate --name create-new-table

# Run migrations
npx sequelize-cli db:migrate

# Rollback migrations
npx sequelize-cli db:migrate:undo
```

#### **Migration Best Practices**
- **Naming Convention**: Use descriptive names with timestamps
- **Reversible**: Always make migrations reversible
- **Data Integrity**: Use foreign key constraints
- **Indexing**: Add appropriate indexes for performance
- **Testing**: Test migrations on development database first

#### **Example Migration**
```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('new_table', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('new_table', ['name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('new_table');
  }
};
```

### **Working with Models**

#### **Model Best Practices**
- **Validation**: Use Sequelize validators for data integrity
- **Hooks**: Use hooks for business logic (beforeCreate, afterUpdate, etc.)
- **Associations**: Define clear relationships between models
- **Scopes**: Use scopes for common queries
- **Indexes**: Ensure proper database indexing

#### **Example Model**
```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Product extends Model {}

Product.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('airtime', 'data', 'electricity', 'vouchers'),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'products',
  underscored: true,
  timestamps: true
});

// Define associations
Product.associate = (models) => {
  Product.hasMany(models.ProductVariant, {
    foreignKey: 'product_id',
    as: 'variants'
  });
};

module.exports = Product;
```

---

## 🔌 **SERVICE DEVELOPMENT**

### **Service Architecture**

#### **Core Service Pattern**
```javascript
class ProductCatalogService {
  constructor() {
    this.cache = new Map();
    this.suppliers = new Map();
  }

  async getAllProducts(options = {}) {
    try {
      // Implementation with error handling
      const products = await this.fetchProductsFromDatabase(options);
      return this.formatProducts(products);
    } catch (error) {
      this.logger.error('Error fetching products:', error);
      throw new ServiceError('Failed to fetch products', error);
    }
  }

  async getProductVariants(productId) {
    try {
      // Implementation with validation
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }
      
      const variants = await this.fetchVariantsFromDatabase(productId);
      return this.formatVariants(variants);
    } catch (error) {
      this.logger.error('Error fetching product variants:', error);
      throw new ServiceError('Failed to fetch product variants', error);
    }
  }
}
```

#### **Service Best Practices**
- **Error Handling**: Comprehensive error handling with custom error types
- **Logging**: Structured logging for debugging and monitoring
- **Validation**: Input validation and sanitization
- **Caching**: Implement caching for frequently accessed data
- **Testing**: Unit tests for all service methods

### **Supplier Integration Development**

#### **Supplier Service Pattern**
```javascript
class FlashSupplierService {
  constructor(config) {
    this.apiEndpoint = config.apiEndpoint;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  async syncProducts() {
    try {
      const products = await this.fetchProductsFromAPI();
      const formattedProducts = this.formatProductsForDatabase(products);
      await this.saveProductsToDatabase(formattedProducts);
      
      return {
        success: true,
        products_synced: products.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Flash product sync failed:', error);
      throw new SupplierSyncError('Flash product synchronization failed', error);
    }
  }

  async purchaseProduct(productId, quantity, recipient) {
    try {
      // Validate input parameters
      this.validatePurchaseParameters(productId, quantity, recipient);
      
      // Process purchase with Flash API
      const purchaseResponse = await this.processPurchaseWithFlash(productId, quantity, recipient);
      
      // Handle response and create order
      return this.handlePurchaseResponse(purchaseResponse);
    } catch (error) {
      this.logger.error('Flash purchase failed:', error);
      throw new PurchaseError('Flash product purchase failed', error);
    }
  }
}
```

---

## 🧪 **TESTING STRATEGY**

### **Testing Framework**
- **Jest**: Unit testing framework
- **Supertest**: API endpoint testing
- **Test Database**: Separate test database for testing
- **Mocking**: Mock external services and APIs

### **Testing Best Practices**
- **Test Coverage**: Aim for >90% code coverage
- **Isolation**: Each test should be independent
- **Mocking**: Mock external dependencies
- **Data Cleanup**: Clean up test data after each test
- **Performance**: Test performance under load

#### **Example Test**
```javascript
describe('ProductCatalogService', () => {
  let service;
  let mockDatabase;

  beforeEach(() => {
    mockDatabase = {
      Product: {
        findAll: jest.fn(),
        findByPk: jest.fn()
      }
    };
    service = new ProductCatalogService(mockDatabase);
  });

  describe('getAllProducts', () => {
    it('should return formatted products', async () => {
      // Arrange
      const mockProducts = [
        { id: 1, name: 'Test Product', category: 'airtime' }
      ];
      mockDatabase.Product.findAll.mockResolvedValue(mockProducts);

      // Act
      const result = await service.getAllProducts();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Product');
      expect(mockDatabase.Product.findAll).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockDatabase.Product.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getAllProducts()).rejects.toThrow('Failed to fetch products');
    });
  });
});
```

---

## 🔒 **SECURITY DEVELOPMENT**

### **Security Best Practices**
- **Input Validation**: Validate and sanitize all inputs
- **SQL Injection**: Use parameterized queries
- **Authentication**: Implement proper JWT authentication
- **Authorization**: Use role-based access control
- **Encryption**: Encrypt sensitive data at rest and in transit
- **Rate Limiting**: Implement API rate limiting
- **Audit Logging**: Log all security-relevant events

### **Security Implementation**
```javascript
// Input validation middleware
const validateProductInput = (req, res, next) => {
  const { name, category, price } = req.body;
  
  if (!name || typeof name !== 'string' || name.length < 2) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Product name must be at least 2 characters long'
      }
    });
  }
  
  if (!category || !['airtime', 'data', 'electricity'].includes(category)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid product category'
      }
    });
  }
  
  next();
};

// Rate limiting middleware
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP'
    }
  }
});
```

### **OTP Verification System (December 30, 2025)**

The platform implements banking-grade OTP verification for password reset and phone changes:

#### **Key Files**
- `models/OtpVerification.js` - Sequelize model with verification methods
- `services/otpService.js` - OTP generation, hashing, rate limiting, verification
- `controllers/authController.js` - Password reset and phone change endpoints
- `migrations/20251230_01_create_otp_verifications_table.js` - Database table

#### **Usage Example**
```javascript
const otpService = require('./services/otpService');

// Create password reset OTP
const result = await otpService.createPasswordResetOtp(phoneNumber, ipAddress, userAgent);
// Returns: { success: true, otp: '123456', expiresAt: Date, expiresInMinutes: 10 }

// Verify OTP
const verifyResult = await otpService.verifyPasswordResetOtp(phoneNumber, otp);
// Returns: { success: true, userId: 123 } or { success: false, error: 'Invalid OTP' }
```

#### **Security Features**
- **Cryptographic OTPs**: `crypto.randomInt()` for secure 6-digit codes
- **Bcrypt Hashing**: OTPs hashed before storage (never plaintext)
- **Rate Limiting**: Max 3 OTPs per phone per hour
- **Attempt Limiting**: Max 3 verification attempts per OTP
- **One-Time Use**: OTPs invalidated after successful verification
- **Audit Trail**: IP, user agent, timestamps logged

---

## 📊 **PERFORMANCE OPTIMIZATION**

### **Database Optimization**
- **Indexing**: Proper database indexing for fast queries
- **Query Optimization**: Optimize database queries
- **Connection Pooling**: Use connection pooling for database connections
- **Caching**: Implement Redis caching for frequently accessed data

### **API Performance**
- **Response Time**: Target <200ms response times
- **Pagination**: Implement proper pagination for large datasets
- **Compression**: Use gzip compression for responses
- **CDN**: Use CDN for static assets

### **Performance Monitoring**
```javascript
// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, statusCode } = req;
    
    // Log performance metrics
    logger.info('API Performance', {
      method,
      url,
      statusCode,
      duration,
      timestamp: new Date().toISOString()
    });
    
    // Alert if response time is too slow
    if (duration > 1000) {
      logger.warn('Slow API Response', {
        method,
        url,
        duration,
        threshold: 1000
      });
    }
  });
  
  next();
};
```

---

## 🚀 **DEPLOYMENT & PRODUCTION**

### **Production Environment**
- **Environment Variables**: Secure environment configuration
- **Database**: Production PostgreSQL with proper backups
- **Redis**: Production Redis with persistence
- **Monitoring**: Application performance monitoring
- **Logging**: Structured logging with log aggregation
- **Security**: Security scanning and vulnerability assessment

### **Deployment Checklist**
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Rollback plan prepared

---

## 📚 **DEVELOPMENT RESOURCES**

### **Documentation**
- [Architecture Documentation](./architecture.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Security Documentation](./SECURITY.md)
- [Performance Documentation](./PERFORMANCE.md)
- [Testing Guide](./TESTING_GUIDE.md)

### **Code Standards**
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **Git Hooks**: Pre-commit hooks for code quality
- **Code Review**: Peer code review process

### **Development Tools**
- **VS Code**: Recommended IDE with extensions
- **Postman**: API testing and documentation
- **pgAdmin**: PostgreSQL database management
- **Redis Commander**: Redis management interface

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database status
sudo systemctl status postgresql

# Check database connection
psql -h localhost -U mymoolah_user -d mymoolah_dev

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### **Redis Connection Issues**
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

#### **API Issues**
```bash
# Check server logs
tail -f logs/app.log

# Check API health
curl http://localhost:3001/api/v1/health

# Check server status
curl http://localhost:3001/api/v1/status
```

---

## 🎯 **DEVELOPMENT ROADMAP**

### **Current Phase (2.3.0)**
- ✅ **Complete Flash Commercial Terms**: All 167 Flash products implemented
- ✅ **Product Variants System**: Advanced multi-supplier product management
- ✅ **International Services**: UI framework for international airtime and data

### **Next Phase (2.4.0)**
- 🔄 **International Services Backend**: Backend implementation for international services
- 🔄 **Enhanced Analytics**: Advanced business intelligence and reporting
- 🔄 **Performance Optimization**: Further performance improvements

### **Future Phases**
- 🔄 **AI-Powered Recommendations**: Machine learning for product suggestions
- 🔄 **Blockchain Integration**: Smart contracts and tokenization
- 🔄 **Global Expansion**: Multi-country support and compliance

---

*This development guide is maintained by the MyMoolah Development Team and updated regularly to reflect the current development practices.* 