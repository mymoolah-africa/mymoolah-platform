const Wallet = require('../models/Wallet');

// Middleware to check KYC verification before debit transactions
const checkKYCForDebit = async (req, res, next) => {
  try {
    const { walletId, type, amount } = req.body;

    // Only check KYC for debit transactions
    if (type === 'debit' || type === 'withdrawal' || type === 'transfer') {
      const isVerified = await Wallet.isKYCVerified(walletId);
      
      if (!isVerified) {
        return res.status(403).json({
          error: 'KYC_VERIFICATION_REQUIRED',
          message: 'KYC verification required for debit transactions. Please upload your ID and proof of address.',
          code: 'KYC_REQUIRED',
          details: {
            requiredDocuments: [
              'South African ID or Passport',
              'Proof of Address (utility bill, bank statement, etc.)'
            ],
            uploadUrl: '/api/v1/kyc/upload'
          }
        });
      }
    }

    next();
  } catch (error) {
    console.error('❌ Error in KYC middleware:', error);
    res.status(500).json({
      error: 'KYC_CHECK_ERROR',
      message: 'Error checking KYC verification status'
    });
  }
};

// Middleware to check KYC status for wallet operations
const checkKYCStatus = async (req, res, next) => {
  try {
    const { walletId } = req.params;
    const kycDetails = await Wallet.getKYCVerificationDetails(walletId);
    
    req.kycStatus = kycDetails;
    next();
  } catch (error) {
    console.error('❌ Error checking KYC status:', error);
    res.status(500).json({
      error: 'KYC_STATUS_ERROR',
      message: 'Error checking KYC status'
    });
  }
};

module.exports = {
  checkKYCForDebit,
  checkKYCStatus
}; 