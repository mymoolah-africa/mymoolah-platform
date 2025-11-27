const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints (stricter)
// With trust proxy: 1, Express correctly sets req.ip to the client IP (after the first proxy)
// Disable express-rate-limit's trust proxy validation (Express returns true even when set to 1)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
  keyGenerator: (req) => req.ip + '-auth',
});

// General API rate limiter
// With trust proxy: 1, Express correctly sets req.ip to the client IP (after the first proxy)
// Disable express-rate-limit's trust proxy validation (Express returns true even when set to 1)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
  keyGenerator: (req) => req.ip,
});

module.exports = {
  authLimiter,
  apiLimiter
};