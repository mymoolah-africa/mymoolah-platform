# Codespaces Quick Start - MyMoolah Platform

**Status**: ✅ **CODESPACES IS RUNNING** - Ready for next steps

## 🎯 **YOUR CURRENT STATUS**

✅ Codespaces is open and running
✅ Project loaded: `MYMOOLAH-PLATFORM [CODESPACES: BUG-FREE DOODLE]`
✅ Working directory: `/workspaces/mymoolah-platform`
✅ Branch: `main`

---

## 📋 **NEXT STEPS: GET PUBLIC URLs FOR TEAM**

### **STEP 1: Make Ports Public**

1. **Click the "PORTS" tab** at the bottom of Codespaces (next to Terminal)
2. Find **port 3001** (backend) - Right-click → **"Port Visibility"** → **"Public"**
3. Find **port 3000** (frontend) - Right-click → **"Port Visibility"** → **"Public"**

### **STEP 2: Get Your Codespace Name**

Your Codespace name is in the browser URL:
- Format: `https://CODESPACE-NAME.app.github.dev`
- Example: `bug-free-doodle-pj66r7q7q5pw39pjv.app.github.dev`

Or run in terminal:
```bash
echo $CODESPACE_NAME
```

### **STEP 3: Your Public URLs**

Replace `YOUR-CODESPACE-NAME` with your actual Codespace name:

**Backend API:**
```
https://3001-YOUR-CODESPACE-NAME.app.github.dev
```

**Frontend:**
```
https://3000-YOUR-CODESPACE-NAME.app.github.dev
```

**Health Check:**
```
https://3001-YOUR-CODESPACE-NAME.app.github.dev/health
```

---

## 📋 **START SERVICES (IF NOT RUNNING)**

### **Terminal 1 - Backend:**

```bash
cd /workspaces/mymoolah-platform
npm start
```

### **Terminal 2 - Frontend:**

```bash
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend
npm run dev
```

---

## 📋 **UPDATE .env FOR CODESPACES**

Your `.env` file currently has:
- `NODE_ENV=development` ✅ (can stay as development for testing)
- `PORT=3001` ✅ (correct)
- `DATABASE_URL=postgres://...@127.0.0.1:5433/...` ✅ (correct for Cloud SQL proxy)

**For Codespaces public URLs, update `ALLOWED_ORIGINS`:**

```bash
# Edit .env file
code .env

# Update ALLOWED_ORIGINS to include your Codespaces URLs:
ALLOWED_ORIGINS=http://localhost:3000,https://3000-YOUR-CODESPACE-NAME.app.github.dev,https://3001-YOUR-CODESPACE-NAME.app.github.dev
```

---

## 📋 **VERIFY EVERYTHING WORKS**

### **1. Check Backend Health:**

```bash
curl https://3001-YOUR-CODESPACE-NAME.app.github.dev/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "...",
  "environment": "development",
  "services": {...}
}
```

### **2. Test Frontend:**

Open in browser:
```
https://3000-YOUR-CODESPACE-NAME.app.github.dev
```

### **3. Test API:**

```bash
curl https://3001-YOUR-CODESPACE-NAME.app.github.dev/api/v1/users
```

---

## 📋 **SHARE WITH TEAM**

Send these URLs to your team:

```
🚀 MyMoolah Platform - Testing Environment

Frontend: https://3000-YOUR-CODESPACE-NAME.app.github.dev
Backend API: https://3001-YOUR-CODESPACE-NAME.app.github.dev/api/v1
Health Check: https://3001-YOUR-CODESPACE-NAME.app.github.dev/health

Test Credentials:
- Phone: [Your test phone number]
- Password: [Your test password]
```

---

## 📋 **DAILY WORKFLOW (FROM NOW ON)**

**When you start working:**
```bash
# 1. Codespaces is already open ✅
# 2. Pull latest changes
git pull origin main

# 3. Start services (if needed)
npm start  # Terminal 1
cd mymoolah-wallet-frontend && npm run dev  # Terminal 2

# 4. Do your work
# (edit files, create features, etc.)

# 5. When done, commit and push
git add .
git commit -m "Description of changes"
git push origin main
```

**Important:**
- ✅ Always develop in Codespaces (NOT local drive)
- ✅ Always `git pull` before starting work
- ✅ Always `git push` when done
- ✅ Codespaces is now the source of truth

---

## ✅ **CHECKLIST**

- [ ] Ports 3000 and 3001 are set to Public
- [ ] Backend is running (`npm start`)
- [ ] Frontend is running (`npm run dev` in frontend directory)
- [ ] Health check works: `curl https://3001-YOUR-CODESPACE-NAME.app.github.dev/health`
- [ ] Frontend loads: `https://3000-YOUR-CODESPACE-NAME.app.github.dev`
- [ ] `.env` has correct `ALLOWED_ORIGINS` with Codespaces URLs
- [ ] URLs shared with team

---

**Need help?** Check the full guide: `docs/GITHUB_CODESPACES_SETUP.md`

