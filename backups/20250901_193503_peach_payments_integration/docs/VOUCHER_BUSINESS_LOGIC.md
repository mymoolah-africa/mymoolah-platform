# 🚨 VOUCHER BUSINESS LOGIC - IMMUTABLE RULES

## ⚠️ **CRITICAL WARNING - NEVER MODIFY**

**This document contains the IMMUTABLE business logic for the MyMoolah voucher system. These rules have been tested, verified, and are working correctly. Any AI agent that modifies these rules without crucial performance or security justification will cause business logic failures and incorrect balance calculations.**

---

## 📋 **Core Voucher Balance Calculation**

### **Active Vouchers = Active Status + Pending Payment Status**

The Dashboard "Active Vouchers" balance must include:
1. **Active MMVouchers**: Use `balance` field (remaining value)
2. **Pending EPVouchers**: Use `originalAmount` field (full value)

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

### **EPVouchers (14-digit EP Code)**
- **Expiry**: Automatic after 96 hours if not settled
- **Status Change**: `pending_payment` → `expired`
- **Balance Impact**: 
  - Voucher becomes **R0.00**
  - Wallet credited with **original amount**
- **Cancellation**: User can cancel before settlement
- **Status Change**: `pending_payment` → `cancelled`
- **Balance Impact**: Same as expiry

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
