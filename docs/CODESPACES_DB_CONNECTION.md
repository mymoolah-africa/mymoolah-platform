# Codespaces DB Connection (Cloud SQL)

**Quick reference** for Codespaces. For full database connection guide (UAT, Staging, Production, migrations), see [DATABASE_CONNECTION_GUIDE.md](./DATABASE_CONNECTION_GUIDE.md).

**Recommended**: Use `./scripts/one-click-restart-and-start.sh` — starts Redis, Cloud SQL Auth Proxy, and backend with correct env vars (NODE_ENV, PORT, TLS_ENABLED, JWT_SECRET, DATABASE_URL). UAT password fallback when .env missing.

Two supported methods:

- **One-click (recommended)**:
  - Run: `./scripts/one-click-restart-and-start.sh`
  - Starts proxy on 6543, backend on 3001, exports required env vars
  - UAT password from .env or fallback B0t3s@Mymoolah

- Manual Cloud SQL Auth Proxy:
  - Download proxy and run:
    ```bash
    ./cloud-sql-proxy --address 127.0.0.1 --port 6543 <PROJECT:REGION:INSTANCE> &
    DATABASE_URL="postgres://mymoolah_app:<PASS>@127.0.0.1:6543/mymoolah?sslmode=disable" npm run start:cs-ip
    ```
  - Ensure NODE_ENV, PORT, TLS_ENABLED, JWT_SECRET are set (or use one-click script)

Frontend remains at 3000. Ensure `CORS_ORIGINS` includes the 3000 forwarded URL.
