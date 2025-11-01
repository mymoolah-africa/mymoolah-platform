# Fix Redis Connection in Codespaces

## 🚀 **QUICK FIX: Install Redis in Codespaces**

Run these commands in your Codespaces terminal:

```bash
# Install Redis
sudo apt-get update
sudo apt-get install -y redis-server

# Start Redis
sudo service redis-server start

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

**Or use Redis in Docker (if Docker is available):**
```bash
# Check if Docker is available
docker --version

# If Docker is available, run Redis in a container:
docker run -d -p 6379:6379 --name redis redis:latest

# Verify
redis-cli ping
```

---

## 📋 **ALTERNATIVE: Disable Redis (If Not Needed)**

If you don't need Redis caching right now, you can disable it:

Edit your `.env` file:
```bash
code .env
```

Comment out or remove Redis-related environment variables:
```bash
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_URL=redis://127.0.0.1:6379
```

The server will work without Redis, but caching features won't be available.

---

## ✅ **VERIFY FIX**

After starting Redis, restart your backend:

```bash
# Stop server (Ctrl + C)
# Then restart
npm start
```

You should no longer see Redis connection errors.

