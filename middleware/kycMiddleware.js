// Use initialized Sequelize models with a robust fallback to handle any module resolution quirks
const models = require('../models');
const User = models.User || (models.sequelize && models.sequelize.models && models.sequelize.models.User);
const Wallet = models.Wallet || (models.sequelize && models.sequelize.models && models.sequelize.models.Wallet);

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

    // Add KYC status to request for use in controllers
    req.kycStatus = {
      userVerified: userKYCVerified,
      walletVerified: walletKYCVerified,
      isRestricted: false
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

    req.kycStatus = {
      userVerified: userKYCVerified,
      walletVerified: walletKYCVerified,
      isRestricted,
      userKYCStatus: user.kycStatus,
      walletKYCVerified: wallet.kycVerified
    };

    next();
  } catch (error) {
    console.error('❌ KYC status middleware error:', error);
    req.kycStatus = {
      userVerified: false,
      walletVerified: false,
      isRestricted: true,
      userKYCStatus: 'not_started'
    };
    next();
  }
};

module.exports = {
  requireKYCVerification,
  getKYCStatus
}; 