# Codespaces Testing Requirement - MyMoolah Platform

**Status**: ✅ **MANDATORY** - All testing must be performed in Codespaces  
**Last Updated**: January 9, 2025  
**Version**: 1.0.0

---

## ⚠️ **CRITICAL REQUIREMENT**

**ALL TESTING MUST BE PERFORMED IN CODESPACES (CS)**

- ❌ **DO NOT** test on local machine
- ❌ **DO NOT** test in other environments
- ✅ **ALWAYS** test in Codespaces
- ✅ **ALWAYS** use Codespaces as the primary testing environment

**Reason**: Codespaces has the correct environment configuration, database connections, and credentials that match production-like conditions.

---

## 📋 **CODESPACES ENVIRONMENT CONFIGURATION**

### **Environment File Location**
- **Path**: `.env` in Codespaces root directory
- **Template**: `env.template` (for reference only)
- **Status**: ✅ Configured and ready for testing

### **Current Codespaces .env Configuration**

```bash
# MyMoolah Wallet API - Environment Configuration

# NEVER commit the actual .env file to version control

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=postgres://mymoolah_app:B0t3s%40Mymoolah@34.35.84.201:5432/mymoolah?sslmode=require

# =============================================================================
# REQUIRED ENVIRONMENT VARIABLES
# =============================================================================

# Application Environment
NODE_ENV=development
PORT=3001

# Database Configuration
DB_DIALECT=postgres
DATABASE_URL=postgres://mymoolah_app:B0t3s%40Mymoolah@34.35.84.201:5432/mymoolah?sslmode=require

# CORS Configuration (comma-separated for production)
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.3.198:3000
CORS_ORIGINS=https://bug-free-doodle-pj66r7q7q5pw39pjv-3000.app.github.dev,http://localhost:3000

# Security Configuration
JWT_SECRET=7108xxx99f5c4
JWT_EXPIRES_IN=24h
SESSION_SECRET=71086xxx99f5c4

# Production Environment Variables
TLS_ENABLED=false

# Supplier Integration Configuration
SUPPLIER_LIVE_INTEGRATIONS=false
FLASH_LIVE_INTEGRATION=false

# =============================================================================
# OPTIONAL ENVIRONMENT VARIABLES
# =============================================================================

# Logging Configuration
LOG_LEVEL=info

# EasyPay Expiry Handler
EASYPAY_EXPIRY_HANDLER_ENABLED=true

# =============================================================================
# REDIS CONFIGURATION (Optional - for caching)
# =============================================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# =============================================================================
# OPENAI API SERVICES
# =============================================================================
OPENAI_API_KEY=sk-proj-fbzxxxSCXuoA
ENABLE_CODEBASE_SWEEP=false

# =============================================================================
# EXTERNAL SERVICE CREDENTIALS
# =============================================================================

# Flash API Credentials (Optional)
FLASH_CONSUMER_KEY=your-flash-consumer-key
FLASH_CONSUMER_SECRET=your-flash-consumer-secret

# PeachPayments API Credentials
PEACH_BASE_AUTH=https://sandbox-dashboard.peachpayments.com
PEACH_BASE_CHECKOUT=https://testsecure.peachpayments.com
PEACH_CLIENT_ID=32d717567de3043756df871ce02719
PEACH_CLIENT_SECRET=+Ih40dv2xh2xWyGuBMEtBdPSPLBH5FRafM8lTI53zOVV5DnX/b0nZQF5OMVrA9FrNTiNBKq6nLtYXqHCbUpSZw==
PEACH_MERCHANT_ID=d8392408ccca4298b9ee72e5ab66c5b4
PEACH_ENTITY_ID_PSH=8ac7a4ca98972c34019899445be504d8
PEACH_ACCESS_TOKEN=OGFjN2E0Yzg5ODdjM2ZiYTAxOTg4NGJkOWJjZDEyZTJ8dXhEaFlTNiVmck1ZZWRSZFJDV3U=
PEACH_RECURRING_ID=8ac7a4c8987c3fba019884bda5da12e8
PEACH_ENABLE_TEST_MODE=true

# EasyPay API Credentials
EASYPAY_EXPIRY_HANDLER_ENABLED=true

# Zapper API Configuration (UAT)
ZAPPER_API_URL=https://api.zapper.com/v1
ZAPPER_ORG_ID=810c1540-6de0-11f0-9286-4f0cdcb898f5
ZAPPER_API_TOKEN=eb22884a-bc62-4307-ac21-ac9f2ac140f2
ZAPPER_X_API_KEY=8h8DDBvlaPoYgefHwqeG3DNZaO6vorxWPsCDtvd0

# MobileMart UAT Configuration
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=mymoolah
MOBILEMART_CLIENT_SECRET=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8
MOBILEMART_API_URL=https://uat.fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api

# Standard Bank PayShap (SBSA RPP/RTP) - UAT
# SBSA = sponsor bank; MM SBSA main account = operating account (no prefunded float)
# Uses LEDGER_ACCOUNT_BANK for RPP/RTP/deposit ledger posting
# Fee: PAYSHAP_FEE_MM_ZAR=4 (user fee), PAYSHAP_FEE_SBSA_ZAR=3 (SBSA cost when settled)
# See docs/SBSA_PAYSHAP_UAT_GUIDE.md
# STANDARDBANK_PAYSHAP_ENABLED=false
# SBSA_PING_CLIENT_ID=
# SBSA_PING_CLIENT_SECRET=
# SBSA_IBM_CLIENT_ID=
# SBSA_IBM_CLIENT_SECRET=
# SBSA_CALLBACK_SECRET=
# SBSA_CALLBACK_BASE_URL=https://staging.mymoolah.africa
# PAYSHAP_FEE_MM_ZAR=4
# PAYSHAP_FEE_SBSA_ZAR=3

# =============================================================================
# PORTAL SYSTEM CONFIGURATION
# =============================================================================

# Portal Backend Configuration
PORTAL_BACKEND_PORT=3002
PORTAL_BACKEND_HOST=localhost
PORTAL_FRONTEND_URL=http://localhost:3003

# Portal Database Configuration
PORTAL_DB_NAME=mymoolah
PORTAL_DB_USER=mymoolah_app
PORTAL_DB_PASSWORD=AppPass_1755005621204_ChangeMe
PORTAL_DB_HOST=127.0.0.1
PORTAL_DB_PORT=5433

# Portal JWT Configuration
PORTAL_JWT_SECRET=710864xxxc76949a9
PORTAL_JWT_EXPIRY=24h

# Portal Admin User Configuration
ADMIN_PASSWORD=Admin123!

# Portal Security Configuration
PORTAL_BCRYPT_ROUNDS=12
PORTAL_RATE_LIMIT_WINDOW_MS=900000
PORTAL_RATE_LIMIT_MAX_REQUESTS=1000

# Portal CORS Configuration
PORTAL_CORS_ORIGIN=http://localhost:3001
PORTAL_CORS_CREDENTIALS=true

# Portal Session Configuration
PORTAL_SESSION_SECRET=7108xxx7c76949a9
PORTAL_SESSION_COOKIE_MAX_AGE=86400000
PORTAL_SESSION_COOKIE_SECURE=false
PORTAL_SESSION_COOKIE_HTTP_ONLY=true
PORTAL_SESSION_COOKIE_SAME_SITE=strict

# Portal Performance Configuration
PORTAL_MAX_REQUEST_SIZE=10mb
PORTAL_REQUEST_TIMEOUT=30000
PORTAL_KEEP_ALIVE_TIMEOUT=5000

# Portal Monitoring Configuration
PORTAL_MONITORING_ENABLED=true
PORTAL_HEALTH_CHECK_INTERVAL=30000

# Portal Logging Configuration
PORTAL_LOG_LEVEL=info
PORTAL_LOG_FILE=logs/portal.log
```

---

## 🧪 **TESTING WORKFLOW IN CODESPACES**

### **Step 1: Access Codespaces**
1. Go to: https://github.com/mymoolah-africa/mymoolah-platform
2. Click **"Code"** → **"Codespaces"** tab
3. Open your Codespace or create a new one

### **Step 2: Verify Environment**
```bash
# Navigate to project directory
cd ~/workspaces/mymoolah-platform

# Verify .env file exists
ls -la .env

# Check Zapper credentials are set
grep ZAPPER .env
```

### **Step 3: Run Tests**
```bash
# Test Zapper UAT credentials
node scripts/test-zapper-uat-complete.js

# Test Zapper basic credentials
node scripts/test-zapper-credentials.js

# Test other integrations
# (add specific test commands as needed)
```

---

## 📝 **IMPORTANT NOTES FOR AGENTS**

### **Before Starting Any Testing:**
1. ✅ **Verify you're in Codespaces** (not local machine)
2. ✅ **Check .env file exists** and has correct credentials
3. ✅ **Verify database connection** is working
4. ✅ **Confirm CORS_ORIGINS** matches your Codespace URL

### **When Testing Zapper:**
1. ✅ **Always test in Codespaces** first
2. ✅ **Use UAT credentials** for initial testing
3. ✅ **Test production credentials** separately (if available)
4. ✅ **Document test results** in session logs

### **Common Mistakes to Avoid:**
- ❌ Testing on local machine (wrong environment)
- ❌ Using wrong credentials (UAT vs Production)
- ❌ Not checking .env file before testing
- ❌ Assuming credentials work without testing

---

## 🔍 **ZAPPER CREDENTIALS STATUS**

### **UAT Credentials (Current)**
- **API URL**: `https://api.zapper.com/v1`
- **Org ID**: `810c1540-6de0-11f0-9286-4f0cdcb898f5`
- **API Token**: `eb22884a-bc62-4307-ac21-ac9f2ac140f2`
- **X-API-Key**: `8h8DDBvlaPoYgefHwqeG3DNZaO6vorxWPsCDtvd0`
- **Status**: ✅ Configured in Codespaces .env
- **Test Results**: 92.3% success rate (12/13 critical tests passed)
- **Documentation**: `docs/ZAPPER_CREDENTIALS_TEST_RESULTS.md`

### **Production Credentials**
- **Organisation Name**: MyMoolah
- **API URL**: `https://api.zapper.com/v1`
- **Org ID**: `2f053500-c05c-11f0-b818-e12393dd6bc4`
- **API Token**: `91446a79-004b-4687-8b37-0e2a5d8ee7ce`
- **X-API-Key**: `u5YVZwClL68S2wOTmuP6i7slhqNvV5Da7a2tysqk`
- **Status**: ✅ Tested, ⚠️ 401 error on payment processing endpoint (needs investigation)
- **Test Results**: 84.6% success rate (11/13 critical tests passed)
- **Documentation**: `docs/ZAPPER_PRODUCTION_CREDENTIALS_TEST_RESULTS.md`
- **Note**: Production credentials tested. Payment processing endpoint returns 401 Unauthorized - contact Zapper support before production deployment.

---

## 📚 **RELATED DOCUMENTATION**

- `docs/GITHUB_CODESPACES_SETUP.md` - Codespaces setup guide
- `docs/agent_handover.md` - Agent handover documentation
- `docs/ZAPPER_UAT_TEST_REPORT.md` - Zapper UAT test results
- `scripts/test-zapper-uat-complete.js` - Comprehensive Zapper test suite
- `scripts/test-zapper-credentials.js` - Basic Zapper credential test

---

## ✅ **VERIFICATION CHECKLIST**

Before running any tests, verify:
- [ ] You're in Codespaces (not local machine)
- [ ] `.env` file exists and is readable
- [ ] Zapper credentials are set in `.env`
- [ ] Database connection is working
- [ ] Backend server can start successfully
- [ ] Test scripts are available in `scripts/` directory

---

**Last Updated**: January 9, 2025  
**Maintained By**: MyMoolah Development Team  
**Status**: ✅ **ACTIVE** - All agents must follow this requirement

