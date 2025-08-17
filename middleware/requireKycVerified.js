const { DataTypes } = require('sequelize');

/**
 * Middleware: requireKycVerified
 *
 * Banking/Mojaloop practice: enforce KYC at the server on restricted rails
 * (Instant Payments, Request to Pay). Returns 403 with a structured body
 * indicating next steps and original intent for deep-linking back.
 */
module.exports = function requireKycVerified() {
  return async function (req, res, next) {
    try {
      // Require authenticated user
      const authUser = req.user;
      if (!authUser || !authUser.id) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHENTICATED',
          status: 'unauthenticated',
          message: 'Authentication required',
        });
      }

      // Load user from DB
      const { sequelize } = require('../models');
      const User = require('../models/User')(sequelize, DataTypes);
      const user = await User.findOne({ where: { id: authUser.id } });
      if (!user) {
        return res.status(404).json({
          success: false,
          code: 'USER_NOT_FOUND',
          status: 'not_found',
          message: 'User not found',
        });
      }

      // Allow only if verified
      if (String(user.kycStatus || '').toLowerCase() === 'verified') {
        return next();
      }

      const intent = req.query.intent || req.body?.intent || null;
      return res.status(403).json({
        success: false,
        code: 'KYC_REQUIRED',
        status: 'kyc_required',
        message: 'KYC verification required for this action',
        next: 'kyc_documents',
        intent,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        status: 'error',
        message: 'Unexpected error while enforcing KYC requirement',
      });
    }
  };
};
