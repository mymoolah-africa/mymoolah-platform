### Setup Quick Start (Local vs Codespaces)

Refer to `PORT_MATRIX.md` for ports and environment variables. Summary:

- Local: Backend 3001, Frontend 3000
- Codespaces: Backend 5050, Frontend 3000 (forwarded)

Commands
```
# Local
cd /Users/andremacbookpro/mymoolah && npm start
cd /Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend && npm run dev

# Codespaces
cd /workspaces/mymoolah-platform && npm start
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend && npm run dev
```

Env files
- Backend: `.env` with PORT, JWT_SECRET (32+), DATABASE_URL, DB_DIALECT=postgres, ALLOWED_ORIGINS
- Frontend: `.env.local` with `VITE_API_BASE_URL`

# MyMoolah Platform - Setup Guide

## 🎯 **Quick Start Guide**

**Current Version:** 2.5.0  
**Status:** ✅ **RECONCILIATION SYSTEM COMPLETE** ✅ **ALL INTEGRATIONS COMPLETE**  
**Last Updated:** January 13, 2026

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

# Start Cloud SQL Auth Proxy (local dev)
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

### **5. Reconciliation System Setup (NEW - January 2026)**
```bash
# Install reconciliation dependencies
npm install exceljs@^4.4.0 moment-timezone@^0.5.45 csv-parse@^5.5.3 @google-cloud/storage@^7.14.0

# Run reconciliation migration
./scripts/run-migrations-master.sh uat

# Verify reconciliation tables
node -e "
const { Sequelize } = require('sequelize');
require('dotenv').config();
const { getUATDatabaseURL } = require('./scripts/db-connection-helper');
(async () => {
  const sequelize = new Sequelize(getUATDatabaseURL(), { logging: false });
  const [tables] = await sequelize.query(\`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'recon_%'
    ORDER BY table_name;
  \`);
  console.log('✅ Reconciliation Tables:', tables.map(t => t.table_name));
  process.exit(0);
})();
"
```

**Optional - Configure SFTP Access**:
```bash
# Add reconciliation environment variables to .env
echo "
# Reconciliation System
RECON_SFTP_HOST=34.35.137.166
RECON_SFTP_PORT=22
RECON_GCS_BUCKET=mymoolah-sftp-inbound

# Email Alerts (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@mymoolah.africa
SMTP_PASS=your-smtp-password
RECON_ALERT_EMAIL=finance@mymoolah.africa
" >> .env
```

**Run Test Suite**:
```bash
# Run reconciliation tests
npm test -- tests/reconciliation.test.js

# Expected: All 23+ tests passing
```

---

## 🔧 **Configuration**

### **Backend Configuration**
The backend uses default configuration for development:

```javascript
// Default settings in server.js
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_URL = process.env.DATABASE_URL; // postgres connection string
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
curl -X GET "http://localhost:3001/api/v1/wallets/transactions?limit=5" \
  -H "Authorization: Bearer <your_jwt_token>"

# Test active vouchers
curl -X GET http://localhost:3001/api/v1/vouchers/active \
  -H "Authorization: Bearer <your_jwt_token>"
```

### **Database Verification**
```bash
# Check Andre Botes transactions
# Example: check transactions via API instead of direct database queries
curl -s -H "Authorization: Bearer <TOKEN>" "http://localhost:3001/api/v1/wallets/transactions?page=1&limit=5" | jq
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Port Conflicts**
```bash
# If port 3000 is in use, Vite will automatically try 3001, 3002, etc.
# If port 3001 is in use, change in server.js or use environment variable
PORT=3002 npm start
```

#### **Database Issues**
```bash
# Check Cloud SQL Proxy connection
lsof -i :5433

# Verify database connection
psql -h localhost -p 5433 -U mymoolah_app -d mymoolah -c "SELECT 1;"
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
- **PostgreSQL Database:** Cloud SQL instance `mmtp-pg` ✅
- **Demo Data:** 2 users with realistic transactions ✅
- **Andre Botes:** 4 transactions in database ✅

---

## 🎯 **Next Steps**

### **Development Workflow**
1. **Start Backend:** `npm start` (port 3001)
2. **Start Frontend:** `npm run dev` (port 3000)
3. **Access Application:** http://localhost:3000
4. **Test Dashboard:** Login and verify real data display
5. **Monitor Console:** Ensure clean output with no errors

### **Production Preparation**
- **Database Migration:** Completed migration to PostgreSQL
- **Environment Variables:** Configure production settings
- **Security Hardening:** Implement additional security measures
- **Performance Optimization:** Monitor and optimize response times 