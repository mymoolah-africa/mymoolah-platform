# MyMoolah Platform

South African fintech wallet platform based on Mojaloop open-source software, focusing on compliance, security, and best practices.

## 🚀 Current Status (July 2025)

**✅ FULLY FUNCTIONAL PLATFORM** - All core systems are working and tested!

### **Working Features:**
- ✅ **Authentication System** - User registration and login with JWT tokens
- ✅ **Wallet Management** - Create, credit, debit, and balance tracking
- ✅ **Transaction Processing** - Automatic transaction recording and history
- ✅ **KYC System** - Document verification and status tracking
- ✅ **Database** - SQLite with 36 users, 36 wallets, 15+ transactions
- ✅ **API Security** - JWT authentication and rate limiting

## 📋 Quick Start

### **Prerequisites:**
- Node.js 18+
- npm or yarn

### **Installation:**
```bash
cd mymoolah
npm install
npm start
```

Server runs on `http://localhost:5050`

## 🔐 Authentication Endpoints

### **User Registration**
```bash
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "password": "password123"
  }'
```

### **User Login**
```bash
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## 💰 Wallet Endpoints

All wallet endpoints require JWT authentication in the Authorization header.

### **Get Wallet Details**
```bash
curl -X GET http://localhost:5050/api/v1/wallets/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Get Wallet Balance**
```bash
curl -X GET http://localhost:5050/api/v1/wallets/1/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Credit Wallet**
```bash
curl -X POST http://localhost:5050/api/v1/wallets/1/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 100}'
```

### **Debit Wallet**
```bash
curl -X POST http://localhost:5050/api/v1/wallets/1/debit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 50}'
```

### **Get Wallet Transactions**
```bash
curl -X GET http://localhost:5050/api/v1/wallets/1/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Data Management Endpoints

### **List All Users**
```bash
curl -X GET http://localhost:5050/api/v1/users
```

### **List All Transactions**
```bash
curl -X GET http://localhost:5050/api/v1/transactions
```

### **List All KYC Records**
```bash
curl -X GET http://localhost:5050/api/v1/kyc
```

## 🗄️ Database Status

- **Users**: 36 registered users
- **Wallets**: 36 wallets (one per user)
- **Transactions**: 15+ transactions recorded
- **KYC Records**: 3 sample records

## 🧪 Testing

### **Run All Tests**
```bash
npm test
```

### **Test Specific Features**
```bash
# Test authentication
node test-auth.js

# Test wallet operations
node test-wallet.js

# Test transactions
node test-transactions.js
```

## 📁 Project Structure

```
mymoolah/
├── controllers/          # Business logic
├── models/             # Database models
├── routes/             # API endpoints
├── middleware/         # Authentication & validation
├── docs/              # Documentation
├── scripts/           # Database initialization
├── tests/             # Test files
└── data/              # SQLite database
```

## 🔧 Environment Setup

### **Local Development**
- Database: SQLite (`data/mymoolah.db`)
- Port: 5050
- Environment: Development

### **Cloud Development (Codespaces)**
- Database: MySQL
- Port: 5050
- Environment: Production-like

## 📚 Documentation

- [API Documentation](docs/api.md)
- [Setup Guide](docs/SETUP_GUIDE.md)
- [Architecture](docs/architecture.md)
- [Security](docs/SECURITY.md)
- [Session Summary](docs/session-summary.md)

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcryptjs
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection protection

## 🚀 Next Steps

1. **Frontend Development** - React-based user interface
2. **Mojaloop Integration** - Inter-bank transfer capabilities
3. **Mobile App** - Native mobile application
4. **Advanced Features** - Multi-currency, limits, 2FA

## 📞 Support

For questions or issues, please refer to the documentation in the `docs/` directory or create an issue in the repository.

---

**Last Updated**: July 2025  
**Status**: ✅ Production Ready - Core Features Complete