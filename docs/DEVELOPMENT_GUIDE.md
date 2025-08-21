# MyMoolah Development Guide

**Last Updated**: August 20, 2025  
**Version**: 2.0.0  
**Status**: ✅ **PRODUCTION READY - DEVELOPMENT PHASE**

---

## 🚀 **Quick Start**

### **Prerequisites**
- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 8+ (comes with Node.js)
- **PostgreSQL**: Version 13+ (local or cloud)
- **Git**: Version 2.30+
- **Google Cloud SQL**: For production database

### **Environment Setup**
```bash
# Clone repository
git clone [repository-url]
cd mymoolah

# Install backend dependencies
npm install

# Install frontend dependencies
cd mymoolah-wallet-frontend
npm install
cd ..
```

### **Configuration**
```bash
# Copy environment template
cp env.template .env

# Edit .env with your credentials
# Required variables:
# - DATABASE_URL
# - JWT_SECRET
# - Service provider API keys
```

### **Database Setup**
```bash
# Start database (if using Docker)
docker-compose up -d postgres

# Or connect to Google Cloud SQL
# Use the cloud-sql-proxy script in scripts/

# Run migrations
npx sequelize-cli db:migrate

# Seed initial data (optional)
npx sequelize-cli db:seed:all
```

### **Start Development Servers**
```bash
# Terminal 1: Backend (port 3001)
npm run dev

# Terminal 2: Frontend (port 3000)
cd mymoolah-wallet-frontend
npm run dev
```

---

## 🏗️ **Project Architecture**

### **Backend Structure**
```
mymoolah/
├── controllers/          # Business logic controllers
├── models/              # Database models and schemas
├── routes/              # API endpoint definitions
├── services/            # Core business services
├── middleware/          # Authentication and validation
├── migrations/          # Database schema changes
├── seeders/             # Database seed data
├── scripts/             # Utility and setup scripts
├── docs/                # Project documentation
└── mymoolah-wallet-frontend/  # React frontend
```

### **Frontend Structure**
```
mymoolah-wallet-frontend/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── contexts/           # React Context providers
├── services/           # API service layer
├── utils/              # Utility functions
├── styles/             # CSS and Tailwind configuration
└── public/             # Static assets
```

### **Database Schema**
- **Users & Wallets**: Core user management and wallet accounts
- **Transactions**: Comprehensive transaction tracking with metadata
- **Vouchers**: Digital voucher system with expiration handling
- **Product Catalogs**: Service provider integrations and pricing
- **KYC System**: Know Your Customer verification tiers

---

## 🔧 **Development Workflow**

### **Code Standards**
- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Code style and best practices enforcement
- **Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit validation and testing

### **Branching Strategy**
```bash
# Main development branch
git checkout main

# Feature development
git checkout -b feature/network-selection-modal

# Bug fixes
git checkout -b fix/debug-log-cleanup

# Hotfixes
git checkout -b hotfix/critical-security-fix
```

### **Commit Standards**
```bash
# Feature commits
git commit -m "feat: add network selection modal for vouchers"

# Bug fix commits
git commit -m "fix: remove debug logs from MoolahContext"

# Documentation commits
git commit -m "docs: update development guide for v2.0.0"

# Refactor commits
git commit -m "refactor: consolidate airtime and data services"
```

---

## 🧪 **Testing & Quality Assurance**

### **Testing Strategy**
- **Unit Tests**: Component and service testing
- **Integration Tests**: API endpoint validation
- **End-to-End Tests**: User workflow validation
- **Performance Tests**: Load testing and optimization

### **Running Tests**
```bash
# Backend tests
npm test

# Frontend tests
cd mymoolah-wallet-frontend
npm test

# All tests
npm run test:all
```

### **Code Quality Checks**
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Build verification
npm run build
```

---

## 🔌 **Service Provider Integrations**

### **Flash Integration**
- **Purpose**: Airtime, data, electricity, and bill payment services
- **API Endpoints**: 5 endpoints for product catalog and purchases
- **Commission Model**: Percentage-based revenue sharing
- **Status**: ✅ **COMPLETE**

### **MobileMart Integration**
- **Purpose**: Product management and transaction processing
- **API Endpoints**: 5 endpoints for services and transactions
- **Commission Model**: Fixed commission per transaction
- **Status**: ✅ **COMPLETE**

### **EasyPay Integration**
- **Purpose**: Digital voucher system with expiration handling
- **API Endpoints**: 7 endpoints for voucher lifecycle
- **Features**: Cancellation, refunds, expiration handling
- **Status**: ✅ **COMPLETE**

### **Peach Payments Integration**
- **Purpose**: PayShap RTP (Real-Time Payments) integration
- **API Endpoints**: Bank transfers and payment requests
- **Authentication**: OAuth with secure token handling
- **Status**: ✅ **COMPLETE**

### **dtMercury Integration**
- **Purpose**: PayShap integration for bank transfers
- **Features**: Transaction status tracking and reporting
- **Compliance**: Regulatory adherence and audit trails
- **Status**: ✅ **COMPLETE**

---

## 📱 **Frontend Development**

### **Component Development**
```tsx
// Example component structure
import React from 'react';
import { useMoolah } from '../contexts/MoolahContext';

interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function ExampleComponent({ title, onAction }: ComponentProps) {
  const { balance, isLoading } = useMoolah();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-gray-600">Balance: R {balance.toLocaleString()}</p>
      <button 
        onClick={onAction}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Take Action
      </button>
    </div>
  );
}
```

### **State Management**
```tsx
// Using React Context for global state
import { useMoolah } from '../contexts/MoolahContext';

function MyComponent() {
  const { 
    balance, 
    transactions, 
    refreshData,
    isLoading 
  } = useMoolah();

  // Component logic here
}
```

### **API Integration**
```tsx
// Using the API service layer
import { apiService } from '../services/apiService';

async function handlePurchase() {
  try {
    const result = await apiService.purchaseAirtimeVoucher(
      'vodacom',
      50.00,
      '+27123456789'
    );
    // Handle success
  } catch (error) {
    // Handle error
  }
}
```

---

## 🗄️ **Backend Development**

### **Controller Development**
```javascript
// Example controller structure
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate input
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Business logic
    const user = await User.findByPk(userId, {
      include: [{ model: Wallet }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Success response
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

### **Model Development**
```javascript
// Example Sequelize model
module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('sent', 'received', 'payment'),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'transactions',
    timestamps: true
  });

  return Transaction;
};
```

### **Service Development**
```javascript
// Example service structure
class TransactionService {
  async createTransaction(transactionData) {
    try {
      // Validate transaction data
      this.validateTransactionData(transactionData);

      // Create transaction
      const transaction = await Transaction.create(transactionData);

      // Update wallet balance
      await this.updateWalletBalance(transaction);

      // Send notifications
      await this.sendTransactionNotification(transaction);

      return transaction;
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  validateTransactionData(data) {
    // Validation logic here
  }
}

module.exports = new TransactionService();
```

---

## 🚨 **Common Issues & Solutions**

### **Database Connection Issues**
```bash
# Problem: Connection refused
# Solution: Check if database is running
docker-compose up -d postgres

# Problem: Authentication failed
# Solution: Verify credentials in .env file
# Check DATABASE_URL format: postgres://user:password@host:port/database
```

### **Port Conflicts**
```bash
# Problem: Port already in use
# Solution: Find and kill process using the port
lsof -i :3001
kill -9 [PID]

# Or use different ports
PORT=3002 npm run dev
```

### **Build Failures**
```bash
# Problem: TypeScript compilation errors
# Solution: Check for type errors
npm run type-check

# Problem: Vite build failures
# Solution: Clear cache and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### **API Integration Issues**
```bash
# Problem: CORS errors
# Solution: Check CORS configuration in backend
# Verify ALLOWED_ORIGINS in .env

# Problem: Authentication failures
# Solution: Check JWT_SECRET and token validation
# Verify Authorization header format
```

---

## 📚 **Development Resources**

### **Essential Documentation**
- **[API Documentation](API_DOCUMENTATION.md)**: Complete API reference
- **[Project Status](PROJECT_STATUS.md)**: Current system status
- **[Cleanup Status](CLEANUP_STATUS.md)**: Code quality and cleanup status
- **[Testing Guide](TESTING_GUIDE.md)**: Testing procedures and best practices

### **External Resources**
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Sequelize ORM**: https://sequelize.org/docs/v6/
- **Express.js**: https://expressjs.com/

### **Development Tools**
- **VS Code Extensions**: ESLint, Prettier, TypeScript
- **Browser DevTools**: React DevTools, Network tab
- **API Testing**: Postman, Insomnia, or browser DevTools
- **Database Tools**: pgAdmin, DBeaver, or command line

---

## 🔮 **Next Development Phase**

### **Immediate Goals (August 21-27, 2025)**
1. **Network Selection Modal**: Implement overlay interface for service selection
2. **Enhanced Purchase Flows**: Create multi-step purchase processes
3. **Service Integration Testing**: Test with real product catalogs
4. **Mobile Optimization**: Improve mobile user experience

### **Short-term Goals (August 28 - September 3, 2025)**
1. **Multi-step Purchase Modals**: Complex service purchase flows
2. **Real-time Validation**: Enhanced input validation and error handling
3. **End-to-End Testing**: Complete purchase flow validation
4. **Performance Optimization**: Load testing and optimization

### **Long-term Goals (September 2025+)**
1. **Advanced Analytics**: Transaction insights and reporting
2. **Multi-currency Support**: International payment capabilities
3. **Mobile Application**: Native mobile app development
4. **Enterprise Features**: Corporate account management

---

## 📞 **Support & Contact**

### **Development Team**
- **Project Lead**: [Lead Name]
- **Frontend Developer**: [Frontend Dev Name]
- **Backend Developer**: [Backend Dev Name]
- **DevOps Engineer**: [DevOps Name]

### **Getting Help**
1. **Check Documentation**: Review relevant documentation first
2. **Search Issues**: Look for similar issues in project history
3. **Create Issue**: Document the problem with steps to reproduce
4. **Team Chat**: Reach out to development team for urgent issues

---

**Development Status**: ✅ **PRODUCTION READY - DEVELOPMENT PHASE**  
**Next Milestone**: 🎯 **Network Selection Modal Implementation**  
**Target Date**: August 21-27, 2025  
**Confidence Level**: 🟢 **HIGH - All systems operational and ready for next phase** 