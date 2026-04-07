'use strict';

/**
 * @module clientPortalAuth
 * @description JWT authentication middleware for the disbursement client portal.
 * Verifies tokens issued by the client-portal login endpoint and scopes
 * all downstream queries to the authenticated client's client_id.
 *
 * Token payload: { clientUserId, clientId, role, email, iat, exp }
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

const jwt = require('jsonwebtoken');

const LOG_PREFIX = '[ClientPortalAuth]';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authenticate a client-portal JWT and attach the decoded user to req.clientUser.
 */
function authenticateClientPortal(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.clientUserId || !decoded.clientId) {
      return res.status(403).json({ success: false, error: 'Invalid token payload' });
    }

    req.clientUser = {
      clientUserId: decoded.clientUserId,
      clientId: decoded.clientId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    console.error(`${LOG_PREFIX} Token verification failed:`, err.message);
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * Role guard factory. Returns middleware that checks req.clientUser.role
 * against the provided list of allowed roles.
 *
 * @param {string[]} roles — e.g. ['maker', 'admin']
 */
function requireClientRole(roles) {
  return (req, res, next) => {
    if (!req.clientUser) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!roles.includes(req.clientUser.role)) {
      return res.status(403).json({
        success: false,
        error: `Requires one of: ${roles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = { authenticateClientPortal, requireClientRole };
