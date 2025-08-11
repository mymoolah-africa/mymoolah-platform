### MyMoolah Platform

Welcome to MyMoolah. This repository contains the backend (Node.js/Express/SQLite via Sequelize) and the Figma-generated frontend.

Important working rules
- Work only inside `mymoolah/` and subdirectories
- Frontend pages under `mymoolah-wallet-frontend/pages` are Figma-managed; do not edit directly
- Users authenticate with SA mobile number + password

### Port Matrix (single source of truth)
See `docs/PORT_MATRIX.md` for the authoritative matrix. Summary:

- Local
  - Backend: 3001
  - Frontend: 3000
  - API base: `http://localhost:3001/api/v1`

- Codespaces
  - Backend: 5050
  - Frontend: 3000 (forwarded)
  - API base: `https://<your-5050-forwarded-host>/api/v1`

### Quick start

Local
```
# Backend
cd /Users/andremacbookpro/mymoolah
cp -n env.template .env || true
# Ensure in .env
# PORT=3001
# DATABASE_PATH=./data/mymoolah.db
# JWT_SECRET=<32+ chars>
# ALLOWED_ORIGINS=http://localhost:3000
npm install
npm start

# Frontend
cd /Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend
echo "VITE_API_BASE_URL=http://localhost:3001/api/v1" > .env.local
npm install
npm run dev
```

Codespaces
```
# Backend
cd /workspaces/mymoolah-platform
cp -n env.template .env || true
# Ensure in .env
# PORT=5050
# DATABASE_PATH=./data/mymoolah.db
# JWT_SECRET=<32+ chars>
# ALLOWED_ORIGINS=https://<your-3000-forwarded-host>
npm install
npm start

# Frontend
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend
echo "VITE_API_BASE_URL=https://<your-5050-forwarded-host>/api/v1" > .env.local
npm install
npm run dev
```

### Troubleshooting
- Failed to fetch
  - Frontend `VITE_API_BASE_URL` is wrong or backend not running
- CORS blocked
  - Add your frontend origin to `ALLOWED_ORIGINS` (comma-separated, no trailing slash) and restart backend
- Health check
  - Local: `curl http://localhost:3001/health`
  - Codespaces: use the 5050 forwarded URL

### Docs
- Port Matrix: `docs/PORT_MATRIX.md`
- Development Guide: `docs/DEVELOPMENT_GUIDE.md`
- Setup Guide: `docs/SETUP_GUIDE.md`
- API: `docs/API_DOCUMENTATION.md`


