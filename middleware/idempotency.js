/**
 * Idempotency Middleware
 * Prevents duplicate processing of requests using X-Idempotency-Key header
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const crypto = require('crypto');
const { IdempotencyKey } = require('../models');
const { sendErrorResponse, ERROR_CODES } = require('../utils/errorHandler');

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
  // Only apply to POST/PUT/PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Get idempotency key from header
  const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['X-Idempotency-Key'];
  
  // If no key provided, continue (idempotency is optional but recommended)
  if (!idempotencyKey) {
    return next();
  }

  // Validate key format (should be non-empty string, max 255 chars)
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0 || idempotencyKey.length > 255) {
    return sendErrorResponse(res, ERROR_CODES.INVALID_FORMAT, 
      'X-Idempotency-Key must be a non-empty string (max 255 characters)', 
      req.requestId);
  }

  try {
    // Calculate request hash
    const requestHash = hashRequestBody(req.body);
    const endpoint = req.path;

    // Check if key exists
    const existingKey = await IdempotencyKey.findOne({
      where: { idempotencyKey: idempotencyKey }
    });

    if (existingKey) {
      // Key exists - check if request is identical
      if (existingKey.requestHash === requestHash && existingKey.endpoint === endpoint) {
        // Identical request - return cached response
        console.log(`✅ Idempotency: Returning cached response for key: ${idempotencyKey.substring(0, 20)}...`);
        return res.status(existingKey.responseStatus).json(existingKey.responseBody);
      } else {
        // Different request with same key - conflict
        console.log(`⚠️ Idempotency conflict: Key ${idempotencyKey.substring(0, 20)}... used with different request`);
        return sendErrorResponse(res, ERROR_CODES.DUPLICATE_REQUEST, 
          'Idempotency key already used with a different request. Use a unique key for each request.', 
          req.requestId);
      }
    }

    // Key doesn't exist - store it for later (after response)
    // We'll store the response in a response interceptor
    req.idempotencyKey = idempotencyKey;
    req.idempotencyRequestHash = requestHash;
    req.idempotencyEndpoint = endpoint;

    // Intercept response to store it
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Store idempotency key and response (async, don't block response)
      storeIdempotencyResponse(idempotencyKey, endpoint, requestHash, res.statusCode, data)
        .catch(err => console.error('❌ Error storing idempotency response:', err));
      
      return originalJson(data);
    };

    next();
  } catch (error) {
    console.error('❌ Idempotency middleware error:', error);
    // Don't block request on idempotency errors - continue processing
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
