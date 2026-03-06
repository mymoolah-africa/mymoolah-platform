/**
 * Idempotency Middleware
 * Prevents duplicate processing of requests using X-Idempotency-Key header.
 * Uses Redis as a fast L1 cache (sub-ms) with PostgreSQL as durable L2 fallback.
 * 
 * @author MyMoolah Development Team
 * @version 2.0.0
 */

const crypto = require('crypto');
const { IdempotencyKey } = require('../models');
const { sendErrorResponse, ERROR_CODES } = require('../utils/errorHandler');

let redisClient = null;
let redisReady = false;

function initRedisForIdempotency() {
  if (redisClient) return;

  const hasRedis = (process.env.REDIS_URL || process.env.REDIS_HOST) &&
    process.env.REDIS_ENABLED !== 'false';

  if (!hasRedis) return;

  try {
    const redis = require('redis');
    const config = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : {
          socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            connectTimeout: 3000,
            reconnectStrategy: (retries) => retries > 3 ? false : Math.min(retries * 200, 2000),
          },
          password: process.env.REDIS_PASSWORD || undefined,
          database: parseInt(process.env.REDIS_DB || '0', 10),
        };

    redisClient = redis.createClient(config);
    redisClient.on('connect', () => { redisReady = true; });
    redisClient.on('error', () => { redisReady = false; });
    redisClient.on('end', () => { redisReady = false; });
    redisClient.connect().catch(() => { redisReady = false; redisClient = null; });
  } catch {
    redisClient = null;
    redisReady = false;
  }
}

const REDIS_IDEMPOTENCY_TTL = 86400; // 24 hours in seconds
const REDIS_KEY_PREFIX = 'idempotency:';

async function redisGet(key) {
  if (!redisReady || !redisClient) return null;
  try {
    return await redisClient.get(`${REDIS_KEY_PREFIX}${key}`);
  } catch {
    return null;
  }
}

async function redisSetProcessing(key) {
  if (!redisReady || !redisClient) return false;
  try {
    const result = await redisClient.set(
      `${REDIS_KEY_PREFIX}${key}`, 'processing', { NX: true, EX: REDIS_IDEMPOTENCY_TTL }
    );
    return result === 'OK';
  } catch {
    return false;
  }
}

async function redisStoreResponse(key, responseData) {
  if (!redisReady || !redisClient) return;
  try {
    await redisClient.set(
      `${REDIS_KEY_PREFIX}${key}`, JSON.stringify(responseData), { EX: REDIS_IDEMPOTENCY_TTL }
    );
  } catch { /* Redis failure is non-fatal */ }
}

async function redisDelete(key) {
  if (!redisReady || !redisClient) return;
  try {
    await redisClient.del(`${REDIS_KEY_PREFIX}${key}`);
  } catch { /* Redis failure is non-fatal */ }
}

// Eagerly attempt Redis connection on module load
initRedisForIdempotency();

/**
 * Calculate SHA-256 hash of request body
 * 
 * @param {object} body - Request body
 * @returns {string} SHA-256 hash
 */
function hashRequestBody(body) {
  const bodyString = JSON.stringify(body);
  return crypto.createHash('sha256').update(bodyString).digest('hex');
}

/**
 * Clean up expired idempotency keys (called periodically)
 * 
 * @param {object} sequelize - Sequelize instance
 */
async function cleanupExpiredKeys(sequelize) {
  try {
    const result = await sequelize.query(
      `DELETE FROM idempotency_keys WHERE expires_at < NOW()`,
      { type: sequelize.QueryTypes.DELETE }
    );
    if (result[1] > 0) {
      console.log(`🧹 Cleaned up ${result[1]} expired idempotency keys`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up expired idempotency keys:', error);
  }
}

/**
 * Idempotency middleware
 * Checks X-Idempotency-Key header and returns cached response if key exists
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
async function idempotencyMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['X-Idempotency-Key'];

  if (!idempotencyKey) {
    return next();
  }

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0 || idempotencyKey.length > 255) {
    return sendErrorResponse(res, ERROR_CODES.INVALID_FORMAT,
      'X-Idempotency-Key must be a non-empty string (max 255 characters)',
      req.requestId);
  }

  try {
    const requestHash = hashRequestBody(req.body);
    const endpoint = req.path;

    // --- L1: Redis fast-path (sub-ms) ---
    const redisCached = await redisGet(idempotencyKey);
    if (redisCached) {
      if (redisCached === 'processing') {
        return res.status(409).json({
          success: false,
          error: 'CONCURRENT_REQUEST',
          message: 'This request is currently being processed. Please wait.',
        });
      }
      try {
        const cached = JSON.parse(redisCached);
        if (cached.requestHash === requestHash && cached.endpoint === endpoint) {
          console.log(`✅ Idempotency [Redis]: Returning cached response for key: ${idempotencyKey.substring(0, 20)}...`);
          return res.status(cached.responseStatus).json(cached.responseBody);
        } else {
          console.log(`⚠️ Idempotency conflict [Redis]: Key ${idempotencyKey.substring(0, 20)}... used with different request`);
          return sendErrorResponse(res, ERROR_CODES.DUPLICATE_REQUEST,
            'Idempotency key already used with a different request. Use a unique key for each request.',
            req.requestId);
        }
      } catch { /* If Redis data is corrupt, fall through to PostgreSQL */ }
    }

    // --- L2: PostgreSQL durable check ---
    const existingKey = await IdempotencyKey.findOne({
      where: { idempotencyKey: idempotencyKey }
    });

    if (existingKey) {
      if (existingKey.requestHash === requestHash && existingKey.endpoint === endpoint) {
        console.log(`✅ Idempotency [PG]: Returning cached response for key: ${idempotencyKey.substring(0, 20)}...`);
        // Backfill Redis so the next duplicate is instant
        redisStoreResponse(idempotencyKey, {
          requestHash, endpoint,
          responseStatus: existingKey.responseStatus,
          responseBody: existingKey.responseBody,
        }).catch(() => {});
        return res.status(existingKey.responseStatus).json(existingKey.responseBody);
      } else {
        console.log(`⚠️ Idempotency conflict [PG]: Key ${idempotencyKey.substring(0, 20)}... used with different request`);
        return sendErrorResponse(res, ERROR_CODES.DUPLICATE_REQUEST,
          'Idempotency key already used with a different request. Use a unique key for each request.',
          req.requestId);
      }
    }

    // --- New request: mark as "processing" in Redis ---
    await redisSetProcessing(idempotencyKey);

    req.idempotencyKey = idempotencyKey;
    req.idempotencyRequestHash = requestHash;
    req.idempotencyEndpoint = endpoint;

    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Store in both PostgreSQL and Redis (async, non-blocking)
      storeIdempotencyResponse(idempotencyKey, endpoint, requestHash, res.statusCode, data)
        .catch(err => console.error('❌ Error storing idempotency response:', err));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisStoreResponse(idempotencyKey, {
          requestHash, endpoint,
          responseStatus: res.statusCode,
          responseBody: data,
        }).catch(() => {});
      } else {
        redisDelete(idempotencyKey).catch(() => {});
      }

      return originalJson(data);
    };

    next();
  } catch (error) {
    console.error('❌ Idempotency middleware error:', error);
    next();
  }
}

/**
 * Store idempotency key and response
 * 
 * @param {string} idempotencyKey - Idempotency key
 * @param {string} endpoint - API endpoint
 * @param {string} requestHash - Request body hash
 * @param {number} responseStatus - HTTP status code
 * @param {object} responseBody - Response body
 */
async function storeIdempotencyResponse(idempotencyKey, endpoint, requestHash, responseStatus, responseBody) {
  try {
    // Only store successful responses (2xx status codes)
    if (responseStatus < 200 || responseStatus >= 300) {
      return; // Don't cache error responses
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await IdempotencyKey.create({
      idempotencyKey: idempotencyKey,
      endpoint: endpoint,
      requestHash: requestHash,
      responseStatus: responseStatus,
      responseBody: responseBody,
      expiresAt: expiresAt
    });

    console.log(`✅ Stored idempotency key: ${idempotencyKey.substring(0, 20)}... (expires in 24 hours)`);
  } catch (error) {
    // If key already exists (race condition), that's okay - it means another request already stored it
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log(`ℹ️ Idempotency key already stored (race condition): ${idempotencyKey.substring(0, 20)}...`);
    } else {
      throw error;
    }
  }
}

/**
 * Schedule periodic cleanup of expired keys
 * 
 * @param {object} sequelize - Sequelize instance
 */
function scheduleCleanup(sequelize) {
  // Run cleanup every hour
  setInterval(() => {
    cleanupExpiredKeys(sequelize);
  }, 60 * 60 * 1000); // 1 hour

  // Run initial cleanup after 5 minutes (give server time to start)
  setTimeout(() => {
    cleanupExpiredKeys(sequelize);
  }, 5 * 60 * 1000); // 5 minutes
}

module.exports = {
  idempotencyMiddleware,
  cleanupExpiredKeys,
  scheduleCleanup
};
