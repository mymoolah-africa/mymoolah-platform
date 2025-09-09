'use strict';

const jwt = require('jsonwebtoken');
const { PortalUser } = require('../models');

/**
 * Portal-specific authentication middleware
 * @param {string} portalType - Type of portal (admin, supplier, client, merchant, reseller)
 * @returns {Function} Express middleware function
 */
const portalAuth = (portalType) => {
  return async (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.header('Authorization');
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : null;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access denied. No token provided.',
          timestamp: new Date().toISOString()
        });
      }

      // Verify token
      const jwtSecret = process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || 'your-portal-secret-key';
      const decoded = jwt.verify(token, jwtSecret);

      // Get portal user from database
      const portalUser = await PortalUser.findByPk(decoded.portalUserId, {
        attributes: [
          'id',
          'entityId',
          'entityName',
          'entityType',
          'email',
          'role',
          'permissions',
          'hasDualRole',
          'dualRoles',
          'isActive',
          'isVerified',
          'lastLoginAt',
          'loginAttempts',
          'lockedUntil'
        ]
      });

      if (!portalUser) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Portal user not found.',
          timestamp: new Date().toISOString()
        });
      }

      // Check if user is active
      if (!portalUser.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated.',
          timestamp: new Date().toISOString()
        });
      }

      // Check if account is locked
      if (portalUser.isAccountLocked()) {
        return res.status(401).json({
          success: false,
          error: 'Account is temporarily locked due to too many failed login attempts.',
          timestamp: new Date().toISOString()
        });
      }

      // Check portal access permissions
      if (!portalUser.canAccessPortal(portalType)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Insufficient permissions for ${portalType} portal.`,
          timestamp: new Date().toISOString()
        });
      }

      // Add user info to request
      req.portalUser = {
        id: portalUser.id,
        entityId: portalUser.entityId,
        entityName: portalUser.entityName,
        entityType: portalUser.entityType,
        email: portalUser.email,
        role: portalUser.role,
        permissions: portalUser.permissions,
        hasDualRole: portalUser.hasDualRole,
        dualRoles: portalUser.dualRoles,
        isVerified: portalUser.isVerified
      };

      // Update last login time
      await portalUser.update({ lastLoginAt: new Date() });

      next();

    } catch (error) {
      console.error('Portal auth error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token.',
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired.',
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: 'Authentication error.',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Role-based access control middleware
 * @param {string|Array} allowedRoles - Role or array of roles allowed
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.portalUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        timestamp: new Date().toISOString()
      });
    }

    const userRole = req.portalUser.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions.',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Permission-based access control middleware
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware function
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.portalUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        timestamp: new Date().toISOString()
      });
    }

    // Admin role has all permissions
    if (req.portalUser.role === 'admin') {
      return next();
    }

    if (!req.portalUser.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required.`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Dual-role access control middleware
 * @param {string} requiredRole - Required dual role
 * @returns {Function} Express middleware function
 */
const requireDualRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.portalUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        timestamp: new Date().toISOString()
      });
    }

    // Admin role has access to all dual roles
    if (req.portalUser.role === 'admin') {
      return next();
    }

    if (!req.portalUser.hasDualRole || !req.portalUser.dualRoles.includes(requiredRole)) {
      return res.status(403).json({
        success: false,
        error: `Dual role '${requiredRole}' required.`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Entity ownership middleware
 * @param {string} entityIdParam - Parameter name containing entity ID
 * @returns {Function} Express middleware function
 */
const requireEntityOwnership = (entityIdParam = 'entityId') => {
  return (req, res, next) => {
    if (!req.portalUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        timestamp: new Date().toISOString()
      });
    }

    // Admin role has access to all entities
    if (req.portalUser.role === 'admin') {
      return next();
    }

    const requestedEntityId = req.params[entityIdParam] || req.body[entityIdParam];
    
    if (requestedEntityId !== req.portalUser.entityId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own entity data.',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Audit logging middleware
 * @param {string} action - Action being performed
 * @returns {Function} Express middleware function
 */
const auditLog = (action) => {
  return (req, res, next) => {
    // Log the action
    const auditData = {
      action,
      portalUser: req.portalUser ? {
        id: req.portalUser.id,
        entityId: req.portalUser.entityId,
        entityType: req.portalUser.entityType,
        role: req.portalUser.role
      } : null,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    console.log('AUDIT:', JSON.stringify(auditData));

    // Add audit data to request for potential database logging
    req.auditData = auditData;

    next();
  };
};

module.exports = {
  portalAuth,
  requireRole,
  requirePermission,
  requireDualRole,
  requireEntityOwnership,
  auditLog
};
