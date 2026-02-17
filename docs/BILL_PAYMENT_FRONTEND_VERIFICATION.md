# Bill Payment Frontend Guide

**Date**: January 10, 2026  
**Status**: ✅ Backend Fixed - Frontend Testing Required  
**Version**: v2.4.46

---

## 🔍 **Problem Analysis** (Original Issue)

**Symptoms**: Bill payment overlay showed categories but no billers/companies.  
**Root Cause**: MobileMart API does NOT provide category information in product list endpoints. Sync script did not add `metadata.category`, so all products had `metadata.category = null` and billers did not display.

---

## 📋 **What Was Fixed**

### **Backend Fixes (All Complete ✅)**

1. **Provider Field Correction**
   - **Before**: `provider: "retail"` (generic category from MobileMart API)
   - **After**: `provider: "Pepkor Trading (Pty) Ltd"` (actual company name)
   - **Impact**: All 1,293 bill-payment products now have correct company names

2. **Category Metadata Added**
   - **Before**: 960 products with NULL categories
   - **After**: All 1,293 products categorized
   - **Categories**: insurance (25), entertainment (5), education (25), municipal (188), telecoms (14), retail (19), other (1,017)

3. **Backend Search Fixed**
   - **Before**: Searched `provider` field (generic categories)
   - **After**: Searches `product.name` field (actual company names)
   - **Impact**: Searching for "pep" now returns "Pepkor Trading (Pty) Ltd"

### **Database State (Staging)**
- ✅ 1,293 bill-payment products in Staging
- ✅ All have valid categories
- ✅ All have correct provider names
- ✅ Backend APIs `/api/v1/overlay/bills/search` and `/api/v1/overlay/bills/categories` working correctly

---

## 🎯 **Frontend Configuration**

### **API Base URL**

The frontend uses `VITE_API_BASE_URL` environment variable:

```typescript
// mymoolah-wallet-frontend/config/app-config.ts
const API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
  ? (import.meta as any).env.VITE_API_BASE_URL
  : 'http://localhost:3001';  // Default for local development
```

**For Staging (Codespaces)**:
- Set `VITE_API_BASE_URL` to your Codespaces backend URL (port 3001)
- Example: `https://scaling-space-happiness-p7r4p6j6jv6fvr56-3001.app.github.dev`

### **Current Deployment Status**

| Environment | Frontend Port | Backend Port | Status |
|------------|---------------|--------------|--------|
| **Local** | 3000 | 3001 | ✅ Working |
| **Codespaces** | 3000 | 3001 | ⚠️ Needs verification |
| **Staging (Cloud Run)** | 80 | 3001 (via Cloud SQL) | ⚠️ Needs verification |

---

## ✅ **Frontend Testing Checklist**

### **Test 1: Bill Payment Overlay Opens**

1. Open MyMoolah Wallet in Staging
2. Navigate to **Pay Bills** section
3. **Expected**: Bill payment overlay opens with category tabs

**Success Criteria**:
- ✅ Overlay opens without errors
- ✅ Category tabs visible (Insurance, Entertainment, Education, Municipal, Telecoms, Retail)
- ✅ Search bar visible

---

### **Test 2: Search Function Works**

1. In bill payment overlay, click search bar
2. Type: `"pep"`
3. **Expected**: Returns **"Pepkor Trading (Pty) Ltd"** under **Retail** category

**Success Criteria**:
- ✅ Search returns results
- ✅ "Pepkor Trading (Pty) Ltd" is visible
- ✅ Category is "Retail"
- ✅ Can select biller

---

### **Test 3: Category Filter Works**

1. In bill payment overlay, click **Municipal** tab
2. **Expected**: Shows 188 municipal billers (City councils, utilities)

**Success Criteria**:
- ✅ Tab switches correctly
- ✅ Only municipal billers displayed
- ✅ Billers sorted alphabetically
- ✅ No duplicate billers

---

### **Test 4: Education Category (Only 2 Selections)**

**Issue Reported**: User saw "only 2 selections" in education category

1. Click **Education** tab
2. **Expected**: Shows 25 education billers (schools, universities, colleges)

**Possible Issues**:
- ❌ Frontend not fetching all products
- ❌ Frontend filtering incorrectly
- ❌ Duplicate detection removing valid billers
- ❌ Pagination/limit issue

**Debug Steps**:
1. Open browser DevTools → Network tab
2. Click Education tab
3. Check API call to `/api/v1/overlay/bills/search?category=education`
4. Verify response contains 25 billers

---

### **Test 5: Full Bill Payment Flow**

1. Search for "Pepkor Trading (Pty) Ltd"
2. Select biller
3. Enter account number
4. Enter amount
5. Confirm payment

**Success Criteria**:
- ✅ Biller details load correctly
- ✅ Amount validation works
- ✅ Payment confirmation shows correct details
- ✅ Payment processes successfully

---

## 🔍 **Debugging Frontend Issues**

### **Issue: "Only 2 selections showing in education category"**

**Root Causes to Check**:

1. **Frontend Duplicate Detection Too Aggressive**
   - Check `BillPaymentOverlay.tsx` for duplicate filtering logic
   - May be grouping different schools under same name

2. **Frontend Pagination/Limit**
   - Check if frontend limits results to small number
   - Look for `slice()`, `take()`, or `limit` in code

3. **API Response Not Reaching Frontend**
   - Use DevTools Network tab to verify API returns all 25 products
   - Check console for JavaScript errors

4. **Category Mapping Issue**
   - Frontend may not recognize "education" category
   - Check category constants in frontend code

### **Debug Commands**

```bash
# In Codespaces, test backend API directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://YOUR_CODESPACES_URL:3001/api/v1/overlay/bills/categories"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://YOUR_CODESPACES_URL:3001/api/v1/overlay/bills/search?category=education"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "billers": [
      { "id": "...", "name": "Richfield Graduate Institute...", "category": "education" },
      { "id": "...", "name": "Some University", "category": "education" },
      // ... 25 total education billers
    ]
  }
}
```

---

## 📝 **Files Modified**

### **Backend (All Committed to Git)**

1. `scripts/sync-mobilemart-production-to-staging.js`
   - Changed `provider` field to use `productName` instead of `contentCreator`

2. `routes/overlayServices.js`
   - Updated search logic to prioritize `product.name` over `provider`

3. `scripts/categorize-bill-payment-products.js`
   - Updated to use `product.name` for categorization
   - Filters for NULL categories only
   - Defaults to Staging environment

4. `scripts/debug-bill-payment-products.js`
   - New script for debugging bill-payment products in Staging

---

## 🚀 **Next Steps**

### **Immediate (Required)**

1. **Verify Frontend Wiring in Codespaces**
   - Check if frontend is running in Codespaces
   - Verify `VITE_API_BASE_URL` points to Codespaces backend (port 3001)
   - Open frontend in browser and test bill payment overlay

2. **Debug "Only 2 selections" Issue**
   - Open DevTools → Network tab
   - Click Education category
   - Verify API response contains all 25 education billers
   - Check frontend console for errors

3. **Test All Categories**
   - Insurance (25 products)
   - Entertainment (5 products)
   - Education (25 products)
   - Municipal (188 products)
   - Telecoms (14 products)
   - Retail (19 products)

### **Optional (Improvements)**

1. **Add More Keywords to Categorization**
   - Current script may miss some companies
   - Review "other" category (1,017 products) for miscategorizations

2. **Frontend UX Improvements**
   - Add loading states
   - Add error handling for empty categories
   - Add "No results" message when search returns 0 billers

3. **Deploy to Staging Cloud Run**
   - Update Cloud Run deployment with new backend changes
   - Verify frontend works in production staging environment

---

## 📊 **Success Metrics**

### **Backend (All Complete ✅)**
- ✅ 1,293 bill-payment products in Staging
- ✅ 0 products with NULL categories (down from 960)
- ✅ All products have correct provider names
- ✅ Search API returns correct results
- ✅ Category API returns all 7 categories

### **Frontend (Needs Verification ⚠️)**
- ⚠️ Bill payment overlay opens correctly
- ⚠️ Search function works (e.g., "pep" returns Pepkor)
- ⚠️ All 7 categories display correctly
- ⚠️ Education category shows all 25 billers (not just 2)
- ⚠️ Merchant search function works
- ⚠️ Full payment flow completes successfully

---

## 🆘 **Troubleshooting**

### **Frontend Not Loading Products**

**Check**:
1. Frontend is connected to Staging backend (port 3001)
2. User is authenticated (valid JWT token)
3. CORS is configured correctly in backend
4. Network tab shows successful API calls

**Fix**:
```bash
# In backend .env (Codespaces)
CORS_ORIGINS=https://YOUR_CODESPACES_URL-3000.app.github.dev
```

### **"Only 2 Selections" in Education**

**Check**:
1. API response has all 25 products
2. Frontend duplicate detection logic
3. Frontend pagination/limit
4. Console errors

**Debug**:
```javascript
// In BillPaymentOverlay.tsx, add logging:
console.log('Education billers:', billers.filter(b => b.category === 'education'));
```

---

**Last Updated**: January 10, 2026  
**Status**: Backend fixes complete ✅ | Frontend verification pending ⚠️  
**Next**: Test frontend in Codespaces and verify all categories display correctly
