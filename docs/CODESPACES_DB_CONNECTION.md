# Codespaces DB Connection (Cloud SQL)

Two supported methods:

- Quick dev (current):
  - Backend: `npm run start:cs-ip` (sets ssl=true + no-verify at runtime)
  - Pros: No code changes; one command
  - Cons: Dev-only TLS verification skip

- Recommended team setup: Cloud SQL Auth Proxy
  - Download proxy in Codespaces and run:
    ```bash
    ./cloud-sql-proxy --address 127.0.0.1 --port 5433 <PROJECT:REGION:INSTANCE> \
      --credentials-file .gcp-sa.json >/tmp/cloudsql.log 2>&1 &
    DATABASE_URL="postgres://mymoolah_app:<PASS>@127.0.0.1:5433/mymoolah" npm start
    ```
  - Pros: Verified TLS; no overrides

Frontend remains at 3000. Ensure `CORS_ORIGINS` includes the 3000 forwarded URL.
