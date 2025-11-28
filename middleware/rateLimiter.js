const rateLimit = require('express-rate-limit');

// Helper function to extract client IP from X-Forwarded-For header
// Cloud Run has exactly 1 proxy hop (Google Cloud Load Balancer)
// Format: X-Forwarded-For: client-ip, proxy-ip
// We want the first IP (client IP)
const getClientIP = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client-ip, proxy-ip"
    // Cloud Run has 1 proxy, so we take the first IP
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || req.ip || req.connection.remoteAddress;
  }
  return req.ip || req.connection.remoteAddress;
};

// Rate limiter for authentication endpoints (stricter)
// With trust proxy disabled, we manually extract IP from X-Forwarded-For header
// This prevents express-rate-limit from throwing ValidationError
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
    trustProxy: false // Disable validation - we handle proxy manually
  },
  keyGenerator: (req) => getClientIP(req) + '-auth',
  skip: (req) => process.env.STAGING === 'true', // Skip entirely in staging for testing
});

// General API rate limiter
// With trust proxy disabled, we manually extract IP from X-Forwarded-For header
// This prevents express-rate-limit from throwing ValidationError
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
    trustProxy: false // Disable validation - we handle proxy manually
  },
  keyGenerator: (req) => getClientIP(req),
  skip: (req) => process.env.STAGING === 'true', // Skip entirely in staging for testing
});

module.exports = {
  authLimiter,
  apiLimiter
};