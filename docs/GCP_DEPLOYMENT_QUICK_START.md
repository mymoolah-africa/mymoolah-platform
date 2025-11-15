# GCP Deployment - Quick Start Guide

**For Users New to Google Cloud Deployment**

---

## Where to Run the Scripts?

### ✅ **Recommended: Local Terminal (Your Mac)**

Run the scripts from your **local terminal** (on your Mac) because:
- You have full control over your environment
- Easier to install and configure tools
- Better for authentication flows
- Docker Desktop works well on Mac

### ⚠️ **Alternative: Codespaces Terminal**

You can also run from **Codespaces terminal**, but you'll need to:
- Install gcloud SDK in Codespaces
- Authenticate in Codespaces
- Set up Docker in Codespaces (if needed)

**Recommendation**: Start with **local terminal** for your first deployment.

---

## Prerequisites Checklist

Before running any scripts, you need these tools installed on your Mac:

### 1. Google Cloud SDK (gcloud)

**Check if installed**:
```bash
gcloud --version
```

**If not installed**, install it:
```bash
# Download and install from:
# https://cloud.google.com/sdk/docs/install

# Or use Homebrew (if you have it):
brew install --cask google-cloud-sdk
```

### 2. Docker Desktop

**Check if installed**:
```bash
docker --version
```

**If not installed**, download from:
- https://www.docker.com/products/docker-desktop

### 3. Node.js and npm

**Check if installed**:
```bash
node --version
npm --version
```

**If not installed**, install from:
- https://nodejs.org/

### 4. PostgreSQL Client (psql)

**Check if installed**:
```bash
psql --version
```

**If not installed**, install via Homebrew:
```bash
brew install postgresql
```

---

## Step-by-Step Setup

### Step 1: Authenticate with Google Cloud

Open your **local terminal** and run:

```bash
# Authenticate with your Google account
gcloud auth login

# Set the project
gcloud config set project mymoolah-db

# Verify you're authenticated
gcloud auth list
```

You should see your email address listed as ACTIVE.

### Step 2: Verify Prerequisites

Run this check script:

```bash
cd /Users/andremacbookpro/mymoolah

# Check all prerequisites
echo "Checking prerequisites..."
gcloud --version && echo "✅ gcloud installed" || echo "❌ gcloud missing"
docker --version && echo "✅ Docker installed" || echo "❌ Docker missing"
node --version && echo "✅ Node.js installed" || echo "❌ Node.js missing"
psql --version && echo "✅ psql installed" || echo "❌ psql missing"
```

### Step 3: Navigate to Project Directory

```bash
cd /Users/andremacbookpro/mymoolah
```

### Step 4: Run Scripts in Order

Now you're ready! Run the scripts from your **local terminal** in this order:

```bash
# 1. Database setup
./scripts/setup-staging-database.sh

# 2. Secrets setup
./scripts/setup-secrets-staging.sh

# 3. Service account
./scripts/create-cloud-run-service-account.sh

# 4. Build and push Docker
./scripts/build-and-push-docker.sh

# 5. Deploy to Cloud Run
./scripts/deploy-cloud-run-staging.sh

# 6. Run migrations
./scripts/run-migrations-staging.sh

# 7. Test service
./scripts/test-staging-service.sh
```

---

## Troubleshooting

### "gcloud: command not found"
- Install Google Cloud SDK (see above)
- Make sure it's in your PATH

### "Docker: command not found"
- Install Docker Desktop
- Make sure Docker Desktop is running

### "Permission denied" when running scripts
- Make scripts executable: `chmod +x scripts/*.sh`

### "Authentication required"
- Run: `gcloud auth login`
- Follow the browser authentication flow

### "Project not found"
- Verify project ID: `gcloud config get-value project`
- Set project: `gcloud config set project mymoolah-db`

---

## Quick Test

Before running all scripts, test your setup:

```bash
# Test gcloud
gcloud config get-value project
# Should output: mymoolah-db

# Test Docker
docker ps
# Should show running containers (or empty list if no containers)

# Test scripts are executable
ls -la scripts/*.sh
# All should show -rwxr-xr-x (executable)
```

---

## Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Verify all prerequisites are installed
3. Check `docs/GCP_STAGING_DEPLOYMENT.md` for detailed troubleshooting
4. Make sure you're authenticated: `gcloud auth list`

---

**Remember**: Run all scripts from your **local terminal** (Mac), not Codespaces, for your first deployment.

