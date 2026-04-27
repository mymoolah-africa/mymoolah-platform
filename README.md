# MyMoolah Treasury Platform

## 🚨 **CRITICAL: VOUCHER BUSINESS LOGIC**

**⚠️ IMMUTABLE BUSINESS RULES - DO NOT MODIFY**

The voucher system implements critical business logic that has been tested and verified. **NEVER change the voucher balance calculation logic unless there are crucial performance or security risks.**

**See**: `docs/VOUCHER_BUSINESS_LOGIC.md` for complete immutable rules.

**Current Status**: ✅ Working correctly for both User ID 1 and 2.

---

**A comprehensive financial platform combining digital wallet functionality with supplier integrations, AI-powered comparisons, complete audit trail compliance, and world-class AI Support system.**

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-production%20ready-green.svg)](docs/PROJECT_STATUS.md)
[![Database](https://img.shields.io/badge/database-postgresql-blue.svg)](docs/SETUP_GUIDE.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🎯 **Project Overview**

MyMoolah Treasury Platform is a full-featured financial platform that provides:

- **💰 Digital Wallet System**: Multi-currency wallet with secure transaction processing
- **🔗 Supplier Integrations**: Real-time data from EasyPay, Flash, and MobileMart
- **🤖 AI-Powered Comparison**: Smart supplier comparison and best deals detection
- **📊 Complete Audit Trail**: Banking-grade compliance with full money flow tracing
- **🌐 Modern Frontend**: React/TypeScript frontend with real-time API integration
- **🎯 AI Support System**: World-class, multi-language customer support platform ✅ **NEW**

---

## ✨ **Latest Updates (v2.1.0)**

### **🏆 Major Achievement: AI Support System COMPLETED**
- ✅ **AI Support System**: Complete multi-language support platform
- ✅ **Multi-Language Support**: English, Afrikaans, isiZulu, isiXhosa, Sesotho
- ✅ **AI-Powered Chat**: OpenAI GPT-4o integration with context awareness
- ✅ **Dynamic Quick Actions**: AI-determined top 6 most used support categories
- ✅ **Dedicated Support Page**: Award-winning UI/UX at `/support` route
- ✅ **Voice Input Ready**: Microphone button for future speech-to-text integration

### **🎨 UI/UX Excellence**
- **Support Page Design**: World-class, award-winning interface
- **Perfect Layout**: Consistent 12px spacing with no unnecessary gaps
- **Mobile-First**: Responsive design optimized for mobile devices
- **Seamless Integration**: Perfect integration with bottom navigation

### **🔧 Technical Implementation**
- **Backend Services**: Complete AI support infrastructure
- **Frontend Components**: Modern React with TypeScript
- **Database Schema**: Support interactions, feedback, and knowledge base
- **Performance**: Sub-second response times with OpenAI integration

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL database
- Cloud SQL Auth Proxy (for local development)

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd mymoolah

# Install dependencies
npm install
cd mymoolah-wallet-frontend && npm install

# Setup environment
cp .env.example .env
cp mymoolah-wallet-frontend/.env.example mymoolah-wallet-frontend/.env.local

# Start development servers
npm start                    # Backend (port 3001)
npm run dev                 # Frontend (port 3000)
```

### **Environment Configuration**
```bash
# Backend (.env)
DATABASE_URL=postgresql://username:password@localhost:5432/mymoolah_db
JWT_SECRET=your_jwt_secret
ALLOWED_ORIGINS=http://localhost:3000

# Frontend (.env.local)
VITE_API_BASE_URL=http://localhost:3001
```

---

## 🏗️ **Architecture**

### **Backend Stack**
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based secure authentication
- **API**: RESTful API with comprehensive error handling

### **Frontend Stack**
- **Framework**: React 18 with TypeScript
- **State Management**: React Context API
- **Styling**: Tailwind CSS with custom components
- **Build Tool**: Vite for fast development

### **Database Schema**
```
Core Tables
├── users (authentication & KYC)
├── wallets (multi-currency support)
├── transactions (complete audit trail)
└── kyc_verifications (user verification)

Supplier Tables
├── bills & payments (EasyPay)
├── flash_products & transactions
└── mobilemart_products & transactions
```

---

## 📊 **Current Status**

| Component | Status | Completion |
|-----------|--------|------------|
| **Project Foundation** | ✅ Operational | 100% |
| **Database Infrastructure** | ✅ Operational | 100% |
| **Core Wallet System** | ✅ Operational | 100% |
| **Authentication & Security** | ✅ Operational | 100% |
| **Supplier Integrations** | ✅ Operational | 100% |
| **Frontend Integration** | ✅ Operational | 100% |
| **Transaction Display System** | ✅ Operational | 100% |
| **Database Integrity & Audit** | ✅ Operational | 100% |

**Overall Status**: ✅ **PRODUCTION READY - ALL SYSTEMS OPERATIONAL**

---

## 🔗 **Key Features**

### **Digital Wallet System**
- Multi-currency wallet support (ZAR, USD, EUR)
- Secure money transfers between users
- Complete transaction history and audit trail
- Real-time balance updates and validation

### **Supplier Integrations**
- **EasyPay**: Bill Payment Receiver **V5** for wallet cash-in (`/billpayment/v1/*`); partner Q&A: `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md`; full guide: `docs/integrations/EasyPay_API_Integration_Guide.md`
- **Flash**: Airtime, data, and VAS services (5 API endpoints)
- **MobileMart**: Mobile services and products (5 API endpoints)
- **AI Comparison**: Smart supplier comparison and best deals

### **Security & Compliance**
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Complete audit trail for regulatory compliance
- Input validation and CORS protection

---

## 📚 **Documentation**

### **Essential Guides**
- [**Development Guide**](docs/DEVELOPMENT_GUIDE.md) - Setup and development workflow
- [**API Documentation**](docs/API_DOCUMENTATION.md) - Complete API reference
- [**Setup Guide**](docs/SETUP_GUIDE.md) - Environment configuration and deployment
- [**Project Status**](docs/PROJECT_STATUS.md) - Current system status and roadmap

### **Integration Guides**
- [**Frontend Source of Truth**](docs/FIGMA_INTEGRATION_COMPLETE.md) - Historical Figma note and current frontend ownership guidance
- [**Testing Guide**](docs/TESTING_GUIDE.md) - Testing procedures and examples
- [**Quick Fixes**](docs/QUICK_FIXES.md) - Common issues and solutions

### **Project Management**
- [**Agent Handover**](docs/AGENT_HANDOVER.md) - Development session handovers
- [**Changelog**](docs/CHANGELOG.md) - Complete version history
- [**Project Onboarding**](docs/PROJECT_ONBOARDING.md) - New developer setup

---

## 🧪 **Testing**

### **Run Tests**
```bash
# Backend tests
npm test

# Frontend tests
cd mymoolah-wallet-frontend && npm test

# API testing
curl http://localhost:3001/api/v1/health
```

### **Test Coverage**
- **Backend**: Unit tests for all major functions
- **Frontend**: Component testing with React Testing Library
- **API**: Integration tests for all endpoints
- **Database**: Migration and data integrity tests

---

## 🚀 **Deployment**

### **Production Requirements**
- PostgreSQL database (Cloud SQL recommended)
- Node.js 18+ runtime environment
- Environment variables properly configured
- SSL certificates for HTTPS

### **Deployment Commands**
```bash
# Production build
npm run build
cd mymoolah-wallet-frontend && npm run build

# Start production servers
NODE_ENV=production npm start
```

---

## 🤝 **Contributing**

### **Development Workflow**
1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### **Code Standards**
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive tests for new features
- Update documentation for any changes

---

## 📞 **Support**

### **Getting Help**
- **Documentation**: Check the comprehensive docs in `/docs/`
- **Quick Fixes**: Common issues and solutions in [QUICK_FIXES.md](docs/QUICK_FIXES.md)
- **Project Status**: Current system status in [PROJECT_STATUS.md](docs/PROJECT_STATUS.md)

### **Emergency Procedures**
- **Database Issues**: Use backup scripts in `/scripts/`
- **System Failures**: Check logs and restart services
- **Critical Issues**: Review recent changes in [CHANGELOG.md](docs/CHANGELOG.md)

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎉 **Acknowledgments**

- **Development Team**: Full-stack development and system architecture
- **Frontend Ownership**: Codebase is the source of truth; Figma is historical only
- **Supplier Partners**: EasyPay, Flash, and MobileMart for service integrations
- **Open Source Community**: For the excellent tools and libraries used

---

**MyMoolah Treasury Platform** - Building the future of digital finance! 🚀

**Current Version**: 2.1.0  
**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: August 17, 2025


