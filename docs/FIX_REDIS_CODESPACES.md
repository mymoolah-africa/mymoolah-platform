# Fix Redis Logs in Codespaces (Dev)

Redis is optional in dev. When not running, the backend suppresses ioredis connection noise and uses in‑memory cache.

- No action needed for normal development
- To enable Redis, run a local Redis container and set `REDIS_URL`:
  ```bash
  docker run -p 6379:6379 --name redis -d redis:7
  export REDIS_URL=redis://127.0.0.1:6379
  ```
