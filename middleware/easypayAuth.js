/**
 * EasyPay API Authentication Middleware
 * Validates X-API-Key header for EasyPay settlement endpoints
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const { sendErrorResponse, ERROR_CODES } = require('../utils/errorHandler');

/**
 * EasyPay API Key Authentication Middleware
 * Validates X-API-Key header against configured API key
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
  
  // If no API key configured, allow request (for development/testing)
  // In production, EASYPAY_API_KEY must be set
  if (!configuredApiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ EASYPAY_API_KEY not configured in production!');
      return sendErrorResponse(res, ERROR_CODES.INTERNAL_ERROR, 
        'API authentication not configured', 
        req.requestId);
    } else {
      // Development mode - allow without API key (with warning)
      console.warn('⚠️ EASYPAY_API_KEY not set - allowing request (development mode only)');
      return next();
    }
  }
  
  // If no API key provided, reject
  if (!apiKey) {
    return sendErrorResponse(res, ERROR_CODES.MISSING_API_KEY, 
      'X-API-Key header is required', 
      req.requestId);
  }
  
  // Validate API key (constant-time comparison to prevent timing attacks)
  const isValid = constantTimeCompare(apiKey, configuredApiKey);
  
  if (!isValid) {
    console.warn(`⚠️ Invalid API key attempt from IP: ${req.ip || req.connection.remoteAddress}`);
    return sendErrorResponse(res, ERROR_CODES.INVALID_API_KEY, 
      'Invalid API key', 
      req.requestId);
  }
  
  // API key is valid - continue
  next();
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
