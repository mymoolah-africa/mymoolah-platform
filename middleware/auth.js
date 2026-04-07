const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  const secrets = [
    process.env.JWT_SECRET,
    process.env.PORTAL_JWT_SECRET,
  ].filter(Boolean);

  if (secrets.length === 0) secrets.push('your-secret-key-change-in-production');

  for (const secret of secrets) {
    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      return next();
    } catch (_) {
      // try next secret
    }
  }

  return res.status(403).json({
    success: false,
    message: 'Invalid or expired token'
  });
};

module.exports = authenticateToken; 