# Figma Integration Workflow - MyMoolah Platform

## 🎯 **CRITICAL WORKFLOW RULES**

### **Figma AI Agent is the SOURCE OF TRUTH**
- **ALL frontend `.tsx` pages are designed by Figma AI agents**
- **NEVER manually edit Figma-generated `.tsx` files**
- **Backend APIs MUST adapt to Figma code, not the other way around**
- **Figma code is the authoritative design and implementation**

### **File Location Rules**
- **ALL work must be done ONLY in `/mymoolah/` project directory**
- **NEVER create files in root directory (`/Users/andremacbookpro/`)**
- **ALL `.md` files must be in `/mymoolah/docs/` directory**
- **Frontend files go in `/mymoolah/mymoolah-wallet-frontend/`**

---

## **WORKFLOW PROCESS**

### **1. Figma AI Agent Creates Page**
```
Figma AI Agent → Creates .tsx file → Uploads to /mymoolah/mymoolah-wallet-frontend/pages/
```

### **2. Cursor AI Agent Integrates**
```
Cursor AI Agent → Reads Figma .tsx file → Adapts backend APIs → Tests integration
```

### **3. Integration Steps**
1. **Review Figma Code:** Understand the component structure and data requirements
2. **Identify API Needs:** Determine what backend endpoints are needed
3. **Adapt Backend:** Create/modify backend APIs to match Figma data structure
4. **Connect Frontend:** Wire Figma components to backend APIs
5. **Test Integration:** Ensure everything works together
6. **Document Changes:** Update all documentation in `/mymoolah/docs/`

---

## **SUCCESSFUL CASE STUDY: EasyPay Voucher Integration**

### **Figma AI Agent Created:**
- **File:** `VouchersPage.tsx` (existing, updated for EasyPay)
- **Location:** `/mymoolah/mymoolah-wallet-frontend/pages/`
- **Features:** Voucher display, EasyPay number formatting, status badges

### **Cursor AI Agent Integrated:**
- **Database Structure:** Added `easyPayNumber` field to vouchers table
- **Voucher Types:** Added `easypay_pending` voucher type to voucher_types table
- **Backend API:** Updated `/api/v1/vouchers/` to include `easyPayNumber` field
- **Frontend Integration:** Updated VouchersPage.tsx to handle EasyPay voucher display
- **EasyPay Number Generation:** Implemented proper 14-digit Luhn algorithm
- **Test Data:** Created 3 EasyPay vouchers with different statuses
- **CORS Configuration:** Added `192.168.3.176:3000` to allowed origins

### **Key Integration Points:**
```typescript
// EasyPay voucher interface
interface MMVoucher {
  id: string;
  type: 'mm_voucher' | 'easypay_voucher' | 'third_party_voucher';
  status: 'active' | 'pending' | 'redeemed' | 'expired' | 'cancelled';
  amount: number;
  currency: 'ZAR';
  voucherCode: string;
  easyPayNumber?: string; // For EasyPay vouchers
  createdDate: string;
  expiryDate: string;
  description: string;
  remainingValue: number;
  isPartialRedemption: boolean;
}

// EasyPay number formatting
const formatVoucherCodeForDisplay = (voucher: MMVoucher): string => {
  if (voucher.type === 'easypay_voucher') {
    if (voucher.easyPayNumber) {
      // Format 14-digit EasyPay number: 9 1234 3886 1924
      const epNumber = voucher.easyPayNumber;
      return `${epNumber.substring(0, 1)} ${epNumber.substring(1, 5)} ${epNumber.substring(5, 9)} ${epNumber.substring(9, 13)} ${epNumber.substring(13, 14)}`;
    }
    return voucher.voucherCode;
  }
  // ... MMVoucher formatting
};
```

### **EasyPay Voucher Flow:**
1. **PENDING EasyPay:** 14-digit number + "Get your MMVoucher at EasyPay Network"
2. **ACTIVE MMVoucher:** 16-digit PIN + EasyPay Number (smaller text)
3. **REDEEMED MMVoucher:** Fully used MMVoucher with original EasyPay number

---

## **SUCCESSFUL CASE STUDY: TransactionHistoryPage with Sorting Fixes**

### **Figma AI Agent Created:**
- **File:** `TransactionHistoryPage.tsx`
- **Location:** `/mymoolah/mymoolah-wallet-frontend/pages/`
- **Features:** Transaction list, filtering, search, export, pagination

### **Cursor AI Agent Integrated:**
- **Backend API:** Connected to `/api/v1/wallets/transactions`
- **Data Mapping:** Transformed backend data to match Figma interface
- **Navigation:** Added route to App.tsx and BottomNavigation.tsx
- **Styling:** Converted Tailwind classes to inline styles for consistency
- **Sorting Fixes:** Resolved transaction ordering issues in both Dashboard and Transaction History pages
- **Date Range Filter:** Implemented proper date filtering with visual indicators
- **UI Warnings:** Fixed button nesting warnings and cleaned up console logs
- **Testing:** Verified top banner and bottom navigation work correctly

### **Key Integration Points:**
```typescript
// Figma interface
interface Transaction {
  id: string;
  transactionId: string;
  type: 'send' | 'receive' | 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'refund' | 'fee';
  amount: number;
  currency: 'ZAR';
  recipient?: string;
  sender?: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed';
  timestamp: string;
  reference: string;
  fee?: number;
  method?: string;
  createdAt: string;
  updatedAt: string;
}

// Backend API response mapping
const transformedTransactions = data.data.transactions.map((tx: any) => ({
  id: tx.id.toString(),
  transactionId: tx.transactionId,
  type: tx.type,
  amount: parseFloat(tx.amount),
  currency: tx.currency || 'ZAR',
  recipient: tx.receiverWalletId || tx.recipient,
  sender: tx.senderWalletId || tx.sender,
  description: tx.description || 'Transaction',
  status: tx.status,
  timestamp: tx.createdAt,
  reference: tx.transactionId,
  fee: parseFloat(tx.fee || 0),
  method: tx.type === 'transfer' ? 'MyMoolah Internal' : 'Bank Transfer',
  createdAt: tx.createdAt,
  updatedAt: tx.updatedAt
}));
```

### **Navigation Integration:**
```typescript
// App.tsx - Route addition
<Route path="/transactions" element={<ProtectedRoute><TransactionHistoryPage /></ProtectedRoute>} />

// App.tsx - Top banner
const pagesWithTopBanner = ['/dashboard', '/send-money', '/transact', '/vouchers', '/profile', '/transactions'];

// BottomNavigation.tsx - Bottom navigation
const showBottomNav = ['/dashboard', '/send-money', '/transact', '/vouchers', '/profile', '/transactions'].includes(location.pathname);
```

---

## **INTEGRATION CHECKLIST**

### **Before Integration:**
- [ ] Figma AI agent has created the `.tsx` file
- [ ] File is in correct location (`/mymoolah/mymoolah-wallet-frontend/pages/`)
- [ ] Figma code is complete and functional
- [ ] No manual edits to Figma-generated code

### **During Integration:**
- [ ] Read and understand Figma component structure
- [ ] Identify required backend APIs
- [ ] Create/modify backend endpoints to match Figma data needs
- [ ] Wire frontend components to backend APIs
- [ ] Handle loading states and error states
- [ ] Test navigation integration (top banner, bottom navigation)
- [ ] Ensure responsive design works correctly

### **After Integration:**
- [ ] Test complete user flow
- [ ] Verify all features work (search, filter, export, etc.)
- [ ] Check navigation consistency
- [ ] Update documentation in `/mymoolah/docs/`
- [ ] Commit changes to Git
- [ ] Create backup

---

## **COMMON INTEGRATION PATTERNS**

### **Data Fetching Pattern:**
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const response = await fetch('/api/v1/endpoint', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    setData(result.data);
  } catch (err) {
    setError('Failed to load data');
  } finally {
    setLoading(false);
  }
};
```

### **Navigation Integration Pattern:**
```typescript
// App.tsx
import { NewPage } from './pages/NewPage';
<Route path="/new-page" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />

// Add to pagesWithTopBanner if needed
const pagesWithTopBanner = ['/dashboard', '/new-page'];

// BottomNavigation.tsx
const showBottomNav = ['/dashboard', '/new-page'].includes(location.pathname);
```

### **Styling Consistency Pattern:**
```typescript
// Convert Tailwind classes to inline styles
// Before: className="mb-6 bg-white border rounded-lg p-4"
// After: style={{ marginBottom: '24px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}
```

---

## **TROUBLESHOOTING**

### **Common Issues:**

#### **Navigation Not Showing:**
- Check if route is added to `pagesWithTopBanner` array
- Check if route is added to `showBottomNav` array in BottomNavigation.tsx
- Verify route path matches exactly

#### **Data Not Loading:**
- Check API endpoint URL
- Verify authentication token is present
- Check backend API is working
- Verify data transformation logic

#### **Styling Issues:**
- Convert all Tailwind classes to inline styles
- Ensure consistent styling with DashboardPage
- Check for layout interference (minHeight, etc.)

#### **File Location Issues:**
- Ensure all files are in `/mymoolah/` project directory
- Never create files in root directory
- All `.md` files must be in `/mymoolah/docs/`

---

## **QUALITY ASSURANCE**

### **Testing Checklist:**
- [ ] Page loads without errors
- [ ] Data displays correctly
- [ ] Loading states work
- [ ] Error states work
- [ ] Navigation works (top banner, bottom navigation)
- [ ] All interactive features work (search, filter, etc.)
- [ ] Responsive design works on mobile
- [ ] No console errors
- [ ] Performance is acceptable

### **Documentation Updates:**
- [ ] Update CHANGELOG.md with new features
- [ ] Update PROJECT_STATUS.md with current status
- [ ] Update API_DOCUMENTATION.md if new endpoints added
- [ ] Update FIGMA_API_WIRING.md with new integrations
- [ ] Update any other relevant documentation

---

## **BEST PRACTICES**

### **Code Organization:**
- Keep Figma-generated code unchanged
- Adapt backend APIs to match Figma requirements
- Use consistent naming conventions
- Follow existing code patterns

### **Error Handling:**
- Always handle loading states
- Always handle error states
- Provide user-friendly error messages
- Implement retry functionality where appropriate

### **Performance:**
- Use proper React hooks (useState, useEffect, useMemo)
- Optimize API calls
- Implement proper caching where needed
- Monitor bundle size

### **Security:**
- Always validate user inputs
- Use proper authentication
- Sanitize data before display
- Follow security best practices

---

**Last Updated:** July 29, 2025  
**Status:** TransactionHistoryPage successfully integrated following this workflow 