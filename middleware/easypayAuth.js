/**
 * EasyPay API Authentication Middleware
 * Validates X-API-Key header for EasyPay settlement endpoints
 * Also allows JWT-authenticated requests in UAT/test environments for simulation
 * 
 * @author MyMoolah Development Team
 * @version 1.1.0
 */

const { sendErrorResponse, ERROR_CODES } = require('../utils/errorHandler');
const jwt = require('jsonwebtoken');

/**
 * EasyPay API Key Authentication Middleware
 * Validates X-API-Key header against configured API key
 * In UAT/test environments, also accepts JWT-authenticated requests for simulation
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function easypayAuthMiddleware(req, res, next) {
  // Get API key from header (case-insensitive)
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers['x-apikey'] || req.headers['X-ApiKey'];
  
  // Get configured API key from environment
  const configuredApiKey = process.env.EASYPAY_API_KEY;
  
  // Check if this is a UAT/test environment (not production)
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.STAGING;
  const isUAT = !isProduction;
  
  // If API key is provided, validate it (for external EasyPay callbacks)
  if (apiKey) {
    if (!configuredApiKey) {
      if (isProduction) {
        console.error('❌ EASYPAY_API_KEY not configured in production!');
        return sendErrorResponse(res, ERROR_CODES.INTERNAL_ERROR, 
          'API authentication not configured', 
          req.requestId);
      } else {
        // Development mode - allow without configured key (with warning)
        console.warn('⚠️ EASYPAY_API_KEY not set - allowing request (development mode only)');
        return next();
      }
    }
    
    // Validate API key (constant-time comparison to prevent timing attacks)
    const isValid = constantTimeCompare(apiKey, configuredApiKey);
    
    if (isValid) {
      // API key is valid - continue
      return next();
    } else {
      console.warn(`⚠️ Invalid API key attempt from IP: ${req.ip || req.connection.remoteAddress}`);
      // Don't return error yet - check JWT as fallback in UAT
      if (isProduction) {
        return sendErrorResponse(res, ERROR_CODES.INVALID_API_KEY, 
          'Invalid API key', 
          req.requestId);
      }
    }
  }
  
  // No API key provided or invalid API key - check JWT authentication in UAT/test
  if (isUAT) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      
      try {
        const decoded = jwt.verify(token, secret);
        // JWT is valid - allow request (for UAT simulation)
        req.user = decoded; // Attach user info to request
        console.log(`✅ JWT authentication successful for EasyPay simulation (UAT mode)`);
        return next();
      } catch (error) {
        // JWT is invalid - reject
        console.warn(`⚠️ Invalid JWT token for EasyPay simulation: ${error.message}`);
        return sendErrorResponse(res, ERROR_CODES.INVALID_API_KEY, 
          'Invalid authentication token', 
          req.requestId, 401);
      }
    }
  }
  
  // No valid authentication method found
  if (isProduction) {
    return sendErrorResponse(res, ERROR_CODES.MISSING_API_KEY, 
      'X-API-Key header is required', 
      req.requestId, 401);
  } else {
    // UAT/test: require either API key or JWT
    return sendErrorResponse(res, ERROR_CODES.MISSING_API_KEY, 
      'X-API-Key header or Bearer token is required', 
      req.requestId, 401);
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 * 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

module.exports = {
  easypayAuthMiddleware
};
