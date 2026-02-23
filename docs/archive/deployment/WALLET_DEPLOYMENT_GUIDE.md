# MyMoolah Wallet Deployment Guide

## Overview

The MyMoolah wallet frontend can be deployed in two configurations:

1. **Development (Codespaces)**: Wallet connects to Codespaces backend for dev testing
2. **Staging (Cloud Run)**: Wallet connects to Cloud Run staging backend for production credential testing

---

## Configuration 1: Development Wallet (Codespaces)

**Purpose**: Test with GitHub data using Codespaces backend

**Prerequisites**: 
- Cloud SQL Auth Proxy must be running (connects Codespaces backend to Google Cloud database)
- Backend must be running on port 3001

**Setup**:

1. **Start Backend with Proxy** (required first):
   ```bash
   ./scripts/one-click-restart-and-start.sh
   ```
   This script:
   - Starts Cloud SQL Auth Proxy on port 6543
   - Starts Redis container
   - Starts backend server on port 3001
   - Configures DATABASE_URL to use proxy

2. **Start Wallet Frontend** (in separate terminal):
   ```bash
   cd mymoolah-wallet-frontend
   export VITE_API_BASE_URL=http://localhost:3001
   npm run dev
   ```

**Access**:
- Local: `http://localhost:3002/` (or whatever port Vite assigns)
- Codespaces Preview: Click "Ports" tab → Find wallet port → Click globe icon

**Backend**: Codespaces backend on `http://localhost:3001` (requires proxy)
**Database**: Google Cloud database via Cloud SQL Auth Proxy (port 6543)

---

## Configuration 2: Staging Wallet (Cloud Run)

**Purpose**: Test with production credentials using staging database

**Setup**:

1. **Build and push Docker image**:
   ```bash
   ./scripts/build-and-push-wallet-staging.sh
   ```

2. **Deploy to Cloud Run**:
   ```bash
   ./scripts/deploy-wallet-staging.sh
   ```

**Access**: 
- URL will be provided after deployment (e.g., `https://mymoolah-wallet-staging-xxx.a.run.app`)

**Backend**: Cloud Run staging backend
**Database**: Staging database (`mymoolah_staging`) with production credentials

---

## Environment Variables

The wallet uses `VITE_API_BASE_URL` to determine which backend to connect to:

- **Development**: `http://localhost:3001` (Codespaces backend)
- **Staging**: `https://mymoolah-backend-staging-4ekgjiko5a-bq.a.run.app` (Cloud Run staging)

---

## Testing Checklist

### Development Wallet
- [ ] Cloud SQL Auth Proxy is running (port 6543)
- [ ] Backend is running (port 3001)
- [ ] Wallet loads in Codespaces
- [ ] Can login with dev credentials
- [ ] Connects to Codespaces backend (port 3001)
- [ ] Backend connects to database via proxy

### Staging Wallet
- [ ] Wallet loads from Cloud Run URL
- [ ] Can login with staging database credentials
- [ ] Connects to staging backend
- [ ] Uses staging database with production credentials
- [ ] Zapper integration works with production credentials

---

## Troubleshooting

### Cloud SQL Auth Proxy Issues (Development)
- **Proxy not running**: Run `./scripts/one-click-restart-and-start.sh`
- **Port 6543 in use**: The script will kill existing proxy processes
- **Authentication errors**: Run `gcloud auth application-default login` in Codespaces
- **Backend can't connect**: Verify proxy is listening on `127.0.0.1:6543`

### CORS Errors
- Ensure backend CORS allows the wallet origin
- For Codespaces: Backend allows `*.github.dev` domains
- For staging: Backend allows the Cloud Run wallet URL

### Authentication Errors
- Development: Uses JWT from Codespaces backend (requires proxy for database)
- Staging: Uses JWT from staging backend (may require IAM configuration)

### Build Errors
- Ensure Docker is running
- Check that `VITE_API_BASE_URL` is set correctly during build
- Verify nginx configuration is correct

---

## Cost Optimization

**Staging Wallet**:
- CPU: 0.5 vCPU (minimal for static site)
- Memory: 256Mi (very lightweight)
- Min Instances: 0 (scales to zero when idle)
- Estimated cost: ~$0.50/month (with minimal traffic)

---

## Security Notes

- Staging wallet is public (static site)
- All API calls go through staging backend (which has authentication)
- Backend handles all security (JWT, rate limiting, etc.)
- Wallet only serves static files

