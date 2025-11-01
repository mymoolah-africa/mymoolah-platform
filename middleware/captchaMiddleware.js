/**
 * 🛡️ CAPTCHA Middleware for Banking-Grade Security
 * 
 * Implements Google reCAPTCHA v3 for bot protection
 * Banking-Grade: Score-based verification with configurable thresholds
 */

const axios = require('axios');

/**
 * Verify reCAPTCHA token
 * @param {string} token - reCAPTCHA token from frontend
 * @param {string} secretKey - reCAPTCHA secret key
 * @returns {Promise<Object>} Verification result
 */
async function verifyRecaptcha(token, secretKey) {
  try {
    if (!token) {
      return { success: false, error: 'reCAPTCHA token is required' };
    }

    if (!secretKey) {
      console.warn('⚠️  reCAPTCHA secret key not configured - skipping verification');
      return { success: true, score: 1.0 }; // Allow in development
    }

    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: token
        },
        timeout: 5000
      }
    );

    const { success, score, challenge_ts, hostname, 'error-codes': errorCodes } = response.data;

    return {
      success: success === true,
      score: score || 0,
      challengeTs: challenge_ts,
      hostname,
      errorCodes: errorCodes || []
    };
  } catch (error) {
    console.error('❌ reCAPTCHA verification error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * CAPTCHA middleware for Express
 * @param {Object} options - Configuration options
 * @param {string} options.secretKey - reCAPTCHA secret key
 * @param {number} options.minScore - Minimum score threshold (0.0 - 1.0)
 * @param {boolean} options.skipInDevelopment - Skip verification in development
 * @returns {Function} Express middleware function
 */
const captchaMiddleware = (options = {}) => {
  const {
    secretKey = process.env.RECAPTCHA_SECRET_KEY,
    minScore = 0.5, // Banking-grade: Require at least 0.5 score
    skipInDevelopment = true
  } = options;

  return async (req, res, next) => {
    // Skip in development if configured
    if (skipInDevelopment && process.env.NODE_ENV === 'development' && !secretKey) {
      return next();
    }

    // Get token from header or body
    const token = req.headers['x-recaptcha-token'] || req.body.recaptchaToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'reCAPTCHA token is required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify token
    const verification = await verifyRecaptcha(token, secretKey);

    if (!verification.success) {
      console.warn('🚫 reCAPTCHA verification failed:', verification.errorCodes || verification.error);
      
      return res.status(403).json({
        success: false,
        error: 'reCAPTCHA verification failed',
        details: verification.errorCodes || [verification.error],
        timestamp: new Date().toISOString()
      });
    }

    // Check score threshold
    if (verification.score < minScore) {
      console.warn(`🚫 reCAPTCHA score too low: ${verification.score} < ${minScore}`);
      
      // Log suspicious activity
      if (req.securityLogger) {
        req.securityLogger.logSuspiciousActivity({
          type: 'low_recaptcha_score',
          ip: req.ip,
          score: verification.score,
          threshold: minScore
        });
      }

      return res.status(403).json({
        success: false,
        error: 'reCAPTCHA verification failed - suspicious activity detected',
        score: verification.score,
        timestamp: new Date().toISOString()
      });
    }

    // Add verification info to request
    req.recaptcha = {
      verified: true,
      score: verification.score,
      hostname: verification.hostname
    };

    next();
  };
};

module.exports = {
  captchaMiddleware,
  verifyRecaptcha
};

