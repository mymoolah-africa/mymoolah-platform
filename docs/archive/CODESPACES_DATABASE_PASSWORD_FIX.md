# Codespaces Database Connection Fix

**Problem:** DATABASE_URL has wrong password in restored .env file.

## ✅ **FIX: UPDATE DATABASE_URL**

The restored `.env` file has the old password. Update it:

### **Option 1: Use Direct Cloud SQL Connection (Recommended for Codespaces)**

```bash
cd /workspaces/mymoolah-platform

# Edit .env file
nano .env
# Or: code .env

# Update DATABASE_URL line to:
DATABASE_URL=postgres://mymoolah_app:B0t3s@Mymoolah@34.35.84.201:5432/mymoolah?sslmode=require

# Comment out the localhost line:
# DATABASE_URL=postgres://mymoolah_app:AppPass_1755005621204_ChangeMe@127.0.0.1:5433/mymoolah
```

**Note:** URL-encode the password: `B0t3s@Mymoolah` becomes `B0t3s%40Mymoolah`

### **Option 2: Use Localhost Proxy (If Proxy is Running)**

If Cloud SQL Proxy is running on port 5433:

```bash
# Update DATABASE_URL to use correct password:
DATABASE_URL=postgres://mymoolah_app:B0t3s%40Mymoolah@127.0.0.1:5433/mymoolah
```

### **Step 3: Restart Backend**

```bash
# Stop backend (Ctrl+C)
# Restart
export REDIS_URL=redis://127.0.0.1:6379
npm run start:cs-ip
```

## 🔍 **VERIFICATION**

After restart, check backend logs for:
- ✅ Database connection successful
- ✅ No authentication errors
- ✅ Login should work


