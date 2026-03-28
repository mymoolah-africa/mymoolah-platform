const models = require('../models');
const User = models.User || (models.sequelize && models.sequelize.models && models.sequelize.models.User);
const Wallet = models.Wallet || (models.sequelize && models.sequelize.models && models.sequelize.models.Wallet);
const { getLimitsForTier } = require('../config/kycTierLimits');

/**
 * Middleware to check if user has completed KYC verification
 * Blocks access to sensitive features for restricted users
 */
const requireKYCVerification = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User authentication required'
      });
    }

    // Get user and wallet information
    // Defensive: if models didn't resolve, throw clear error
    if (!User || !Wallet) {
      throw new Error('Models not initialized');
    }

    const user = await User.findByPk(userId);
    const wallet = await Wallet.findOne({ where: { userId } });

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (!wallet) {
      return res.status(404).json({
        error: 'WALLET_NOT_FOUND',
        message: 'Wallet not found'
      });
    }

    // Check both user KYC status and wallet KYC verification
    const userKYCVerified = user.kycStatus === 'verified';
    const walletKYCVerified = wallet.kycVerified === true;

    // User is restricted if either check fails
    const isRestricted = !userKYCVerified || !walletKYCVerified;

    if (isRestricted) {
      return res.status(403).json({
        error: 'KYC_REQUIRED',
        message: 'KYC verification required for this feature',
        details: {
          userKYCStatus: user.kycStatus,
          walletKYCVerified: wallet.kycVerified,
          requiresKYC: true
        }
      });
    }

    const kycTier = user.kyc_tier !== null && user.kyc_tier !== undefined ? user.kyc_tier : 0;
    const tierLimits = getLimitsForTier(kycTier);

    req.kycStatus = {
      userVerified: userKYCVerified,
      walletVerified: walletKYCVerified,
      isRestricted: false,
      kycTier,
      tierLimits,
    };

    next();
  } catch (error) {
    console.error('❌ KYC middleware error:', error);
    return res.status(500).json({
      error: 'KYC_CHECK_ERROR',
      message: 'Error checking KYC status'
    });
  }
};

/**
 * Middleware to check KYC status without blocking
 * Returns KYC status information for frontend use
 */
const getKYCStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      req.kycStatus = {
        userVerified: false,
        walletVerified: false,
        isRestricted: true,
        userKYCStatus: 'not_started'
      };
      return next();
    }

    // Get user and wallet information
    const user = await User.findByPk(userId);
    const wallet = await Wallet.findOne({ where: { userId } });

    if (!user || !wallet) {
      req.kycStatus = {
        userVerified: false,
        walletVerified: false,
        isRestricted: true,
        userKYCStatus: 'not_started'
      };
      return next();
    }

    // Check both user KYC status and wallet KYC verification
    const userKYCVerified = user.kycStatus === 'verified';
    const walletKYCVerified = wallet.kycVerified === true;
    const isRestricted = !userKYCVerified || !walletKYCVerified;

    const kycTier = user.kyc_tier !== null && user.kyc_tier !== undefined ? user.kyc_tier : 0;
    const tierLimits = getLimitsForTier(kycTier);

    req.kycStatus = {
      userVerified: userKYCVerified,
      walletVerified: walletKYCVerified,
      isRestricted,
      userKYCStatus: user.kycStatus,
      walletKYCVerified: wallet.kycVerified,
      kycTier,
      tierLimits,
    };

    next();
  } catch (error) {
    console.error('❌ KYC status middleware error:', error);
    req.kycStatus = {
      userVerified: false,
      walletVerified: false,
      isRestricted: true,
      userKYCStatus: 'not_started',
      kycTier: 0,
      tierLimits: getLimitsForTier(0),
    };
    next();
  }
};

module.exports = {
  requireKYCVerification,
  getKYCStatus
}; 