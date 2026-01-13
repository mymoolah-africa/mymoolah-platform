# MyMoolah Treasury Platform - Architecture Documentation

**Last Updated**: January 13, 2026  
**Version**: 2.5.0 - Banking-Grade Reconciliation System
**Status**: ✅ **RECONCILIATION LIVE** ✅ **PRODUCTION READY**

---

## 🏗️ **SYSTEM ARCHITECTURE OVERVIEW**

The MyMoolah Treasury Platform is built on a **banking-grade, Mojaloop-compliant architecture** designed to handle **millions of transactions** with enterprise-grade reliability, security, and performance.

### **Core Architecture Principles**
- **Multi-Supplier Integration**: Unified product catalog across Flash, MobileMart, dtMercury, and Peach
- **Banking-Grade Security**: ISO 27001 compliant with end-to-end encryption
- **Mojaloop Compliance**: FSPIOP standards for financial services interoperability
- **Microservices Architecture**: Scalable, maintainable service-oriented design
- **Real-Time Processing**: Sub-second transaction processing with automatic supplier selection
- **Automated Reconciliation**: Multi-supplier transaction reconciliation with self-healing (<200ms per transaction)

---

## 🎯 **PRODUCT CATALOG ARCHITECTURE**

### **Multi-Supplier Product Management System**

The platform uses a **sophisticated multi-supplier product catalog system** designed for banking-grade operations and Mojaloop compliance. The system automatically handles supplier selection based on commission rates and availability.

#### **Core Product Tables**

##### **`products` Table (Base Product)**
- **Purpose**: Defines the base product (e.g., "MTN Airtime", "Vodacom Data")
- **Key Fields**:
  - `id`: Unique product identifier
  - `name`: Product name (e.g., "MTN Airtime")
  - `description`: Product description
  - `category`: Product category (airtime, data, vouchers, etc.)
  - `type`: Product type (prepaid, postpaid, etc.)
  - `is_active`: Product availability status
  - `created_at`, `updated_at`: Timestamps

##### **`product_variants` Table (Supplier-Specific Products)**
- **Purpose**: Links base products to specific suppliers with pricing and availability
- **Key Fields**:
  - `id`: Unique variant identifier
  - `product_id`: Reference to base product
  - `supplier_id`: Reference to supplier (Flash, MobileMart, etc.)
  - `supplier_product_id`: Supplier's internal product ID
  - `name`: Variant name (e.g., "MTN Airtime R10")
  - `description`: Variant description
  - `price`: Retail price in cents
  - `commission_rate`: Commission percentage (e.g., 2.5%)
  - `commission_amount`: Fixed commission amount
  - `is_active`: Variant availability status
  - `metadata`: JSON field for supplier-specific data
  - `created_at`, `updated_at`: Timestamps

##### **`suppliers` Table**
- **Purpose**: Manages supplier information and integration details
- **Key Fields**:
  - `id`: Unique supplier identifier
  - `name`: Supplier name (Flash, MobileMart, dtMercury, Peach)
  - `api_endpoint`: Supplier API endpoint
  - `api_key`: Encrypted API key
  - `is_active`: Supplier availability status
  - `commission_structure`: JSON field for commission rules
  - `created_at`, `updated_at`: Timestamps

#### **Product Variants System Architecture**

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

---

## 🔄 **SERVICE LAYER ARCHITECTURE**

### **Core Services**

#### **1. Product Catalog Service (`productCatalogService.js`)**
- **Purpose**: Manages product catalog operations
- **Key Functions**:
  - `getAllProducts()`: Retrieve all active products
  - `getProductVariants(productId)`: Get variants for specific product
  - `searchProducts(query)`: Search products by name/description
  - `getProductsByCategory(category)`: Filter products by category

#### **2. Product Comparison Service (`productComparisonService.js`)**
- **Purpose**: Compares products across suppliers
- **Key Functions**:
  - `compareVariants(productId)`: Compare all variants of a product
  - `getBestDeal(productId)`: Find best commission rate
  - `getSupplierComparison(productId)`: Detailed supplier comparison

#### **3. Catalog Synchronization Service (`catalogSynchronizationService.js`)**
- **Purpose**: Syncs product catalog with external suppliers
- **Key Functions**:
  - `syncFlashProducts()`: Sync Flash product catalog
  - `syncMobileMartProducts()`: Sync MobileMart products
  - `syncAllSuppliers()`: Sync all supplier catalogs
  - `updatePricing()`: Update prices from suppliers

#### **4. Supplier Pricing Service (`supplierPricingService.js`)**
- **Purpose**: Manages supplier pricing and commission structures
- **Key Functions**:
  - `getSupplierPricing(supplierId)`: Get supplier pricing
  - `calculateCommission(price, commissionRate)`: Calculate commission
  - `getBestCommission(productId)`: Find best commission rate

#### **5. Product Purchase Service (`productPurchaseService.js`)**
- **Purpose**: Handles product purchases and supplier integration
- **Key Functions**:
  - `purchaseProduct(variantId, userId)`: Purchase product
  - `processSupplierOrder(supplierId, orderData)`: Process with supplier
  - `handlePurchaseResponse(response)`: Handle supplier response

---

## 🗄️ **DATABASE SCHEMA DETAILS**

### **Key Relationships**

#### **Product → Product Variants (One-to-Many)**
- Each base product can have multiple variants from different suppliers
- Variants inherit base product properties (name, category, type)
- Variants can have different pricing and commission structures

#### **Supplier → Product Variants (One-to-Many)**
- Each supplier can provide multiple product variants
- Supplier-specific metadata stored in variant metadata field
- Commission structures defined at supplier level

#### **Product Variants → Transactions (One-to-Many)**
- Each variant can have multiple purchase transactions
- Transaction history linked to specific variant
- Commission tracking at variant level

### **Indexing Strategy**

#### **Performance Indexes**
- **Primary Keys**: All tables have auto-incrementing primary keys
- **Foreign Keys**: Indexed for fast joins between tables
- **Search Indexes**: Product names and categories indexed for fast search
- **Status Indexes**: Active/inactive status indexed for filtering

#### **Query Optimization**
- **Eager Loading**: Product variants loaded with products to minimize queries
- **Caching**: Frequently accessed products cached in memory
- **Pagination**: Large result sets paginated for performance

---

## 🔌 **INTEGRATION ARCHITECTURE**

### **Supplier API Integration**

#### **Flash Integration**
- **API Version**: Flash Partner API v4
- **Products**: 167 commercial terms products
- **Categories**: Airtime, Data, Electricity, Gaming, Entertainment
- **Commission Structure**: Dynamic commission rates
- **Real-Time**: Live pricing and availability

#### **MobileMart Integration**
- **API Version**: MobileMart Partner API
- **Products**: 45+ products across multiple categories
- **Categories**: Airtime, Data, Electricity, Gaming
- **Commission Structure**: Fixed commission rates
- **Real-Time**: Live pricing and availability

#### **dtMercury Integration**
- **API Version**: dtMercury Partner API
- **Products**: 30+ products
- **Categories**: Airtime, Data, Electricity
- **Commission Structure**: Tiered commission rates
- **Real-Time**: Live pricing and availability

#### **Peach Payments Integration**
- **API Version**: Peach Payments API
- **Services**: Payment processing, card payments
- **Integration**: Payment gateway for product purchases
- **Security**: PCI DSS compliant

### **API Security & Authentication**

#### **Authentication Methods**
- **API Keys**: Encrypted API keys for each supplier
- **OAuth 2.0**: Where supported by suppliers
- **JWT Tokens**: For secure API communication
- **Rate Limiting**: Prevents API abuse

#### **Data Encryption**
- **In Transit**: TLS 1.3 encryption for all API calls
- **At Rest**: AES-256 encryption for sensitive data
- **API Keys**: Encrypted in database
- **Metadata**: Encrypted JSON fields

---

## 🏦 **RECONCILIATION SYSTEM ARCHITECTURE**

### **Overview**
Automated, banking-grade multi-supplier transaction reconciliation system with self-healing capabilities and immutable audit trails.

### **Core Components**

#### **1. Reconciliation Tables**
```sql
-- Supplier Configurations
recon_supplier_configs (id, supplier_code, sftp_config, file_config, schedule)

-- Reconciliation Runs
recon_runs (id, supplier_config_id, file_name, file_hash, status, summary)

-- Transaction Matches
recon_transaction_matches (id, recon_run_id, external_ref, internal_ref, match_type, confidence, discrepancies)

-- Immutable Audit Trail
recon_audit_trail (id, recon_run_id, event_type, event_data, event_hash, previous_event_hash)
```

#### **2. Core Services**
1. **ReconciliationOrchestrator** - Workflow coordination
2. **AuditLogger** - Immutable audit trail with SHA-256 event chaining
3. **FileParserService** - Generic parser with supplier adapters
4. **MatchingEngine** - Exact + fuzzy matching (>99% match rate)
5. **DiscrepancyDetector** - 7 types of discrepancy detection
6. **SelfHealingResolver** - Auto-resolves 80% of discrepancies
7. **CommissionReconciliation** - Commission verification
8. **SFTPWatcherService** - Automated file ingestion from GCS
9. **ReportGenerator** - Excel/JSON reports
10. **AlertService** - Real-time email notifications

#### **3. Supplier Adapters**
- **MobileMartAdapter**: CSV parser for MobileMart recon files
- **FlashAdapter**: (Future) Flash recon file parser
- **ZapperAdapter**: (Future) Zapper recon file parser
- **Extensible**: Easy to add new suppliers

### **Reconciliation Workflow**
```
1. File Ingestion
   └─> SFTP Watcher monitors GCS bucket
   └─> SHA-256 hash for file integrity
   └─> Idempotency check (prevent duplicates)

2. File Parsing
   └─> Supplier-specific adapter
   └─> Schema validation
   └─> Data transformation

3. Transaction Matching
   └─> Exact matching (ref + amount)
   └─> Fuzzy matching (confidence scoring)
   └─> Match rate: >99% target

4. Discrepancy Detection
   └─> Missing transactions
   └─> Amount/status/timestamp mismatches
   └─> Product/commission mismatches

5. Self-Healing
   └─> Auto-resolve timing differences (±5 min)
   └─> Auto-resolve rounding (±R0.01)
   └─> Auto-resolve status normalization
   └─> 80% auto-resolution target

6. Reporting & Alerting
   └─> Excel/JSON report generation
   └─> Email alerts for critical issues
   └─> Real-time reconciliation analytics

7. Audit Trail
   └─> Immutable event log
   └─> SHA-256 event chaining
   └─> Cryptographic verification
```

### **Performance Characteristics**
- **Transaction Processing**: <200ms per transaction
- **Throughput**: 1M+ transactions per run
- **Match Rate**: >99% (exact + fuzzy)
- **Auto-Resolution**: 80% of discrepancies
- **API Response**: <500ms for all endpoints

### **Security Features**
- **File Integrity**: SHA-256 hashing
- **Idempotency**: Safe reprocessing
- **Event Integrity**: Blockchain-style chaining (without blockchain)
- **Access Control**: Admin-only endpoints
- **SFTP Security**: SSH keys + IP allowlisting

### **API Endpoints**
```
POST   /api/v1/reconciliation/trigger          - Start reconciliation
GET    /api/v1/reconciliation/runs             - List runs
GET    /api/v1/reconciliation/runs/:id         - Run details
POST   /api/v1/reconciliation/runs/:id/...     - Manual resolution
GET    /api/v1/reconciliation/suppliers        - List suppliers
POST   /api/v1/reconciliation/suppliers        - Configure supplier
GET    /api/v1/reconciliation/analytics        - Analytics
```

### **Integration Points**
- **SFTP Service**: Google Cloud Storage (`gs://mymoolah-sftp-inbound`)
- **Database**: PostgreSQL (4 tables, 15+ indexes)
- **Cache**: Redis (supplier configs, run status)
- **Email**: SMTP for alerts
- **Storage**: GCS for reconciliation files

---

## 🚀 **PERFORMANCE & SCALABILITY**

### **Performance Metrics**
- **Transaction Processing**: < 1 second average response time
- **Product Search**: < 100ms for catalog queries
- **Supplier Selection**: < 50ms for automatic supplier selection
- **Database Queries**: Optimized for sub-100ms response times

### **Scalability Features**
- **Horizontal Scaling**: Database can be sharded by supplier
- **Caching Layer**: Redis caching for frequently accessed data
- **Load Balancing**: Multiple API endpoints for high availability
- **Database Optimization**: Indexed queries for fast performance

### **Monitoring & Alerting**
- **Performance Monitoring**: Real-time transaction monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Health Checks**: Automated health checks for all services
- **Metrics Dashboard**: Real-time performance metrics

---

## 🔒 **SECURITY ARCHITECTURE**

### **Security Layers**
- **API Security**: Rate limiting, authentication, authorization
- **Data Security**: Encryption at rest and in transit
- **Access Control**: Role-based access control (RBAC)
- **Audit Logging**: Comprehensive audit trail for all operations

### **Compliance Standards**
- **ISO 27001**: Information security management
- **PCI DSS**: Payment card industry compliance
- **Mojaloop**: Financial services interoperability standards
- **GDPR**: Data protection and privacy compliance

---

## 📊 **CURRENT SYSTEM STATISTICS**

### **Product Catalog**
- **Total Products**: 172 base products
- **Total Variants**: 344 product variants
- **Active Suppliers**: 4 (Flash, MobileMart, dtMercury, Peach)
- **Categories**: 8 major product categories

### **Performance Metrics**
- **Transaction Volume**: Designed for millions of transactions
- **Response Time**: < 1 second average
- **Uptime**: 99.9% target availability
- **Error Rate**: < 0.1% target error rate

---

## 🔮 **FUTURE ARCHITECTURE ROADMAP**

### **Phase 1: Enhanced International Services**
- **International Airtime**: Cross-border airtime services
- **International Data**: Global data roaming packages
- **Multi-Currency**: Support for multiple currencies
- **Global Compliance**: International regulatory compliance

### **Phase 2: Advanced Analytics**
- **Predictive Analytics**: AI-powered product recommendations
- **Market Intelligence**: Real-time market analysis
- **Commission Optimization**: Machine learning for commission optimization
- **Performance Insights**: Advanced performance analytics

### **Phase 3: Blockchain Integration**
- **Smart Contracts**: Automated supplier agreements
- **Tokenization**: Digital asset tokenization
- **Decentralized Finance**: DeFi integration capabilities
- **Cross-Chain**: Multi-blockchain support

---

## 📚 **RELATED DOCUMENTATION**

- [Product Catalog Service](./PRODUCT_CATALOG_SERVICE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Security Documentation](./SECURITY.md)
- [Performance Documentation](./PERFORMANCE.md)

---

*This architecture document is maintained by the MyMoolah Development Team and updated regularly to reflect the current system state.* 