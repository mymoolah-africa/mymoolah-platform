const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints (stricter)
// With trust proxy: 1, Express correctly sets req.ip to the client IP (after the first proxy)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + '-auth',
});

// General API rate limiter
// With trust proxy: 1, Express correctly sets req.ip to the client IP (after the first proxy)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

module.exports = {
  authLimiter,
  apiLimiter
};