/**
 * Banking-Grade Structured Error Handler
 * Provides consistent error response format for all API endpoints
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Error codes for EasyPay API
 */
const ERROR_CODES = {
  // Validation errors (400)
  INVALID_PIN: 'INVALID_PIN',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Not found errors (404)
  PIN_NOT_FOUND: 'PIN_NOT_FOUND',
  VOUCHER_NOT_FOUND: 'VOUCHER_NOT_FOUND',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  
  // Business logic errors (400)
  PIN_EXPIRED: 'PIN_EXPIRED',
  VOUCHER_ALREADY_SETTLED: 'VOUCHER_ALREADY_SETTLED',
  VOUCHER_ALREADY_REDEEMED: 'VOUCHER_ALREADY_REDEEMED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  
  // Conflict errors (409)
  ALREADY_SETTLED: 'ALREADY_SETTLED',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  
  // Authentication errors (401)
  AUTH_FAILED: 'AUTH_FAILED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  MISSING_API_KEY: 'MISSING_API_KEY',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * HTTP status codes mapping
 */
const HTTP_STATUS = {
  [ERROR_CODES.INVALID_PIN]: 400,
  [ERROR_CODES.INVALID_AMOUNT]: 400,
  [ERROR_CODES.AMOUNT_MISMATCH]: 400,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
  [ERROR_CODES.INVALID_FORMAT]: 400,
  [ERROR_CODES.PIN_NOT_FOUND]: 404,
  [ERROR_CODES.VOUCHER_NOT_FOUND]: 404,
  [ERROR_CODES.WALLET_NOT_FOUND]: 404,
  [ERROR_CODES.PIN_EXPIRED]: 400,
  [ERROR_CODES.VOUCHER_ALREADY_SETTLED]: 400,
  [ERROR_CODES.VOUCHER_ALREADY_REDEEMED]: 400,
  [ERROR_CODES.INSUFFICIENT_BALANCE]: 400,
  [ERROR_CODES.ALREADY_SETTLED]: 409,
  [ERROR_CODES.DUPLICATE_REQUEST]: 409,
  [ERROR_CODES.AUTH_FAILED]: 401,
  [ERROR_CODES.INVALID_API_KEY]: 401,
  [ERROR_CODES.MISSING_API_KEY]: 401,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503
};

/**
 * Human-readable error messages
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_PIN]: 'Invalid EasyPay PIN format. PIN must be 14 digits starting with 9.',
  [ERROR_CODES.INVALID_AMOUNT]: 'Invalid amount. Amount must be between R50 and R4000 for top-up, or R50 and R3000 for cash-out.',
  [ERROR_CODES.AMOUNT_MISMATCH]: 'Settlement amount does not match voucher amount.',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing.',
  [ERROR_CODES.INVALID_FORMAT]: 'Invalid request format.',
  [ERROR_CODES.PIN_NOT_FOUND]: 'EasyPay PIN not found or already settled.',
  [ERROR_CODES.VOUCHER_NOT_FOUND]: 'Voucher not found.',
  [ERROR_CODES.WALLET_NOT_FOUND]: 'User wallet not found.',
  [ERROR_CODES.PIN_EXPIRED]: 'EasyPay PIN has expired. PINs expire after 96 hours.',
  [ERROR_CODES.VOUCHER_ALREADY_SETTLED]: 'Voucher has already been settled.',
  [ERROR_CODES.VOUCHER_ALREADY_REDEEMED]: 'Voucher has already been redeemed.',
  [ERROR_CODES.INSUFFICIENT_BALANCE]: 'Insufficient wallet balance.',
  [ERROR_CODES.ALREADY_SETTLED]: 'This transaction has already been processed.',
  [ERROR_CODES.DUPLICATE_REQUEST]: 'Duplicate request detected.',
  [ERROR_CODES.AUTH_FAILED]: 'Authentication failed.',
  [ERROR_CODES.INVALID_API_KEY]: 'Invalid API key.',
  [ERROR_CODES.MISSING_API_KEY]: 'API key is required.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal server error occurred.',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.'
};

/**
 * Create a structured error response
 * 
 * @param {string} errorCode - Error code from ERROR_CODES
 * @param {string} details - Additional error details (optional)
 * @param {string} requestId - Request ID (optional, will generate if not provided)
 * @param {object} metadata - Additional metadata (optional)
 * @returns {object} Structured error response
 */
function createErrorResponse(errorCode, details = null, requestId = null, metadata = {}) {
  const requestIdValue = requestId || uuidv4();
  const httpStatus = HTTP_STATUS[errorCode] || 500;
  const message = ERROR_MESSAGES[errorCode] || 'An error occurred';
  
  return {
    success: false,
    error: {
      code: errorCode,
      message: message,
      details: details || message,
      request_id: requestIdValue,
      timestamp: new Date().toISOString(),
      ...metadata
    },
    httpStatus
  };
}

/**
 * Send structured error response
 * 
 * @param {object} res - Express response object
 * @param {string} errorCode - Error code from ERROR_CODES
 * @param {string} details - Additional error details (optional)
 * @param {string} requestId - Request ID (optional)
 * @param {object} metadata - Additional metadata (optional)
 */
function sendErrorResponse(res, errorCode, details = null, requestId = null, metadata = {}) {
  const errorResponse = createErrorResponse(errorCode, details, requestId, metadata);
  const httpStatus = errorResponse.httpStatus;
  delete errorResponse.httpStatus; // Remove httpStatus from response body
  
  res.status(httpStatus).json(errorResponse);
}

/**
 * Middleware to add request ID to all requests
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function requestIdMiddleware(req, res, next) {
  // Check if request ID already exists (from X-Request-ID header)
  req.requestId = req.headers['x-request-id'] || uuidv4();
  
  // Add request ID to response header
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
}

module.exports = {
  ERROR_CODES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  createErrorResponse,
  sendErrorResponse,
  requestIdMiddleware
};
