# MyMoolah Platform - Development Guide

## **🚀 Getting Started**

### **Prerequisites**
- Node.js v22.16.0 or higher
- npm or yarn package manager
- Git for version control
- SQLite (development) / MySQL (production)

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

# Initialize database
npm run init-db

# Start development server
npm start
```

### **2. Working Directory Rules**
- **✅ Always work in `/mymoolah/` directory**
- **❌ Never work in root directory**
- **✅ All code changes in subdirectories**
- **✅ Documentation updates in `/docs/`**

### **3. Frontend Development**
- **Source of Truth**: Figma AI-generated components
- **Location**: `/mymoolah-wallet-frontend/pages/`
- **No Manual Edits**: Don't edit `.tsx` files directly (will be overwritten by Figma updates)
- **Integration**: Adapt backend APIs to match Figma components

### **4. Backend Development**
- **API Design**: RESTful endpoints with consistent response format
- **Database**: Single table design for vouchers (MM + EasyPay)
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

### **Currency Formatting Standards (Updated August 5, 2025)**
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
  if (backendType === 'deposit') return 'received';
  if (backendType === 'payment') {
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
```javascript
// config/database.js
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './data/mymoolah.db'
  },
  production: {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  }
};
```

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
- **Database**: SQLite Browser for development
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

**Last Updated**: August 4, 2025  
**Version**: 1.2.1  
**Status**: Production Ready 

## 🛑 Critical Process Policy: Incremental Cleanup & Testing

- All code cleanup (especially deletions) must be performed in small, incremental steps.
- After each small change, comprehensive tests must be run to ensure nothing is broken.
- No bulk deletions or mass cleanups without explicit, step-by-step review and confirmation.
- All testing/debugging scripts must be backed up or archived before removal.
- A clear, restorable backup must be created before any destructive operation.
- Every cleanup step must be documented in the changelog and session notes.
- If in doubt, always err on the side of caution and ask for explicit user confirmation. 