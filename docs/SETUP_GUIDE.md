# MyMoolah Platform - Setup Guide

## 🎯 **Quick Start Guide**

**Current Version:** 2.2.0  
**Status:** ✅ **DASHBOARD COMPLETE - PRODUCTION READY**  
**Last Updated: July 31, 2025

---

## 🚀 **Prerequisites**

### **System Requirements**
- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Git:** Latest version
- **Operating System:** macOS, Windows, or Linux

### **Development Tools**
- **Code Editor:** VS Code (recommended)
- **Terminal:** Built-in terminal or iTerm2
- **Browser:** Chrome, Firefox, or Safari

---

## 📦 **Installation Steps**

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd mymoolah
```

### **2. Install Backend Dependencies**
```bash
# Navigate to backend directory
cd mymoolah

# Install dependencies
npm install

# Create data directory for SQLite
mkdir -p data
```

### **3. Install Frontend Dependencies**
```bash
# Navigate to frontend directory
cd mymoolah-wallet-frontend

# Install dependencies
npm install
```

### **4. Environment Setup**
```bash
# Backend environment (optional - uses defaults)
cp .env.example .env
# Edit .env with your configuration
```

---

## 🔧 **Configuration**

### **Backend Configuration**
The backend uses default configuration for development:

```javascript
// Default settings in server.js
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_PATH = './data/mymoolah.db';
```

### **Frontend Configuration**
The frontend is configured for development:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    host: true
  }
});
```

---

## 🚀 **Starting the Application**

### **Start Backend Server**
```bash
# From mymoolah directory
cd mymoolah
npm start
```

**Expected Output:**
```
Server running on port 5050
Database connected successfully
All routes initialized
```

### **Start Frontend Server**
```bash
# From mymoolah-wallet-frontend directory
cd mymoolah-wallet-frontend
npm run dev
```

**Expected Output:**
```
VITE v4.5.14  ready in 237 ms
➜  Local:   http://localhost:3002/
➜  Network: http://192.168.3.160:3002/
```

---

## 🎯 **Dashboard Testing (NEW - JULY 29, 2025)**

### **Verify Dashboard Functionality**
```bash
# 1. Start both servers (backend on 5050, frontend on 3002)
# 2. Open browser to http://localhost:3002
# 3. Login with Andre Botes credentials
# 4. Verify dashboard displays:
#    - Real wallet balance (R5204.50)
#    - Last 5 transactions with contextual icons
#    - Active vouchers count and value
#    - Clean console with no errors
```

### **Test API Endpoints**
```bash
# Test wallet balance
curl -X GET http://localhost:5050/api/v1/wallets/balance \
  -H "Authorization: Bearer <your_jwt_token>"

# Test recent transactions
curl -X GET "http://localhost:5050/api/v1/wallets/transactions?limit=5" \
  -H "Authorization: Bearer <your_jwt_token>"

# Test active vouchers
curl -X GET http://localhost:5050/api/v1/vouchers/active \
  -H "Authorization: Bearer <your_jwt_token>"
```

### **Database Verification**
```bash
# Check Andre Botes transactions
sqlite3 data/mymoolah.db "SELECT t.type, t.description, t.amount, t.createdAt FROM transactions t JOIN wallets w ON t.walletId = w.walletId WHERE w.userId = (SELECT id FROM users WHERE firstName = 'Andre' AND lastName = 'Botes') ORDER BY t.createdAt DESC LIMIT 5;"
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Port Conflicts**
```bash
# If port 3000 is in use, Vite will automatically try 3001, 3002, etc.
# If port 5050 is in use, change in server.js or use environment variable
PORT=5051 npm start
```

#### **Database Issues**
```bash
# Reinitialize database
npm run init-db

# Check database status
sqlite3 data/mymoolah.db ".tables"
```

#### **Frontend Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

#### **Console Errors**
```bash
# Verify clean console output:
# - No 404 errors for manifest.json or vite.svg
# - No React Router warnings
# - No debug console.log statements
# - Only expected React DevTools suggestion
```

---

## 📊 **Current Status**

### **✅ Working Features**
- **Dashboard Page:** Real data integration with contextual icons
- **Authentication:** JWT-based login/logout
- **Wallet Management:** Balance tracking and transactions
- **KYC System:** Document upload and verification
- **Voucher System:** Voucher creation and management
- **Send Money:** Money transfer functionality

### **✅ API Endpoints**
- **Health Check:** `/health` ✅
- **User Management:** `/api/v1/users` ✅
- **Authentication:** `/api/v1/auth/*` ✅
- **Wallet Operations:** `/api/v1/wallets/*` ✅
- **Transaction History:** `/api/v1/transactions/*` ✅
- **KYC System:** `/api/v1/kyc/*` ✅
- **Voucher Management:** `/api/v1/vouchers/*` ✅

### **✅ Database Status**
- **SQLite Database:** `data/mymoolah.db` ✅
- **Demo Data:** 5 users with realistic transactions ✅
- **Andre Botes:** 4 transactions in database ✅

---

## 🎯 **Next Steps**

### **Development Workflow**
1. **Start Backend:** `npm start` (port 5050)
2. **Start Frontend:** `npm run dev` (port 3002)
3. **Access Application:** http://localhost:3002
4. **Test Dashboard:** Login and verify real data display
5. **Monitor Console:** Ensure clean output with no errors

### **Production Preparation**
- **Database Migration:** SQLite to MySQL
- **Environment Variables:** Configure production settings
- **Security Hardening:** Implement additional security measures
- **Performance Optimization:** Monitor and optimize response times 