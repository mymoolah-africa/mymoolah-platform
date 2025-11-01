# Transaction Icon CSS System - Centralized Styling Guide

**Last Updated**: October 31, 2025  
**Purpose**: Centralized CSS-based transaction icon styling system

---

## 🎯 **Overview**

All transaction icons now use **CSS classes** instead of inline styles only. This allows you to control icon appearance globally through `globals.css` without modifying individual pages.

---

## ✅ **What's Been Fixed**

### **1. Enhanced Zapper Detection**
- ✅ Detects Zapper transactions by multiple patterns:
  - Description contains: `'qr payment'`, `'zapper'`, `'qr code'`, `'zapper float'`, `'zapper transaction'`, `'zapper payment'`
  - Metadata contains: `processingSource === 'zapper'`, `zapperTransactionId`, `qrType === 'zapper'`
- ✅ **All Zapper transactions now show QR icons** (not arrows)

### **2. CSS Class System**
- ✅ All icons now have CSS classes for centralized control
- ✅ Color classes: `.transaction-icon-credit` (green) and `.transaction-icon-debit` (red)
- ✅ Type classes: `.transaction-icon-zapper`, `.transaction-icon-voucher`, etc.

---

## 🎨 **CSS Classes Available**

### **Base Class**
```css
.transaction-icon
```
Applied to all transaction icons - base styling.

### **Type Classes**
```css
.transaction-icon-zapper      /* Zapper QR payments */
.transaction-icon-voucher    /* Voucher transactions */
.transaction-icon-airtime    /* Airtime purchases */
.transaction-icon-data       /* Data purchases */
.transaction-icon-electricity /* Electricity purchases */
.transaction-icon-banking    /* External bank transfers */
.transaction-icon-wallet     /* Internal wallet transfers */
.transaction-icon-default    /* Default arrow icons */
```

### **Color Classes**
```css
.transaction-icon-credit     /* Green (#16a34a) for money in */
.transaction-icon-debit      /* Red (#dc2626) for money out */
```

---

## 🔧 **How to Customize Icons**

### **Example: Change Zapper Icon Color**
```css
/* In globals.css */
.transaction-icon-zapper.transaction-icon-debit {
  color: #dc2626 !important; /* Red for debits */
}

.transaction-icon-zapper.transaction-icon-credit {
  color: #16a34a !important; /* Green for credits */
}
```

### **Example: Change Icon Size Globally**
```css
.transaction-icon {
  width: 24px !important;
  height: 24px !important;
}
```

### **Example: Add Hover Effects**
```css
.transaction-icon-zapper:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}
```

---

## 📋 **Icon Detection Logic**

Icons are determined in this order:

1. **Zapper QR Payments** → QR icon (red/green)
2. **Vouchers** → Ticket icon (red/green)
3. **Airtime** → Phone icon (red/green)
4. **Data** → Wifi icon (red/green)
5. **Electricity** → Zap icon (red/green)
6. **Banking** → Arrow icons (red/green)
7. **Wallet Transfers** → Wallet icon (red/green)
8. **Default** → Arrow icons (red/green)

---

## 🚀 **Future Changes**

To change icon appearance globally:

1. **Open**: `mymoolah-wallet-frontend/styles/globals.css`
2. **Find**: The `.transaction-icon-*` classes
3. **Modify**: Add your CSS rules
4. **Result**: Changes apply to all pages automatically

**No need to modify individual pages!**

---

## 📝 **Example Use Cases**

### **Change All Zapper Icons to Blue**
```css
.transaction-icon-zapper {
  color: var(--mymoolah-blue) !important;
}
```

### **Make Debit Icons More Red**
```css
.transaction-icon-debit {
  color: #b91c1c !important; /* Darker red */
}
```

### **Add Border to QR Icons**
```css
.transaction-icon-zapper {
  border: 2px solid var(--mymoolah-green);
  border-radius: 4px;
  padding: 2px;
}
```

---

## ✅ **Current Status**

- ✅ All Zapper transactions show QR icons
- ✅ Red QR icons for debits (money out)
- ✅ Green QR icons for credits (money in)
- ✅ CSS classes applied to all icons
- ✅ Centralized styling system ready

---

## 📍 **Files Modified**

1. **`mymoolah-wallet-frontend/utils/transactionIcons.tsx`**
   - Enhanced Zapper detection
   - Added CSS classes to all icons

2. **`mymoolah-wallet-frontend/styles/globals.css`**
   - Added transaction icon CSS classes
   - Centralized color and styling system

3. **`controllers/qrPaymentController.js`**
   - Added Zapper metadata to transactions

---

**Now you can control all transaction icons globally through CSS!** 🎉

