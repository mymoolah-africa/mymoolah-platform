# MyMoolah Treasury Platform - Development Guide

**Version**: 3.3.0  
**Last Updated**: August 19, 2025  
**Status**: ✅ **PRODUCTION READY - ALL SYSTEMS OPERATIONAL**

---

## 🎯 **Overview**

This guide provides comprehensive instructions for setting up and developing the MyMoolah Treasury Platform. The platform is a full-stack financial application built with Node.js, Express.js, React, TypeScript, and PostgreSQL.

### **Current System Status**
- **Backend**: ✅ Complete with 28+ API endpoints
- **Frontend**: ✅ Complete React/TypeScript application
- **Database**: ✅ PostgreSQL with full audit trail
- **Authentication**: ✅ JWT-based security
- **UI/UX**: ✅ Enhanced with modern design elements
- **Documentation**: ✅ Comprehensive and up-to-date

---

## 🚀 **Quick Setup**

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL database (Cloud SQL recommended)
- Git
- Code editor (VS Code recommended)

### **1. Clone Repository**
```bash
git clone <repository-url>
cd mymoolah
```

### **2. Backend Setup**
```bash
# Install dependencies
npm install

# Copy environment template
cp env.template .env

# Edit .env with your configuration
# Required variables:
# DATABASE_URL=postgresql://...
# JWT_SECRET=your-secret-key
# CORS_ORIGINS=http://localhost:3000

# Start development server
npm run dev
# Backend runs on http://localhost:3001
```

### **3. Frontend Setup**
```bash
# Navigate to frontend directory
cd mymoolah-wallet-frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend runs on http://localhost:3000
```

### **4. Database Setup**
```bash
# Run migrations
npx sequelize-cli db:migrate

# Seed initial data
npx sequelize-cli db:seed:all
```

---

## 🏗️ **Project Architecture**

### **Backend Structure**
```
mymoolah/
├── controllers/          # API controllers
│   ├── authController.js      # Authentication logic
│   ├── walletController.js    # Wallet operations
│   ├── voucherController.js   # Voucher management
│   ├── userController.js      # User management
│   └── ...
├── models/              # Database models
│   ├── User.js               # User model
│   ├── Wallet.js             # Wallet model
│   ├── Transaction.js        # Transaction model
│   ├── Voucher.js            # Voucher model
│   └── ...
├── routes/              # API routes
│   ├── auth.js               # Authentication routes
│   ├── wallets.js            # Wallet routes
│   ├── vouchers.js           # Voucher routes
│   └── ...
├── middleware/          # Custom middleware
│   ├── auth.js               # JWT authentication
│   ├── rateLimiter.js        # Rate limiting
│   └── ...
├── services/            # Business logic
│   ├── WalletService.js      # Wallet business logic
│   ├── kycService.js         # KYC processing
│   └── ...
├── migrations/          # Database migrations
├── seeders/             # Database seeders
└── docs/                # Documentation
```

### **Frontend Structure**
```
mymoolah-wallet-frontend/
├── components/          # Reusable components
│   ├── TopBanner.tsx          # Header with logo
│   ├── ui/                    # UI component library
│   └── ...
├── pages/               # Page components
│   ├── DashboardPage.tsx      # Main dashboard
│   ├── LoginPage.tsx          # Authentication
│   ├── SendMoneyPage.tsx      # Money transfer
│   ├── TransactionHistoryPage.tsx # Transaction list
│   ├── VouchersPage.tsx       # Voucher management
│   └── ...
├── contexts/            # React contexts
│   ├── AuthContext.tsx        # Authentication state
│   └── MoolahContext.tsx      # Global app state
├── services/            # API services
│   └── apiService.ts          # API communication
├── utils/               # Utility functions
│   ├── transactionIcons.tsx   # Transaction icons
│   └── ...
└── assets/              # Static assets
    ├── logo.svg              # Application logo
    └── ...
```

---

## 🔧 **Development Workflow**

### **Working Directory Rules**
- **✅ Always work in `/mymoolah/` directory**
- **❌ Never work in root directory**
- **✅ All code changes in subdirectories**
- **✅ Documentation updates in `/docs/`**

### **Code Standards**

#### **Backend (Node.js/Express)**
```javascript
// Use ES6+ features
const express = require('express');
const { User, Wallet } = require('../models');

// Consistent error handling
try {
  const result = await someOperation();
  res.json({ success: true, data: result });
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ success: false, error: error.message });
}

// JSDoc comments for functions
/**
 * Create a new wallet for a user
 * @param {number} userId - The user ID
 * @param {string} currency - The wallet currency
 * @returns {Promise<Object>} The created wallet
 */
async function createWallet(userId, currency) {
  // Implementation
}
```

#### **Frontend (React/TypeScript)**
```typescript
// Use TypeScript interfaces
interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

// Functional components with hooks
const UserProfile: React.FC<{ user: User }> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Implementation
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// Proper error handling
const handleSubmit = async (data: FormData) => {
  try {
    setIsLoading(true);
    const result = await apiService.submitData(data);
    // Handle success
  } catch (error) {
    console.error('Error:', error);
    // Handle error
  } finally {
    setIsLoading(false);
  }
};
```

### **Git Workflow**
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push to remote
git push origin feature/new-feature

# Create pull request
# Code review and merge
```

---

## 🧪 **Testing**

### **Backend Testing**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.js

# Run tests with coverage
npm run test:coverage
```

### **Frontend Testing**
```bash
cd mymoolah-wallet-frontend

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### **API Testing**
```bash
# Test authentication
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+27123456789", "password": "password123"}'

# Test wallet operations
curl -X GET http://localhost:3001/api/v1/wallets/1/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔒 **Security Guidelines**

### **Authentication**
- Always use JWT tokens for API authentication
- Implement proper token refresh mechanisms
- Use bcrypt for password hashing
- Validate all input data

### **API Security**
```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true
}));

// Input validation
const { body, validationResult } = require('express-validator');
app.post('/api/v1/auth/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  // Handle validation errors
]);
```

### **Database Security**
- Use parameterized queries (Sequelize ORM)
- Implement proper access controls
- Regular security audits
- Encrypt sensitive data

---

## 📊 **Performance Optimization**

### **Backend Optimization**
```javascript
// Database query optimization
const users = await User.findAll({
  include: [{
    model: Wallet,
    attributes: ['balance']
  }],
  where: { status: 'active' },
  limit: 50
});

// Caching strategies
const cache = require('redis');
const client = cache.createClient();

// Cache frequently accessed data
const getCachedData = async (key) => {
  let data = await client.get(key);
  if (!data) {
    data = await fetchFromDatabase();
    await client.setex(key, 3600, JSON.stringify(data));
  }
  return JSON.parse(data);
};
```

### **Frontend Optimization**
```typescript
// React optimization
import React, { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  // Handle click
}, [dependencies]);

// Lazy loading
const LazyComponent = React.lazy(() => import('./LazyComponent'));
```

---

## 🐛 **Debugging**

### **Backend Debugging**
```javascript
// Enable debug logging
DEBUG=app:* npm run dev

// Add debug statements
console.log('Debug:', { variable1, variable2 });

// Use debugger
debugger; // Will pause execution in debugger

// Error tracking
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### **Frontend Debugging**
```typescript
// React DevTools
// Install React Developer Tools browser extension

// Console debugging
console.log('Component state:', state);
console.log('Props:', props);

// React error boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
}
```

---

## 📚 **Documentation Standards**

### **Code Documentation**
```javascript
/**
 * User authentication controller
 * Handles user registration, login, and token management
 * 
 * @module controllers/authController
 * @requires express
 * @requires bcryptjs
 * @requires jsonwebtoken
 */

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data and token
 */
exports.register = async (req, res) => {
  // Implementation
};
```

### **API Documentation**
```javascript
/**
 * @api {post} /api/v1/auth/register Register User
 * @apiName RegisterUser
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 *
 * @apiParam {String} name User's full name
 * @apiParam {String} identifier Phone number or email
 * @apiParam {String} password User's password
 *
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} data User data and token
 * @apiSuccess {String} data.token JWT token
 * @apiSuccess {Object} data.user User information
 */
```

---

## 🚀 **Deployment**

### **Environment Configuration**
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-production-secret
CORS_ORIGINS=https://yourdomain.com
PORT=3001
```

### **Database Migration**
```bash
# Run migrations in production
NODE_ENV=production npx sequelize-cli db:migrate

# Verify migration status
npx sequelize-cli db:migrate:status
```

### **Build and Deploy**
```bash
# Build frontend
cd mymoolah-wallet-frontend
npm run build

# Start production server
cd ..
npm start
```

---

## 📋 **Development Checklist**

### **Before Starting Development**
- [ ] Environment variables configured
- [ ] Database migrations up to date
- [ ] Dependencies installed
- [ ] Development servers running
- [ ] Git repository cloned and up to date

### **During Development**
- [ ] Follow coding standards
- [ ] Write tests for new features
- [ ] Update documentation
- [ ] Test on multiple browsers/devices
- [ ] Check for security vulnerabilities

### **Before Committing**
- [ ] All tests passing
- [ ] Code linting clean
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance impact assessed

### **Before Deploying**
- [ ] Production environment configured
- [ ] Database migrations applied
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Backup procedures verified

---

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database connection
npx sequelize-cli db:migrate:status

# Reset database (development only)
npx sequelize-cli db:drop
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

#### **Frontend Build Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
npm run build -- --force
```

#### **API Endpoint Issues**
```bash
# Check server logs
npm run dev

# Test endpoints with curl
curl -X GET http://localhost:3001/api/v1/health
```

---

## 📞 **Support & Resources**

### **Documentation**
- **[API Documentation](API_DOCUMENTATION.md)**: Complete API reference
- **[Project Status](PROJECT_STATUS.md)**: Current system status
- **[Quick Fixes](QUICK_FIXES.md)**: Common issues and solutions
- **[Testing Guide](TESTING_GUIDE.md)**: Testing procedures

### **Tools & Resources**
- **Postman**: API testing and documentation
- **React DevTools**: Frontend debugging
- **Sequelize CLI**: Database management
- **Jest**: Testing framework
- **ESLint**: Code linting

### **Community**
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and tutorials
- **Code Reviews**: Peer review process

---

**Development Guide Version**: 3.3.0  
**Last Updated**: August 19, 2025  
**Status**: ✅ **COMPLETE AND UP-TO-DATE**

---

*This development guide provides comprehensive instructions for working with the MyMoolah Treasury Platform. Follow these guidelines to ensure consistent, high-quality development practices.* 