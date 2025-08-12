const { Voucher, VoucherType, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Configuration for EasyPay expiration handling
const EASYPAY_EXPIRATION_CONFIG = {
  ENABLE_EXPIRY_FEE: false, // Future implementation - currently no fee
  EXPIRY_FEE_PERCENTAGE: 0.05, // 5% fee when enabled
  MIN_EXPIRY_FEE: 5.00, // Minimum R5.00 fee
  MAX_EXPIRY_FEE: 50.00, // Maximum R50.00 fee
  REFUND_DESCRIPTION: 'EasyPay voucher expired - full refund',
  FEE_DESCRIPTION: 'EasyPay voucher expired - processing fee',
  REFUND_DESCRIPTION_WITH_FEE: 'EasyPay voucher expired - refund minus processing fee'
};

// Handle expired EasyPay vouchers with automatic refund
const handleExpiredVouchers = async () => {
  try {
    console.log('🕐 Checking for expired EasyPay vouchers...');
    
    const expiredVouchers = await Voucher.findAll({
      where: {
        status: 'pending_payment',
        easyPayCode: { [Op.ne]: null }, // Only EasyPay vouchers
        expiresAt: { [Op.lt]: new Date() }
      }
    });

    console.log(`📊 Found ${expiredVouchers.length} expired EasyPay vouchers`);

    for (const voucher of expiredVouchers) {
      try {
        // Get user's wallet
        const { Wallet, Transaction } = require('../models');
        const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });
        
        if (!wallet) {
          console.error(`❌ Wallet not found for user ${voucher.userId}`);
          continue;
        }

        // Calculate refund amount (with future fee capability)
        let refundAmount = parseFloat(voucher.originalAmount);
        let feeAmount = 0;
        let transactionDescription = EASYPAY_EXPIRATION_CONFIG.REFUND_DESCRIPTION;

        // Future implementation: Apply expiry fee if enabled
        if (EASYPAY_EXPIRATION_CONFIG.ENABLE_EXPIRY_FEE) {
          feeAmount = Math.max(
            EASYPAY_EXPIRATION_CONFIG.MIN_EXPIRY_FEE,
            Math.min(
              EASYPAY_EXPIRATION_CONFIG.MAX_EXPIRY_FEE,
              refundAmount * EASYPAY_EXPIRATION_CONFIG.EXPIRY_FEE_PERCENTAGE
            )
          );
          refundAmount -= feeAmount;
          transactionDescription = EASYPAY_EXPIRATION_CONFIG.REFUND_DESCRIPTION_WITH_FEE;
        }

        // Update voucher status to expired
        await voucher.update({ 
          status: 'expired',
          metadata: {
            ...voucher.metadata,
            expiredAt: new Date().toISOString(),
            refundAmount: refundAmount,
            feeAmount: feeAmount,
            processedBy: 'auto_expiration_handler'
          }
        });

        // Credit user's wallet with refund
        await wallet.credit(refundAmount, 'easypay_expired_refund');
        
        // Create refund transaction record
        const refundTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Transaction.create({
          transactionId: refundTransactionId,
          userId: voucher.userId,
          walletId: wallet.walletId,
          amount: refundAmount,
          type: 'refund',
          status: 'completed',
          description: transactionDescription,
          currency: 'ZAR',
          fee: 0.00,
          metadata: {
            voucherId: voucher.id,
            voucherCode: voucher.easyPayCode,
            voucherType: 'easypay_expired',
            originalAmount: voucher.originalAmount,
            refundAmount: refundAmount,
            feeAmount: feeAmount,
            expiryDate: voucher.expiresAt,
            refundReason: 'easypay_voucher_expired',
            auditTrail: {
              processedAt: new Date().toISOString(),
              handler: 'auto_expiration_handler',
              config: {
                enableExpiryFee: EASYPAY_EXPIRATION_CONFIG.ENABLE_EXPIRY_FEE,
                expiryFeePercentage: EASYPAY_EXPIRATION_CONFIG.EXPIRY_FEE_PERCENTAGE
              }
            }
          }
        });

        // Create fee transaction record if fee was applied
        if (feeAmount > 0) {
          const feeTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await Transaction.create({
            transactionId: feeTransactionId,
            userId: voucher.userId,
            walletId: wallet.walletId,
            amount: -feeAmount, // Negative amount for fee
            type: 'fee',
            status: 'completed',
            description: EASYPAY_EXPIRATION_CONFIG.FEE_DESCRIPTION,
            currency: 'ZAR',
            fee: feeAmount,
            metadata: {
              voucherId: voucher.id,
              voucherCode: voucher.easyPayCode,
              voucherType: 'easypay_expired_fee',
              originalAmount: voucher.originalAmount,
              feeAmount: feeAmount,
              expiryDate: voucher.expiresAt,
              feeReason: 'easypay_voucher_expiry_fee',
              auditTrail: {
                processedAt: new Date().toISOString(),
                handler: 'auto_expiration_handler',
                config: {
                  enableExpiryFee: EASYPAY_EXPIRATION_CONFIG.ENABLE_EXPIRY_FEE,
                  expiryFeePercentage: EASYPAY_EXPIRATION_CONFIG.EXPIRY_FEE_PERCENTAGE
                }
              }
            }
          });
        }

        console.log(`✅ Processed expired voucher ${voucher.easyPayCode}:`);
        console.log(`   - Original Amount: R${voucher.originalAmount}`);
        console.log(`   - Refund Amount: R${refundAmount}`);
        console.log(`   - Fee Amount: R${feeAmount}`);
        console.log(`   - User ID: ${voucher.userId}`);

      } catch (error) {
        console.error(`❌ Error processing expired voucher ${voucher.easyPayCode}:`, error);
      }
    }

    console.log(`✅ Completed expired voucher processing. Processed ${expiredVouchers.length} vouchers.`);

  } catch (error) {
    console.error('❌ Error in handleExpiredVouchers:', error);
  }
};

// Start automatic expiration handling (run every hour)
const startExpirationHandler = () => {
  console.log('🔄 Starting EasyPay expiration handler...');
  
  // Run immediately on startup
  handleExpiredVouchers();
  
  // Then run every hour
  setInterval(handleExpiredVouchers, 60 * 60 * 1000);
  
  console.log('✅ EasyPay expiration handler started successfully');
};

// Export for manual execution if needed
exports.handleExpiredVouchers = handleExpiredVouchers;
exports.startExpirationHandler = startExpirationHandler;
exports.EASYPAY_EXPIRATION_CONFIG = EASYPAY_EXPIRATION_CONFIG;

// Manual trigger endpoint for testing (admin only)
exports.triggerExpirationHandler = async (req, res) => {
  try {
    // Check if user is admin (you can modify this logic)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }

    console.log('🔧 Manual trigger of EasyPay expiration handler...');
    
    // Run the expiration handler
    await handleExpiredVouchers();
    
    res.json({
      success: true,
      message: 'EasyPay expiration handler executed successfully',
      timestamp: new Date().toISOString(),
      config: {
        enableExpiryFee: EASYPAY_EXPIRATION_CONFIG.ENABLE_EXPIRY_FEE,
        expiryFeePercentage: EASYPAY_EXPIRATION_CONFIG.EXPIRY_FEE_PERCENTAGE,
        minExpiryFee: EASYPAY_EXPIRATION_CONFIG.MIN_EXPIRY_FEE,
        maxExpiryFee: EASYPAY_EXPIRATION_CONFIG.MAX_EXPIRY_FEE
      }
    });

  } catch (error) {
    console.error('❌ Error in manual expiration trigger:', error);
    res.status(500).json({ 
      error: 'Failed to execute expiration handler',
      details: error.message 
    });
  }
};

// Generate EasyPay number using Luhn algorithm
const generateEasyPayNumber = () => {
  const EASYPAY_PREFIX = '9';
  const RECEIVER_ID = '1234'; // MyMoolah's EasyPay receiver ID
  
  // Generate random account number (8 digits) - fixed length for Receiver 1234
  const accountNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  
  // Combine receiver ID and account number (excluding the leading 9)
  const baseDigits = RECEIVER_ID + accountNumber;
  
  // Calculate check digit using Luhn algorithm on baseDigits
  const checkDigit = generateLuhnCheckDigit(baseDigits);
  
  // Return complete EasyPay number (14 digits)
  return EASYPAY_PREFIX + baseDigits + checkDigit;
};

const generateLuhnCheckDigit = (digits) => {
  let sum = 0;
  
  // Process from right to left (last digit to first)
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
    // Check if position is odd (from right to left, 1-based indexing)
    const positionFromRight = digits.length - i;
    if (positionFromRight % 2 === 1) {
      // Odd position: double the digit
      digit *= 2;
      if (digit > 9) {
        digit -= 9; // Same as adding the digits: 16 -> 1+6 = 7, so 16-9=7
      }
    }
    // Even position: use digit as is
    
    sum += digit;
  }
  
  // Check digit is the number needed to make sum a multiple of 10
  return (10 - (sum % 10)) % 10;
};

// Generate MM voucher code
const generateMMVoucherCode = () => {
  // Generate a 16-digit numeric code
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0'); // 8 random digits
  return timestamp + random; // 16-digit numeric code
};

// Clean voucher code by removing spaces and non-digits
const cleanVoucherCode = (code) => {
  return code.replace(/\s/g, '').replace(/\D/g, '');
};

// Issue a new voucher
exports.issueVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    const amount = Number(voucherData.original_amount);
    const userId = req.user?.id || voucherData.user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Validate minimum and maximum value
    if (isNaN(amount) || amount < 5.00 || amount > 4000.00) {
      return res.status(400).json({ error: 'Voucher value must be between 5.00 and 4000.00' });
    }
    
    // Get user's wallet
    const { Wallet, Transaction } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: userId } });
    
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }
    
    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }
    
    // Check if user has sufficient balance
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    
    try {
      // Generate voucher code
      const voucherCode = generateMMVoucherCode();
      
      // Create voucher
      const voucher = await Voucher.create({
        voucherCode,
        userId: userId,
        originalAmount: amount,
        balance: amount,
        status: 'active',
        voucherType: 'standard',
        // MMVoucher expiry: 12 months from issuance
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        metadata: {
          description: voucherData.description || null,
          merchant: voucherData.merchant || null
        }
      });
      
      // Debit user's wallet
      await wallet.debit(amount, 'voucher_purchase');
      
      // Create transaction record
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await Transaction.create({
        transactionId: transactionId,
        userId: userId,
        walletId: wallet.walletId,
        amount: amount,
        type: 'payment',
        status: 'completed',
        description: `Voucher purchase: ${voucherCode}`,
        currency: 'ZAR',
        fee: 0.00,
        metadata: {
          voucherId: voucher.id,
          voucherCode: voucherCode,
          voucherType: 'standard',
          purchaseType: 'voucher_issue'
        }
      });
      
      res.status(201).json({
        success: true,
        message: 'Voucher issued successfully',
        data: {
          voucher_code: voucher.voucherCode,
          original_amount: voucher.originalAmount,
          balance: voucher.balance,
          status: voucher.status,
          wallet_balance: wallet.balance,
          transaction_id: transactionId
        }
      });
      
    } catch (error) {
      console.error('❌ Error in voucher issuance:', error);
      res.status(500).json({ error: 'Database error during issuance. Please try again.' });
    }
    
  } catch (err) {
    console.error('❌ Issue voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to issue voucher' });
  }
};

// Issue EasyPay voucher
exports.issueEasyPayVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    
    // Validate required fields
    if (!voucherData.original_amount || !voucherData.issued_to) {
      return res.status(400).json({ error: 'Amount and issued_to are required' });
    }

    // Validate amount (50-4000)
    const amount = Number(voucherData.original_amount);
    if (isNaN(amount) || amount < 50 || amount > 4000) {
      return res.status(400).json({ error: 'Amount must be between 50 and 4000' });
    }

    // Get user's wallet
    const { Wallet, Transaction } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }
    
    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }
    
    // Check if user has sufficient balance
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Generate EasyPay number
    const easyPayCode = generateEasyPayNumber();
    
    // Set expiration (96 hours from now - 4 days) for EasyPay pending
    const expiresAt = new Date(Date.now() + 96 * 60 * 60 * 1000);
    
    try {
      // Create EasyPay voucher
      const voucher = await Voucher.create({
        userId: req.user.id, // Add user ID
        voucherCode: easyPayCode, // Use EasyPay code as voucher code initially
        easyPayCode,
        originalAmount: amount,
        balance: 0, // No balance until settled
        status: 'pending_payment',
        voucherType: 'easypay_pending',
        expiresAt,
        metadata: {
          issuedTo: voucherData.issued_to,
          issuedBy: 'system',
          callbackReceived: false,
          smsSent: false,
          description: voucherData.description || null,
          merchant: voucherData.merchant || null
        }
      });

      // Debit user's wallet
      await wallet.debit(amount, 'voucher_purchase');
      
      // Create transaction record
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await Transaction.create({
        transactionId: transactionId,
        userId: req.user.id,
        walletId: wallet.walletId,
        amount: amount,
        type: 'payment',
        status: 'completed',
        description: `Voucher purchase: ${easyPayCode}`,
        currency: 'ZAR',
        fee: 0.00,
        metadata: {
          voucherId: voucher.id,
          voucherCode: easyPayCode,
          voucherType: 'easypay_pending',
          purchaseType: 'easypay_voucher_issue'
        }
      });

      res.status(201).json({
        success: true,
        message: 'EasyPay voucher created successfully',
        data: {
          easypay_code: voucher.easyPayCode,
          amount: voucher.originalAmount,
          expires_at: voucher.expiresAt,
          sms_sent: false,
          wallet_balance: wallet.balance,
          transaction_id: transactionId
        }
      });
    } catch (error) {
      console.error('❌ Error in EasyPay voucher issuance:', error);
      res.status(500).json({ error: 'Database error during EasyPay voucher issuance. Please try again.' });
    }
  } catch (err) {
    console.error('❌ Issue EasyPay voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to issue EasyPay voucher' });
  }
};

// Process EasyPay settlement callback
exports.processEasyPaySettlement = async (req, res) => {
  try {
    const { easypay_code, settlement_amount, merchant_id, transaction_id } = req.body;
    
    // Find the pending EasyPay voucher
    const voucher = await Voucher.findOne({
      where: {
        easyPayCode: easypay_code,
        voucherType: 'easypay_pending',
        status: 'pending_payment'
      }
    });
    
    if (!voucher) {
      return res.status(404).json({ error: 'EasyPay voucher not found or already settled' });
    }
    
    // Generate MM voucher code
    const mmVoucherCode = generateMMVoucherCode();
    
    // Update voucher to settled state (MMVoucher active, 12 months)
    await voucher.update({
      voucherCode: mmVoucherCode,
      status: 'active',
      voucherType: 'easypay_active',
      balance: voucher.originalAmount,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months
      metadata: {
        ...voucher.metadata,
        settlementAmount: settlement_amount,
        settlementMerchant: merchant_id,
        settlementTimestamp: new Date().toISOString(),
        callbackReceived: true,
        transactionId: transaction_id
      }
    });
    

    
    res.json({
      success: true,
      message: 'EasyPay voucher settled successfully',
      data: {
        easypay_code: easypay_code,
        mm_voucher_code: mmVoucherCode,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('❌ Process EasyPay settlement error:', err);
    res.status(500).json({ error: err.message || 'Failed to process settlement' });
  }
};

// Redeem a voucher
exports.redeemVoucher = async (req, res) => {
  try {
    const { voucher_code, amount, redeemer_id, merchant_id, service_provider_id } = req.body;
    
    if (!voucher_code) {
      return res.status(400).json({ error: 'Voucher code is required' });
    }
    
    // Clean the voucher code to handle spaces and formatting
    const cleanedVoucherCode = cleanVoucherCode(voucher_code);

    // Business rule: EasyPay (14 digits) can never be redeemed directly
    if (cleanedVoucherCode.length === 14) {
      return res.status(400).json({ error: 'EasyPay codes (14 digits) cannot be redeemed. Use the 16‑digit MMVoucher code.' });
    }

    // Only redeem using the 16‑digit MMVoucher code
    let voucher = await Voucher.findOne({ where: { voucherCode: cleanedVoucherCode } });
    
    // If still not found, try to match against formatted display codes
    if (!voucher) {
      // Get all vouchers and check if the cleaned code matches any formatted display code
      const allVouchers = await Voucher.findAll();
      for (const v of allVouchers) {
        // Format the database code the same way the frontend does
        const numericCode = (v.voucherCode || '').replace(/\D/g, ''); // Remove non-digits
        const paddedCode = numericCode.padEnd(16, '0').substring(0, 16);
        const formattedCode = `${paddedCode.substring(0, 4)} ${paddedCode.substring(4, 8)} ${paddedCode.substring(8, 12)} ${paddedCode.substring(12, 16)}`;
        const formattedCleaned = cleanVoucherCode(formattedCode);
        
        if (formattedCleaned === cleanedVoucherCode) {
          voucher = v;
          break;
        }
      }
    }
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    if (voucher.status !== 'active') {
      return res.status(400).json({ error: 'Voucher is not active and cannot be redeemed' });
    }
    
    // Determine redemption amount
    let redemptionAmount;
    if (amount && amount > 0) {
      // Partial redemption
      redemptionAmount = Number(amount);
      if (isNaN(redemptionAmount) || redemptionAmount <= 0) {
        return res.status(400).json({ error: 'Invalid redemption amount' });
      }
      if (redemptionAmount > voucher.balance) {
        return res.status(400).json({ error: 'Redemption amount exceeds voucher balance' });
      }
    } else {
      // Full redemption
      redemptionAmount = voucher.balance;
    }
    
    // Get user's wallet
    const { Wallet, Transaction } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });
    
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }
    
    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }
    
    try {
      // Calculate new balance
      const newBalance = voucher.balance - redemptionAmount;
      
      // Update voucher balance
      await voucher.update({
        balance: newBalance,
        redemptionCount: (voucher.redemptionCount || 0) + 1
      });
      
      // If balance is 0, mark as redeemed
      if (newBalance === 0) {
        await voucher.update({ status: 'redeemed' });
      }
      
      // Credit user's wallet
      await wallet.credit(redemptionAmount, 'voucher_redemption');
      
      // Create transaction record
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await Transaction.create({
        transactionId: transactionId,
        userId: voucher.userId,
        walletId: wallet.walletId,
        amount: redemptionAmount,
        type: 'deposit',
        status: 'completed',
        description: `Voucher redemption: ${voucher.voucherCode || voucher.easyPayCode}`,
        currency: 'ZAR',
        fee: 0.00,
        metadata: {
          voucherId: voucher.id,
          voucherCode: voucher.voucherCode,
          easyPayCode: voucher.easyPayCode,
          voucherType: voucher.voucherType,
          redemptionType: voucher.balance === 0 ? 'full' : 'partial',
          merchantId: merchant_id,
          serviceProviderId: service_provider_id
        }
      });
      
      res.json({
        success: true,
        message: 'Voucher redeemed successfully',
        data: {
          voucher_code: voucher.voucherCode || voucher.easyPayCode,
          redeemed_amount: redemptionAmount,
          remaining_balance: voucher.balance,
          status: voucher.status,
          wallet_balance: wallet.balance,
          transaction_id: transactionId
        }
      });
      
    } catch (error) {
      console.error('❌ Error in voucher redemption:', error);
      res.status(500).json({ error: 'Database error during redemption. Please try again.' });
    }
    
  } catch (err) {
    console.error('❌ Redeem voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to redeem voucher' });
  }
};

// List active vouchers for a user
exports.listActiveVouchers = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: vouchers
    });
  } catch (err) {
    console.error('❌ List vouchers error:', err);
    res.status(500).json({ error: 'Failed to list vouchers' });
  }
};

// List active vouchers for authenticated user
exports.listActiveVouchersForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      data: { vouchers: vouchers } 
    });
  } catch (err) {
    console.error('❌ List my vouchers error:', err);
    res.status(500).json({ error: 'Failed to list vouchers' });
  }
};

// List redeemed vouchers for authenticated user
exports.listRedeemedVouchersForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'redeemed'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      data: { vouchers: vouchers } 
    });
  } catch (err) {
    console.error('❌ List my redeemed vouchers error:', err);
    res.status(500).json({ error: 'Failed to list redeemed vouchers' });
  }
};



// Get voucher by code
exports.getVoucherByCode = async (req, res) => {
  try {
    const { voucher_code } = req.params;
    
    const voucher = await Voucher.findOne({
      where: { voucherCode: voucher_code }
    });
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    res.json({
      success: true,
      data: voucher
    });
  } catch (err) {
    console.error('❌ Get voucher error:', err);
    res.status(500).json({ error: 'Failed to get voucher' });
  }
};

// Get voucher redemption history
exports.getVoucherRedemptions = async (req, res) => {
  try {
    const { voucher_id } = req.params;
    
    const voucher = await Voucher.findByPk(voucher_id);
    
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    res.json({
      success: true,
      data: {
        voucher_id: voucher.id,
        voucher_code: voucher.voucherCode,
        redemption_count: voucher.redemptionCount,
        max_redemptions: voucher.maxRedemptions,
        status: voucher.status
      }
    });
  } catch (err) {
    console.error('❌ Get voucher redemptions error:', err);
    res.status(500).json({ error: 'Failed to get voucher redemptions' });
  }
};

// Get voucher balance for authenticated user
exports.getVoucherBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all active vouchers for the user
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: 'active'
      },
      attributes: ['balance', 'originalAmount', 'redemptionCount']
    });
    
    // Calculate totals
    const totalBalance = vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.balance), 0);
    const totalOriginalValue = vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.originalAmount), 0);
    const totalRedeemed = totalOriginalValue - totalBalance;
    const voucherCount = vouchers.length;
    
    res.json({
      success: true,
      data: {
        totalBalance: totalBalance.toFixed(2),
        totalOriginalValue: totalOriginalValue.toFixed(2),
        totalRedeemed: totalRedeemed.toFixed(2),
        voucherCount: voucherCount,
        redemptionRate: voucherCount > 0 ? ((totalRedeemed / totalOriginalValue) * 100).toFixed(1) : '0.0'
      }
    });
  } catch (err) {
    console.error('❌ Get voucher balance error:', err);
    res.status(500).json({ error: 'Failed to get voucher balance' });
  }
};

// Get voucher balance summary for authenticated user
exports.getVoucherBalanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all vouchers for the user (active, pending, redeemed)
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId
      },
      attributes: ['balance', 'originalAmount', 'status', 'voucherType']
    });
    
    // Calculate active vouchers (including partially redeemed)
    const activeVouchers = vouchers.filter(voucher => {
      if (voucher.status === 'active') return true;
      if (voucher.status === 'redeemed' && parseFloat(voucher.balance || 0) > 0) return true; // Partially redeemed = active
      return false;
    });
    
    // Calculate totals
    const activeVouchersCount = activeVouchers.length;
    const activeVouchersValue = activeVouchers.reduce((sum, voucher) => sum + parseFloat(voucher.balance || 0), 0);
    
    // Calculate pending vouchers (EasyPay pending)
    const pendingVouchers = vouchers.filter(voucher => voucher.status === 'pending_payment');
    const pendingVouchersCount = pendingVouchers.length;
    const pendingVouchersValue = pendingVouchers.reduce((sum, voucher) => sum + parseFloat(voucher.originalAmount || 0), 0);
    
    // Calculate redeemed vouchers (fully redeemed only)
    const redeemedVouchers = vouchers.filter(voucher => voucher.status === 'redeemed' && parseFloat(voucher.balance || 0) === 0);
    const redeemedVouchersCount = redeemedVouchers.length;
    const redeemedVouchersValue = redeemedVouchers.reduce((sum, voucher) => sum + parseFloat(voucher.originalAmount || 0), 0);
    
    res.json({
      success: true,
      data: {
        active: {
          count: activeVouchersCount,
          value: activeVouchersValue.toFixed(2)
        },
        pending: {
          count: pendingVouchersCount,
          value: pendingVouchersValue.toFixed(2)
        },
        redeemed: {
          count: redeemedVouchersCount,
          value: redeemedVouchersValue.toFixed(2)
        },
        total: {
          count: vouchers.length,
          value: vouchers.reduce((sum, voucher) => sum + parseFloat(voucher.originalAmount || 0), 0).toFixed(2)
        }
      }
    });
  } catch (err) {
    console.error('❌ Get voucher balance summary error:', err);
    res.status(500).json({ error: 'Failed to get voucher balance summary' });
  }
};

// List all vouchers for authenticated user (for dashboard)
exports.listAllVouchersForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId
      },
      order: [['createdAt', 'DESC']]
    });
    
    const vouchersData = vouchers.map(voucher => ({
      id: voucher.id,
      voucherCode: voucher.voucherCode,
      easyPayCode: voucher.easyPayCode,
      userId: voucher.userId,
      voucherType: voucher.voucherType,
      originalAmount: voucher.originalAmount,
      balance: voucher.balance,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
      metadata: voucher.metadata
    }));
    
    res.json({ 
      success: true,
      message: 'Vouchers retrieved successfully',
      data: { vouchers: vouchersData }
    });
  } catch (error) {
    console.error('❌ Error in listAllVouchersForMe:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Cancel EasyPay voucher with full refund
exports.cancelEasyPayVoucher = async (req, res) => {
  try {
    const { voucherId } = req.params;
    
    if (!voucherId) {
      return res.status(400).json({ error: 'Voucher ID is required' });
    }

    // Find the voucher
    const voucher = await Voucher.findOne({
      where: {
        id: voucherId,
        userId: req.user.id,
        status: 'pending_payment',
        easyPayCode: { [Op.ne]: null } // Only EasyPay vouchers
      }
    });

    if (!voucher) {
      return res.status(404).json({ 
        error: 'EasyPay voucher not found or cannot be cancelled' 
      });
    }

    // Check if voucher has already expired
    if (voucher.expiresAt && new Date() > voucher.expiresAt) {
      return res.status(400).json({ 
        error: 'Cannot cancel expired voucher. It will be automatically refunded.' 
      });
    }

    // Check if voucher has already been settled (callback received)
    if (voucher.metadata?.callbackReceived) {
      return res.status(400).json({ 
        error: 'Cannot cancel voucher that has already been settled' 
      });
    }

    // Get user's wallet
    const { Wallet, Transaction } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    const refundAmount = parseFloat(voucher.originalAmount);

    try {
      // Update voucher status to cancelled
      await voucher.update({ 
        status: 'cancelled',
        metadata: {
          ...voucher.metadata,
          cancelledAt: new Date().toISOString(),
          cancellationReason: 'user_requested',
          cancelledBy: req.user.id,
          refundAmount: refundAmount,
          auditTrail: {
            action: 'easypay_voucher_cancellation',
            userInitiated: true,
            processedAt: new Date().toISOString(),
            originalStatus: 'pending_payment',
            newStatus: 'cancelled'
          }
        }
      });

      // Credit user's wallet with full refund
      await wallet.credit(refundAmount, 'easypay_cancellation_refund');
      
      // Create refund transaction record
      const refundTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await Transaction.create({
        transactionId: refundTransactionId,
        userId: req.user.id,
        walletId: wallet.walletId,
        amount: refundAmount,
        type: 'refund',
        status: 'completed',
        description: 'EasyPay voucher cancelled - full refund',
        currency: 'ZAR',
        fee: 0.00,
        metadata: {
          voucherId: voucher.id,
          voucherCode: voucher.easyPayCode,
          voucherType: 'easypay_cancelled',
          originalAmount: voucher.originalAmount,
          refundAmount: refundAmount,
          cancellationReason: 'user_requested',
          cancelledAt: new Date().toISOString(),
          auditTrail: {
            processedAt: new Date().toISOString(),
            handler: 'user_cancellation',
            action: 'easypay_voucher_cancellation',
            userInitiated: true,
            originalStatus: 'pending_payment',
            newStatus: 'cancelled'
          }
        }
      });

      console.log(`✅ User ${req.user.id} cancelled EasyPay voucher ${voucher.easyPayCode}:`);
      console.log(`   - Original Amount: R${voucher.originalAmount}`);
      console.log(`   - Refund Amount: R${refundAmount}`);
      console.log(`   - New Wallet Balance: R${wallet.balance}`);

      res.json({
        success: true,
        message: 'EasyPay voucher cancelled successfully',
        data: {
          voucherId: voucher.id,
          easyPayCode: voucher.easyPayCode,
          originalAmount: voucher.originalAmount,
          refundAmount: refundAmount,
          newWalletBalance: wallet.balance,
          cancelledAt: new Date().toISOString(),
          transactionId: refundTransactionId
        }
      });

    } catch (error) {
      console.error('❌ Error cancelling EasyPay voucher:', error);
      res.status(500).json({ 
        error: 'Failed to cancel voucher. Please try again.' 
      });
    }

  } catch (error) {
    console.error('❌ Error in cancelEasyPayVoucher:', error);
    res.status(500).json({ 
      error: 'Server error during voucher cancellation' 
    });
  }
};