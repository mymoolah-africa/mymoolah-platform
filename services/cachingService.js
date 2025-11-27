/**
 * Caching Service for MyMoolah
 * 
 * Provides Redis and in-memory caching for improved performance
 * Implements smart cache invalidation and TTL management
 */

const redis = require('redis');
const NodeCache = require('node-cache');

class CachingService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = null;
    this.isRedisConnected = false;
    this.cacheStats = {
      redis: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      memory: { hits: 0, misses: 0, sets: 0, deletes: 0 }
    };
    
    this.initializeCaches();
  }

  /**
   * Initialize Redis and in-memory caches
   */
  async initializeCaches() {
    // Initialize in-memory cache first (always available)
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every minute
      maxKeys: 1000, // Maximum 1000 keys in memory
      useClones: false // Better performance
    });

    // Only initialize Redis if explicitly configured
    // In Cloud Run, Redis is not available by default, so we skip it
    if ((process.env.REDIS_URL || process.env.REDIS_HOST) && process.env.REDIS_ENABLED !== 'false') {
      try {
        // Initialize Redis client - use REDIS_URL if available, otherwise use REDIS_HOST
        // Redis v5 API - don't default to localhost!
        const redisConfig = process.env.REDIS_URL ? 
          { url: process.env.REDIS_URL } :
          {
            socket: {
              host: process.env.REDIS_HOST, // Don't default to localhost!
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
              connectTimeout: 5000,
              reconnectStrategy: (retries) => {
                if (retries > 3) {
                  console.warn('⚠️ Redis max retry attempts reached, disabling Redis');
                  this.redisClient = null;
                  this.isRedisConnected = false;
                  return false; // Stop retrying
                }
                return Math.min(retries * 200, 2000);
              }
            },
            password: process.env.REDIS_PASSWORD,
            database: parseInt(process.env.REDIS_DB || '0', 10)
          };

        this.redisClient = redis.createClient(redisConfig);

        // Redis event handlers
        this.redisClient.on('connect', () => {
          console.log('✅ Redis connected successfully');
          this.isRedisConnected = true;
        });

        this.redisClient.on('error', (err) => {
          console.warn('⚠️ Redis connection error:', err.message);
          this.isRedisConnected = false;
          // Don't crash - just disable Redis
          this.redisClient = null;
        });

        this.redisClient.on('end', () => {
          console.log('⚠️ Redis connection ended, using in-memory cache only');
          this.isRedisConnected = false;
          this.redisClient = null;
        });

        // Try to connect (non-blocking, won't crash if fails)
        this.redisClient.connect().catch((err) => {
          console.warn('⚠️ Redis connection failed, using in-memory cache only:', err.message);
          this.redisClient = null;
          this.isRedisConnected = false;
        });

        console.log('✅ Caching service initialized (Redis optional)');

      } catch (error) {
        console.warn('⚠️ Failed to initialize Redis, using in-memory cache only:', error.message);
        this.redisClient = null;
        this.isRedisConnected = false;
      }
    } else {
      console.log('ℹ️ Redis disabled for CachingService (REDIS_URL/REDIS_HOST not set or REDIS_ENABLED=false)');
      this.redisClient = null;
      this.isRedisConnected = false;
    }

    console.log('✅ Caching service initialized successfully');
  }

  /**
   * Get value from cache (Redis first, then memory)
   */
  async get(key, options = {}) {
    const { useRedis = true, useMemory = true } = options;

    try {
      // Try Redis first if available
      if (useRedis && this.isRedisConnected && this.redisClient) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue !== null) {
          this.cacheStats.redis.hits++;
          const parsedValue = this.parseValue(redisValue);
          return parsedValue;
        }
        this.cacheStats.redis.misses++;
      }

      // Try memory cache
      if (useMemory && this.memoryCache) {
        const memoryValue = this.memoryCache.get(key);
        if (memoryValue !== undefined) {
          this.cacheStats.memory.hits++;
          return memoryValue;
        }
        this.cacheStats.memory.misses++;
      }

      return null;

    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache (both Redis and memory)
   */
  async set(key, value, options = {}) {
    const { 
      ttl = 300, // 5 minutes default
      useRedis = true, 
      useMemory = true,
      serialize = true 
    } = options;

    try {
      const serializedValue = serialize ? this.serializeValue(value) : value;

      // Set in Redis if available
      if (useRedis && this.isRedisConnected && this.redisClient) {
        await this.redisClient.setex(key, ttl, serializedValue);
        this.cacheStats.redis.sets++;
      }

      // Set in memory cache
      if (useMemory && this.memoryCache) {
        this.memoryCache.set(key, value, ttl);
        this.cacheStats.memory.sets++;
      }

      return true;

    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key, options = {}) {
    const { useRedis = true, useMemory = true } = options;

    try {
      // Delete from Redis
      if (useRedis && this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
        this.cacheStats.redis.deletes++;
      }

      // Delete from memory
      if (useMemory && this.memoryCache) {
        this.memoryCache.del(key);
        this.cacheStats.memory.deletes++;
      }

      return true;

    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache data
   */
  async clear(options = {}) {
    const { useRedis = true, useMemory = true } = options;

    try {
      // Clear Redis
      if (useRedis && this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushdb();
        console.log('✅ Redis cache cleared');
      }

      // Clear memory cache
      if (useMemory && this.memoryCache) {
        this.memoryCache.flushAll();
        console.log('✅ Memory cache cleared');
      }

      return true;

    } catch (error) {
      console.error('❌ Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache ? this.memoryCache.getStats() : {};
    
    return {
      redis: {
        connected: this.isRedisConnected,
        stats: this.cacheStats.redis,
        hitRate: this.cacheStats.redis.hits + this.cacheStats.redis.misses > 0 
          ? (this.cacheStats.redis.hits / (this.cacheStats.redis.hits + this.cacheStats.redis.misses) * 100).toFixed(2) + '%'
          : '0%'
      },
      memory: {
        stats: this.cacheStats.memory,
        keys: memoryStats.keys || 0,
        hitRate: this.cacheStats.memory.hits + this.cacheStats.memory.misses > 0
          ? (this.cacheStats.memory.hits / (this.cacheStats.memory.hits + this.cacheStats.memory.misses) * 100).toFixed(2) + '%'
          : '0%'
      }
    };
  }

  /**
   * Cache middleware for Express routes
   */
  cacheMiddleware(ttl = 300, keyGenerator = null) {
    return async (req, res, next) => {
      try {
        // Generate cache key
        const cacheKey = keyGenerator ? keyGenerator(req) : `api:${req.method}:${req.originalUrl}`;
        
        // Try to get from cache
        const cachedResponse = await this.get(cacheKey);
        
        if (cachedResponse) {
          return res.json(cachedResponse);
        }

        // Store original send method
        const originalSend = res.json;
        
        // Override send method to cache response
        res.json = function(data) {
          // Cache the response
          this.set(cacheKey, data, { ttl });
          
          // Call original send method
          return originalSend.call(this, data);
        }.bind(this);

        next();

      } catch (error) {
        console.error('❌ Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Smart cache invalidation for related data
   */
  async invalidatePattern(pattern) {
    try {
      // Invalidate Redis keys matching pattern
      if (this.isRedisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          console.log(`✅ Invalidated ${keys.length} Redis keys matching pattern: ${pattern}`);
        }
      }

      // Invalidate memory cache keys matching pattern
      if (this.memoryCache) {
        const memoryKeys = this.memoryCache.keys();
        const matchingKeys = memoryKeys.filter(key => key.includes(pattern.replace('*', '')));
        matchingKeys.forEach(key => this.memoryCache.del(key));
        console.log(`✅ Invalidated ${matchingKeys.length} memory cache keys matching pattern: ${pattern}`);
      }

      return true;

    } catch (error) {
      console.error('❌ Cache invalidation error:', error);
      return false;
    }
  }

  /**
   * Serialize value for Redis storage
   */
  serializeValue(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('❌ Value serialization error:', error);
      return String(value);
    }
  }

  /**
   * Parse value from Redis storage
   */
  parseValue(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  /**
   * Health check for caching service
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: this.isRedisConnected,
        status: this.isRedisConnected ? 'connected' : 'disconnected'
      },
      memory: {
        status: this.memoryCache ? 'available' : 'unavailable',
        keys: this.memoryCache ? this.memoryCache.keys().length : 0
      }
    };

    // Test Redis connection if available
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.ping();
        health.redis.status = 'connected';
      } catch (error) {
        health.redis.status = 'error';
        health.status = 'degraded';
      }
    }

    return health;
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        console.log('✅ Redis connection closed');
        this.redisClient = null;
        this.isRedisConnected = false;
      }
    } catch (error) {
      console.warn('⚠️ Error closing Redis connection:', error.message);
      this.redisClient = null;
      this.isRedisConnected = false;
    }
  }
}

// Create singleton instance
const cachingService = new CachingService();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down caching service...');
  await cachingService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down caching service...');
  await cachingService.close();
  process.exit(0);
});

module.exports = cachingService;
