# GitHub & Codespaces Setup Guide - MyMoolah Platform

**Status**: ✅ **READY TO USE** - Complete step-by-step instructions

## 🎯 **OBJECTIVE**
- Sync local drive changes to GitHub
- Set up Codespaces as PRIMARY development environment (source of truth)
- Get public URLs for team testing
- Prepare for production deployment

---

## 📋 **STEP 1: SYNC LOCAL TO GITHUB (ONE-TIME)**

### **Current Status Check**
✅ Your local drive is already synced with GitHub:
- Working tree is clean (no uncommitted changes)
- Local `main` branch matches `origin/main`
- Remote configured: `git@github.com:mymoolah-africa/mymoolah-platform.git`

### **If You Had Changes (you don't, but for reference):**

```bash
# Navigate to project directory
cd /Users/andremacbookpro/mymoolah

# Check current status
git status

# If you have uncommitted changes:
git add .
git commit -m "Sync local changes to GitHub"

# Push to GitHub
git push origin main
```

---

## 📋 **STEP 2: OPEN CODESPACES**

### **2.1 Access Your Codespace**

1. Go to: https://github.com/mymoolah-africa/mymoolah-platform
2. Click the green **"Code"** button (top right)
3. Select **"Codespaces"** tab
4. Click **"MYMOOLAH-PLATFORM [CODESPACES: BUG-FREE DOODLE]"** or create a new one
5. Wait for Codespaces to start (2-3 minutes)

### **2.2 Verify Codespaces Setup**

Once Codespaces opens, run these commands in the terminal:

```bash
# Navigate to project directory
cd ~/workspaces/mymoolah-platform || cd ~/mymoolah-platform || cd ~/mymoolah

# Check git status
git status

# Pull latest from GitHub (should match your local)
git pull origin main

# Verify remote configuration
git remote -v
# Should show: git@github.com:mymoolah-africa/mymoolah-platform.git
```

---

## 📋 **STEP 3: CODESPACES ENVIRONMENT SETUP**

### **3.1 Backend Setup**

```bash
# Navigate to project root
cd ~/workspaces/mymoolah-platform

# Install backend dependencies
npm install

# Create .env file (copy from template)
cp env.template .env

# Edit .env file with your configuration
# IMPORTANT: Set these values:
# - DATABASE_URL (your Cloud SQL PostgreSQL connection)
# - JWT_SECRET (generate: openssl rand -hex 32)
# - PORT=3001
# - NODE_ENV=production (for Codespaces)

# Run database migrations
npx sequelize-cli db:migrate
```

### **3.2 Frontend Setup**

```bash
# Navigate to frontend directory
cd mymoolah-wallet-frontend

# Install frontend dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
VITE_API_BASE_URL=https://3000-$(echo $CODESPACE_NAME).app.github.dev
VITE_API_PORT=3001
EOF

# Or manually set:
# VITE_API_BASE_URL=https://3000-YOUR-CODESPACE-NAME.app.github.dev
# VITE_API_PORT=3001
```

### **3.3 Start Services**

**Terminal 1 - Backend:**
```bash
cd ~/workspaces/mymoolah-platform
npm start
# Backend will run on port 3001
```

**Terminal 2 - Frontend:**
```bash
cd ~/workspaces/mymoolah-platform/mymoolah-wallet-frontend
npm run dev
# Frontend will run on port 3000
```

---

## 📋 **STEP 4: GET PUBLIC URLs**

### **4.1 Codespaces Port Forwarding**

Codespaces automatically creates public URLs for your ports:

1. **Backend API**: `https://3001-YOUR-CODESPACE-NAME.app.github.dev`
   - Health check: `https://3001-YOUR-CODESPACE-NAME.app.github.dev/health`
   - API base: `https://3001-YOUR-CODESPACE-NAME.app.github.dev/api/v1`

2. **Frontend**: `https://3000-YOUR-CODESPACE-NAME.app.github.dev`
   - Main app: `https://3000-YOUR-CODESPACE-NAME.app.github.dev`

### **4.2 Make Ports Public**

1. In Codespaces, click the **"Ports"** tab (bottom panel)
2. Find port **3001** (backend) → Right-click → **"Port Visibility"** → **"Public"**
3. Find port **3000** (frontend) → Right-click → **"Port Visibility"** → **"Public"**

### **4.3 Get Your Codespace Name**

```bash
# Check your Codespace name
echo $CODESPACE_NAME

# Or check the URL in the browser address bar
# Format: https://CODESPACE-NAME-xxx.app.github.dev
```

### **4.4 Share URLs with Team**

**Backend API:**
```
https://3001-YOUR-CODESPACE-NAME.app.github.dev/api/v1
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

## 📋 **STEP 5: CODESPACES WORKFLOW (FROM NOW ON)**

### **5.1 Daily Workflow**

**When you start working:**
```bash
# 1. Open Codespaces (web browser)
# 2. Navigate to project
cd ~/workspaces/mymoolah-platform

# 3. Pull latest changes
git pull origin main

# 4. Start your work
# (edit files, create features, etc.)

# 5. When done, commit and push
git add .
git commit -m "Description of changes"
git push origin main
```

**When you finish working:**
```bash
# 1. Check what changed
git status

# 2. Stage all changes
git add .

# 3. Commit with descriptive message
git commit -m "feat: add webhook handler for Peach Payments"

# 4. Push to GitHub
git push origin main

# 5. Close Codespaces tab (or leave it running)
```

### **5.2 ⚠️ IMPORTANT: Never Use Local Drive for Development**

**FROM NOW ON:**
- ✅ **DO**: Develop ONLY in Codespaces
- ✅ **DO**: Use Codespaces as source of truth
- ❌ **DON'T**: Edit files on local drive
- ❌ **DON'T**: Pull from local to override Codespaces

**If you accidentally edit local files:**
```bash
# On local drive (only to sync TO GitHub if needed):
cd /Users/andremacbookpro/mymoolah
git pull origin main  # Get latest from Codespaces
# Don't make changes here - just sync
```

---

## 📋 **STEP 6: PRODUCTION DEPLOYMENT PREPARATION**

### **6.1 Environment Variables Checklist**

Create a production `.env` file with these variables:

```bash
# Core Application
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@host:5432/mymoolah
DB_DIALECT=postgres

# Security
JWT_SECRET=<generate: openssl rand -hex 32>
SESSION_SECRET=<generate: openssl rand -hex 32>
TLS_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# External Services
FLASH_API_KEY=<your-flash-key>
FLASH_CONSUMER_KEY=<your-flash-consumer-key>
FLASH_CONSUMER_SECRET=<your-flash-secret>

MOBILEMART_API_KEY=<your-mobilemart-key>
MOBILEMART_CLIENT_ID=<your-client-id>
MOBILEMART_CLIENT_SECRET=<your-client-secret>

PEACH_BASE_AUTH=<peach-auth-url>
PEACH_BASE_CHECKOUT=<peach-checkout-url>
PEACH_CLIENT_ID=<peach-client-id>
PEACH_CLIENT_SECRET=<peach-client-secret>
PEACH_MERCHANT_ID=<peach-merchant-id>
PEACH_ENTITY_ID_PSH=<peach-entity-id>
PEACH_WEBHOOK_SECRET=<generate: openssl rand -hex 32>

ZAPPER_API_URL=<zapper-api-url>
ZAPPER_ORG_ID=<zapper-org-id>
ZAPPER_API_TOKEN=<zapper-api-token>
ZAPPER_X_API_KEY=<zapper-x-api-key>

# Redis
REDIS_URL=redis://host:6379

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### **6.2 Database Migration**

```bash
# Run migrations in production
NODE_ENV=production npx sequelize-cli db:migrate

# Verify migrations
NODE_ENV=production npx sequelize-cli db:migrate:status
```

### **6.3 Production Deployment Options**

**Option 1: Cloud Run (Google Cloud)**
```bash
# Build Docker image
docker build -t gcr.io/PROJECT-ID/mymoolah:latest .

# Push to Container Registry
docker push gcr.io/PROJECT-ID/mymoolah:latest

# Deploy to Cloud Run
gcloud run deploy mymoolah \
  --image gcr.io/PROJECT-ID/mymoolah:latest \
  --platform managed \
  --region africa-south1 \
  --allow-unauthenticated \
  --port 3001
```

**Option 2: App Engine (Google Cloud)**
```bash
# Create app.yaml
gcloud app deploy
```

**Option 3: VM Instance**
```bash
# SSH into VM
ssh user@your-vm-ip

# Clone repository
git clone git@github.com:mymoolah-africa/mymoolah-platform.git
cd mymoolah-platform

# Install dependencies
npm install --production

# Start with PM2
npm install -g pm2
pm2 start server.js --name mymoolah
pm2 save
pm2 startup
```

---

## 📋 **STEP 7: TESTING CHECKLIST**

### **7.1 Backend Health Check**

```bash
# Test backend health
curl https://3001-YOUR-CODESPACE-NAME.app.github.dev/health

# Expected response:
# {
#   "status": "OK",
#   "timestamp": "...",
#   "environment": "production",
#   "services": {...}
# }
```

### **7.2 API Endpoints**

```bash
# Test authentication
curl -X POST https://3001-YOUR-CODESPACE-NAME.app.github.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+27123456789","password":"YourPassword123!"}'

# Test wallet balance
curl https://3001-YOUR-CODESPACE-NAME.app.github.dev/api/v1/wallets/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **7.3 Frontend Access**

1. Open: `https://3000-YOUR-CODESPACE-NAME.app.github.dev`
2. Verify login page loads
3. Test authentication
4. Test wallet operations

---

## 📋 **STEP 8: TROUBLESHOOTING**

### **8.1 Port Not Accessible**

```bash
# Check if ports are public
# In Codespaces: Ports tab → Right-click port → Public visibility

# Check if services are running
ps aux | grep node
lsof -i :3001
lsof -i :3000
```

### **8.2 Database Connection Issues**

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check .env file
cat .env | grep DATABASE_URL
```

### **8.3 Git Sync Issues**

```bash
# Check git status
git status

# Pull latest
git pull origin main

# Force push (only if needed, be careful!)
git push origin main --force
```

---

## 📋 **QUICK REFERENCE**

### **Codespaces URLs**
- Repository: `https://github.com/mymoolah-africa/mymoolah-platform`
- Codespaces: Click "Code" → "Codespaces" tab
- Backend API: `https://3001-YOUR-CODESPACE-NAME.app.github.dev`
- Frontend: `https://3000-YOUR-CODESPACE-NAME.app.github.dev`

### **Development Workflow**
1. Open Codespaces
2. `git pull origin main`
3. Make changes
4. `git add .`
5. `git commit -m "description"`
6. `git push origin main`

### **Never Edit Local Drive**
- ❌ Don't develop on `/Users/andremacbookpro/mymoolah`
- ✅ Develop ONLY in Codespaces
- ✅ Codespaces is source of truth

---

## ✅ **SUCCESS CRITERIA**

You're ready when:
- ✅ Local changes synced to GitHub
- ✅ Codespaces opens and connects to GitHub
- ✅ Backend runs on port 3001
- ✅ Frontend runs on port 3000
- ✅ Public URLs work for team testing
- ✅ Team can access frontend and test
- ✅ Production environment variables configured

---

**Last Updated**: October 29, 2025
**Status**: ✅ **READY TO USE**

