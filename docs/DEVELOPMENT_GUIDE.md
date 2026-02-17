# MyMoolah Treasury Platform - Development Guide

**Last Updated**: February 16, 2026  
**Version**: 2.11.5 - Codespaces Startup Fix & SSL Cert v4  
**Status**: ✅ **PRODUCTION LIVE** ✅ **API api-mm.mymoolah.africa** ✅ **WALLET wallet.mymoolah.africa** ✅ **PRODUCTION DB MIGRATED** ✅ **TAP TO ADD MONEY** ✅ **USDC SEND** ✅ **11 LANGUAGES** ✅ **MOJALOOP COMPLIANT**

---

## 🚀 **LATEST UPDATE: Codespaces Startup Fix & SSL Cert v4 (February 16, 2026)**

Codespaces backend startup fixed (env vars, UAT password). Production SSL: cert-production-v4 (api-mm, wallet, www.wallet). Production: https://api-mm.mymoolah.africa, https://wallet.mymoolah.africa. See `docs/session_logs/2026-02-16_0900_codespaces-startup-ssl-cert-v4.md`.

---

## 🚀 **PREVIOUS UPDATE: NFC Tap to Add Money (February 10, 2026)**

Tap to Add Money: NFC deposit via Halo Dot. Visible on Transact page; quick amounts R50-R8000; description "Tap your card or use Google Pay / Apple Pay"; max R10k. Model fixes (user_id), Halo API amount-as-number, ECONNRESET troubleshooting. **Rule 9A**: MUST sweep scripts/ before creating new scripts. **Last 3 weeks (Jan 20–Feb 10)** also: Transaction Detail + USDC fee UI; USDC send flow; Watch to Earn Staging; USDC feature + sweep; proxy & gcloud auth; Global Airtime; Flash cash_out; ZERO SHORTCUTS POLICY. See `docs/CHANGELOG.md` and `docs/session_logs/2026-02-10_1550_nfc-tap-to-add-money-refinements.md`.

---

## 🚀 **PREVIOUS UPDATE: USDC Fixes & Banking-Grade Sweep (February 07, 2026)**

USDC service hardened: beneficiary list fix (model + enrichment + filter), Redis v5 cache, VALR 503 handling, edit flow and overlay banners. All USDC routes use express-validator and DB-only aggregation for limits. See `docs/session_logs/2026-02-07_2230_usdc-fixes-banners-banking-grade-sweep.md`.

---

## 🚀 **PREVIOUS UPDATE: Electricity Purchase with MobileMart Integration (February 01, 2026)**

### **⚡ Production-Ready Electricity Purchase**
Complete end-to-end electricity purchase implementation:

**User Flow**:
1. Select Electricity service
2. Create/select meter recipient (8-digit UAT support)
3. Enter amount (R20-R2000)
4. Purchase electricity
5. View transaction in history
6. Click transaction → see 16-digit electricity PIN/token

**Backend Integration**:
- ✅ **MobileMart API**: Full prevend → purchase flow
- ✅ **Environment Aware**: UAT simulation, Staging/Production real API
- ✅ **Real Tokens**: Extracts authentic electricity tokens from MobileMart
- ✅ **Wallet Integration**: Automatic debit and transaction history
- ✅ **Error Handling**: Comprehensive API error handling

**Frontend Features**:
- ✅ **Transaction Detail Modal**: View electricity PIN/token by clicking transaction
- ✅ **Copy Token**: One-click token copying
- ✅ **Zap Icon**: Red lightning bolt for electricity debits
- ✅ **Receipt View**: Complete purchase details (meter, amount, status)

**Status**: ✅ **UAT Tested**, ✅ **Ready for Staging Deployment**

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

## 💰 **MULTI-LEVEL REFERRAL SYSTEM**

### **Referral System Architecture**

The MyMoolah platform includes a **banking-grade multi-level referral system** designed to create earning opportunities in South Africa. The system is built on Mojaloop and ISO20022 standards with comprehensive fraud prevention.

#### **Commission Structure**
- **3-Level System**: 5% (1st level), 3% (2nd level), 2% (3rd level) - no caps
- **Revenue Source**: 10% of MyMoolah's net earnings from all transactions (VAS commissions, transaction fees)
- **Activation**: After first transaction (prevents fraud)

#### **Database Schema**

##### **Core Tables**
1. **`referrals`**: Referral invitations tracking
   - Stores referral codes, invitee phone numbers, status
   - Tracks signup bonuses and activation

2. **`referral_chains`**: 3-level network structure
   - Maintains hierarchical relationships
   - Tracks referrer → referree at each level

3. **`referral_earnings`**: Commission records with caps
   - Logs all earned commissions
   - Tracks monthly caps per level
   - Status: pending, paid, capped

4. **`referral_payouts`**: Daily batch processing
   - Batch tracking and processing
   - Error handling and retry logic

5. **`user_referral_stats`**: Real-time statistics
   - Quick access to user-specific metrics
   - Monthly and lifetime totals

#### **Transaction Integration**

Referral earnings are automatically calculated on:
- **Voucher Purchases**: From `pricing.commissionCents` (MyMoolah's commission)
- **VAS Purchases**: From `netCommissionCents` (after VAT)
- **Zapper QR Payments**: From `mmFeeExclVat * 100` (after VAT, converted to cents)

**Integration Points**:
- `services/productPurchaseService.js` - Voucher purchases
- `routes/overlayServices.js` - VAS purchases
- `controllers/qrPaymentController.js` - Zapper QR payments

All hooks are **non-blocking** (`setImmediate()`) and include comprehensive error handling.

#### **SMS Integration**

The referral system uses **MyMobileAPI** for SMS invitations:
- **11-Language Support**: English, Afrikaans, isiZulu, isiXhosa, Sesotho, Setswana, Sepedi, Tshivenda, Xitsonga, siSwati, isiNdebele
- **URL Shortening**: MyMobileAPI automatically shortens URLs
- **Personalization**: Includes referrer's name in messages
- **Graceful Degradation**: System works without SMS (referral records still created)

**Service**: `services/smsService.js`

#### **Daily Payout Engine**

The payout system processes referral earnings daily at 2:00 AM SAST:
- **Batch Processing**: Groups all pending earnings by user
- **Wallet Crediting**: Credits user wallets with transaction records
- **Stats Updating**: Updates user referral statistics
- **Error Handling**: Per-user transaction rollback on failure

**Service**: `services/referralPayoutService.js`  
**Cron Script**: `scripts/process-referral-payouts.js`

#### **API Endpoints**

The referral system provides 6 REST API endpoints:
- `GET /api/v1/referrals/my-code` - Get referral code
- `POST /api/v1/referrals/send-invite` - Send SMS invitation
- `GET /api/v1/referrals/stats` - Get referral statistics
- `GET /api/v1/referrals/earnings` - Get monthly earnings
- `GET /api/v1/referrals/network` - Get referral network
- `GET /api/v1/referrals/pending` - Get pending earnings

**Controller**: `controllers/referralController.js`  
**Routes**: `routes/referrals.js`

#### **Fraud Prevention**

The referral system includes comprehensive fraud prevention:
- **KYC Verification**: Only verified users can earn
- **Velocity Limits**: Maximum referrals per time period
- **Phone Verification**: SMS verification required
- **Minimum Transaction Values**: Only transactions above threshold generate earnings
- **Cooling Periods**: Prevents rapid-fire referrals
- **AI-Based Detection**: Pattern recognition for suspicious activity

#### **Development Workflow**

1. **Database Migrations**: Run `./scripts/run-migrations-master.sh [uat|staging]`
2. **Environment Variables**: Add MyMobileAPI credentials to `.env`
3. **Testing**: Test API endpoints and transaction hooks
4. **Cron Setup**: Schedule payout script for 2:00 AM SAST

**Documentation**:
- `docs/REFERRAL_IMPLEMENTATION_ROADMAP.md`
- `docs/REFERRAL_SYSTEM_VERIFICATION.md`
- `docs/REFERRAL_PROGRAM_UI_SPECIFICATIONS.md`

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

## 🏦 **RECONCILIATION SYSTEM DEVELOPMENT**

### **Reconciliation System Overview**

The MyMoolah platform includes a **world-class automated reconciliation system** for multi-supplier transaction reconciliation. This system follows banking-grade standards and best practices from leading fintechs.

#### **Core Components**

1. **ReconciliationOrchestrator** - Workflow coordination
2. **AuditLogger** - Immutable audit trail with SHA-256 event chaining
3. **FileParserService** - Generic file parsing with supplier adapters
4. **MatchingEngine** - Exact + fuzzy transaction matching
5. **DiscrepancyDetector** - Identifies 7 types of discrepancies
6. **SelfHealingResolver** - Auto-resolves 80% of common issues
7. **CommissionReconciliation** - Commission calculation and verification
8. **SFTPWatcherService** - Automated file ingestion from GCS
9. **ReportGenerator** - Excel/JSON report generation
10. **AlertService** - Real-time email notifications

#### **Database Schema**

```javascript
// Four core tables
- recon_supplier_configs    // Supplier configurations
- recon_runs                 // Reconciliation run metadata
- recon_transaction_matches  // Transaction matches and discrepancies
- recon_audit_trail          // Immutable audit log
```

#### **Adding a New Supplier Adapter**

**Step 1: Create Adapter File**
```javascript
// services/reconciliation/adapters/NewSupplierAdapter.js
const moment = require('moment-timezone');

class NewSupplierAdapter {
  async parse(fileContent, fileName) {
    // Parse supplier-specific format
    const transactions = [];
    
    // Example: CSV parsing
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      transactions.push({
        externalRef: values[0],
        amount: parseFloat(values[1]) * 100, // Convert to cents
        timestamp: moment(values[2]).toDate(),
        status: this.normalizeStatus(values[3]),
        productId: values[4],
        commission: parseFloat(values[5]) * 100
      });
    }
    
    return {
      supplierCode: 'NEWSUP',
      transactions,
      metadata: {
        totalTransactions: transactions.length,
        fileDate: moment().format('YYYY-MM-DD')
      }
    };
  }
  
  normalizeStatus(status) {
    const statusMap = {
      'SUCCESS': 'completed',
      'FAILED': 'failed',
      'PENDING': 'pending'
    };
    return statusMap[status] || 'unknown';
  }
}

module.exports = NewSupplierAdapter;
```

**Step 2: Register Adapter in FileParserService**
```javascript
// services/reconciliation/FileParserService.js
const NewSupplierAdapter = require('./adapters/NewSupplierAdapter');

class FileParserService {
  constructor() {
    this.adapters = {
      MobileMartAdapter: require('./adapters/MobileMartAdapter'),
      NewSupplierAdapter: NewSupplierAdapter  // Add here
    };
  }
}
```

**Step 3: Configure Supplier**
```javascript
// Create supplier config via API or directly in database
await ReconSupplierConfig.create({
  supplier_code: 'NEWSUP',
  supplier_name: 'New Supplier',
  is_active: true,
  sftp_config: {
    host: 'sftp.newsupplier.com',
    port: 22,
    username: 'mymoolah',
    path: '/reconciliation/'
  },
  file_config: {
    format: 'csv',
    delimiter: ',',
    encoding: 'UTF-8',
    adapter: 'NewSupplierAdapter'
  },
  schedule: {
    frequency: 'daily',
    time: '06:00',
    timezone: 'Africa/Johannesburg'
  }
});
```

#### **Testing Reconciliation**

**Unit Test Example**:
```javascript
// tests/reconciliation.test.js
describe('Reconciliation System', () => {
  describe('File Parsing', () => {
    it('should parse valid MobileMart CSV file', async () => {
      const fileContent = `transaction_ref,amount,timestamp,status
MM20260113-001,50.00,2026-01-13T08:15:00Z,SUCCESS`;
      
      const parser = new FileParserService();
      const result = await parser.parse(fileContent, 'MMART', 'recon_20260113.csv');
      
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].externalRef).toBe('MM20260113-001');
      expect(result.transactions[0].amount).toBe(5000); // In cents
    });
  });
  
  describe('Transaction Matching', () => {
    it('should match transaction with exact ref', async () => {
      const external = { externalRef: 'MM20260113-001', amount: 5000 };
      const internal = { ref: 'MM20260113-001', amount: 5000 };
      
      const matcher = new MatchingEngine();
      const match = await matcher.findMatch(external, [internal]);
      
      expect(match.matchType).toBe('exact');
      expect(match.confidence).toBe(1.0);
    });
  });
});
```

**Integration Test**:
```bash
# Run full reconciliation test
npm test -- tests/reconciliation.test.js

# Test with sample file
node scripts/test-reconciliation.js --supplier MMART --file sample_recon.csv
```

#### **Manual Reconciliation Trigger**

**Via API**:
```bash
curl -X POST http://localhost:3001/api/v1/reconciliation/trigger \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierCode": "MMART",
    "filePath": "gs://mymoolah-sftp-inbound/mobilemart/recon_20260113.csv",
    "runType": "manual"
  }'
```

**Via Script**:
```javascript
// scripts/run-reconciliation.js
const ReconciliationOrchestrator = require('../services/reconciliation/ReconciliationOrchestrator');

(async () => {
  const orchestrator = new ReconciliationOrchestrator();
  const result = await orchestrator.runReconciliation({
    supplierCode: 'MMART',
    filePath: 'gs://mymoolah-sftp-inbound/mobilemart/recon_20260113.csv'
  });
  
  console.log('Reconciliation complete:', result);
})();
```

#### **Monitoring Reconciliation**

**View Recent Runs**:
```bash
curl -X GET "http://localhost:3001/api/v1/reconciliation/runs?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Get Run Details**:
```bash
curl -X GET "http://localhost:3001/api/v1/reconciliation/runs/{runId}" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Analytics**:
```bash
curl -X GET "http://localhost:3001/api/v1/reconciliation/analytics?startDate=2026-01-01&endDate=2026-01-13" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### **Troubleshooting**

**Common Issues**:

1. **File Not Found**
   - Verify GCS bucket path
   - Check IAM permissions
   - Ensure SFTP service is running

2. **Low Match Rate (<95%)**
   - Review transaction ref formats
   - Check amount precision (cents vs ZAR)
   - Verify timestamp formats and timezones

3. **High Discrepancy Rate (>20%)**
   - Review self-healing rules
   - Check status normalization
   - Verify product ID mappings

4. **Audit Trail Verification Failed**
   - Check for database tampering
   - Verify event sequence
   - Review SHA-256 hash chain

**Debug Mode**:
```bash
# Enable debug logging
DEBUG=recon:* npm start

# Run single reconciliation with verbose output
node scripts/run-reconciliation.js --supplier MMART --file test.csv --debug
```

#### **Documentation**

- **Framework**: `docs/RECONCILIATION_FRAMEWORK.md` - Complete architecture
- **Quick Start**: `docs/RECONCILIATION_QUICK_START.md` - Setup guide
- **API Reference**: `docs/API_DOCUMENTATION.md` - API endpoints
- **Session Log**: `docs/session_logs/2026-01-13_recon_system_implementation.md`

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

### **Utility Scripts**

#### **Markdown to PDF Converter**
Convert any markdown documentation file to professional PDF format:

```bash
# Convert any markdown file to PDF
node scripts/md-to-pdf.js <path-to-markdown-file>

# Examples
node scripts/md-to-pdf.js docs/integrations/EasyPay_API_Integration_Guide.md
node scripts/md-to-pdf.js README.md
node scripts/md-to-pdf.js docs/API_DOCUMENTATION.md
```

**Features**:
- Generates both PDF and HTML files in the same directory as source
- Professional print-friendly styling
- Supports all markdown features (tables, code blocks, lists, headers, links)
- Falls back to HTML generation if puppeteer unavailable

**Dependencies**: `marked` and `puppeteer` (installed as dev dependencies)

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