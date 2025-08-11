### Ports and Environment Matrix

This single source of truth defines which ports and environment variables to use in each environment. Use it to avoid CORS and "Failed to fetch" errors.

### Summary

- Local development
  - Backend: PORT=3001
  - Frontend dev server: 3000
  - API base: http://localhost:3001/api/v1
  - Backend CORS: ALLOWED_ORIGINS=http://localhost:3000[,http://<your-LAN-IP>:3000]
  - Frontend env: VITE_API_BASE_URL=http://localhost:3001

- Codespaces (or any cloud dev with forwarded URLs)
  - Backend: PORT=5050
  - Frontend dev server: 3000 (Codespaces UI)
  - API base: https://<your-5050-forwarded-host>/api/v1
  - Backend CORS: ALLOWED_ORIGINS=https://<your-3000-forwarded-host>
  - Frontend env: VITE_API_BASE_URL=https://<your-5050-forwarded-host>

Notes
- Never include a trailing slash on ALLOWED_ORIGINS values
- Multiple origins are comma-separated in a single line
- The backend CORS in `config/security.js` accepts ALLOWED_ORIGINS in both production and development
- `VITE_API_BASE_URL` should be the host only. The frontend code adds `/api/v1` internally.

### Exact steps

#### Local
1) Backend `.env` (at `mymoolah/.env`)
```
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/mymoolah.db
JWT_SECRET=<32+ char secret>
ALLOWED_ORIGINS=http://localhost:3000
```

2) Frontend `.env.local` (at `mymoolah/mymoolah-wallet-frontend/.env.local`)
```
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

3) Start
```
cd /Users/andremacbookpro/mymoolah && npm start
cd /Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend && npm run dev
```

#### Codespaces
1) Backend `.env` (at `/workspaces/mymoolah-platform/.env`)
```
PORT=5050
NODE_ENV=development
DATABASE_PATH=./data/mymoolah.db
JWT_SECRET=<32+ char secret>
ALLOWED_ORIGINS=https://<your-3000-forwarded-host>
```

2) Frontend `.env.local` (at `/workspaces/mymoolah-platform/mymoolah-wallet-frontend/.env.local`)
```
VITE_API_BASE_URL=https://<your-5050-forwarded-host>/api/v1
```

3) Start
```
cd /workspaces/mymoolah-platform && npm start
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend && npm run dev
```

### Troubleshooting quick checks
- Login says "Failed to fetch":
  - Ensure the frontend is using the correct VITE_API_BASE_URL
  - Verify backend health: curl http://localhost:3001/health (local) or your 5050 URL (Codespaces)
- CORS error: add your frontend origin to ALLOWED_ORIGINS (no trailing slash), restart backend
- Mixed content error: use https URLs in Codespaces for the API base


