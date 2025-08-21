# Agent Handover Document

**Last Updated:** 2025-08-20  
**Current Version:** 2.1.0  
**Status:** Active Development - Services Consolidation Complete

## 🚨 CRITICAL: VOUCHER BUSINESS LOGIC - NEVER CHANGE

### IMMUTABLE BUSINESS RULES - DO NOT MODIFY

The voucher balance calculation logic in `controllers/voucherController.js` has been tested and verified to work correctly. Changing this logic will result in incorrect balances and business logic failures.

**BUSINESS RULES:**
1. **Active Vouchers = Active Status + Pending Payment Status**
2. **Active MMVouchers**: use balance field (remaining value)
3. **Pending EPVouchers**: use originalAmount field (full value)
4. **Cross-user redemption**: Creator's voucher balance debited, Redeemer's wallet credited
5. **NEVER use single SQL aggregation** - ALWAYS use the working JavaScript logic

**VIOLATION OF THESE RULES WILL RESULT IN INCORRECT BALANCES.**
**ONLY MODIFY IF THERE ARE CRUCIAL PERFORMANCE OR SECURITY RISKS.**

## Current Project State

### ✅ Recently Completed (v2.0.0)
- **Wallet Balance Badges**: Added to Vouchers, Send Money, and QR Payment pages
- **Bottom Navigation Fix**: Resolved missing icons on QR Payment page
- **Frontend Build Optimization**: Resolved all build warnings and optimizations
- **Ledger Service**: Added draft posting functions for VAS purchases and PayShap RTP
- **Documentation**: Updated all documentation files to reflect current state

### 🔄 In Progress
- **Airtime Page Development**: Next major feature to be implemented
- **Dynamic Supplier Integration**: Real-time supplier product availability
- **OpenAI Product Screening**: Daily automated product optimization

### 📋 Upcoming Features
- **Airtime & Data Services**: Complete airtime and data purchase functionality
- **Global Services**: International airtime, data, and electricity services
- **Enhanced Notifications**: Improved notification delivery and management

## Architecture Overview

### Backend Architecture
```
Node.js + Express.js Server
├── Authentication Middleware (JWT)
├── API Routes (28+ endpoints)
├── Database Layer (Sequelize ORM)
├── Supplier Integration Services
├── Transaction Processing Engine
├── Ledger Service (Double-entry accounting)
└── Error Handling & Logging
```

### Frontend Architecture
```
React + TypeScript + Vite
├── Component Library (Consistent design system)
├── State Management (Context API)
├── API Service Layer
├── Routing & Navigation
├── Error Boundaries
├── Modern UI Components
└── Responsive Design (Mobile-first)
```

### Database Architecture
```
PostgreSQL (Cloud SQL)
├── Users & Authentication
├── Wallets & Balances
├── Transactions (Full Audit Trail)
├── KYC & Verification
├── Vouchers (Internal & EasyPay)
├── Supplier Data & Products
├── Ledger Accounts & Journal Entries
└── Integration Metadata
```

## Key Technical Decisions

### 1. Event-Driven Architecture
- **Removed polling** in favor of event-driven refresh
- **Component-level data fetching** for scalability
- **Optimistic updates** for better UX
- **WebSocket ready** for real-time features

### 2. Performance Optimization
- **Keyset pagination** for transaction endpoints
- **Database indexes** for critical queries
- **Code splitting** for frontend bundles
- **Caching strategies** for supplier data

### 3. Security & Compliance
- **JWT authentication** with secure token handling
- **Banking-grade audit trail** for all transactions
- **KYC integration** for user verification
- **Encrypted data storage** for sensitive information

## Critical Files & Components

### Backend Critical Files
- `controllers/voucherController.js` - **IMMUTABLE** voucher balance logic
- `controllers/transactionController.js` - Transaction processing
- `controllers/walletController.js` - Wallet operations
- `services/ledgerService.js` - Double-entry accounting
- `middleware/auth.js` - Authentication middleware
- `models/` - Database models and relationships

### Frontend Critical Files
- `pages/DashboardPage.tsx` - Main dashboard with balance cards
- `pages/TransactPage.tsx` - Supplier integration page
- `pages/SendMoneyPage.tsx` - Money transfer functionality
- `pages/VouchersPage.tsx` - Voucher management
- `components/BottomNavigation.tsx` - Navigation system
- `services/apiService.ts` - API integration layer

### Configuration Files
- `.env` - Environment variables
- `config/config.json` - Application configuration
- `vite.config.ts` - Frontend build configuration
- `package.json` - Dependencies and scripts

## Database Schema

### Core Tables
- `users` - User accounts and authentication
- `wallets` - Wallet balances and metadata
- `transactions` - Complete transaction history
- `vouchers` - Voucher creation and management
- `kyc` - KYC verification data
- `ledger_accounts` - Chart of accounts
- `journal_entries` - Double-entry transactions

### Supplier Tables
- `flash_products` - Flash supplier products
- `mobilemart_products` - MobileMart products
- `easypay_transactions` - EasyPay integration
- `peach_payments` - Peach Payments integration

## API Endpoints

### Core Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/wallets/balance` - Wallet balance
- `GET /api/v1/wallets/transactions` - Transaction history
- `POST /api/v1/transactions/send-money` - Money transfer
- `GET /api/v1/vouchers/balance-summary` - Voucher balances

### Supplier Endpoints
- `GET /api/v1/flash/products` - Flash products
- `POST /api/v1/flash/purchase` - Flash purchase
- `GET /api/v1/mobilemart/products` - MobileMart products
- `POST /api/v1/easypay/generate-voucher` - EasyPay voucher

## Development Workflow

### Environment Setup
1. **Backend**: `npm install && npm start` (runs on port 3001)
2. **Frontend**: `cd mymoolah-wallet-frontend && npm install && npm run dev`
3. **Database**: PostgreSQL with Cloud SQL proxy
4. **Environment**: Copy `.env.template` to `.env` and configure

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Consistent code style
- **Prettier**: Code formatting
- **Git**: Feature branch workflow

### Testing
- **Unit Tests**: Jest framework
- **Integration Tests**: API endpoint testing
- **Manual Testing**: User acceptance testing

## Known Issues & Workarounds

### 1. Voucher Balance Calculation
- **Issue**: Complex cross-user redemption logic
- **Solution**: Use multiple-query JavaScript logic (NOT single SQL aggregation)
- **Status**: ✅ Resolved and documented

### 2. Transaction Display Colors
- **Issue**: Credit/debit color confusion
- **Solution**: Consistent green=credit, red=debit logic
- **Status**: ✅ Resolved

### 3. Bottom Navigation
- **Issue**: Missing icons on QR Payment page
- **Solution**: Added `/qr-payment` to navigation arrays
- **Status**: ✅ Resolved

### 4. Build Warnings
- **Issue**: CSS nesting and dynamic imports
- **Solution**: Flattened CSS and standardized imports
- **Status**: ✅ Resolved

## Performance Considerations

### Backend Performance
- **Database Queries**: Optimized with proper indexes
- **API Response Time**: < 200ms for most endpoints
- **Caching**: Supplier data cached for 5-15 minutes
- **Connection Pooling**: Efficient database connections

### Frontend Performance
- **Bundle Size**: Optimized with code splitting
- **Load Time**: < 2 seconds initial load
- **Memory Usage**: Efficient component lifecycle
- **Mobile Optimization**: Responsive design

## Security Considerations

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds
- **Session Management**: Secure session handling
- **Rate Limiting**: API endpoint protection

### Data Protection
- **Encryption**: Data encryption at rest and in transit
- **Audit Trail**: Complete transaction logging
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Proper cross-origin handling

## Deployment & Operations

### Production Deployment
- **Backend**: Node.js on cloud platform
- **Frontend**: Static hosting with CDN
- **Database**: Cloud SQL with automated backups
- **Monitoring**: Application performance monitoring

### Backup & Recovery
- **Database Backups**: Automated daily backups
- **Code Backups**: Git repository with version control
- **Configuration**: Environment-specific configurations
- **Disaster Recovery**: Automated recovery procedures

## Next Development Phase

### Immediate Priorities (Next 2-4 weeks)
1. **Airtime Page Development**: Complete airtime purchase functionality
2. **Dynamic Supplier Integration**: Real-time supplier product availability
3. **OpenAI Product Screening**: Daily automated product optimization
4. **Testing & QA**: Comprehensive testing of new features

### Development Approach
1. **Backend First**: API endpoints and business logic
2. **Frontend Integration**: UI components and user experience
3. **Testing**: Unit, integration, and user acceptance testing
4. **Documentation**: Update documentation and guides
5. **Deployment**: Production deployment and monitoring

## Business Logic Summary

### Voucher System
- **Internal Vouchers**: 16-digit codes, 12-month expiry, redeemable by anyone
- **EasyPay Vouchers**: 14-digit codes, 96-hour expiry, settle at EP merchants
- **Cross-user Redemption**: Creator's voucher balance debited, redeemer's wallet credited
- **Expiration Logic**: MM vouchers refund remaining balance, EP vouchers refund original amount

### Transaction Types
- **Wallet-to-Wallet**: Direct transfers between users
- **Supplier Purchases**: Airtime, data, electricity, etc.
- **Voucher Redemption**: Internal and third-party redemption
- **Bank Transfers**: PayShap RTP integration

### Balance Calculations
- **Wallet Balance**: Sum of all wallet transactions
- **Voucher Balance**: Active + Pending Payment vouchers
- **Transaction Colors**: Green for credits, red for debits
- **Audit Trail**: Complete transaction history with full references

## Contact & Support

### Development Team
- **Primary Contact**: Current development team
- **Documentation**: Comprehensive documentation in `/docs/`
- **Code Repository**: Git with full version history
- **Issue Tracking**: Documented issues and resolutions

### Emergency Procedures
- **Critical Issues**: Immediate rollback to last stable version
- **Data Recovery**: Automated backup restoration
- **Security Incidents**: Immediate security patch deployment
- **Performance Issues**: Load balancing and optimization

---

**This document should be updated with each major development phase to ensure continuity and knowledge transfer.**