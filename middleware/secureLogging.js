const securityConfig = require('../config/security');

// Secure logging middleware
const secureLogging = (req, res, next) => {
  // Store original send method
  const originalSend = res.send;
  
  // Override send method to sanitize response data
  res.send = function(data) {
    // Sanitize sensitive data before logging
    const sanitizedData = securityConfig.sanitizeForLogging(data);
    
    // Log request with sanitized data
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      console.log('Request Headers:', securityConfig.sanitizeForLogging(req.headers));
      console.log('Request Body:', securityConfig.sanitizeForLogging(req.body));
      console.log('Response:', typeof sanitizedData === 'string' ? sanitizedData : JSON.stringify(sanitizedData));
    }
    
    // Call original send method
    return originalSend.call(this, data);
  };
  
  next();
};

// Error logging middleware
const secureErrorLogging = (err, req, res, next) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: err.code
    }
  };
  
  // Log error with sanitized data
  console.error('❌ Server Error:', securityConfig.sanitizeForLogging(errorInfo));
  
  // Send sanitized error response
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Request validation logging
const logValidationErrors = (errors) => {
  if (errors && errors.length > 0) {
    console.warn('⚠️  Validation Errors:', errors.map(error => ({
      field: error.path,
      message: error.msg,
      value: securityConfig.sanitizeForLogging({ value: error.value })
    })));
  }
};

module.exports = {
  secureLogging,
  secureErrorLogging,
  logValidationErrors
}; 