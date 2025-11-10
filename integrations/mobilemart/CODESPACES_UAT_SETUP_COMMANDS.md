# MobileMart UAT Setup Commands for Codespaces

**Date:** November 10, 2025  
**Purpose:** Quick setup commands to configure MobileMart UAT credentials in Codespaces

---

## 🚀 **Quick Setup Commands**

Run these commands in your Codespaces terminal:

### **Step 1: Navigate to Project Directory**
```bash
cd /workspaces/mymoolah-platform
```

### **Step 2: Update .env File**

**Option A: Using echo (append to existing .env)**
```bash
cat >> .env << 'EOF'

# MobileMart UAT Configuration (Added $(date +%Y-%m-%d))
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=mymoolah
MOBILEMART_CLIENT_SECRET=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8
MOBILEMART_API_URL=https://uat.fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api
EOF
```

**Option B: Using sed (update existing lines if present)**
```bash
# Remove old MobileMart config if exists
sed -i '/^MOBILEMART_/d' .env

# Add new config
cat >> .env << 'EOF'
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=mymoolah
MOBILEMART_CLIENT_SECRET=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8
MOBILEMART_API_URL=https://uat.fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api
EOF
```

**Option C: Manual Edit (Recommended)**
```bash
nano .env
# or
code .env
```

Then add these lines:
```env
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=mymoolah
MOBILEMART_CLIENT_SECRET=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8
MOBILEMART_API_URL=https://uat.fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api
```

### **Step 3: Verify Configuration**
```bash
# Check if variables are set
grep MOBILEMART .env

# Verify values (will show masked secret)
echo "Client ID: $(grep MOBILEMART_CLIENT_ID .env | cut -d'=' -f2)"
echo "API URL: $(grep MOBILEMART_API_URL .env | cut -d'=' -f2)"
echo "Live Integration: $(grep MOBILEMART_LIVE_INTEGRATION .env | cut -d'=' -f2)"
```

### **Step 4: Test Credentials**
```bash
# Run quick credentials test
node scripts/test-mobilemart-uat-credentials.js
```

**Expected Output:**
```
✅ Authentication successful!
✅ Product endpoint accessible!
✅ UAT CREDENTIALS TEST: PASSED
```

### **Step 5: Test via Backend API (if backend is running)**

**Start backend first:**
```bash
./scripts/start-codespace-backend.sh
```

**In another terminal, test endpoints:**
```bash
# Health check
curl http://localhost:3001/api/v1/mobilemart/health

# List airtime products
curl http://localhost:3001/api/v1/mobilemart/products/airtime

# List data products
curl http://localhost:3001/api/v1/mobilemart/products/data

# List electricity products
curl http://localhost:3001/api/v1/mobilemart/products/electricity
```

---

## 🔍 **Troubleshooting Commands**

### **Check if credentials are loaded:**
```bash
node -e "require('dotenv').config(); console.log('Client ID:', process.env.MOBILEMART_CLIENT_ID); console.log('API URL:', process.env.MOBILEMART_API_URL);"
```

### **Test token retrieval manually:**
```bash
curl -X POST "https://uat.fulcrumswitch.com/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=mymoolah&client_secret=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8&scope=api"
```

### **Check backend logs for MobileMart:**
```bash
# If backend is running, look for:
# ✅ MobileMart routes loaded
# 🔍 MobileMart Token Request
```

---

## ✅ **Verification Checklist**

After running setup commands, verify:

- [ ] `.env` file contains `MOBILEMART_CLIENT_ID=mymoolah`
- [ ] `.env` file contains `MOBILEMART_CLIENT_SECRET=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8`
- [ ] `.env` file contains `MOBILEMART_API_URL=https://uat.fulcrumswitch.com`
- [ ] `.env` file contains `MOBILEMART_LIVE_INTEGRATION=true`
- [ ] Test script runs successfully: `node scripts/test-mobilemart-uat-credentials.js`
- [ ] Backend starts without MobileMart credential errors
- [ ] Health endpoint returns healthy status: `/api/v1/mobilemart/health`
- [ ] Product endpoints return data: `/api/v1/mobilemart/products/airtime`

---

## 📝 **Notes**

- **Security:** Never commit `.env` file to Git (it's already in `.gitignore`)
- **Environment:** These are UAT credentials - use different values for PROD
- **Backend Restart:** After updating `.env`, restart backend to load new values
- **Token Expiry:** Tokens expire after 2 hours (7200 seconds) - refresh is automatic

---

**Last Updated:** November 10, 2025

