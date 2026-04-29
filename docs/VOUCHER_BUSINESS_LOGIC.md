# 🚨 VOUCHER BUSINESS LOGIC - IMMUTABLE RULES

## ⚠️ **CRITICAL WARNING - NEVER MODIFY**

**This document contains the IMMUTABLE business logic for the MyMoolah voucher system. These rules have been tested, verified, and are working correctly. Any AI agent that modifies these rules without crucial performance or security justification will cause business logic failures and incorrect balance calculations.**

---

## 📋 **Core Voucher Balance Calculation**

### **Active Vouchers = Active Status + Pending Payment Status**

The Dashboard "Active Vouchers" balance must include:
1. **Active MMVouchers**: Use `balance` field (remaining value)
2. **Pending EPVouchers**: Use `originalAmount` field (full value)
   - **EXCEPTION**: `easypay_topup` vouchers are excluded (user hasn't paid yet)

**Implementation**: This logic is implemented in JavaScript, NOT in SQL aggregation.

---

## 🔄 **Transaction Types & Balance Impact**

### 1. **Wallet-to-Wallet Transfers**
- **Process**: User A → User B
- **Impact**: Sender debited, Receiver credited
- **Icon**: Wallet icon
- **Type**: Internal MyMoolah transfer

### 2. **Voucher Redemption (Internal)**
- **Process**: User A creates MMVoucher → User B redeems
- **Impact**: 
  - User A: Active voucher balance **debited** (decreases)
  - User B: Wallet balance **credited** (increases)
- **Icon**: Voucher icon
- **Type**: Voucher redemption

### 3. **Supplier Purchases (VAS)**
- **Process**: User → Supplier (airtime, data, electricity)
- **Impact**: User wallet debited, Supplier credited
- **Icon**: Service-specific icon
- **Type**: Value Added Service

### 4. **Third-Party Voucher Redemption**
- **Process**: User MMVoucher → 3rd Party System
- **Impact**: 
  - User: Active voucher balance **debited**
  - Supplier Account: **credited**
- **Icon**: Voucher icon
- **Type**: External voucher redemption

---

## ⏰ **Expiry & Cancellation Logic**

### **MMVouchers (16-digit)**
- **Expiry**: Automatic after 12 months
- **Status Change**: `active` → `expired`
- **Balance Impact**: 
  - Voucher becomes **R0.00**
  - Wallet credited with **current balance** (not original)
- **Cancellation**: **NOT ALLOWED**

### **EPVouchers (14-digit EP Code) - Traditional**
- **Expiry**: Automatic after 30 days if not settled
- **Status Change**: `pending_payment` → `expired`
- **Balance Impact**:
  - Voucher becomes **R0.00**
  - Wallet credited with **original amount**
- **Cancellation**: User can cancel before settlement
- **Status Change**: `pending_payment` → `cancelled`
- **Balance Impact**: Same as expiry
- **Asset Treatment**: Counted as active assets (user has paid upfront)

### **EPVouchers (14-digit EP Code) - Top-up @ EasyPay**
- **Creation**: No upfront payment required
- **Settlement**: User pays at EasyPay store, wallet credited with net amount
- **Status Change**: `pending_payment` → `redeemed` (consumed)
- **Balance Impact**:
  - Wallet credited with **gross amount - fees** (net amount)
  - Voucher consumed (balance = 0)
- **Fees**: R2.50 total (R2.00 provider + R0.50 MyMoolah margin)
- **Asset Treatment**: **NOT counted as active assets** (user hasn't paid yet)
- **Exception**: This is the ONLY exception to the "Active Vouchers = Active Status + Pending Payment Status" rule

### **EPVouchers (14-digit EP Code) - Standalone Voucher**
- **Creation**: Wallet debited immediately (voucher amount + transaction fee)
- **Status**: Created as `active` (not `pending_payment`)
- **Usage**: Can only be used at EasyPay merchants (online or in-store), **NOT redeemable in wallet**
- **Settlement**: When used at merchant, EasyPay sends callback, status changes to `redeemed`
- **Status Change**: `active` → `redeemed` (when used at merchant)
- **Balance Impact**:
  - Wallet already debited on creation (no credit on settlement)
  - Voucher consumed (balance = 0)
- **Fees**: Transaction fee (R2.50 default, configurable) charged on creation
- **Expiry**: 30 days from creation
- **Cancellation**: Available while `active`, refunds voucher amount + transaction fee
- **Asset Treatment**: Counted as active assets (user has paid upfront)
- **Badge**: Shows "EPVoucher" (blue #2D8CCA) to distinguish from other EasyPay types
- **PIN Format**: 14 digits starting with 9, format: X XXXX XXXX XXXX X (9 + 4-digit MM code 5063 + 8 digits + 1 check digit)

---

## 🏗️ **Implementation Requirements**

### **DO NOT DO:**
- ❌ Use single SQL aggregation for voucher balance calculations
- ❌ Change the JavaScript business logic implementation
- ❌ Modify the status-based calculation approach
- ❌ Remove cross-user redemption logic

### **MUST MAINTAIN:**
- ✅ Multiple-query approach with JavaScript business logic
- ✅ Status-based calculations (active + pending_payment = active vouchers)
  - **EXCEPTION**: `easypay_topup` vouchers excluded from active calculation
- ✅ Cross-user redemption impact on balances
- ✅ Proper field usage (balance vs originalAmount)

---

## 🔒 **Security & Performance Exceptions**

**The ONLY acceptable reasons to modify this logic are:**
1. **Critical Security Vulnerabilities** (SQL injection, authentication bypass)
2. **Severe Performance Issues** (response times > 5 seconds for millions of users)
3. **Database Schema Changes** (mandatory by compliance requirements)

**Any other modifications require explicit user approval and thorough testing.**

---

## 📝 **Code Location**

- **Controller**: `controllers/voucherController.js` - `getVoucherBalanceSummary()`
- **Documentation**: This file and `AGENT_HANDOVER.md`
- **Last Verified**: Current session - balances working correctly for both User ID 1 and 2

---

## 🚫 **Consequences of Violation**

**Modifying these rules will result in:**
- ❌ Incorrect Dashboard balances
- ❌ Wrong transaction calculations
- ❌ Business logic failures
- ❌ User account discrepancies
- ❌ Potential financial reporting errors

**RESPECT THESE RULES - THEY ARE THE FOUNDATION OF THE SYSTEM.**
