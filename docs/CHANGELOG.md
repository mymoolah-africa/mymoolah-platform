# MyMoolah Wallet - Changelog

## [2025-08-11] - Git Sync Hardening, Ignore Rules, and Docs Alignment
- Voucher redemption rule: enforce 16‑digit MMVoucher only; block 14‑digit EasyPay codes from redemption with a clear error. Updated backend and API docs.
- Added `scripts/git-sync-local.sh` and npm scripts:
  - `npm run sync:local` creates a timestamped snapshot branch from local work and prints a PR link
  - `npm run sync:pull` pulls the latest `main` safely
- Standardized Git workflow: always snapshot to `sync/local-YYYYMMDD-HHMM` (or cloud branch) and merge via PRs. See `docs/git-sync-workflow.md`.
- Tightened `.gitignore` to prevent accidental commits:
  - `google-cloud-sdk/`, `*.old`, `test-*.js`, `mymoolah-wallet-frontend/.env.local`, and `data/*.db`
  - Stopped tracking `data/mymoolah.db` and added `data/.gitkeep`
- Updated `docs/PORT_MATRIX.md` to clarify that `VITE_API_BASE_URL` should be the HOST ONLY (no trailing slash and no `/api/v1`).
- Clarified restart guidance and trust‑proxy/CORS notes in server docs; consolidated CORS in `server.js` and relaxed Helmet `connectSrc` to include `https:` when on Codespaces.


## [2025-08-08] - Treasury Platform Scope & DB Migration Documentation
- Added `docs/AGENT_ROLE_TEMPLATE.md` defining the Treasury Platform operating charter (wallet, general ledger, integrations, APIs).
- Documented SQLite (dev) → PostgreSQL (prod) migration directive with phased steps and rollback strategy.
- Linked the role template from `AGENT_HANDOVER.md`.

## [2025-08-05] - Critical Incident & Process Improvement

### 🛑 Incident: Overzealous Cleanup of Testing/Debugging Code
- During a cleanup operation, crucial testing and debugging scripts were removed in bulk, resulting in the loss of valuable work and hours of restoration effort.
- This is unacceptable for a production-grade, banking-compliant project.

### 🚨 New Policy (Effective Immediately)
- **All code cleanup, especially deletions, must be performed in small, incremental steps.**
- **After each small change, comprehensive tests must be run to ensure nothing is broken.**
- **No bulk deletions or mass cleanups without explicit, step-by-step review and confirmation.**
- **All testing/debugging scripts must be backed up or archived before removal.**
- **A clear, restorable backup must be created before any destructive operation.**
- **Every cleanup step must be documented in the changelog and session notes.**
- **If in doubt, always err on the side of caution and ask for explicit user confirmation.**

---

## [2025-08-05] - Voucher System Enhancements & Copy Functionality Fixes

### ✅ **EasyPay Automatic Expiration Handling**
- **Added**: Automatic processing of expired EasyPay vouchers with full refunds
- **Feature**: Runs every hour to check for expired vouchers
- **Refund Logic**: Full refund to user's wallet when EasyPay vouchers expire
- **Future Fee Capability**: Configurable expiry fee system (currently disabled)
- **Audit Trail**: Comprehensive transaction records with detailed metadata
- **Manual Trigger**: Admin endpoint for manual expiration processing
- **Bug Fix**: Resolved Sequelize association error in expiration handler

### ✅ **EasyPay Cancel Functionality**
- **Added**: User-initiated cancellation of pending EasyPay vouchers
- **Feature**: Small red "Cancel" button on pending EasyPay voucher cards
- **Refund Logic**: Immediate full refund to user's wallet upon cancellation
- **Confirmation Dialog**: Clear warning about cancellation being permanent
- **Audit Trail**: Complete transaction records with cancellation metadata
- **API Endpoint**: `POST /api/v1/vouchers/:voucherId/cancel`
- **User Experience**: Loading states, success/error toasts, automatic list refresh

### ✅ **EasyPay Voucher Formatting Fixes**
- **Fixed**: Cancelled EasyPay vouchers now display properly formatted 14-digit numbers
- **Format**: `9 1234 6042 6333 9` (as per EasyPay API requirements)
- **Status Handling**: Added `'cancelled'` status to voucher code formatting logic
- **Consistency**: Same formatting as pending EasyPay vouchers

### ✅ **Cancelled Vouchers in History**
- **Added**: "Cancelled" status option to voucher history filter dropdown
- **Fixed**: Frontend status mapping to include cancelled vouchers in API response
- **Display**: Cancelled vouchers show with red "Cancelled" badges
- **Filtering**: Users can now filter and view cancelled vouchers in history

### ✅ **Transaction Display Fixes**
- **Fixed**: Refund transactions now display as green credits instead of red debits
- **Updated**: Transaction type mapping to include `'refund'` as credit transaction
- **Consistency**: Proper color coding for all transaction types
- **User Experience**: Clear visual distinction between credits and debits

### ✅ **EasyPay Pending Expiry Information**
- **Added**: Expiry timestamp and payment instructions for EasyPay pending vouchers
- **Feature**: Shows "Expires: 10 Aug 2025, 18:03" and "Make payment at any EasyPay terminal"
- **Styling**: Orange background with clock icon and left border accent
- **Conditional**: Only displays for `voucher.type === 'easypay_voucher' && voucher.status === 'pending_payment'`
- **Easy Removal**: Well-commented for future changes

### ✅ **EasyPay Copy to Clipboard Function - FIXED**
- **Issue**: Copy button in voucher details popup wasn't working for EasyPay vouchers
- **Root Cause**: Using inline logic instead of centralized copy function
- **Solution**: Created dedicated `handleCopyEasyPayNumber()` function
- **Improvements**:
  - Proper formatting: `9 1234 0671 6648 2`
  - Success toast: "EasyPay number copied!"
  - Visual feedback: Green check icon when copied
  - Error handling: Graceful fallback if copy fails
  - TypeScript safety: Null checks for `easyPayNumber`

### ✅ **All Copy Functions Now Working**
- **Dashboard Voucher Cards**: Uses `handleCopyCode(voucher)` ✅
- **History Voucher Cards**: Uses `handleCopyCode(voucher)` ✅  
- **Details Popup MMVoucher**: Uses `handleCopyCode(selectedVoucher)` ✅
- **Details Popup EasyPay**: Uses `handleCopyEasyPayNumber(selectedVoucher.easyPayNumber)` ✅

### 🔧 **Technical Improvements**
- **Code Organization**: Separated EasyPay copy logic from regular voucher copy logic
- **Error Handling**: Added comprehensive error handling for clipboard operations
- **User Experience**: Consistent copy behavior across all voucher types
- **Type Safety**: Added proper TypeScript null checks

### 📋 **Files Modified**
- `mymoolah/mymoolah-wallet-frontend/pages/VouchersPage.tsx`
  - Added `handleCopyEasyPayNumber()` function
  - Fixed EasyPay copy button in details popup
  - Added EasyPay pending expiry information display
  - Improved conditional rendering logic

### 🎯 **User Experience Improvements**
- **EasyPay Pending Vouchers**: Clear expiry information and payment instructions
- **Copy Functionality**: All voucher types now have working copy buttons
- **Visual Feedback**: Consistent success indicators across all copy operations
- **Error Recovery**: Graceful handling of clipboard failures

---

## [2025-08-04] - Voucher Display Logic & Currency Formatting

### 🎫 **Voucher Display Logic Fix**
- **Corrected Voucher Status Logic:**
  - **Pending EasyPay**: Shows only EasyPay number (`9 1234 1385 1948 7`)
  - **Active EasyPay**: Shows MMVoucher code as main (`1093 2371 6105 6632`) + EasyPay as sub (`9 1234 1385 1948 7`)
  - **Regular MMVoucher**: Shows 16-digit code (`1234 5678 9012 3456`)

- **Fixed Voucher Number Formatting:**
  - All voucher numbers now display in groups of 4 digits
  - MMVoucher codes: `1234 5678 9012 3456`
  - EasyPay numbers: `9 1234 1385 1948 7`
  - Applied to TransactionHistoryPage, DashboardPage, and VouchersPage

- **Corrected Business Logic:**
  - **All vouchers are MMVouchers** (16 digits)
  - **EasyPay is a "type" of MMVoucher** (different purchase method)
  - **Process**: Create EasyPay → Settle → Activate MMVoucher
  - **MMVouchers only exist after settlement** (cannot be "Pending")

### 💰 **Currency Formatting Standardization**
- **Fixed Currency Display Inconsistencies:**
  - **Before**: `-R -500.00` (double negative) and `R -6,581.00` (inconsistent)
  - **After**: `R -500.00` (negative after currency) and `R -6,581.00` (consistent)

- **Applied Banking Standards:**
  - **Credits**: `R 900.00` (green, no + sign)
  - **Debits**: `R -500.00` (red, negative after currency)
  - **Consistent across**: TransactionHistoryPage, DashboardPage, Money Out summary

- **Updated Both Pages:**
  - TransactionHistoryPage: Fixed formatCurrency function
  - DashboardPage: Fixed formatCurrency function
  - Removed conditional negative signs from display logic

### 📱 **Transaction History Improvements**
- **Removed Clutter from Transaction Cards:**
  - Removed transaction ID (`TXN-1754426529429-3rw6jy970`)
  - Removed payment method (`Bank Transfer`)
  - **Kept**: Amount, description, date, status, icon, fee
  - Added cursor pointer for future details view

- **Enhanced Pagination:**
  - Increased default limit from 6 to 100 transactions
  - Added "Load More Transactions" button
  - Proper pagination with `page`, `limit`, `offset` parameters
  - Reset pagination on filter clear

- **Improved UX:**
  - Cleaner, more compact transaction cards
  - More transactions visible on screen
  - Professional banking app appearance
  - Future-ready for transaction details modal

### 🎨 **Frontend UX Enhancements**
- **Voucher Transaction Display:**
  - **Voucher Redemptions**: Green credit transactions with Gift icon
  - **Voucher Purchases**: Red debit transactions with Gift icon
  - **Correct Icons**: Gift icon for all voucher transactions
  - **Proper Colors**: Green for credits, red for debits

- **Transaction Type Mapping:**
  - Backend `deposit` → Frontend `received` (green)
  - Backend `payment` with "voucher purchase" → Frontend `purchase` (red)
  - Backend `payment` with "voucher redemption" → Frontend `received` (green)

### 🔧 **Technical Fixes**
- **Luhn Algorithm Correction:**
  - Fixed EasyPay number generation to use correct Luhn algorithm
  - Updated `generateLuhnCheckDigit` function per EasyPay API specification
  - Regenerated existing invalid EasyPay numbers in database
  - Fixed voucher creation with proper `voucherCode` field

- **Voucher Redemption Logic:**
  - Fixed voucher status update during redemption
  - Corrected balance calculation (`newBalance === 0` check)
  - Manually fixed voucher status inconsistencies in database

### 🛡️ **Data Integrity**
- **Database Corrections:**
  - Regenerated all existing EasyPay numbers with correct Luhn algorithm
  - Fixed voucher status mismatches (redeemed vouchers with positive balance)
  - Corrected voucher creation constraints (`voucherCode` not null)

### 📊 **Status Updates**
- **Voucher Status Logic:**
  - **Pending**: Only EasyPay number visible
  - **Active**: MMVoucher code + EasyPay number visible
  - **Redeemed**: Proper balance tracking and status updates

---

## [2025-08-04] - Major Cleanup & Voucher System Optimization

### 🧹 **Code Cleanup & Optimization**
- **Removed Debug/Test Code:**
  - Deleted `/test` and `/debug` endpoints from server.js
  - Removed test routes without authentication from vouchers.js
  - Removed `createTestBills` function from EasyPay controller
  - Removed temporary balance-summary-test route
  - Fixed duplicate port declaration in server.js
  - Removed unused express-validator imports

- **Removed Console.log Statements:**
  - Frontend: VouchersPage.tsx, BalanceCards.tsx, AuthContext.tsx
  - Backend: KYC controller (kept essential startup logs)
  - Cleaned up TODO comments

- **File Cleanup:**
  - Deleted 25+ backup summary text files
  - Removed all .DS_Store files from project
  - Fixed import paths (authMiddleware → auth.js)
  - Removed non-existent functions from routes

### 🎯 **Voucher System Improvements**
- **Navigation UI Enhancement:**
  - Increased navigation text size by 25% (12px → 15px)
  - Changed "Sell" tab to "Create" for better UX
  - Updated active navigation link styling (green text only)

- **Voucher Integration:**
  - Integrated wallet debit/credit with voucher operations
  - Added transaction logging for audit trails
  - Implemented proper voucher balance reconciliation
  - Fixed voucher code cleaning (removes spaces and non-digits)

- **Database Optimization:**
  - Single-table voucher structure for better performance
  - Proper foreign key relationships
  - Optimized SQLite connection pool configuration
  - Removed SQLITE_BUSY errors through transaction management

### 🔧 **Bug Fixes**
- Fixed voucher redemption input to accept 16-digit codes with/without spaces
- Corrected partial redemption display format
- Fixed voucher balance calculations between Dashboard and VouchersPage
- Resolved TypeScript type issues with easyPayCode property
- Fixed server startup issues with missing imports and functions

### 📊 **Data Management**
- **Voucher Status Updates:**
  - Changed 4 specific vouchers to fully redeemed (R0.00 balance)
  - Updated voucher creation dates to be more realistic
  - Removed malformed voucher with incorrect format
  - Ensured consistent voucher totals across components

- **EasyPay Voucher Lifecycle:**
  - Pending → Active → Redeemed status flow
  - 96-hour expiration for pending vouchers
  - 12-month expiration for active vouchers
  - Proper linking between EasyPay and MM vouchers

### 🛡️ **Security & Compliance**
- Removed unauthenticated test endpoints
- Maintained proper authentication middleware
- Kept Mojaloop compliance standards
- Enhanced input validation and sanitization

### 📈 **Performance Improvements**
- Optimized database queries
- Reduced memory usage through cleanup
- Improved frontend rendering performance
- Enhanced API response times

---

## [2025-08-03] - Voucher System Integration

### 🎫 **Voucher System Implementation**
- **EasyPay Voucher Features:**
  - Value range: R50 minimum, R4000 maximum
  - 4-day expiration for pending vouchers
  - No SMS notifications (direct display in VouchersPage)
  - Dual display: 16-digit MMVoucher + 14-digit EasyPay number
  - Payment simulation for testing (later removed)

- **Database Structure:**
  - Single-table approach for all voucher types
  - Proper foreign key relationships
  - Optimized for security and performance
  - Mojaloop-compliant design

### 🔄 **Wallet Integration**
- **Voucher Issuance:** Debits user wallet balance
- **Voucher Redemption:** Credits user wallet balance
- **Transaction Logging:** Complete audit trail
- **Balance Reconciliation:** Proper wallet/voucher balance sync

### 🎨 **Frontend Enhancements**
- **VouchersPage Updates:**
  - EasyPay voucher type badge (blue "EasyPay")
  - Proper status display (Pending, Active, Redeemed)
  - Correct text sizing for voucher numbers
  - Improved navigation styling

- **Dashboard Integration:**
  - Changed "Open Vouchers" to "Active Vouchers"
  - Proper voucher balance reconciliation
  - Consistent totals between components

---

## [2025-08-02] - Authentication & Security

### 🔐 **Authentication System**
- JWT token implementation
- Secure password hashing with bcrypt
- CORS configuration for cross-origin requests
- Rate limiting for API endpoints

### 🛡️ **Security Enhancements**
- Helmet.js for security headers
- Input validation and sanitization
- SQL injection prevention
- XSS protection

---

## [2025-08-01] - Initial Setup

### 🏗️ **Project Foundation**
- Node.js backend with Express.js
- React frontend with TypeScript
- SQLite database for development
- Docker configuration for production
- Git workflow setup

### 📱 **Core Features**
- User registration and authentication
- Wallet management system
- Transaction history
- KYC verification system
- Support ticket system

---

## [2025-07-30] - Project Initialization

### 🚀 **Project Creation**
- Initial MyMoolah fintech platform setup
- Mojaloop compliance framework
- Banking-grade security implementation
- Development environment configuration 