/**
 * EasyPay API Authentication Middleware
 * Validates EasyPay BillPayment Receiver API V5 authentication.
 *
 * Per the official EasyPay V5 spec (EasypayReceiverV5.yaml), EasyPay sends:
 *   Authorization: SessionToken {token}
 * where the token is assigned by us (the Receiver) and given to EasyPay.
 *
 * The token is stored in EASYPAY_API_KEY environment variable / Secret Manager.
 * In UAT/test environments, JWT Bearer tokens are also accepted for internal simulation.
 *
 * @author MyMoolah Development Team
 * @version 2.0.0
 */

const { sendErrorResponse, ERROR_CODES } = require('../utils/errorHandler');
const jwt = require('jsonwebtoken');

/**
 * Extracts the SessionToken value from the Authorization header.
 * Accepts: "SessionToken abc123" (EasyPay V5 spec)
 * Also accepts: "SessionToken: abc123" (defensive variant)
 *
 * @param {string} authHeader - Raw Authorization header value
 * @returns {string|null} The token string, or null if not a SessionToken header
 */
function extractSessionToken(authHeader) {
  if (!authHeader) return null;
  // Normalise: remove optional colon after "SessionToken"
  const match = authHeader.match(/^SessionToken:?\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * EasyPay Authentication Middleware
 * Priority order:
 *   1. Authorization: SessionToken {token}  — EasyPay V5 spec (production + UAT)
 *   2. X-API-Key: {token}                   — legacy header (backward compat)
 *   3. Authorization: Bearer {jwt}          — internal simulation (UAT only)
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function easypayAuthMiddleware(req, res, next) {
  const configuredApiKey = process.env.EASYPAY_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.STAGING;
  const isUAT = !isProduction;
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  // ── 1. Authorization: SessionToken {token} (EasyPay V5 spec) ──────────────
  const authHeader = req.headers['authorization'] || '';
  const sessionToken = extractSessionToken(authHeader);

  if (sessionToken) {
    if (!configuredApiKey) {
      if (isProduction) {
        console.error('❌ EASYPAY_API_KEY not configured in production!');
        return sendErrorResponse(res, ERROR_CODES.INTERNAL_ERROR,
          'API authentication not configured', req.requestId);
      }
      console.warn('⚠️ EASYPAY_API_KEY not set — allowing SessionToken request (development mode only)');
      return next();
    }
    if (constantTimeCompare(sessionToken, configuredApiKey)) {
      console.log(`✅ EasyPay SessionToken authentication successful from IP: ${clientIp}`);
      return next();
    }
    console.warn(`⚠️ Invalid EasyPay SessionToken from IP: ${clientIp}`);
    return sendErrorResponse(res, ERROR_CODES.INVALID_API_KEY, 'Invalid SessionToken', req.requestId, 401);
  }

  // ── 2. X-API-Key header (legacy / backward compat) ────────────────────────
  const apiKey = req.headers['x-api-key'] || req.headers['x-apikey'];

  if (apiKey) {
    if (!configuredApiKey) {
      if (isProduction) {
        console.error('❌ EASYPAY_API_KEY not configured in production!');
        return sendErrorResponse(res, ERROR_CODES.INTERNAL_ERROR,
          'API authentication not configured', req.requestId);
      }
      console.warn('⚠️ EASYPAY_API_KEY not set — allowing X-API-Key request (development mode only)');
      return next();
    }
    if (constantTimeCompare(apiKey, configuredApiKey)) {
      console.log(`✅ EasyPay X-API-Key authentication successful from IP: ${clientIp}`);
      return next();
    }
    console.warn(`⚠️ Invalid EasyPay X-API-Key from IP: ${clientIp}`);
    if (isProduction) {
      return sendErrorResponse(res, ERROR_CODES.INVALID_API_KEY, 'Invalid API key', req.requestId, 401);
    }
    // Fall through to JWT check in UAT
  }

  // ── 3. Authorization: Bearer {jwt} (UAT internal simulation only) ──────────
  if (isUAT && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      console.log(`✅ EasyPay JWT simulation authentication successful (UAT mode)`);
      return next();
    } catch (error) {
      console.warn(`⚠️ Invalid JWT for EasyPay simulation: ${error.message}`);
      return sendErrorResponse(res, ERROR_CODES.INVALID_API_KEY,
        'Invalid authentication token', req.requestId, 401);
    }
  }

  // ── No valid authentication ────────────────────────────────────────────────
  const msg = isProduction
    ? 'Authorization: SessionToken {token} header is required'
    : 'Authorization: SessionToken {token}, X-API-Key, or Bearer token is required';
  return sendErrorResponse(res, ERROR_CODES.MISSING_API_KEY, msg, req.requestId, 401);
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
