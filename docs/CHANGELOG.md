# MyMoolah Treasury Platform - Changelog

All notable changes to the MyMoolah Treasury Platform will be documented in this file.

## [3.3.0] - 2025-08-19

### Added
- **Dashboard Voucher Counter Enhancement**: Active vouchers counter now includes both "Active" status vouchers and "Pending Payment" status EasyPay vouchers
- **Dynamic Registration Date**: Profile page now displays actual user registration date instead of hardcoded text
- **Beautiful Success Modal**: Replaced browser `alert()` popups with custom-designed modal dialogs for voucher operations
- **SVG Logo Integration**: TopBanner now uses `logo.svg` with fallback to gradient text
- **Logo Size Enhancements**: Doubled size of logos on TopBanner and LoginPage for better visibility
- **LoginPage UI Improvements**: Reduced gap between logo and "Sign In" text, moved card up with negative margin

### Fixed
- **React Ref Warning**: Fixed Button component to properly handle refs using React.forwardRef
- **Transaction Icon System**: Standardized transaction icons across Dashboard, Transaction History, and Send Money pages
- **Transaction Color Logic**: Corrected transaction display colors (green for credits, red for debits)
- **Missing Transactions**: Fixed transaction display issues on Dashboard, Transaction History, and Send Money pages
- **Transaction Type Mapping**: Updated frontend to match backend's transformed transaction types
- **Voucher Expiration Logic**: Enhanced voucher expiration to handle both EasyPay and MM vouchers with proper refund logic
- **Timezone Handling**: Fixed voucher expiry timezone to display correctly as local time (SAST)
- **User CreatedAt Field**: Added `createdAt` field to user data for dynamic registration date display

### Changed
- **Transaction Icon Rules**: Implemented new icon system with wallet, ticket, arrows, airtime, data, electricity icons
- **Voucher Expiration System**: Updated to handle both EasyPay (refund original amount) and MM vouchers (refund remaining balance)
- **UI Consistency**: Standardized transaction display across all pages with consistent icons and colors
- **Logo Display**: TopBanner now uses SVG logo with localStorage toggle for easy switching
- **LoginPage Layout**: Improved spacing and positioning for better visual hierarchy

### Technical Improvements
- **TypeScript Fixes**: Resolved various TypeScript errors with proper type assertions
- **Component Architecture**: Improved Button component with proper ref forwarding
- **API Integration**: Enhanced transaction data handling with proper wallet ID mapping
- **Error Handling**: Replaced browser alerts with custom error components
- **Code Quality**: Improved maintainability and consistency across components

## [3.2.0] - 2025-08-17

### Added
- **Database Integrity Restoration**: Complete audit trail compliance achieved
- **Wallet Reference Mapping**: All transactions now have complete sender/receiver wallet references
- **Regulatory Compliance**: Banking-grade audit requirements met

### Fixed
- **Transaction Display Issues**: Resolved duplicate names and incorrect descriptions in frontend
- **Frontend Description Logic**: Simplified to use backend descriptions directly without parsing
- **Backend Transaction Creation**: Corrected transaction description formatting
- **Missing Wallet References**: Restored senderWalletId and receiverWalletId for all 24 transactions
- **Audit Trail Completeness**: Every transaction now has full wallet references for money flow tracing

### Changed
- **Transaction Format**: Standardized to `<Counterparty> | <User Description>` format
- **Frontend Logic**: Removed unnecessary description parsing and formatting
- **Database Structure**: Unified wallet reference structure across all transaction types

### Technical Improvements
- **SendMoneyPage.tsx**: Cleaned up transaction mapping logic and description construction
- **DashboardPage.tsx**: Simplified getPrimaryDisplayText function
- **TransactionHistoryPage.tsx**: Removed reference concatenation from getPrimaryText function
- **Database Queries**: Optimized wallet reference restoration queries

## [3.1.0] - 2025-08-16

### Fixed
- **Duplicate Transaction References**: Removed duplicate " — Ref:" concatenation from frontend display
- **Transaction Description Format**: Cleaned up transaction mapping logic in SendMoneyPage.tsx
- **Frontend Display Logic**: Removed unnecessary reference concatenation from TransactionHistoryPage.tsx
- **Transaction Display Consistency**: Both sent and received transactions now show clean, readable descriptions

### Changed
- **SendMoneyPage.tsx**: Cleaned up transaction mapping and removed hardcoded references
- **TransactionHistoryPage.tsx**: Simplified getPrimaryText function to remove reference concatenation
- **Transaction Display Format**: Now follows rule `<Sender> | <Description of transaction entered by sender>`

### Technical Improvements
- **Frontend Logic**: Streamlined transaction description handling
- **Code Quality**: Removed duplicate reference logic and improved maintainability
- **User Experience**: Cleaner, more readable transaction descriptions

## [3.0.0] - 2025-08-14

### Added
- **Complete Frontend Integration**: All major pages connected to real backend APIs
- **API Service Layer**: Comprehensive backend integration with error handling
- **Real-time Data**: Replaced hardcoded dummy data with live API responses
- **Type Safety**: Full TypeScript integration with proper interfaces

### Changed
- **TransactPage**: Connected to real supplier data APIs
- **SendMoneyPage**: Full payment flow with recipient resolution
- **DashboardPage**: Real-time wallet balance and transaction history
- **TransactionHistoryPage**: Complete transaction listing with search/filter

### Technical Improvements
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Professional loading indicators for all API calls
- **API Integration**: 28 endpoints fully integrated with frontend

## [2.0.0] - 2025-08-12

### Added
- **Supplier Integration System**: Complete integration with EasyPay, Flash, and MobileMart
- **AI-Powered Comparison**: Smart supplier comparison with best deals detection
- **Real-time Data**: Live supplier data and dynamic pricing
- **Comprehensive API Coverage**: 17+ supplier API endpoints

### Changed
- **Database Schema**: Extended with supplier-specific tables and models
- **API Architecture**: Modular supplier integration system
- **Performance**: Optimized database queries and caching

## [1.0.0] - 2025-08-10

### Added
- **Core Wallet System**: Basic wallet functionality with PostgreSQL
- **Authentication**: JWT-based user authentication system
- **Database Infrastructure**: PostgreSQL setup with Sequelize ORM
- **Project Foundation**: Organized project structure and development tools

### Technical Foundation
- **PostgreSQL Database**: Cloud SQL instance with local development proxy
- **Node.js Backend**: Express.js server with comprehensive middleware
- **React Frontend**: TypeScript-based frontend with modern UI components
- **Development Tools**: Hot reload, linting, and debugging setup

---

## Version History

- **3.3.0** (2025-08-19): UI/UX enhancements, voucher system improvements, and various fixes
- **3.2.0** (2025-08-17): Database integrity restoration and transaction display fixes
- **3.1.0** (2025-08-16): Transaction description display improvements
- **3.0.0** (2025-08-14): Complete frontend integration with backend APIs
- **2.0.0** (2025-08-12): Supplier integration system and AI comparison
- **1.0.0** (2025-08-10): Core wallet system and project foundation

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 