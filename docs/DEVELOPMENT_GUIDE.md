# MyMoolah Platform - Development Guide

## **🚀 Getting Started**

### **Prerequisites**
- Node.js 18+
- npm
- Git
- PostgreSQL (Google Cloud SQL)
- Cloud SQL Auth Proxy (local dev)

### **Project Structure**
```
mymoolah/
├── server.js                 # Main server entry point
├── models/                   # Database models
│   └── voucherModel.js      # Unified voucher model
├── controllers/              # Business logic
│   └── voucherController.js # Voucher operations
├── routes/                   # API endpoints
│   └── vouchers.js          # Voucher routes
├── config/                   # Configuration files
│   └── security.js          # Security settings
├── mymoolah-wallet-frontend/ # Frontend application
│   └── pages/               # React components
└── docs/                    # Documentation
```

---

## **🔧 Development Workflow**

### **1. Environment Setup**
```bash
# Clone repository
git clone <repository-url>
cd mymoolah

# Install dependencies
npm install

# Start backend
npm start
```

### **2. Working Directory Rules**
- **✅ Always work in `/mymoolah/` directory**
- **❌ Never work in root directory**
- **✅ All code changes in subdirectories**
- **✅ Documentation updates in `/docs/`**

### **2.1 Git Sync (Local-first)**
- Use the helper scripts:
  - From your Mac: `cd /Users/andremacbookpro/mymoolah && npm run sync:local` to snapshot and push a PR branch
  - Pull latest main: `cd /Users/andremacbookpro/mymoolah && npm run sync:pull`
- Never force-push to `main`. Always merge via PRs. See `docs/git-sync-workflow.md` for the full playbook.

### **3. Frontend Development**
- **Source of Truth**: Figma AI-generated components
- **Location**: `/mymoolah-wallet-frontend/pages/`
- **No Manual Edits**: Don't edit `.tsx` files directly (will be overwritten by Figma updates)
- **Integration**: Adapt backend APIs to match Figma components

### **4. Backend Development**
- **API Design**: RESTful endpoints with consistent response format
- **Database**: PostgreSQL (Cloud SQL). Single-table voucher design (MM + EasyPay)
- **Security**: JWT authentication + banking-grade encryption
- **Validation**: Comprehensive input validation and error handling

---

## **📋 Current System Architecture**

### **Voucher System (Unified Design)**
```javascript
// Single table for all voucher types
const Voucher = sequelize.define('Voucher', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  voucherCode: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  easyPayCode: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  originalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  status: { 
    type: DataTypes.ENUM('pending_payment', 'active', 'redeemed', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending_payment'
  },
  voucherType: {
    type: DataTypes.ENUM('mm_voucher', 'easypay_voucher', 'third_party_voucher'),
    allowNull: false,
    defaultValue: 'mm_voucher'
  },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  redemptionCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  maxRedemptions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  metadata: { type: DataTypes.JSON, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
});
```

### **Voucher Display Logic (Updated August 5, 2025)**
```javascript
// Correct business logic: All vouchers are MMVouchers
const formatVoucherCodeForDisplay = (voucher) => {
  if (voucher.type === 'mm_voucher') {
    // Regular MMVoucher: 16 digits in groups of 4
    return { mainCode: '1234 5678 9012 3456' };
  } else if (voucher.type === 'easypay_voucher') {
    if (voucher.status === 'pending_payment') {
      // Pending: Show only EasyPay number
      return { mainCode: '9 1234 1385 1948 7' };
    } else if (voucher.status === 'active') {
      // Active: Show MMVoucher as main, EasyPay as sub
      return { 
        mainCode: '1093 2371 6105 6632',
        subCode: '9 1234 1385 1948 7'
      };
    }
  }
};
```

### **Currency Formatting Standards (Updated Aug 12, 2025)**
```javascript
// Banking standards: Negative sign after currency
const formatCurrency = (amount) => {
  if (amount < 0) {
    return `R -${Math.abs(amount).toLocaleString('en-ZA', { 
      minimumFractionDigits: 2 
    })}`;
  }
  return `R ${amount.toLocaleString('en-ZA', { 
    minimumFractionDigits: 2 
  })}`;
};

// Examples:
// Credits: R 900.00 (green, no + sign)
// Debits: R -500.00 (red, negative after currency)
```

### **Redemption Rules (Updated Aug 11, 2025)**
```text
- Only 16‑digit MMVoucher codes can be redeemed
- 14‑digit EasyPay codes are display/settlement only and cannot be redeemed
- Settlement converts EasyPay → MMVoucher (active) and sets balance=originalAmount
```

### **Transaction Display Standards**
```javascript
// Voucher transaction mapping
const getTransactionDisplay = (transaction) => {
  if (transaction.description.includes('voucher')) {
    return {
      icon: <Gift />,
      color: transaction.type === 'received' ? 'green' : 'red',
      amount: formatCurrency(transaction.amount)
    };
  }
};

// Transaction type mapping
const mapTransactionType = (backendType, description) => {
  if (backendType === 'deposit' || backendType === 'refund' || backendType === 'receive') return 'received';
  if (backendType === 'payment' || backendType === 'debit' || backendType === 'send') {
    if (description.includes('voucher purchase')) return 'purchase';
    if (description.includes('voucher redemption')) return 'received';
  }
  return 'sent';
};
```

### **Status Logic (Frontend Mapping)**
```javascript
// Consistent status mapping across all components
const mapVoucherStatus = (voucher) => {
  if (voucher.status === 'pending_payment') {
    return 'pending_payment';
  } else if (voucher.status === 'expired') {
    return 'expired';
  } else if (voucher.status === 'redeemed') {
    const balance = parseFloat(voucher.balance || 0);
    if (balance === 0) {
      return 'redeemed'; // Fully redeemed
    } else {
      return 'active'; // Partially redeemed - still active
    }
  } else {
    return 'active';
  }
};
```

### **API Response Format**
```javascript
// Standard API response structure
{
  success: true,
  data: {
    vouchers: [
      {
        id: 1,
        voucherCode: "MMVOUCHER_1754321424055_abc123",
        easyPayCode: "91234388661929",
        originalAmount: "500.00",
        balance: "250.00",
        status: "active",
        voucherType: "easypay_active",
        expiresAt: "2026-08-04T14:15:13.040Z"
      }
    ]
  }
}
```

---

## **🎯 Development Best Practices**

### **1. Code Organization**
- **Models**: Database schema and relationships
- **Controllers**: Business logic and data processing
- **Routes**: API endpoint definitions
- **Frontend**: React components with TypeScript

### **2. Error Handling**
```javascript
// Standard error handling pattern
try {
  const result = await someOperation();
  res.json({ success: true, data: result });
} catch (err) {
  console.error('❌ Operation error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Operation failed' 
  });
}
```

### **3. Database Operations**
```javascript
// Use Sequelize for all database operations
const voucher = await Voucher.create({
  voucherCode: generateMMVoucherCode(),
  originalAmount: amount,
  balance: amount,
  status: 'active',
  voucherType: 'standard',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});
```

### **4. API Design**
- **RESTful**: Use standard HTTP methods (GET, POST, PUT, DELETE)
- **Consistent**: Same response format across all endpoints
- **Validated**: Input validation on all endpoints
- **Documented**: Clear API documentation with examples

---

## **🔒 Security Guidelines**

### **1. Authentication**
- **JWT Tokens**: Secure token-based authentication
- **Token Storage**: Secure localStorage management
- **Token Refresh**: Automatic token refresh mechanism

### **2. Input Validation**
```javascript
// Validate all inputs
const validateVoucherAmount = (amount) => {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 5 || numAmount > 4000) {
    throw new Error('Voucher value must be between 5.00 and 4000.00');
  }
  return numAmount;
};
```

### **3. Data Protection**
- **Encryption**: Sensitive data encrypted at rest
- **HTTPS**: Required for all communications
- **CORS**: Proper cross-origin resource sharing
- **Rate Limiting**: Prevent abuse of API endpoints

---

## **📊 Testing Strategy**

### **1. Unit Testing**
```javascript
// Test voucher status logic
describe('Voucher Status Logic', () => {
  test('should map partially redeemed to active', () => {
    const voucher = { status: 'redeemed', balance: 250 };
    const result = mapVoucherStatus(voucher);
    expect(result).toBe('active');
  });
});
```

### **2. Integration Testing**
- **API Endpoints**: Test all voucher operations
- **Database Operations**: Verify data integrity
- **Frontend Integration**: Test component interactions

### **3. Performance Testing**
- **API Response Time**: < 200ms for all operations
- **Database Queries**: Optimized single table queries
- **Frontend Rendering**: Smooth, responsive interface

---

## **🚀 Deployment Guidelines**

### **1. Environment Configuration**
- Backend `.env` (local proxy):
```env
DATABASE_URL=postgres://mymoolah_app:<PASSWORD>@127.0.0.1:5433/mymoolah
DB_DIALECT=postgres
```
- Start the proxy in a separate terminal:
```bash
./bin/cloud-sql-proxy --address 127.0.0.1 --port 5433 mymoolah-db:africa-south1:mmtp-pg
```
- Frontend `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:3001
```
- Note: If you connect via public IP instead of the proxy, set `DATABASE_URL` to the instance host with `sslmode=require` and make sure your Mac IP is authorized in Cloud SQL.

### **2. Production Checklist**
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Monitoring tools configured
- [ ] Backup procedures in place

### **3. Monitoring**
- **Health Checks**: Regular system health monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: API response time tracking
- **User Analytics**: Voucher usage analytics

---

## **📝 Documentation Standards**

### **1. Code Documentation**
```javascript
/**
 * Issue a new voucher with the specified amount
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Created voucher data
 */
exports.issueVoucher = async (req, res) => {
  // Implementation
};
```

### **2. API Documentation**
- **OpenAPI/Swagger**: Complete API specification
- **Request/Response Examples**: Clear examples for all endpoints
- **Error Codes**: Comprehensive error documentation
- **Authentication**: Clear authentication requirements

### **3. User Documentation**
- **Setup Guide**: Step-by-step installation instructions
- **User Guide**: End-user documentation
- **Troubleshooting**: Common issues and solutions
- **FAQ**: Frequently asked questions

---

## **🔗 Key Resources**

### **Development Tools**
- **IDE**: Visual Studio Code with TypeScript support
- **Database**: PostgreSQL (Cloud SQL). For local inspection use `psql` or TablePlus.
- **API Testing**: Postman or Insomnia
- **Version Control**: Git with GitHub

### **Documentation**
- [API Documentation](./API_DOCUMENTATION.md)
- [Project Status](./PROJECT_STATUS.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Security Compliance](./SECURITY_COMPLIANCE_CERTIFICATE.md)

### **External Resources**
- [Mojaloop Documentation](https://docs.mojaloop.io/)
- [Sequelize Documentation](https://sequelize.org/)
- [React Documentation](https://reactjs.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

## **🎯 Success Metrics**

### **Code Quality**
- **Test Coverage**: > 80% for critical components
- **Code Review**: All changes reviewed before merge
- **Documentation**: Complete and up-to-date
- **Performance**: < 200ms API response times

### **User Experience**
- **Voucher Management**: Intuitive creation and redemption
- **Status Clarity**: Clear distinction between voucher states
- **Error Handling**: Helpful error messages
- **Mobile Experience**: Optimized for mobile use

### **System Reliability**
- **Uptime**: 99.9% system availability
- **Error Rate**: < 1% for all operations
- **Data Integrity**: No data corruption or loss
- **Security**: No security vulnerabilities

---

**Last Updated**: August 12, 2025  
**Version**: 1.3.0  
**Status**: Production Ready (PostgreSQL)

## 🛑 Critical Process Policy: Incremental Cleanup & Testing

- All code cleanup (especially deletions) must be performed in small, incremental steps.
- After each small change, comprehensive tests must be run to ensure nothing is broken.
- No bulk deletions or mass cleanups without explicit, step-by-step review and confirmation.
- All testing/debugging scripts must be backed up or archived before removal.
- A clear, restorable backup must be created before any destructive operation.
- Every cleanup step must be documented in the changelog and session notes.
- If in doubt, always err on the side of caution and ask for explicit user confirmation. 

## Voucher Copy Functionality (2025-08-05)

### EasyPay Copy Function
```typescript
const handleCopyEasyPayNumber = async (easyPayNumber: string) => {
  const formattedNumber = easyPayNumber.slice(0, 1) + ' ' + 
                         easyPayNumber.slice(1, 5) + ' ' + 
                         easyPayNumber.slice(5, 9) + ' ' + 
                         easyPayNumber.slice(9, 13) + ' ' + 
                         easyPayNumber.slice(13);
  
  await navigator.clipboard.writeText(formattedNumber);
  setCopiedCode(formattedNumber);
  // Shows success toast and green check icon
};
```

### All Copy Functions Working
- **Dashboard Cards**: `handleCopyCode(voucher)`
- **History Cards**: `handleCopyCode(voucher)`  
- **Details Popup MMVoucher**: `handleCopyCode(selectedVoucher)`
- **Details Popup EasyPay**: `handleCopyEasyPayNumber(selectedVoucher.easyPayNumber)`

### EasyPay Pending Expiry Information
```typescript
{voucher.type === 'easypay_voucher' && voucher.status === 'pending_payment' && (
  <div style={{ 
    marginTop: '8px', 
    padding: '8px 12px', 
    backgroundColor: '#fef3c7', 
    border: '1px solid #f59e0b', 
    borderRadius: '6px',
    borderLeft: '3px solid #f59e0b'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
      <Clock style={{ width: '10px', height: '10px', color: '#f59e0b' }} />
      <span style={{ color: '#f59e0b', fontWeight: '600' }}>
        Expires: {formatDate(voucher.expiryDate)}
      </span>
    </div>
    <span style={{ color: '#d97706', fontWeight: '500' }}>
      Make payment at any EasyPay terminal
    </span>
  </div>
)}
```

## EasyPay Automatic Expiration Handling (2025-08-05)

### Configuration
```javascript
const EASYPAY_EXPIRATION_CONFIG = {
  ENABLE_EXPIRY_FEE: false, // Future implementation - currently no fee
  EXPIRY_FEE_PERCENTAGE: 0.05, // 5% fee when enabled
  MIN_EXPIRY_FEE: 5.00, // Minimum R5.00 fee
  MAX_EXPIRY_FEE: 50.00, // Maximum R50.00 fee
  REFUND_DESCRIPTION: 'EasyPay voucher expired - full refund',
  FEE_DESCRIPTION: 'EasyPay voucher expired - processing fee',
  REFUND_DESCRIPTION_WITH_FEE: 'EasyPay voucher expired - refund minus processing fee'
};
```

### Automatic Processing
- **Frequency**: Runs every hour automatically
- **Scope**: Only processes EasyPay vouchers with `pending_payment` status
- **Action**: Updates status to `expired` and refunds user's wallet
- **Audit**: Creates detailed transaction records with metadata

### Manual Trigger Endpoint
```bash
POST /api/v1/vouchers/trigger-expiration
Authorization: Bearer <admin_token>
```

### Future Fee Implementation
When `ENABLE_EXPIRY_FEE: true`:
- **Fee Calculation**: 5% of original amount (min R5, max R50)
- **Refund Amount**: Original amount minus fee
- **Transaction Records**: Separate refund and fee transactions
- **Audit Trail**: Complete metadata for compliance

## EasyPay Cancel Functionality (2025-08-05)

### API Endpoint
```bash
POST /api/v1/vouchers/:voucherId/cancel
Authorization: Bearer <user_token>
```

### Business Logic
```javascript
// Validation checks
- Voucher must be pending_payment status
- Voucher must not be expired
- Voucher must not be settled (callback received)
- User must own the voucher

// Actions performed
- Update status: pending_payment → cancelled
- Refund full amount to user's wallet
- Create refund transaction record
- Add comprehensive audit trail
```

### Frontend Implementation
```typescript
const handleCancelEasyPayVoucher = async (voucher: MMVoucher) => {
  // Show confirmation dialog
  // Make API call to cancel endpoint
  // Show loading state
  // Display success/error toast
  // Refresh voucher list
};
```

### User Experience
- **Cancel Button**: Small red button with X icon
- **Confirmation Dialog**: Clear warning about permanent cancellation
- **Loading State**: Orange toast during processing
- **Success Feedback**: Green toast with refund amount
- **Error Handling**: Red toast with error message
- **Auto Refresh**: Voucher list updates automatically 

## EasyPay Voucher Formatting (2025-08-05)

### Cancelled Voucher Display
```typescript
// Format cancelled EasyPay vouchers
} else if (voucher.status === 'cancelled') {
  if (voucher.easyPayNumber) {
    const epNumber = voucher.easyPayNumber;
    return {
      mainCode: `${epNumber.substring(0, 1)} ${epNumber.substring(1, 5)} ${epNumber.substring(5, 9)} ${epNumber.substring(9, 13)} ${epNumber.substring(13, 14)}`
    };
  }
}
```

### Format Requirements
- **14-digit EasyPay numbers**: `9 1234 6042 6333 9`
- **Consistent spacing**: Groups of 4 digits with spaces
- **Status handling**: All EasyPay statuses (pending, active, cancelled, redeemed) 