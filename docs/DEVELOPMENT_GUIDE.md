# MyMoolah Treasury Platform - Development Guide

**Last Updated**: August 17, 2025  
**Current Version**: 3.2.0  
**Status**: ✅ **PRODUCTION READY - ALL SYSTEMS OPERATIONAL**

This guide provides comprehensive instructions for setting up and developing the MyMoolah Treasury Platform.

---

## 🎯 **Project Overview**

**MyMoolah Treasury Platform (MMTP)** is a comprehensive financial platform that combines:
- **Digital Wallet System**: Multi-currency wallet with secure transaction processing
- **Supplier Integrations**: Real-time data from EasyPay, Flash, and MobileMart
- **AI-Powered Comparison**: Smart supplier comparison and best deals detection
- **Complete Audit Trail**: Banking-grade compliance with full money flow tracing
- **Modern Frontend**: React/TypeScript frontend with real-time API integration

---

## 🚀 **Quick Setup (5 Minutes)**

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL database access
- Git for version control

### **One-Command Setup**
```bash
# Clone and setup
git clone <repository-url>
cd mymoolah
npm run setup:dev
```

### **Manual Setup**
```bash
# Backend setup
npm install
cp .env.example .env
# Edit .env with your database credentials

# Frontend setup
cd mymoolah-wallet-frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URL

# Start development
npm start                    # Backend (port 3001)
npm run dev                 # Frontend (port 3000)
```

---

## 🏗️ **Project Architecture**

### **Directory Structure**
```
mymoolah/
├── controllers/           # API controllers and business logic
├── models/               # Database models and schemas
├── routes/               # API route definitions
├── middleware/           # Authentication and validation middleware
├── config/               # Configuration files and database setup
├── scripts/              # Utility and setup scripts
├── docs/                 # Project documentation
├── mymoolah-wallet-frontend/  # React frontend application
└── package.json          # Backend dependencies and scripts
```

### **Technology Stack**
```
Backend
├── Runtime: Node.js 18+ with Express.js
├── Database: PostgreSQL with Sequelize ORM
├── Authentication: JWT with bcrypt
├── Validation: Joi and custom middleware
└── Testing: Jest with supertest

Frontend
├── Framework: React 18 with TypeScript
├── State Management: React Context API
├── Styling: Tailwind CSS with custom components
├── Build Tool: Vite for fast development
└── Testing: React Testing Library
```

---

## 🔧 **Development Environment Setup**

### **1. Backend Environment**
```bash
# Create .env file
cp .env.example .env

# Required environment variables
DATABASE_URL=postgresql://username:password@localhost:5432/mymoolah_db
JWT_SECRET=your_32_character_jwt_secret_key
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=3001
NODE_ENV=development
```

### **2. Frontend Environment**
```bash
# Create .env.local file
cd mymoolah-wallet-frontend
cp .env.example .env.local

# Required environment variables
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_NAME=MyMoolah Treasury Platform
```

### **3. Database Setup**
```bash
# Start Cloud SQL Auth Proxy (for local development)
cloud-sql-proxy --instances=mmtp_pg:us-central1:mmtp-pg

# Test database connection
psql "postgresql://username:password@localhost:5432/mymoolah_db"

# Run database migrations
npx sequelize-cli db:migrate

# Seed initial data (optional)
npm run seed
```

---

## 🚀 **Development Workflow**

### **Starting Development Servers**
```bash
# Terminal 1 - Backend
cd /Users/andremacbookpro/mymoolah
npm start

# Terminal 2 - Frontend
cd /Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend
npm run dev
```

### **Development Commands**
```bash
# Backend commands
npm start              # Start development server
npm run dev            # Start with nodemon (auto-restart)
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run lint           # Lint code
npm run lint:fix       # Fix linting issues

# Frontend commands
cd mymoolah-wallet-frontend
npm run dev            # Start development server
npm run build          # Build for production
npm test               # Run tests
npm run lint           # Lint code
```

### **Hot Reload & Development**
- **Backend**: Auto-restart on file changes (nodemon)
- **Frontend**: Hot module replacement (Vite)
- **Database**: Sequelize migrations for schema changes
- **API**: Live reload with automatic route registration

---

## 📊 **Current Development Status**

### **✅ Completed Systems (100% Operational)**
1. **Project Foundation** - Complete development environment
2. **Database Infrastructure** - PostgreSQL with full audit trail
3. **Core Wallet System** - Multi-currency wallet functionality
4. **Authentication & Security** - JWT-based secure authentication
5. **Supplier Integrations** - EasyPay, Flash, MobileMart
6. **Frontend Integration** - Complete React/TypeScript integration
7. **Transaction Display System** - Clean, readable descriptions
8. **Database Integrity & Audit Trail** - Full regulatory compliance

### **🎯 Next Development Phase**
- **Additional Frontend Pages**: Profile management, settings, notifications
- **Enhanced UI/UX**: Better mobile responsiveness, animations, themes
- **Advanced Features**: Recurring payments, scheduled transfers
- **Analytics Dashboard**: Spending patterns, financial insights

---

## 🔍 **Development Best Practices**

### **Code Organization**
```typescript
// Controllers: Business logic and request handling
export const sendMoney = async (req: Request, res: Response) => {
  try {
    // Input validation
    // Business logic
    // Database operations
    // Response formatting
  } catch (error) {
    // Error handling
  }
};

// Models: Database schema and relationships
export class Transaction extends Model {
  static associate(models: any) {
    // Define relationships
  }
}

// Routes: API endpoint definitions
router.post('/send-money', authenticateToken, sendMoney);
```

### **Error Handling**
```typescript
// Consistent error response format
const errorResponse = (res: Response, message: string, status: number = 400) => {
  return res.status(status).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

// Try-catch with proper error logging
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  return errorResponse(res, 'Operation failed', 500);
}
```

### **Database Operations**
```typescript
// Use transactions for complex operations
const transaction = await sequelize.transaction();
try {
  // Multiple database operations
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}

// Proper error handling for database queries
const user = await User.findByPk(userId);
if (!user) {
  throw new Error('User not found');
}
```

---

## 🧪 **Testing Strategy**

### **Backend Testing**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testNamePattern="User Authentication"

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### **Frontend Testing**
```bash
# Run all tests
cd mymoolah-wallet-frontend
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### **API Testing**
```bash
# Test health endpoint
curl http://localhost:3001/api/v1/health

# Test authenticated endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/v1/wallets/balance

# Test with data
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"amount": 100, "recipientPhone": "+27123456789"}' \
     http://localhost:3001/api/v1/wallets/send-money
```

---

## 🔧 **Common Development Tasks**

### **Adding New API Endpoints**
1. **Create Controller**: Add business logic in `controllers/`
2. **Define Route**: Add route in appropriate `routes/` file
3. **Add Validation**: Create validation schema if needed
4. **Write Tests**: Add unit and integration tests
5. **Update Documentation**: Update API documentation

### **Database Schema Changes**
1. **Create Migration**: `npx sequelize-cli migration:generate --name=add_new_field`
2. **Update Model**: Modify model file to reflect changes
3. **Run Migration**: `npx sequelize-cli db:migrate`
4. **Update Tests**: Modify tests to work with new schema
5. **Verify Changes**: Test the new schema thoroughly

### **Frontend Component Development**
1. **Create Component**: Add new component in appropriate directory
2. **Add Types**: Define TypeScript interfaces
3. **Implement Logic**: Add business logic and state management
4. **Style Component**: Use Tailwind CSS for styling
5. **Add Tests**: Write component tests
6. **Update Routes**: Add navigation if needed

---

## 🚨 **Troubleshooting Common Issues**

### **Database Connection Issues**
```bash
# Check Cloud SQL Auth Proxy
ps aux | grep cloud-sql-proxy

# Test database connection
psql "postgresql://username:password@localhost:5432/mymoolah_db"

# Check environment variables
echo $DATABASE_URL
```

### **Frontend Build Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Check for TypeScript errors
npm run type-check
```

### **API Integration Issues**
```bash
# Check backend server status
curl http://localhost:3001/api/v1/health

# Verify CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3001/api/v1/wallets/balance
```

---

## 📚 **Development Resources**

### **Essential Documentation**
- [**API Documentation**](API_DOCUMENTATION.md) - Complete API reference
- [**Project Status**](PROJECT_STATUS.md) - Current system status
- [**Quick Fixes**](QUICK_FIXES.md) - Common issues and solutions
- [**Agent Handover**](AGENT_HANDOVER.md) - Development session handovers

### **External Resources**
- [**Node.js Documentation**](https://nodejs.org/docs/)
- [**Express.js Guide**](https://expressjs.com/en/guide/routing.html)
- [**Sequelize Documentation**](https://sequelize.org/docs/v6/)
- [**React Documentation**](https://react.dev/)
- [**TypeScript Handbook**](https://www.typescriptlang.org/docs/)

### **Development Tools**
- **VS Code Extensions**: ESLint, Prettier, TypeScript, Tailwind CSS IntelliSense
- **API Testing**: Postman, Insomnia, or curl
- **Database Management**: pgAdmin, DBeaver, or psql
- **Git Tools**: SourceTree, GitKraken, or command line

---

## 🚀 **Deployment Preparation**

### **Production Checklist**
- [ ] **Environment Variables**: All production values configured
- [ ] **Database**: Production database configured and tested
- [ ] **Security**: JWT secrets and API keys updated
- [ ] **Testing**: All tests passing
- [ ] **Documentation**: Updated and accurate
- [ ] **Monitoring**: Logging and error tracking configured

### **Deployment Commands**
```bash
# Production build
npm run build
cd mymoolah-wallet-frontend && npm run build

# Start production servers
NODE_ENV=production npm start
```

---

## 📞 **Getting Help**

### **Immediate Issues**
1. **Check Quick Fixes**: [QUICK_FIXES.md](QUICK_FIXES.md)
2. **Review Recent Changes**: [CHANGELOG.md](CHANGELOG.md)
3. **Check System Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)

### **Development Questions**
1. **Review This Guide**: Check relevant sections
2. **Examine Code**: Look at existing implementations
3. **Check Documentation**: Review API and integration guides

### **Emergency Procedures**
1. **Database Issues**: Use backup scripts in `/scripts/`
2. **System Failures**: Check logs and restart services
3. **Critical Issues**: Review recent changes and rollback if needed

---

**Development Guide**: ✅ **UP TO DATE**  
**All Systems**: ✅ **OPERATIONAL**  
**Ready for Development**: 🚀 **YES** 