---
name: redis-caching-and-locks
description: Implement robust financial synchronization using Redis. Use this skill when managing rate limits, creating distributed locks to prevent double-spends, handling idempotency caching, or caching non-sensitive product data using ioredis in Node.js.
---

# MyMoolah Redis Caching and Distributed Locks

In a highly concurrent digital wallet like MyMoolah, PostgreSQL transactions alone are 
sometimes insufficient or too slow to prevent distributed race conditions (e.g., a user 
double-tapping "Send" causing two Node.js workers to deduct balance simultaneously).
We use Redis (`ioredis`) for explicit locking, idempotency caching, and rate limiting.

## When This Skill Activates

- Writing code that mutates user balances (`wallets`, `transactions`).
- Processing incoming webhooks from external providers (Peach, Flash).
- Implementing the backend Idempotency middleware.
- Caching high-read, low-write data (Flash product catalogs, standard configurations).
- **Warning:** NEVER cache PII, PCI data, or plain-text ledger accounts in Redis.

---

## 1. Core Principles

1. **Safety First**: Redis should fail gracefully. If Redis is down, idempotent endpoints should reject traffic rather than process unsafely without locks.
2. **TTL Everywhere**: Every key inserted into Redis MUST have an explicit Time-To-Live (TTL). No infinite keys.
3. **Redlock Algorithm**: When locking a resource (like a specific Wallet ID), use an algorithm robust against Node.js event loop lags (e.g., locking via Lua scripts or established libraries).

---

## 2. Distributed Locking for Financial Transactions

Before starting a Sequelize transaction that touches a wallet balance, acquire a Redis lock on that specific `walletId`.

### Redlock Implementation Pattern
Using `ioredis` and optionally `redlock` or a custom Lua script lock.

```javascript
// utils/redisLock.js
const { redisClient } = require('../config/redis');

/**
 * Acquires an exclusive lock on a resource.
 * @param {string} resourceKey - e.g., 'lock:wallet:1234'
 * @param {number} ttlMs - Lock expiration (e.g., 5000ms)
 * @returns {string|null} - Lock token if acquired, null if failed
 */
async function acquireLock(resourceKey, ttlMs = 5000) {
  const token = Math.random().toString(36).substring(2);
  // SET key value NX (Not eXists) PX (milliseconds)
  const result = await redisClient.set(resourceKey, token, 'NX', 'PX', ttlMs);
  return result === 'OK' ? token : null;
}

/**
 * Safely releases a lock ONLY if the token matches (Lua Script)
 */
async function releaseLock(resourceKey, token) {
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
  `;
  await redisClient.eval(luaScript, 1, resourceKey, token);
}

module.exports = { acquireLock, releaseLock };
```

### Applying the Lock in Controllers
```javascript
const { acquireLock, releaseLock } = require('../utils/redisLock');

async function sendMoney(req, res) {
  const { senderWalletId, amount } = req.body;
  const lockKey = `lock:wallet:${senderWalletId}`;
  
  // 1. Attempt to acquire lock for 5 seconds
  const lockToken = await acquireLock(lockKey, 5000);
  
  if (!lockToken) {
    // Another request is currently modifying this wallet
    return res.status(409).json({ 
      error: 'CONCURRENT_REQUEST', 
      message: 'Wallet is currently processing a transaction. Please try again in a few seconds.' 
    });
  }

  try {
    // 2. Perform DB operations safely inside Sequelize transaction
    await sequelize.transaction(async (t) => {
      // Validate balance, insert journal entries, update wallet
    });
    
    return res.status(200).json({ success: true });
  } finally {
    // 3. Always release the lock, even if DB fails
    await releaseLock(lockKey, lockToken);
  }
}
```

---

## 3. Idempotency Caching

While idempotency keys can be saved in PostgreSQL (`IdempotencyKey` model), Redis provides a dramatically faster first layer of defense against rapid double-clicks.

### Redis Idempotency Middleware Layer
```javascript
const { redisClient } = require('../config/redis');

const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return res.status(400).json({ error: 'X-Idempotency-Key header required' });

  const cacheKey = `idempotency:${key}`;
  
  // Attempt to set a "processing" flag atomically
  const isNew = await redisClient.set(cacheKey, 'processing', 'NX', 'EX', 86400); // 24hr TTL

  if (!isNew) {
    const status = await redisClient.get(cacheKey);
    if (status === 'processing') {
      return res.status(409).json({ error: 'Request is already processing' });
    }
    // If it's a JSON response, the previous request succeeded completely
    try {
      return res.status(200).json(JSON.parse(status));
    } catch {
      return res.status(500).json({ error: 'IDEMPOTENCY_CORRUPTION' });
    }
  }

  // Inject a method to cache the FINAL response upon success
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Overwrite 'processing' with the actual success JSON
      redisClient.set(cacheKey, JSON.stringify(body), 'EX', 86400);
    } else {
      // If the transaction failed (e.g., 400 Insufficient Funds), delete the key 
      // so the user can fix the error and try again with the same key
      redisClient.del(cacheKey);
    }
    originalJson.call(res, body);
  };

  next();
};
```

---

## 4. Product / Catalog Caching

Providers like Flash and EasyPay have static catalogs (Voucher amounts, Electricity municipalities). Do not query PostgreSQL or the API provider on every user request.

### Caching Strategy
```javascript
async function getFlashProducts() {
  const CACHE_KEY = 'products:flash';
  
  // 1. Try Cache
  const cached = await redisClient.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // 2. Fetch from DB/Provider
  const products = await FlashProductModel.findAll();
  
  // 3. Set Cache with TTL (e.g., 1 hour)
  await redisClient.set(CACHE_KEY, JSON.stringify(products), 'EX', 3600);
  
  return products;
}
```

---

## 5. Redis Checklist

- [ ] Has a TTL (`EX`, `PX`) been explicitly set on the inserted key?
- [ ] Are financial locks acquiring via atomic `set NX` operations?
- [ ] Is the lock token being verified via Lua script before deletion (`releaseLock`)?
- [ ] Does the lock have a TTL to prevent deadlocks if the Node process crashes?
- [ ] Is error handling swallowing Redis connection errors or failing safely?
- [ ] Are PII and PCI compliant details strictly excluded from cached payloads?
