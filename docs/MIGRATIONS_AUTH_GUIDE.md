# Running Database Migrations - Authentication Guide

**Date**: November 15, 2025  
**Issue**: Cloud SQL Auth Proxy requires re-authentication

---

## 🔐 **Re-Authentication Required**

The Cloud SQL Auth Proxy needs fresh Application Default Credentials (ADC) to connect to the staging database.

### **Step 1: Re-Authenticate**

Run this command in your terminal (it will open a browser for authentication):

```bash
gcloud auth application-default login
```

**What happens:**
1. A browser window will open
2. Sign in with your Google account (andre@mymoolah.africa)
3. Grant permissions
4. A verification code will be displayed
5. Copy the code and paste it in your terminal

**Alternative (if browser doesn't open):**
```bash
gcloud auth application-default login --no-launch-browser
```
Then visit the URL shown and enter the verification code.

---

### **Step 2: Verify Authentication**

Test that authentication works:

```bash
# Test Cloud SQL access
gcloud sql instances describe mmtp-pg-staging --project=mymoolah-db
```

If this works, authentication is successful.

---

### **Step 3: Run Migrations**

Once authenticated, run the migrations script:

```bash
./scripts/run-migrations-staging.sh
```

**What the script does:**
1. Starts Cloud SQL Auth Proxy on port 5434
2. Tests database connection
3. Runs Sequelize migrations
4. Verifies tables were created
5. Stops the proxy

---

## 🔍 **Troubleshooting**

### **Error: "reauth related error (invalid_rapt)"**
**Solution**: Run `gcloud auth application-default login` again

### **Error: "Failed to connect to database"**
**Possible causes:**
1. Authentication expired - re-authenticate
2. Proxy not running - script will start it automatically
3. Wrong password - check Secret Manager
4. Database doesn't exist - verify database was created

### **Error: "Port 5434 is already in use"**
**Solution**: 
```bash
# Kill existing proxy
pkill -f cloud-sql-proxy

# Or use a different port by editing the script
```

---

## 📋 **Manual Migration Alternative**

If the script doesn't work, you can run migrations manually:

```bash
# 1. Get password
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db)

# 2. Start proxy (in separate terminal)
./bin/cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging --port=5434

# 3. In another terminal, set DATABASE_URL and run migrations
export DATABASE_URL="postgres://mymoolah_app:${DB_PASSWORD}@127.0.0.1:5434/mymoolah_staging?sslmode=disable"
export NODE_ENV=production
npx sequelize-cli db:migrate
```

---

## ✅ **Verification**

After migrations complete, verify tables were created:

```bash
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db)
PGPASSWORD="${DB_PASSWORD}" psql -h 127.0.0.1 -p 5434 -U mymoolah_app -d mymoolah_staging -c "\dt" | head -20
```

You should see a list of tables like:
- users
- wallets
- transactions
- products
- etc.

---

**Last Updated**: November 15, 2025

