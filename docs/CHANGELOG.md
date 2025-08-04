# MyMoolah Platform - Changelog

## **[Unreleased] - August 4, 2025**

### **🔄 Major System Improvements**

#### **Voucher Status Logic Optimization**
- **Fixed Status Logic**: Partially redeemed vouchers now show as "Active" (can still be used), fully redeemed vouchers show as "Redeemed" (balance = 0)
- **Database Updates**: Updated 4 vouchers (IDs 32, 33, 34, 35) from partially redeemed to fully redeemed
- **Frontend Consistency**: All voucher displays now use consistent status mapping
- **Status Filter Fix**: Fixed status filtering logic to work correctly without duplicates

#### **API Route Optimization**
- **Removed Duplicate Routes**: Eliminated conflicting `/redeemed` vs `/:voucher_id/redemptions` routes
- **Single Data Source**: All vouchers now fetched from `/api/v1/vouchers/` endpoint
- **Removed Redundant Endpoints**: Deleted separate EasyPay voucher endpoints (functionality integrated into main voucher system)
- **Clean Route Structure**: No more duplicate or conflicting API calls

#### **Frontend Display Fixes**
- **Consistent Partial Redemption Display**: All partial redemptions show "R[balance] of R[original]" format
- **Font Size Consistency**: 16-digit MM PIN on EasyPay vouchers now matches normal MyMoolah voucher size (16px)
- **Dashboard Terminology**: Changed "Open Vouchers" to "Active Vouchers" for consistency
- **Status Badge Consistency**: Proper status badges across all voucher types

#### **Database Cleanup**
- **Removed Malformed Records**: Deleted voucher with incorrect "EP-1754125987523-PENDING" format
- **Verified Data Integrity**: Confirmed no duplicate or malformed voucher records remain
- **Balance Corrections**: Updated voucher balances to reflect proper partial vs full redemptions

#### **System Architecture Improvements**
- **Single Table Design**: All vouchers (MM and EasyPay) now use unified `vouchers` table
- **Optimized Performance**: Reduced API calls and eliminated data duplication
- **Consistent Logic**: Dashboard and VouchersPage now use identical calculation methods

### **🐛 Bug Fixes**
- Fixed voucher status filtering inconsistency between Dashboard and VouchersPage
- Resolved API route conflicts causing duplicate data
- Corrected partial redemption display logic
- Fixed font size inconsistency for EasyPay voucher codes
- Removed malformed voucher records from database

### **📈 Performance Improvements**
- Reduced API calls by eliminating duplicate endpoints
- Optimized database queries with single table design
- Improved frontend rendering with consistent data structure
- Enhanced status filtering performance

---

## **[1.2.0] - August 3, 2025**

### **🆕 New Features**
- **EasyPay Voucher Integration**: Complete EasyPay voucher system with 14-digit Luhn algorithm numbers
- **Dual Display System**: EasyPay vouchers show both MM PIN and EasyPay number
- **Settlement Callback Processing**: Automatic MM voucher creation upon EasyPay settlement
- **Partial Redemption Support**: Vouchers can be partially redeemed with remaining balance tracking

### **🔄 Major Changes**
- **Unified Voucher System**: Single table design for all voucher types (MM and EasyPay)
- **Enhanced Status Management**: Pending → Active → Redeemed lifecycle
- **Improved Frontend Logic**: Better voucher type and status handling
- **Database Schema Optimization**: Streamlined voucher table structure

### **🐛 Bug Fixes**
- Fixed voucher status mapping inconsistencies
- Resolved EasyPay number generation issues
- Corrected voucher balance calculations
- Fixed frontend display formatting

---

## **[1.1.0] - August 2, 2025**

### **🆕 New Features**
- **Enhanced Voucher Management**: Improved voucher creation and redemption system
- **Status Tracking**: Better voucher status management (pending, active, redeemed, expired)
- **Frontend Improvements**: Enhanced voucher display and filtering
- **Database Optimization**: Improved voucher table structure

### **🔄 Major Changes**
- **Voucher Status Logic**: Improved status mapping and display
- **Frontend Consistency**: Better voucher type and status handling
- **API Endpoint Optimization**: Streamlined voucher-related endpoints
- **Database Schema Updates**: Enhanced voucher table with better indexing

### **🐛 Bug Fixes**
- Fixed voucher status display issues
- Resolved voucher balance calculation problems
- Corrected frontend filtering logic
- Fixed voucher creation validation

---

## **[1.0.0] - August 1, 2025**

### **🎉 Initial Release**
- **Core Voucher System**: Basic MM voucher functionality
- **User Authentication**: JWT-based authentication system
- **Dashboard**: Basic dashboard with wallet and voucher overview
- **Frontend Interface**: React-based voucher management interface
- **Backend API**: RESTful API for voucher operations
- **Database Integration**: SQLite database with Sequelize ORM

### **🆕 Features**
- **Voucher Generation**: Create MM vouchers with unique codes
- **Voucher Redemption**: Redeem vouchers with balance tracking
- **User Management**: User registration and authentication
- **Wallet Integration**: Basic wallet functionality
- **Frontend Dashboard**: User-friendly voucher management interface

### **🔧 Technical Implementation**
- **Backend**: Node.js + Express.js + Sequelize
- **Frontend**: React + TypeScript
- **Database**: SQLite (development)
- **Authentication**: JWT tokens
- **Security**: bcrypt password hashing

---

## **📋 Version History Summary**

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.2.0 | Aug 3, 2025 | EasyPay integration, unified voucher system |
| 1.1.0 | Aug 2, 2025 | Enhanced voucher management, status tracking |
| 1.0.0 | Aug 1, 2025 | Initial release with core voucher functionality |

---

## **🔗 Related Documentation**
- [API Documentation](./API_DOCUMENTATION.md)
- [Project Status](./PROJECT_STATUS.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

---

**Last Updated**: August 4, 2025  
**Current Version**: 1.2.1 (Unreleased)  
**Next Release**: Production testing and monitoring 