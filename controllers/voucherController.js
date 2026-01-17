const { Voucher, VoucherType, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendErrorResponse, ERROR_CODES, requestIdMiddleware } = require('../utils/errorHandler');
const { validateEasyPayNumber } = require('../utils/easyPayUtils');

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

// Handle expired vouchers with automatic refund (with retry/backoff and DB readiness check)
const handleExpiredVouchers = async () => {
  try {
    // Ensure DB is reachable before starting
    try {
      await sequelize.authenticate();
    } catch (dbErr) {
      console.warn('⏸️ Skipping handleExpiredVouchers - database not ready:', dbErr.message);
      return;
    }

    
    // Find all expired vouchers (both EasyPay and MM vouchers)
    const expiredVouchers = await Voucher.findAll({
      where: {
        status: { [Op.in]: ['pending_payment', 'active'] }, // Handle both pending and active vouchers
        expiresAt: { [Op.lt]: new Date() }
      }
    });

    

    for (const voucher of expiredVouchers) {
      try {
        // Check if this is a top-up voucher - no wallet credit needed (wallet was never debited)
        const isTopUpVoucher = voucher.voucherType === 'easypay_topup' || voucher.voucherType === 'easypay_topup_active';
        
        if (isTopUpVoucher) {
          // For top-up vouchers, just mark as expired - no wallet credit (no debit was made)
          await voucher.update({ 
            status: 'expired',
            balance: 0,
            metadata: {
              ...voucher.metadata,
              expiredAt: new Date().toISOString(),
              processedBy: 'auto_expiration_handler',
              note: 'No wallet credit - top-up voucher was never paid'
            }
          });

          console.log(`✅ Processed expired top-up voucher ${voucher.easyPayCode}: No refund (wallet was never debited)`);
          continue; // Skip to next voucher
        }

        // Check if this is an EasyPay standalone voucher - refund voucher + fee
        const isEasyPayStandaloneVoucher = voucher.voucherType === 'easypay_voucher';
        
        if (isEasyPayStandaloneVoucher) {
          // Get user's wallet
          const { Wallet, Transaction } = require('../models');
          const { sequelize } = require('../models');
          const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });
          
          if (!wallet) {
            console.error(`❌ Wallet not found for user ${voucher.userId}`);
            continue;
          }

          const voucherAmount = parseFloat(voucher.originalAmount);
          const transactionFee = parseFloat(voucher.metadata?.transactionFee || process.env.EASYPAY_VOUCHER_TRANSACTION_FEE || '2.50');
          const totalRefund = voucherAmount + transactionFee; // Refund voucher + fee

          // Use transaction to ensure atomicity
          await sequelize.transaction(async (t) => {
            // Update voucher status to expired
            await voucher.update({ 
              status: 'expired',
              balance: 0,
              metadata: {
                ...voucher.metadata,
                expiredAt: new Date().toISOString(),
                refundAmount: totalRefund,
                voucherRefundAmount: voucherAmount,
                feeRefundAmount: transactionFee,
                processedBy: 'auto_expiration_handler',
                refundReason: 'easypay_voucher_expired',
                note: 'EasyPay voucher expired - full refund (voucher + fee)'
              }
            }, { transaction: t });

            // Credit user wallet (voucher + fee)
            wallet.balance = parseFloat(wallet.balance) + totalRefund;
            wallet.lastTransactionAt = new Date();
            await wallet.save({ transaction: t });

            // Create refund transaction 1: Voucher amount
            const voucherRefundId = `EPVOUCHER-EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await Transaction.create({
              transactionId: voucherRefundId,
              userId: voucher.userId,
              walletId: wallet.walletId,
              amount: voucherAmount,
              type: 'refund',
              status: 'completed',
              description: 'EasyPay Voucher Refund',
              currency: 'ZAR',
              fee: 0,
              metadata: {
                voucherId: voucher.id,
                voucherCode: voucher.easyPayCode,
                voucherType: 'easypay_voucher',
                originalAmount: voucherAmount,
                refundAmount: voucherAmount,
                expiryDate: voucher.expiresAt,
                refundReason: 'easypay_voucher_expired',
                isEasyPayVoucherRefund: true,
                auditTrail: {
                  processedAt: new Date().toISOString(),
                  handler: 'auto_expiration_handler'
                }
              }
            }, { transaction: t });

            // Create refund transaction 2: Fee amount
            const feeRefundId = `FEE-EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await Transaction.create({
              transactionId: feeRefundId,
              userId: voucher.userId,
              walletId: wallet.walletId,
              amount: transactionFee,
              type: 'refund',
              status: 'completed',
              description: 'Transaction Fee Refund',
              currency: 'ZAR',
              fee: 0,
              metadata: {
                voucherId: voucher.id,
                voucherCode: voucher.easyPayCode,
                voucherType: 'easypay_voucher',
                feeRefundAmount: transactionFee,
                expiryDate: voucher.expiresAt,
                refundReason: 'easypay_voucher_expired',
                isEasyPayVoucherFeeRefund: true,
                relatedTransactionId: voucherRefundId,
                auditTrail: {
                  processedAt: new Date().toISOString(),
                  handler: 'auto_expiration_handler'
                }
              }
            }, { transaction: t });
          });

          console.log(`✅ Processed expired EasyPay voucher ${voucher.easyPayCode}: Refunded R${totalRefund} (Voucher: R${voucherAmount} + Fee: R${transactionFee})`);
          continue; // Skip to next voucher
        }

        // Check if this is a cash-out voucher - refund voucher + fee
        const isCashoutVoucher = voucher.voucherType === 'easypay_cashout' || voucher.voucherType === 'easypay_cashout_active';
        
        if (isCashoutVoucher) {
          // Get user's wallet and EasyPay Cash-out Float
          const { Wallet, Transaction, SupplierFloat } = require('../models');
          const { sequelize } = require('../models');
          const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });
          
          if (!wallet) {
            console.error(`❌ Wallet not found for user ${voucher.userId}`);
            continue;
          }

          const cashoutFloat = await SupplierFloat.findOne({
            where: { supplierId: 'easypay_cashout' }
          });

          if (!cashoutFloat) {
            console.error(`❌ EasyPay Cash-out Float not found`);
            continue;
          }

          // Get fee structure from metadata
          const userFee = parseFloat(voucher.metadata?.feeStructure?.userFee || process.env.EASYPAY_CASHOUT_USER_FEE || '800') / 100;
          const voucherAmount = parseFloat(voucher.originalAmount);
          const totalRefund = voucherAmount + userFee; // Refund voucher + fee

          // Use transaction to ensure atomicity
          await sequelize.transaction(async (t) => {
            // Update voucher status to expired
            await voucher.update({ 
              status: 'expired',
              balance: 0,
              metadata: {
                ...voucher.metadata,
                expiredAt: new Date().toISOString(),
                refundAmount: totalRefund,
                processedBy: 'auto_expiration_handler',
                note: 'Cash-out voucher expired - full refund (voucher + fee)'
              }
            }, { transaction: t });

            // Credit user wallet (voucher + fee)
            // Manually update balance within transaction to ensure it's committed
            wallet.balance = parseFloat(wallet.balance) + totalRefund;
            wallet.lastTransactionAt = new Date();
            await wallet.save({ transaction: t });

            // Credit EasyPay Cash-out Float (voucher amount only)
            cashoutFloat.currentBalance = parseFloat(cashoutFloat.currentBalance) + voucherAmount;
            await cashoutFloat.save({ transaction: t });

            // Create refund transaction 1: Voucher amount
            const voucherRefundId = `CASHOUT-EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await Transaction.create({
              transactionId: voucherRefundId,
              userId: voucher.userId,
              walletId: wallet.walletId,
              amount: voucherAmount,
              type: 'refund',
              status: 'completed',
              description: `Cash-out @ EasyPay expired - voucher refund: ${voucher.easyPayCode}`,
              currency: 'ZAR',
              fee: 0,
              metadata: {
                voucherId: voucher.id,
                voucherCode: voucher.easyPayCode,
                voucherType: 'easypay_cashout',
                originalAmount: voucherAmount,
                refundAmount: voucherAmount,
                expiryDate: voucher.expiresAt,
                refundReason: 'easypay_cashout_expired',
                isCashoutVoucherRefund: true,
                auditTrail: {
                  processedAt: new Date().toISOString(),
                  handler: 'auto_expiration_handler'
                }
              }
            }, { transaction: t });

            // Create refund transaction 2: Fee amount
            const feeRefundId = `FEE-EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await Transaction.create({
              transactionId: feeRefundId,
              userId: voucher.userId,
              walletId: wallet.walletId,
              amount: userFee,
              type: 'refund',
              status: 'completed',
              description: 'Transaction Fee Refund',
              currency: 'ZAR',
              fee: 0,
              metadata: {
                voucherId: voucher.id,
                voucherCode: voucher.easyPayCode,
                voucherType: 'easypay_cashout',
                feeRefundAmount: userFee,
                expiryDate: voucher.expiresAt,
                refundReason: 'easypay_cashout_expired',
                isCashoutFeeRefund: true,
                relatedTransactionId: voucherRefundId,
                auditTrail: {
                  processedAt: new Date().toISOString(),
                  handler: 'auto_expiration_handler'
                }
              }
            }, { transaction: t });
          });

          console.log(`✅ Processed expired cash-out voucher ${voucher.easyPayCode}: Refunded R${totalRefund} (Voucher: R${voucherAmount} + Fee: R${userFee})`);
          continue; // Skip to next voucher
        }

        // Get user's wallet
        const { Wallet, Transaction } = require('../models');
        const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });
        
        if (!wallet) {
          console.error(`❌ Wallet not found for user ${voucher.userId}`);
          continue;
        }

        // Determine voucher type and calculate refund amount
        const isEasyPayVoucher = voucher.easyPayCode !== null;
        const isMMVoucher = voucher.voucherCode && !voucher.easyPayCode;
        
        // For MM vouchers, refund the remaining balance
        // For EasyPay vouchers, refund the original amount (as they haven't been paid yet)
        let refundAmount = isMMVoucher ? parseFloat(voucher.balance) : parseFloat(voucher.originalAmount);
        let feeAmount = 0;
        let transactionDescription = isEasyPayVoucher ? 
          EASYPAY_EXPIRATION_CONFIG.REFUND_DESCRIPTION : 
          'MM Voucher expired - balance refund';

        // Future implementation: Apply expiry fee if enabled (only for EasyPay)
        if (isEasyPayVoucher && EASYPAY_EXPIRATION_CONFIG.ENABLE_EXPIRY_FEE) {
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

        // Update voucher status to expired and debit voucher balance
        await voucher.update({ 
          status: 'expired',
          balance: 0, // Debit voucher balance - set to 0 on expiry
          metadata: {
            ...voucher.metadata,
            expiredAt: new Date().toISOString(),
            refundAmount: refundAmount,
            feeAmount: feeAmount,
            processedBy: 'auto_expiration_handler'
          }
        });

        // Credit user's wallet with refund
        const creditReason = isEasyPayVoucher ? 'easypay_expired_refund' : 'mm_voucher_expired_refund';
        await wallet.credit(refundAmount, creditReason);
        
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
            voucherCode: isEasyPayVoucher ? voucher.easyPayCode : voucher.voucherCode,
            voucherType: isEasyPayVoucher ? 'easypay_expired' : 'mm_voucher_expired',
            originalAmount: voucher.originalAmount,
            refundAmount: refundAmount,
            feeAmount: feeAmount,
            expiryDate: voucher.expiresAt,
            refundReason: isEasyPayVoucher ? 'easypay_voucher_expired' : 'mm_voucher_expired',
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

        const voucherCode = isEasyPayVoucher ? voucher.easyPayCode : voucher.voucherCode;
        console.log(`✅ Processed expired ${isEasyPayVoucher ? 'EasyPay' : 'MM'} voucher ${voucherCode}: Refunded R${refundAmount} to wallet`);

      } catch (error) {
        const voucherCode = isEasyPayVoucher ? voucher.easyPayCode : voucher.voucherCode;
        console.error(`❌ Error processing expired ${isEasyPayVoucher ? 'EasyPay' : 'MM'} voucher ${voucherCode}:`, error);
      }
    }

    if (expiredVouchers.length > 0) {
      console.log(`✅ Voucher expiration handler completed: Processed ${expiredVouchers.length} expired voucher(s)`);
    }

  } catch (error) {
    // Retry/backoff on transient connection errors
    const isConnError = /ECONNRESET|SequelizeConnectionError|ConnectionError/i.test(error?.name || '') || /ECONNRESET/.test(error?.message || '');
    if (isConnError) {
      let delay = 1000;
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, delay));
        try {
          await sequelize.authenticate();
          console.warn(`↻ Retrying handleExpiredVouchers after ${delay}ms...`);
          return await handleExpiredVouchers();
        } catch (_) {
          delay *= 2; // exponential backoff
        }
      }
    }
    console.error('❌ Error in handleExpiredVouchers:', error);
  }
};

// Start automatic expiration handling (run every hour) with readiness gate
const startExpirationHandler = () => {
  
  
  // Run after short delay to allow DB to finish starting
  setTimeout(handleExpiredVouchers, 5000);
  
  // Then run every hour
  setInterval(handleExpiredVouchers, 60 * 60 * 1000);
  
  
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


    
    // Run the expiration handler
    await handleExpiredVouchers();
    
    res.json({
      success: true,
      message: 'Voucher expiration handler executed successfully',
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
  // Use environment variable for receiver ID, fallback to 5063 (MyMoolah's EasyPay receiver ID)
  const RECEIVER_ID = process.env.EASYPAY_RECEIVER_ID || '5063'; // MyMoolah's EasyPay receiver ID (4-digit MM code)
  
  // Generate random account number (8 digits) - fixed length
  const accountNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  
  // Combine receiver ID and account number (excluding the leading 9)
  const baseDigits = RECEIVER_ID + accountNumber;
  
  // Calculate check digit using Luhn algorithm on baseDigits
  const checkDigit = generateLuhnCheckDigit(baseDigits);
  
  // Return complete EasyPay number (14 digits): 9 + 4-digit MM code + 8-digit account + 1 check digit
  // Format: X XXXX XXXX XXXX X
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
      const result = await sequelize.transaction(async (t) => {
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
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          metadata: {
            description: voucherData.description || null,
            merchant: voucherData.merchant || null
          }
        }, { transaction: t });

        // Debit wallet within the same transaction
        await wallet.debit(amount, 'voucher_purchase', { transaction: t });

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
        }, { transaction: t });

        return { voucher, transactionId };
      });

      res.status(201).json({
        success: true,
        message: 'Voucher issued successfully',
        data: {
          voucher_code: result.voucher.voucherCode,
          original_amount: result.voucher.originalAmount,
          balance: result.voucher.balance,
          status: result.voucher.status,
          wallet_balance: wallet.balance,
          transaction_id: result.transactionId
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

// Issue EasyPay Top-up Request
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

    // Generate EasyPay number
    const easyPayCode = generateEasyPayNumber();

    // Set expiration (96 hours from now - 4 days) for EasyPay top-up request
    const expiresAt = new Date(Date.now() + 96 * 60 * 60 * 1000);

    try {
      // Create EasyPay top-up request voucher
      const voucher = await Voucher.create({
        userId: req.user.id, // Add user ID
        voucherCode: easyPayCode, // Use EasyPay code as voucher code initially
        easyPayCode,
        originalAmount: amount,
        balance: 0, // No balance until settled
        status: 'pending_payment',
        voucherType: 'easypay_topup', // Changed to topup type
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

      // No transaction record created - no wallet movement on request creation
      // Transaction will be created when settlement occurs (wallet credit)

      res.status(201).json({
        success: true,
        message: 'EasyPay top-up request created successfully',
        data: {
          easypay_code: voucher.easyPayCode,
          amount: voucher.originalAmount,
          expires_at: voucher.expiresAt,
          sms_sent: false,
          wallet_balance: wallet.balance, // Unchanged balance
          voucher_id: voucher.id
        }
      });
    } catch (error) {
      console.error('❌ Error in EasyPay top-up request creation:', error);
      res.status(500).json({ error: 'Database error during EasyPay top-up request creation. Please try again.' });
    }
  } catch (err) {
    console.error('❌ Issue EasyPay top-up request error:', err);
    res.status(500).json({ error: err.message || 'Failed to create EasyPay top-up request' });
  }
};

// Issue EasyPay Cash-out Voucher
exports.issueEasyPayCashout = async (req, res) => {
  try {
    const voucherData = req.body;

    // Validate required fields
    if (!voucherData.original_amount || !voucherData.issued_to) {
      return res.status(400).json({ error: 'Amount and issued_to are required' });
    }

    // Validate amount (50-3000 for cash-out)
    const amount = Number(voucherData.original_amount);
    if (isNaN(amount) || amount < 50 || amount > 3000) {
      return res.status(400).json({ error: 'Amount must be between 50 and 3000' });
    }

    // Get fee structure (VAT Inclusive)
    const userFee = parseFloat(process.env.EASYPAY_CASHOUT_USER_FEE || '800') / 100; // R8.00
    const providerFee = parseFloat(process.env.EASYPAY_CASHOUT_PROVIDER_FEE || '500') / 100; // R5.00
    const mmMargin = parseFloat(process.env.EASYPAY_CASHOUT_MM_MARGIN || '300') / 100; // R3.00
    const vatRate = parseFloat(process.env.EASYPAY_CASHOUT_VAT_RATE || '0.15'); // 15%

    // Calculate VAT breakdown (VAT Inclusive amounts)
    const userFeeVAT = (userFee / (1 + vatRate)) * vatRate; // R1.04
    const providerFeeVAT = (providerFee / (1 + vatRate)) * vatRate; // R0.65
    const mmMarginVAT = (mmMargin / (1 + vatRate)) * vatRate; // R0.39

    const totalRequired = amount + userFee; // Voucher amount + transaction fee

    // Get user's wallet
    const { Wallet, Transaction, SupplierFloat, Bill } = require('../models');
    const { sequelize } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });

    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }

    // Check wallet balance
    if (parseFloat(wallet.balance) < totalRequired) {
      return res.status(400).json({ 
        error: `Insufficient balance. Required: R${totalRequired.toFixed(2)} (Voucher: R${amount.toFixed(2)} + Fee: R${userFee.toFixed(2)}). Available: R${parseFloat(wallet.balance).toFixed(2)}` 
      });
    }

    // Get EasyPay Cash-out Float Account
    const cashoutFloat = await SupplierFloat.findOne({
      where: { supplierId: 'easypay_cashout' }
    });

    if (!cashoutFloat) {
      return res.status(500).json({ error: 'EasyPay Cash-out Float Account not configured' });
    }

    if (!cashoutFloat.isActive) {
      return res.status(400).json({ error: 'EasyPay Cash-out Float Account is not active' });
    }

    // Check EasyPay Cash-out Float balance
    if (parseFloat(cashoutFloat.currentBalance) < amount) {
      return res.status(400).json({ 
        error: `Insufficient EasyPay Cash-out Float balance. Required: R${amount.toFixed(2)}, Available: R${parseFloat(cashoutFloat.currentBalance).toFixed(2)}` 
      });
    }

    // Generate EasyPay number
    const easyPayCode = generateEasyPayNumber();

    // Set expiration (96 hours from now - 4 days)
    const expiresAt = new Date(Date.now() + 96 * 60 * 60 * 1000);

    try {
      // Use transaction to ensure atomicity
      const result = await sequelize.transaction(async (t) => {
        // Debit user wallet (voucher amount + fee)
        await wallet.debit(totalRequired, 'easypay_cashout_creation', { transaction: t });

        // Debit EasyPay Cash-out Float
        cashoutFloat.currentBalance = parseFloat(cashoutFloat.currentBalance) - amount;
        await cashoutFloat.save({ transaction: t });

        // Create EasyPay cash-out voucher
        const voucher = await Voucher.create({
          userId: req.user.id,
          voucherCode: easyPayCode,
          easyPayCode,
          originalAmount: amount,
          balance: amount, // Full amount available for cash-out
          status: 'pending_payment',
          voucherType: 'easypay_cashout',
          expiresAt,
          metadata: {
            issuedTo: voucherData.issued_to,
            issuedBy: 'system',
            callbackReceived: false,
            smsSent: false,
            description: voucherData.description || null,
            merchant: voucherData.merchant || null,
            feeStructure: {
              userFee: userFee,
              providerFee: providerFee,
              mmMargin: mmMargin,
              vatBreakdown: {
                userFeeVAT: userFeeVAT,
                providerFeeVAT: providerFeeVAT,
                mmMarginVAT: mmMarginVAT,
                totalVAT: userFeeVAT + providerFeeVAT + mmMarginVAT
              }
            }
          }
        }, { transaction: t });

        // Create Bill record for EasyPay lookup
        // Extract receiverId from EasyPay code (4 digits after the leading 9)
        const { extractReceiverId } = require('../utils/easyPayUtils');
        const receiverId = extractReceiverId(easyPayCode) || '1234'; // Fallback to default if extraction fails
        
        await Bill.create({
          userId: req.user.id,
          easyPayNumber: easyPayCode,
          receiverId: receiverId, // Required field - extract from EasyPay code
          amount: amount,
          minAmount: amount,
          maxAmount: amount,
          status: 'pending',
          billType: 'easypay_cashout',
          description: `Cash-out @ EasyPay: ${easyPayCode}`,
          customerName: req.user.name || req.user.phoneNumber,
          accountNumber: easyPayCode.substring(5, 13), // Account number portion (8 digits)
          dueDate: expiresAt,
          metadata: {
            voucherId: voucher.id,
            voucherType: 'easypay_cashout',
            feeStructure: {
              userFee: userFee,
              providerFee: providerFee,
              mmMargin: mmMargin
            }
          }
        }, { transaction: t });

        // Create transaction 1: Voucher amount debit
        const voucherTransactionId = `CASHOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Transaction.create({
          transactionId: voucherTransactionId,
          userId: req.user.id,
          walletId: wallet.walletId,
          amount: -amount, // Negative for debit
          type: 'payment',
          status: 'completed',
          description: `Cash-out @ EasyPay: ${easyPayCode}`,
          currency: 'ZAR',
          fee: 0, // Fee shown as separate transaction
          metadata: {
            voucherId: voucher.id,
            voucherCode: easyPayCode,
            voucherType: 'easypay_cashout',
            operationType: 'easypay_cashout_creation',
            grossAmount: amount,
            isCashoutVoucherAmount: true
          }
        }, { transaction: t });

        // Create transaction 2: Fee debit
        const feeTransactionId = `FEE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Transaction.create({
          transactionId: feeTransactionId,
          userId: req.user.id,
          walletId: wallet.walletId,
          amount: -userFee, // Negative for debit
          type: 'fee',
          status: 'completed',
          description: 'Transaction Fee',
          currency: 'ZAR',
          fee: 0,
          metadata: {
            voucherId: voucher.id,
            voucherCode: easyPayCode,
            voucherType: 'easypay_cashout',
            operationType: 'easypay_cashout_fee',
            feeAmount: userFee,
            feeStructure: {
              total: userFee,
              providerCost: providerFee,
              serviceRevenue: mmMargin,
              vatBreakdown: {
                userFeeVAT: userFeeVAT,
                providerFeeVAT: providerFeeVAT,
                mmMarginVAT: mmMarginVAT,
                totalVAT: userFeeVAT + providerFeeVAT + mmMarginVAT
              }
            },
            isCashoutFee: true,
            relatedTransactionId: voucherTransactionId
          }
        }, { transaction: t });

        // Post ledger entries (double-entry accounting) - Optional
        // Note: Ledger accounts must be created first. If they don't exist, this will be skipped.
        try {
          const ledgerService = require('../services/ledgerService');
          const LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE;
          const LEDGER_ACCOUNT_VAT_CONTROL = process.env.LEDGER_ACCOUNT_VAT_CONTROL;
          const LEDGER_ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT;
          
          // Only post if required account codes are configured
          if (LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE && LEDGER_ACCOUNT_VAT_CONTROL && LEDGER_ACCOUNT_CLIENT_FLOAT) {
            // Get EasyPay Cash-out Float ledger account code (from float record or env var)
            const LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT = process.env.LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT;
            const floatLedgerCode = cashoutFloat.ledgerAccountCode || LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT;
            
            if (!floatLedgerCode) {
              console.warn('⚠️ Ledger posting skipped: EasyPay Cash-out Float ledger account code not configured');
            } else {
              await ledgerService.postJournalEntry({
                description: `EasyPay Cash-out: ${easyPayCode}`,
                lines: [
                  { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: totalRequired, memo: 'User wallet debit (voucher + fee)' },
                  { accountCode: floatLedgerCode, dc: 'credit', amount: amount, memo: 'EasyPay Cash-out Float credit' },
                  { accountCode: LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE, dc: 'credit', amount: mmMargin, memo: 'MM revenue (fee margin)' },
                  { accountCode: LEDGER_ACCOUNT_VAT_CONTROL, dc: 'credit', amount: userFeeVAT, memo: 'VAT payable (on user fee)' },
                  { accountCode: 'PROVIDER_FEE_EXP', dc: 'debit', amount: providerFee, memo: 'Provider fee expense (EasyPay)' }
                ],
                reference: voucherTransactionId
              });
            }
            console.log('✅ Ledger entry posted for cash-out voucher');
          } else {
            console.warn('⚠️ Ledger posting skipped: missing required LEDGER_ACCOUNT_* env vars');
          }
        } catch (ledgerErr) {
          // Don't fail voucher creation if ledger posting fails
          console.error('⚠️ Failed to post cash-out journal entry:', ledgerErr.message);
          console.error('   Voucher creation will continue without ledger entry');
        }

        return { voucher, voucherTransactionId, feeTransactionId };
      });

      const { voucher } = result;

      // Reload wallet to get updated balance
      await wallet.reload();

      res.status(201).json({
        success: true,
        message: 'EasyPay cash-out voucher created successfully',
        data: {
          easypay_code: voucher.easyPayCode,
          amount: voucher.originalAmount,
          transaction_fee: userFee,
          total_debited: totalRequired,
          expires_at: voucher.expiresAt,
          sms_sent: false,
          wallet_balance: wallet.balance,
          voucher_id: voucher.id
        }
      });
    } catch (error) {
      console.error('❌ Error in EasyPay cash-out voucher creation:', error);
      res.status(500).json({ error: 'Database error during EasyPay cash-out voucher creation. Please try again.' });
    }
  } catch (err) {
    console.error('❌ Issue EasyPay cash-out voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to create EasyPay cash-out voucher' });
  }
};

// Issue EasyPay Standalone Voucher (for use at 3rd party merchants like EasyBet)
exports.issueEasyPayStandaloneVoucher = async (req, res) => {
  try {
    const voucherData = req.body;

    // Validate required fields
    if (!voucherData.original_amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Validate amount (50-3000 for EasyPay voucher)
    const amount = Number(voucherData.original_amount);
    const minAmount = parseFloat(process.env.EASYPAY_VOUCHER_MIN_AMOUNT || '50');
    const maxAmount = parseFloat(process.env.EASYPAY_VOUCHER_MAX_AMOUNT || '3000');
    
    if (isNaN(amount) || amount < minAmount || amount > maxAmount) {
      return res.status(400).json({ 
        error: `Amount must be between R${minAmount} and R${maxAmount}` 
      });
    }

    // Get transaction fee (R2.50 default)
    const transactionFee = parseFloat(process.env.EASYPAY_VOUCHER_TRANSACTION_FEE || '2.50');
    const totalRequired = amount + transactionFee;

    // Get user's wallet
    const { Wallet, Transaction } = require('../models');
    const { sequelize } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });

    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }

    // Check wallet balance
    if (parseFloat(wallet.balance) < totalRequired) {
      return res.status(400).json({ 
        error: `Insufficient balance. Required: R${totalRequired.toFixed(2)} (Voucher: R${amount.toFixed(2)} + Fee: R${transactionFee.toFixed(2)}). Available: R${parseFloat(wallet.balance).toFixed(2)}` 
      });
    }

    // Generate EasyPay number (14-digit PIN)
    const easyPayCode = generateEasyPayNumber();

    // Set expiration (96 hours from now - 4 days)
    const expiryHours = parseFloat(process.env.EASYPAY_VOUCHER_EXPIRY_HOURS || '96');
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    try {
      // Use transaction to ensure atomicity
      const result = await sequelize.transaction(async (t) => {
        // Debit user wallet (voucher amount + fee)
        await wallet.debit(totalRequired, 'easypay_voucher_creation', { transaction: t });

        // Create EasyPay standalone voucher (active immediately, like MMVoucher)
        const voucher = await Voucher.create({
          userId: req.user.id,
          voucherCode: easyPayCode,
          easyPayCode,
          originalAmount: amount,
          balance: amount, // Full amount available
          status: 'active', // Active immediately, NOT pending
          voucherType: 'easypay_voucher', // New distinct type
          expiresAt,
          metadata: {
            issuedTo: voucherData.issued_to || 'self',
            issuedBy: 'system',
            description: voucherData.description || null,
            merchant: voucherData.merchant || null,
            transactionFee: transactionFee,
            feeType: 'user_charged', // For future commission model
            commissionRate: null, // For future use
            redemptionCommission: null // For future use
          }
        }, { transaction: t });

        // Create transaction 1: Voucher purchase debit
        const voucherTransactionId = `EPVOUCHER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Transaction.create({
          transactionId: voucherTransactionId,
          userId: req.user.id,
          walletId: wallet.walletId,
          amount: -amount, // Negative for debit
          type: 'payment',
          status: 'completed',
          description: `EasyPay Voucher: ${easyPayCode}`,
          currency: 'ZAR',
          fee: 0, // Fee shown as separate transaction
          metadata: {
            voucherId: voucher.id,
            voucherCode: easyPayCode,
            voucherType: 'easypay_voucher',
            operationType: 'easypay_voucher_creation',
            isEasyPayVoucher: true
          }
        }, { transaction: t });

        // Create transaction 2: Transaction fee debit
        const feeTransactionId = `FEE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Transaction.create({
          transactionId: feeTransactionId,
          userId: req.user.id,
          walletId: wallet.walletId,
          amount: -transactionFee, // Negative for debit
          type: 'payment',
          status: 'completed',
          description: 'Transaction Fee',
          currency: 'ZAR',
          fee: 0,
          metadata: {
            voucherId: voucher.id,
            voucherCode: easyPayCode,
            voucherType: 'easypay_voucher',
            operationType: 'easypay_voucher_fee',
            feeAmount: transactionFee,
            isEasyPayVoucherFee: true,
            isTransactionFee: true,
            relatedTransactionId: voucherTransactionId
          }
        }, { transaction: t });

        return { voucher, voucherTransactionId, feeTransactionId };
      });

      const { voucher } = result;

      // Reload wallet to get updated balance
      await wallet.reload();

      res.status(201).json({
        success: true,
        message: 'EasyPay voucher created successfully',
        data: {
          easypay_code: voucher.easyPayCode,
          amount: voucher.originalAmount,
          transaction_fee: transactionFee,
          total_debited: totalRequired,
          expires_at: voucher.expiresAt,
          wallet_balance: wallet.balance,
          voucher_id: voucher.id
        }
      });
    } catch (error) {
      console.error('❌ Error in EasyPay voucher creation:', error);
      res.status(500).json({ error: 'Database error during EasyPay voucher creation. Please try again.' });
    }
  } catch (err) {
    console.error('❌ Issue EasyPay voucher error:', err);
    res.status(500).json({ error: err.message || 'Failed to create EasyPay voucher' });
  }
};

// Process EasyPay top-up settlement callback
exports.processEasyPaySettlement = async (req, res) => {
  const requestId = req.requestId || req.headers['x-request-id'];
  
  console.log('🔔 processEasyPaySettlement called:', {
    method: req.method,
    path: req.path,
    url: req.url,
    body: req.body,
    requestId
  });
  
  try {
    const { easypay_code, settlement_amount, merchant_id, transaction_id } = req.body;

    // Validate required fields
    if (!easypay_code) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'easypay_code is required', requestId);
    }
    
    if (!settlement_amount) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'settlement_amount is required', requestId);
    }
    
    if (!merchant_id) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'merchant_id is required', requestId);
    }
    
    if (!transaction_id) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'transaction_id is required', requestId);
    }

    // Validate EasyPay PIN format
    if (!validateEasyPayNumber(easypay_code)) {
      return sendErrorResponse(res, ERROR_CODES.INVALID_PIN, `Invalid EasyPay PIN format: ${easypay_code}`, requestId);
    }

    // Validate amount
    const amount = parseFloat(settlement_amount);
    if (isNaN(amount) || amount < 50 || amount > 4000) {
      return sendErrorResponse(res, ERROR_CODES.INVALID_AMOUNT, `Amount must be between R50 and R4000. Received: R${amount}`, requestId);
    }

    // Find the pending EasyPay top-up voucher
    const voucher = await Voucher.findOne({
      where: {
        easyPayCode: easypay_code,
        voucherType: 'easypay_topup',
        status: 'pending_payment'
      }
    });

    if (!voucher) {
      // Check if voucher exists with different status or type
      const debugVoucher = await Voucher.findOne({
        where: { easyPayCode: easypay_code }
      });
      
      if (debugVoucher) {
        if (debugVoucher.status === 'redeemed') {
          return sendErrorResponse(res, ERROR_CODES.VOUCHER_ALREADY_SETTLED, 'This EasyPay top-up has already been settled', requestId);
        }
        if (debugVoucher.voucherType !== 'easypay_topup') {
          return sendErrorResponse(res, ERROR_CODES.INVALID_FORMAT, `Voucher type mismatch. Expected: easypay_topup, Found: ${debugVoucher.voucherType}`, requestId);
        }
      }
      
      return sendErrorResponse(res, ERROR_CODES.PIN_NOT_FOUND, 'EasyPay top-up request not found', requestId);
    }
    
    // Check if voucher has expired (96 hours = 96 * 60 * 60 * 1000 ms)
    const expiryTime = 96 * 60 * 60 * 1000;
    const voucherAge = Date.now() - new Date(voucher.createdAt).getTime();
    if (voucherAge > expiryTime) {
      return sendErrorResponse(res, ERROR_CODES.PIN_EXPIRED, 'EasyPay PIN has expired. PINs expire after 96 hours.', requestId);
    }

    // Apply fee structure (configurable via environment variables)
    const providerFee = parseFloat(process.env.EASYPAY_TOPUP_PROVIDER_FEE || '200'); // R2.00 in cents
    const mmMargin = parseFloat(process.env.EASYPAY_TOPUP_MM_MARGIN || '50');    // R0.50 in cents
    const totalFee = providerFee + mmMargin; // Total R2.50 in cents

    // Calculate net amount to credit (gross amount minus total fee)
    const grossAmount = parseFloat(voucher.originalAmount);
    const netAmount = grossAmount - (totalFee / 100); // Convert cents to rands

    // Verify settlement amount matches voucher amount (with tolerance for rounding)
    const voucherAmount = parseFloat(voucher.originalAmount);
    if (Math.abs(voucherAmount - amount) > 0.01) {
      return sendErrorResponse(res, ERROR_CODES.AMOUNT_MISMATCH, 
        `Settlement amount mismatch. Expected: R${voucherAmount.toFixed(2)}, Received: R${amount.toFixed(2)}`, 
        requestId);
    }

    // Get user's wallet
    const { Wallet, Transaction } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });

    if (!wallet) {
      return sendErrorResponse(res, ERROR_CODES.WALLET_NOT_FOUND, 'User wallet not found', requestId);
    }

    // Credit wallet with net amount (correct for balance calculation)
    await wallet.credit(netAmount, 'easypay_topup_settlement');

    // Create TWO transaction records:
    // 1. Top-up deposit transaction (shows GROSS amount for display, wallet credited with NET)
    const settlementId = `STL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const feeTransactionId = `FEE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await Transaction.create({
      transactionId: settlementId,
      userId: voucher.userId,
      walletId: wallet.walletId,
      amount: grossAmount, // Display gross amount (R100.00) in Transaction History
      type: 'deposit',
      status: 'completed',
      description: `Top-up @ EasyPay: ${easypay_code}`,
      currency: 'ZAR',
      fee: 0, // Fee shown as separate transaction
      metadata: {
        voucherId: voucher.id,
        voucherCode: easypay_code,
        voucherType: 'easypay_topup',
        settlementType: 'easypay_topup_settlement',
        grossAmount: grossAmount,
        netAmount: netAmount,
        walletCreditedAmount: netAmount, // Actual amount credited to wallet (for audit)
        feeStructure: {
          total: totalFee / 100,
          providerCost: providerFee / 100,
          serviceRevenue: mmMargin / 100
        },
        easyPayTransactionId: transaction_id,
        merchantId: merchant_id,
        settlementTimestamp: new Date().toISOString(),
        isTopUpGrossAmount: true // Flag to indicate this shows gross amount
      }
    });

    // 2. Fee transaction (separate entry for Transaction History)
    await Transaction.create({
      transactionId: feeTransactionId,
      userId: voucher.userId,
      walletId: wallet.walletId,
      amount: -(totalFee / 100), // Negative amount (fee deduction)
      type: 'fee',
      status: 'completed',
      description: 'Transaction Fee',
      currency: 'ZAR',
      fee: 0,
      metadata: {
        voucherId: voucher.id,
        voucherCode: easypay_code,
        voucherType: 'easypay_topup',
        settlementType: 'easypay_topup_fee',
        grossAmount: grossAmount,
        feeAmount: totalFee / 100,
        feeStructure: {
          total: totalFee / 100,
          providerCost: providerFee / 100,
          serviceRevenue: mmMargin / 100
        },
        easyPayTransactionId: transaction_id,
        merchantId: merchant_id,
        settlementTimestamp: new Date().toISOString(),
        isTopUpFee: true,
        relatedTransactionId: settlementId
      }
    });

    // Update voucher as consumed (no longer active, but track for history)
    const redeemedAt = new Date().toISOString();
    await voucher.update({
      status: 'redeemed', // Consumed
      voucherType: 'easypay_topup', // Keep type for tracking
      balance: 0, // Consumed
      metadata: {
        ...voucher.metadata,
        settlementAmount: settlement_amount,
        settlementMerchant: merchant_id,
        settlementTimestamp: redeemedAt,
        callbackReceived: true,
        transactionId: transaction_id,
        feeApplied: totalFee / 100,
        netCredited: netAmount,
        settlementTransactionId: settlementId,
        redeemedAt: redeemedAt // Track when voucher was redeemed
      }
    });

    res.json({
      success: true,
      message: 'EasyPay top-up settled successfully',
      data: {
        easypay_code: easypay_code,
        gross_amount: grossAmount,
        net_amount: netAmount,
        fee_applied: totalFee / 100,
        status: 'completed',
        settlement_transaction_id: settlementId
      }
    });
  } catch (err) {
    console.error('❌ Process EasyPay top-up settlement error:', err);
    const requestId = req.requestId || req.headers['x-request-id'];
    sendErrorResponse(res, ERROR_CODES.INTERNAL_ERROR, 
      err.message || 'Failed to process top-up settlement', 
      requestId,
      { error_type: err.name || 'UnknownError' });
  }
};

// Process EasyPay Standalone Voucher Settlement Callback
exports.processEasyPayStandaloneVoucherSettlement = async (req, res) => {
  const requestId = req.requestId || req.headers['x-request-id'];
  
  try {
    const { easypay_code, settlement_amount, merchant_id, transaction_id } = req.body;

    // Validate required fields
    if (!easypay_code) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'easypay_code is required', requestId);
    }
    
    if (!settlement_amount) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'settlement_amount is required', requestId);
    }
    
    if (!merchant_id) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'merchant_id is required', requestId);
    }
    
    if (!transaction_id) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'transaction_id is required', requestId);
    }

    // Validate EasyPay PIN format
    if (!validateEasyPayNumber(easypay_code)) {
      return sendErrorResponse(res, ERROR_CODES.INVALID_PIN, `Invalid EasyPay PIN format: ${easypay_code}`, requestId);
    }

    // Validate amount
    const settlementAmount = parseFloat(settlement_amount);
    const minAmount = parseFloat(process.env.EASYPAY_VOUCHER_MIN_AMOUNT || '50');
    const maxAmount = parseFloat(process.env.EASYPAY_VOUCHER_MAX_AMOUNT || '3000');
    if (isNaN(settlementAmount) || settlementAmount < minAmount || settlementAmount > maxAmount) {
      return sendErrorResponse(res, ERROR_CODES.INVALID_AMOUNT, `Amount must be between R${minAmount} and R${maxAmount}. Received: R${settlementAmount}`, requestId);
    }

    // Find the active EasyPay standalone voucher
    const voucher = await Voucher.findOne({
      where: {
        easyPayCode: easypay_code,
        voucherType: 'easypay_voucher',
        status: 'active'
      }
    });

    if (!voucher) {
      // Check if voucher exists with different status
      const debugVoucher = await Voucher.findOne({
        where: { easyPayCode: easypay_code }
      });
      
      if (debugVoucher) {
        if (debugVoucher.status === 'redeemed') {
          return sendErrorResponse(res, ERROR_CODES.VOUCHER_ALREADY_SETTLED, 'This EasyPay voucher has already been settled', requestId);
        }
        if (debugVoucher.voucherType !== 'easypay_voucher') {
          return sendErrorResponse(res, ERROR_CODES.INVALID_FORMAT, `Voucher type mismatch. Expected: easypay_voucher, Found: ${debugVoucher.voucherType}`, requestId);
        }
      }
      
      return sendErrorResponse(res, ERROR_CODES.PIN_NOT_FOUND, 'EasyPay standalone voucher not found', requestId);
    }
    
    // Check if voucher has expired (96 hours = 4 days)
    const expiryTime = 96 * 60 * 60 * 1000;
    const voucherAge = Date.now() - new Date(voucher.createdAt).getTime();
    if (voucherAge > expiryTime) {
      return sendErrorResponse(res, ERROR_CODES.PIN_EXPIRED, 'EasyPay PIN has expired. PINs expire after 96 hours (4 days).', requestId);
    }

    // Verify settlement amount matches voucher amount
    const voucherAmount = parseFloat(voucher.originalAmount);
    if (Math.abs(voucherAmount - settlementAmount) > 0.01) {
      return sendErrorResponse(res, ERROR_CODES.AMOUNT_MISMATCH, 
        `Settlement amount mismatch. Expected: R${voucherAmount.toFixed(2)}, Received: R${settlementAmount.toFixed(2)}`, 
        requestId);
    }

    // Get user's wallet (for audit purposes, wallet already debited on creation)
    const { Wallet, Transaction } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });

    if (!wallet) {
      return sendErrorResponse(res, ERROR_CODES.WALLET_NOT_FOUND, 'User wallet not found', requestId);
    }

    // Create settlement audit transaction (no wallet movement - already debited on creation)
    const settlementId = `EPVOUCHER-STL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await Transaction.create({
      transactionId: settlementId,
      userId: voucher.userId,
      walletId: wallet.walletId,
      amount: 0, // No wallet movement - already debited on creation
      type: 'payment',
      status: 'completed',
      description: `EasyPay Voucher settled: ${easypay_code}`,
      currency: 'ZAR',
      fee: 0,
      metadata: {
        voucherId: voucher.id,
        voucherCode: easypay_code,
        voucherType: 'easypay_voucher',
        settlementType: 'easypay_voucher_settlement',
        voucherAmount: voucherAmount,
        settlementAmount: settlementAmount,
        easyPayTransactionId: transaction_id,
        merchantId: merchant_id,
        settlementTimestamp: new Date().toISOString(),
        note: 'Wallet already debited on voucher creation'
      }
    });

    // Update voucher as redeemed (consumed)
    const redeemedAt = new Date().toISOString();
    await voucher.update({
      status: 'redeemed', // Consumed
      voucherType: 'easypay_voucher', // Keep type for tracking
      balance: 0, // Consumed
      metadata: {
        ...voucher.metadata,
        settlementAmount: settlement_amount,
        settlementMerchant: merchant_id,
        settlementTimestamp: redeemedAt,
        callbackReceived: true,
        transactionId: transaction_id,
        settlementTransactionId: settlementId,
        redeemedAt: redeemedAt // Track when voucher was redeemed
      }
    });

    res.json({
      success: true,
      message: 'EasyPay standalone voucher settled successfully',
      data: {
        easypay_code: easypay_code,
        voucher_amount: voucherAmount,
        status: 'completed',
        settlement_transaction_id: settlementId
      }
    });
  } catch (err) {
    console.error('❌ Process EasyPay standalone voucher settlement error:', err);
    const requestId = req.requestId || req.headers['x-request-id'];
    sendErrorResponse(res, ERROR_CODES.INTERNAL_ERROR, 
      err.message || 'Failed to process standalone voucher settlement', 
      requestId,
      { error_type: err.name || 'UnknownError' });
  }
};

// Process EasyPay Cash-out Settlement Callback
exports.processEasyPayCashoutSettlement = async (req, res) => {
  const requestId = req.requestId || req.headers['x-request-id'];
  
  try {
    const { easypay_code, settlement_amount, merchant_id, transaction_id } = req.body;

    // Validate required fields
    if (!easypay_code) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'easypay_code is required', requestId);
    }
    
    if (!settlement_amount) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'settlement_amount is required', requestId);
    }
    
    if (!merchant_id) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'merchant_id is required', requestId);
    }
    
    if (!transaction_id) {
      return sendErrorResponse(res, ERROR_CODES.MISSING_REQUIRED_FIELD, 'transaction_id is required', requestId);
    }

    // Validate EasyPay PIN format
    if (!validateEasyPayNumber(easypay_code)) {
      return sendErrorResponse(res, ERROR_CODES.INVALID_PIN, `Invalid EasyPay PIN format: ${easypay_code}`, requestId);
    }

    // Validate amount
    const settlementAmount = parseFloat(settlement_amount);
    if (isNaN(settlementAmount) || settlementAmount < 50 || settlementAmount > 3000) {
      return sendErrorResponse(res, ERROR_CODES.INVALID_AMOUNT, `Amount must be between R50 and R3000. Received: R${settlementAmount}`, requestId);
    }

    // Find the pending EasyPay cash-out voucher
    const voucher = await Voucher.findOne({
      where: {
        easyPayCode: easypay_code,
        voucherType: 'easypay_cashout',
        status: 'pending_payment'
      }
    });

    if (!voucher) {
      // Check if voucher exists with different status
      const debugVoucher = await Voucher.findOne({
        where: { easyPayCode: easypay_code }
      });
      
      if (debugVoucher) {
        if (debugVoucher.status === 'redeemed') {
          return sendErrorResponse(res, ERROR_CODES.VOUCHER_ALREADY_SETTLED, 'This EasyPay cash-out has already been settled', requestId);
        }
        if (debugVoucher.voucherType !== 'easypay_cashout') {
          return sendErrorResponse(res, ERROR_CODES.INVALID_FORMAT, `Voucher type mismatch. Expected: easypay_cashout, Found: ${debugVoucher.voucherType}`, requestId);
        }
      }
      
      return sendErrorResponse(res, ERROR_CODES.PIN_NOT_FOUND, 'EasyPay cash-out voucher not found', requestId);
    }
    
    // Check if voucher has expired (96 hours)
    const expiryTime = 96 * 60 * 60 * 1000;
    const voucherAge = Date.now() - new Date(voucher.createdAt).getTime();
    if (voucherAge > expiryTime) {
      return sendErrorResponse(res, ERROR_CODES.PIN_EXPIRED, 'EasyPay PIN has expired. PINs expire after 96 hours.', requestId);
    }

    // Verify settlement amount matches voucher amount
    const voucherAmount = parseFloat(voucher.originalAmount);
    if (Math.abs(voucherAmount - settlementAmount) > 0.01) {
      return sendErrorResponse(res, ERROR_CODES.AMOUNT_MISMATCH, 
        `Settlement amount mismatch. Expected: R${voucherAmount.toFixed(2)}, Received: R${settlementAmount.toFixed(2)}`, 
        requestId);
    }

    // Get user's wallet (for audit purposes, wallet already debited on creation)
    const { Wallet, Transaction, Bill } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: voucher.userId } });

    if (!wallet) {
      return sendErrorResponse(res, ERROR_CODES.WALLET_NOT_FOUND, 'User wallet not found', requestId);
    }

    // Update Bill status to paid
    const bill = await Bill.findOne({ where: { easyPayNumber: easypay_code } });
    if (bill) {
      await bill.update({
        status: 'paid',
        paidAt: new Date(),
        metadata: {
          ...bill.metadata,
          settlementAmount: settlement_amount,
          settlementMerchant: merchant_id,
          settlementTransactionId: transaction_id,
          settlementTimestamp: new Date().toISOString()
        }
      });
    }

    // Create settlement audit transaction (no wallet movement - already debited)
    const settlementId = `CASHOUT-STL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await Transaction.create({
      transactionId: settlementId,
      userId: voucher.userId,
      walletId: wallet.walletId,
      amount: 0, // No wallet movement - already debited on creation
      type: 'payment',
      status: 'completed',
      description: `Cash-out @ EasyPay settled: ${easypay_code}`,
      currency: 'ZAR',
      fee: 0,
      metadata: {
        voucherId: voucher.id,
        voucherCode: easypay_code,
        voucherType: 'easypay_cashout',
        settlementType: 'easypay_cashout_settlement',
        voucherAmount: voucherAmount,
        settlementAmount: settlementAmount,
        easyPayTransactionId: transaction_id,
        merchantId: merchant_id,
        settlementTimestamp: new Date().toISOString(),
        note: 'Wallet already debited on voucher creation'
      }
    });

    // Update voucher as redeemed (consumed)
    const redeemedAt = new Date().toISOString();
    await voucher.update({
      status: 'redeemed', // Consumed
      voucherType: 'easypay_cashout', // Keep type for tracking
      balance: 0, // Consumed
      metadata: {
        ...voucher.metadata,
        settlementAmount: settlement_amount,
        settlementMerchant: merchant_id,
        settlementTimestamp: redeemedAt,
        callbackReceived: true,
        transactionId: transaction_id,
        settlementTransactionId: settlementId,
        redeemedAt: redeemedAt // Track when voucher was redeemed
      }
    });

    res.json({
      success: true,
      message: 'EasyPay cash-out settled successfully',
      data: {
        easypay_code: easypay_code,
        voucher_amount: voucherAmount,
        status: 'completed',
        settlement_transaction_id: settlementId
      }
    });
  } catch (err) {
    console.error('❌ Process EasyPay cash-out settlement error:', err);
    const requestId = req.requestId || req.headers['x-request-id'];
    sendErrorResponse(res, ERROR_CODES.INTERNAL_ERROR, 
      err.message || 'Failed to process cash-out settlement', 
      requestId,
      { error_type: err.name || 'UnknownError' });
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
    const { Wallet, Transaction, User } = require('../models');
    // Credit the REDEEMER's wallet (transfer on redemption)
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }
    
    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }
    
    try {
      let redemptionTransactionId = null;
      // Perform redemption and reconciliation atomically
      await sequelize.transaction(async (t) => {
        // Calculate new balance
        const newBalance = voucher.balance - redemptionAmount;
        
        // Update voucher balance
        await voucher.update({
          balance: newBalance,
          redemptionCount: (voucher.redemptionCount || 0) + 1
        }, { transaction: t });
        
        // If balance is 0, mark as redeemed
        if (newBalance === 0) {
          await voucher.update({ status: 'redeemed' }, { transaction: t });
        }
        
        // Credit redeemer's wallet
        await wallet.credit(redemptionAmount, 'voucher_redemption', { transaction: t });
        
        // Record redeemer transaction
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        redemptionTransactionId = transactionId;
        await Transaction.create({
          transactionId: transactionId,
          userId: req.user.id,
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
            redemptionType: newBalance === 0 ? 'full' : 'partial',
            merchantId: merchant_id,
            serviceProviderId: service_provider_id,
            redeemedBy: req.user.id
          }
        }, { transaction: t });

        // Reconciliation for legacy vouchers (issuer was not debited on issue)
        try {
          const { Op } = require('sequelize');
          const issuerWallet = await Wallet.findOne({ where: { userId: voucher.userId } });
          if (issuerWallet) {
            // Look for a prior purchase transaction for this voucher
            const priorPurchaseTx = await Transaction.findOne({
              where: {
                userId: voucher.userId,
                type: 'payment',
                description: { [Op.like]: `%${voucher.voucherCode}%` }
              }
            });
            if (!priorPurchaseTx) {
              // No prior debit found; debit issuer now for the redeemed amount (with cap for partial redemptions)
              const meta = voucher.metadata || {};
              const debitedSoFar = Number(meta.issuerDebitedAmount || 0);
              const original = Number(voucher.originalAmount || 0);
              const remainingCap = Math.max(0, original - debitedSoFar);
              const amountToDebit = Math.min(Number(redemptionAmount), remainingCap);
              if (amountToDebit > 0) {
                await issuerWallet.debit(amountToDebit, 'voucher_redemption_issuer', { transaction: t });
              }
              await Transaction.create({
                transactionId: `TXN-${Date.now()}-ISSUER-${Math.random().toString(36).substr(2, 6)}`,
                userId: voucher.userId,
                walletId: issuerWallet.walletId,
                amount: amountToDebit,
                type: 'payment',
                status: 'completed',
                description: `Voucher redemption debit: ${voucher.voucherCode}`,
                currency: 'ZAR',
                fee: 0.00,
                metadata: {
                  voucherId: voucher.id,
                  voucherCode: voucher.voucherCode,
                  reconciliation: true,
                  redeemedBy: req.user.id
                }
              }, { transaction: t });

              // Track cumulative issuer debit on voucher metadata to support partial redemptions
              const newDebitedTotal = debitedSoFar + amountToDebit;
              await voucher.update({
                metadata: { ...(voucher.metadata || {}), issuerDebitedAmount: newDebitedTotal }
              }, { transaction: t });
            }
          }
        } catch (_) { /* best effort reconciliation */ }
      });

      // Persist redemption location metadata on voucher
      try {
        const redeemer = await User.findByPk(req.user.id);
        const redeemedAt = {
          type: 'wallet',
          userId: req.user.id,
          walletId: wallet.walletId,
          name: redeemer ? `${redeemer.firstName || ''} ${redeemer.lastName || ''}`.trim() : undefined,
          phoneNumber: redeemer ? redeemer.phoneNumber : undefined,
          timestamp: new Date().toISOString()
        };
        await voucher.update({
          metadata: { ...(voucher.metadata || {}), redeemedAt }
        });
      } catch (_) { /* best effort */ }
      

      
      res.json({
        success: true,
        message: 'Voucher redeemed successfully',
        data: {
          voucher_code: voucher.voucherCode || voucher.easyPayCode,
          redeemed_amount: redemptionAmount,
          remaining_balance: voucher.balance,
          status: voucher.status,
          wallet_balance: wallet.balance,
          transaction_id: redemptionTransactionId,
          redeemed_at: (voucher.metadata && voucher.metadata.redeemedAt) || null
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

/**
 * 🚨 CRITICAL: VOUCHER BUSINESS LOGIC - NEVER CHANGE
 * 
 * ⚠️ IMMUTABLE BUSINESS RULES - DO NOT MODIFY
 * 
 * This function implements the core voucher balance calculation logic that has been
 * tested and verified to work correctly. Changing this logic will result in
 * incorrect balances and business logic failures.
 * 
 * BUSINESS RULES:
 * 1. Active Vouchers = Active Status + Pending Payment Status
 * 2. Active MMVouchers: use balance field (remaining value)
 * 3. Pending EPVouchers: use originalAmount field (full value)
 * 4. Cross-user redemption: Creator's voucher balance debited, Redeemer's wallet credited
 * 5. NEVER use single SQL aggregation - ALWAYS use this working JavaScript logic
 * 
 * VIOLATION OF THESE RULES WILL RESULT IN INCORRECT BALANCES.
 * ONLY MODIFY IF THERE ARE CRUCIAL PERFORMANCE OR SECURITY RISKS.
 */

// Get voucher balance summary for authenticated user - REVERTED to previous working logic
exports.getVoucherBalanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all vouchers for the user (excluding cancelled/expired)
    const allVouchers = await Voucher.findAll({
      where: {
        userId: userId,
        status: {
          [require('sequelize').Op.notIn]: ['cancelled', 'expired']
        }
      },
      attributes: ['id', 'status', 'balance', 'originalAmount', 'voucherType']
    });
    
    let activeValue = 0;
    let pendingValue = 0;
    let redeemedValue = 0;
    let totalValue = 0;
    
    // Apply business logic: Active Vouchers = Active status + Pending Payment status
    allVouchers.forEach(voucher => {
      const amount = parseFloat(voucher.originalAmount || 0);
      const balance = parseFloat(voucher.balance || 0);
      
      if (voucher.status === 'active') {
        // Active MMVouchers: use balance (remaining value)
        activeValue += balance;
      } else if (voucher.status === 'pending_payment' && voucher.voucherType === 'easypay_pending') {
        // Traditional EPVouchers: use originalAmount (user already paid)
        activeValue += amount;
      } else if (voucher.status === 'pending_payment' && voucher.voucherType === 'easypay_topup') {
        // Top-up @ EasyPay: use 0 (user hasn't paid yet)
        // Don't add to activeValue - not an asset yet
      } else if (voucher.status === 'redeemed') {
        // Redeemed vouchers: use originalAmount
        redeemedValue += amount;
      }
      
      // Total includes all non-cancelled/expired vouchers
      totalValue += amount;
    });
    
    // Count vouchers by status
    const activeCount = allVouchers.filter(v => v.status === 'active').length;
    const pendingCount = allVouchers.filter(v => v.status === 'pending_payment').length;
    const redeemedCount = allVouchers.filter(v => v.status === 'redeemed').length;
    
    res.json({
      success: true,
      data: {
        active: {
          count: activeCount + pendingCount, // BOTH active AND pending count as "active vouchers"
          value: activeValue.toFixed(2)
        },
        pending: {
          count: pendingCount,
          value: pendingValue.toFixed(2)
        },
        redeemed: {
          count: redeemedCount,
          value: redeemedValue.toFixed(2)
        },
        total: {
          count: allVouchers.length,
          value: totalValue.toFixed(2)
        }
      }
    });
  } catch (err) {
    console.error('❌ Get voucher balance summary error:', err);
    res.status(500).json({ error: 'Failed to get voucher balance summary' });
  }
};

// List all vouchers for authenticated user (for dashboard)
// Only returns active vouchers (status: 'active' or 'pending_payment') - expired/cancelled/redeemed are excluded
exports.listAllVouchersForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await Voucher.findAll({
      where: {
        userId: userId,
        // Removed status filter to show all vouchers in history
      },
      order: [['createdAt', 'DESC']]
    });
    
    const vouchersData = vouchers.map(voucher => {
      // Backfill expiry if missing to ensure consistent UI
      let effectiveExpiresAt = voucher.expiresAt;
      if (!effectiveExpiresAt) {
        const createdTs = new Date(voucher.createdAt).getTime();
        if (voucher.status === 'pending_payment' && voucher.easyPayCode) {
          // EasyPay pending: 96 hours from creation
          effectiveExpiresAt = new Date(createdTs + 96 * 60 * 60 * 1000);
        } else if (voucher.status === 'active') {
          // Active MMVoucher: 12 months from creation
          effectiveExpiresAt = new Date(createdTs + 365 * 24 * 60 * 60 * 1000);
        }
      }

      return {
        id: voucher.id,
        voucherCode: voucher.voucherCode,
        easyPayCode: voucher.easyPayCode,
        userId: voucher.userId,
        voucherType: voucher.voucherType,
        originalAmount: voucher.originalAmount,
        balance: voucher.balance,
        status: voucher.status,
        // Provide both expiresAt and expiryDate for frontend compatibility
        expiresAt: effectiveExpiresAt,
        expiryDate: effectiveExpiresAt,
        createdAt: voucher.createdAt,
        updatedAt: voucher.updatedAt,
        metadata: voucher.metadata,
        redeemedAt: voucher.metadata && voucher.metadata.redeemedAt ? voucher.metadata.redeemedAt : null
      };
    });
    
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

// Cancel voucher with refund
exports.cancelEasyPayVoucher = async (req, res) => {
  try {
    const { voucherId } = req.params;
    
    console.log(`🔄 Cancellation request for voucher ID: ${voucherId}, User ID: ${req.user?.id}`);
    
    if (!voucherId) {
      return res.status(400).json({ error: 'Voucher ID is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find the voucher (both EasyPay and MM vouchers)
    const voucher = await Voucher.findOne({
      where: {
        id: voucherId,
        userId: req.user.id,
        status: { [Op.in]: ['pending_payment', 'active'] } // Allow cancellation of pending and active vouchers
      }
    });

    if (!voucher) {
      console.log(`❌ Voucher not found: ID=${voucherId}, User=${req.user.id}`);
      return res.status(404).json({ 
        error: 'Voucher not found or cannot be cancelled' 
      });
    }

    console.log(`✅ Found voucher: ${voucher.easyPayCode || voucher.voucherCode}, Status: ${voucher.status}, Amount: ${voucher.originalAmount}`);

    // Check if this is a cash-out voucher - route to cash-out cancellation handler
    const isCashoutVoucher = voucher.voucherType === 'easypay_cashout' || voucher.voucherType === 'easypay_cashout_active';
    if (isCashoutVoucher) {
      console.log(`🔄 Routing cash-out voucher to cancelEasyPayCashout handler`);
      // Call the cash-out cancellation handler
      return await exports.cancelEasyPayCashout(req, res);
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

    // Check if this is a top-up voucher - no wallet credit needed (wallet was never debited)
    const isTopUpVoucher = voucher.voucherType === 'easypay_topup' || voucher.voucherType === 'easypay_topup_active';
    
    // Check if this is an EasyPay standalone voucher - needs voucher + fee refund
    const isEasyPayStandaloneVoucher = voucher.voucherType === 'easypay_voucher';
    
    if (isTopUpVoucher) {
      // For top-up vouchers, just mark as cancelled - no wallet credit (no debit was made)
      await voucher.update({ 
        status: 'cancelled',
        balance: 0,
        metadata: {
          ...voucher.metadata,
          cancelledAt: new Date().toISOString(),
          cancellationReason: 'user_requested',
          cancelledBy: req.user.id,
          auditTrail: {
            action: 'easypay_topup_cancellation',
            userInitiated: true,
            processedAt: new Date().toISOString(),
            originalStatus: voucher.status,
            newStatus: 'cancelled',
            note: 'No wallet credit - top-up voucher was never paid'
          }
        }
      });

      return res.json({
        success: true,
        message: 'Top-up voucher cancelled successfully',
        data: {
          voucherId: voucher.id,
          easyPayCode: voucher.easyPayCode,
          originalAmount: voucher.originalAmount,
          refundAmount: 0, // No refund - wallet was never debited
          note: 'Top-up vouchers do not require refund as wallet was never debited',
          cancelledAt: new Date().toISOString()
        }
      });
    }

    // For EasyPay standalone vouchers, proceed with voucher + fee refund
    if (isEasyPayStandaloneVoucher) {
      // Get user's wallet
      const { Wallet, Transaction } = require('../models');
      const { sequelize } = require('../models');
      const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
      
      if (!wallet) {
        return res.status(404).json({ error: 'User wallet not found' });
      }

      const voucherAmount = parseFloat(voucher.originalAmount);
      const transactionFee = parseFloat(voucher.metadata?.transactionFee || process.env.EASYPAY_VOUCHER_TRANSACTION_FEE || '2.50');
      const totalRefund = voucherAmount + transactionFee;

      try {
        // Use transaction to ensure atomicity
        const result = await sequelize.transaction(async (t) => {
          // Update voucher status to cancelled
          await voucher.update({ 
            status: 'cancelled',
            balance: 0,
            metadata: {
              ...voucher.metadata,
              cancelledAt: new Date().toISOString(),
              cancellationReason: 'user_requested',
              cancelledBy: req.user.id,
              refundAmount: totalRefund,
              voucherRefundAmount: voucherAmount,
              feeRefundAmount: transactionFee,
              auditTrail: {
                action: 'easypay_voucher_cancellation',
                userInitiated: true,
                processedAt: new Date().toISOString(),
                originalStatus: voucher.status,
                newStatus: 'cancelled'
              }
            }
          }, { transaction: t });

          // Credit user's wallet with full refund (voucher + fee)
          await wallet.credit(totalRefund, 'easypay_voucher_cancellation_refund', { transaction: t });
        
          // Create refund transaction 1: Voucher amount
          const voucherRefundId = `EPVOUCHER-REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await Transaction.create({
            transactionId: voucherRefundId,
            userId: req.user.id,
            walletId: wallet.walletId,
            amount: voucherAmount,
            type: 'refund',
            status: 'completed',
            description: 'EasyPay Voucher Refund',
            currency: 'ZAR',
            fee: 0,
            metadata: {
              voucherId: voucher.id,
              voucherCode: voucher.easyPayCode,
              voucherType: 'easypay_voucher',
              refundAmount: voucherAmount,
              cancellationReason: 'user_requested',
              isEasyPayVoucherRefund: true,
              cancelledAt: new Date().toISOString()
            }
          }, { transaction: t });

          // Create refund transaction 2: Fee amount
          const feeRefundId = `FEE-REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await Transaction.create({
            transactionId: feeRefundId,
            userId: req.user.id,
            walletId: wallet.walletId,
            amount: transactionFee,
            type: 'refund',
            status: 'completed',
            description: 'Transaction Fee Refund',
            currency: 'ZAR',
            fee: 0,
            metadata: {
              voucherId: voucher.id,
              voucherCode: voucher.easyPayCode,
              voucherType: 'easypay_voucher',
              feeRefundAmount: transactionFee,
              cancellationReason: 'user_requested',
              isEasyPayVoucherFeeRefund: true,
              relatedTransactionId: voucherRefundId,
              cancelledAt: new Date().toISOString()
            }
          }, { transaction: t });

          console.log(`✅ EasyPay voucher cancelled: ${voucher.easyPayCode}, Refunded: R${totalRefund} (Voucher: R${voucherAmount} + Fee: R${transactionFee})`);
          
          return { voucherRefundId, feeRefundId };
        });

        // Reload wallet to get updated balance
        await wallet.reload();

        res.json({
          success: true,
          message: 'EasyPay voucher cancelled successfully',
          data: {
            voucherId: voucher.id,
            easyPayCode: voucher.easyPayCode,
            originalAmount: voucher.originalAmount,
            transactionFee: transactionFee,
            refundAmount: totalRefund,
            newWalletBalance: wallet.balance,
            cancelledAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('❌ Error cancelling EasyPay voucher:', error);
        res.status(500).json({ 
          error: 'Failed to cancel voucher. Please try again.' 
        });
      }
      return; // Exit early for standalone voucher
    }

    // For regular EasyPay vouchers (not top-up, not standalone), proceed with refund
    // Get user's wallet
    const { Wallet, Transaction } = require('../models');
    const { sequelize } = require('../models');
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    const refundAmount = parseFloat(voucher.originalAmount);

    try {
      // Use transaction to ensure atomicity (same as expiration handler)
      const result = await sequelize.transaction(async (t) => {
        // Update voucher status to cancelled and debit voucher balance (same as expiration)
        await voucher.update({ 
          status: 'cancelled',
          balance: 0, // Debit voucher balance - set to 0 on cancellation (same as expiration)
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
              originalStatus: voucher.status,
              newStatus: 'cancelled'
            }
          }
        }, { transaction: t });

        // Credit user's wallet with full refund
        await wallet.credit(refundAmount, 'easypay_cancellation_refund', { transaction: t });
      
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
              originalStatus: voucher.status,
              newStatus: 'cancelled'
            }
          }
        }, { transaction: t });

        console.log(`✅ Voucher cancelled: ${voucher.easyPayCode || voucher.voucherCode}, Refunded: R${refundAmount}`);
        
        return { refundTransactionId };
      });

      const { refundTransactionId } = result;

      // Reload wallet to get updated balance
      await wallet.reload();

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

// Cancel EasyPay Cash-out Voucher
exports.cancelEasyPayCashout = async (req, res) => {
  try {
    const { voucherId } = req.params;
    
    console.log(`🔄 Cash-out cancellation request for voucher ID: ${voucherId}, User ID: ${req.user?.id}`);
    
    if (!voucherId) {
      return res.status(400).json({ error: 'Voucher ID is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find the cash-out voucher
    const voucher = await Voucher.findOne({
      where: {
        id: voucherId,
        userId: req.user.id,
        voucherType: { [Op.in]: ['easypay_cashout', 'easypay_cashout_active'] },
        status: { [Op.in]: ['pending_payment', 'active'] }
      }
    });

    if (!voucher) {
      console.log(`❌ Cash-out voucher not found: ID=${voucherId}, User=${req.user.id}`);
      return res.status(404).json({ 
        error: 'Cash-out voucher not found or cannot be cancelled' 
      });
    }

    console.log(`✅ Found cash-out voucher: ${voucher.easyPayCode}, Status: ${voucher.status}, Amount: ${voucher.originalAmount}`);

    // Check if voucher has already expired
    if (voucher.expiresAt && new Date() > voucher.expiresAt) {
      return res.status(400).json({ 
        error: 'Cannot cancel expired voucher. It will be automatically refunded.' 
      });
    }

    // Check if voucher has already been settled
    if (voucher.metadata?.callbackReceived) {
      return res.status(400).json({ 
        error: 'Cannot cancel voucher that has already been settled' 
      });
    }

    // Get fee structure from metadata
    // Fee in metadata is already in rands (not cents), so don't divide by 100 if it's from metadata
    let userFee;
    if (voucher.metadata?.feeStructure?.userFee) {
      // Fee from metadata is already in rands (stored as 8.00, not 800)
      userFee = parseFloat(voucher.metadata.feeStructure.userFee);
    } else {
      // Fee from env is in cents (800), so divide by 100
      userFee = parseFloat(process.env.EASYPAY_CASHOUT_USER_FEE || '800') / 100;
    }
    const voucherAmount = parseFloat(voucher.originalAmount);
    const totalRefund = voucherAmount + userFee; // Refund voucher + fee

    // Get user's wallet and EasyPay Cash-out Float
    const { Wallet, Transaction, SupplierFloat } = require('../models');
    const { sequelize } = require('../models');
    
    // Get wallet and float OUTSIDE transaction to ensure fresh instances
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    
    if (!wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    const cashoutFloat = await SupplierFloat.findOne({
      where: { supplierId: 'easypay_cashout' }
    });

    if (!cashoutFloat) {
      return res.status(500).json({ error: 'EasyPay Cash-out Float Account not configured' });
    }

    // Log initial balances
    console.log(`📊 Initial balances - Wallet: R${wallet.balance}, Float: R${cashoutFloat.currentBalance}`);

    try {
      // Use transaction to ensure atomicity
      const result = await sequelize.transaction(async (t) => {
        // Reload wallet and float within transaction to get latest state
        await wallet.reload({ transaction: t });
        await cashoutFloat.reload({ transaction: t });
        // Update voucher status to cancelled
        await voucher.update({ 
          status: 'cancelled',
          balance: 0,
          metadata: {
            ...voucher.metadata,
            cancelledAt: new Date().toISOString(),
            cancellationReason: 'user_requested',
            cancelledBy: req.user.id,
            refundAmount: totalRefund,
            auditTrail: {
              action: 'easypay_cashout_cancellation',
              userInitiated: true,
              processedAt: new Date().toISOString(),
              originalStatus: voucher.status,
              newStatus: 'cancelled'
            }
          }
        }, { transaction: t });

        // Credit user wallet (voucher amount + fee)
        console.log(`💰 Crediting wallet: R${totalRefund} (Voucher: R${voucherAmount} + Fee: R${userFee})`);
        const walletBalanceBefore = parseFloat(wallet.balance);
        
        // Manually update balance within transaction to ensure it's committed
        wallet.balance = parseFloat(wallet.balance) + totalRefund;
        wallet.lastTransactionAt = new Date();
        await wallet.save({ transaction: t });
        
        const walletBalanceAfter = parseFloat(wallet.balance);
        console.log(`✅ Wallet credited: R${walletBalanceBefore} → R${walletBalanceAfter} (+R${totalRefund})`);

        // Credit EasyPay Cash-out Float (voucher amount only)
        const floatBalanceBefore = parseFloat(cashoutFloat.currentBalance);
        cashoutFloat.currentBalance = parseFloat(cashoutFloat.currentBalance) + voucherAmount;
        await cashoutFloat.save({ transaction: t });
        console.log(`✅ Float credited: R${floatBalanceBefore} → R${cashoutFloat.currentBalance} (+R${voucherAmount})`);

        // Create refund transaction 1: Voucher amount
        const voucherRefundId = `CASHOUT-REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Transaction.create({
          transactionId: voucherRefundId,
          userId: req.user.id,
          walletId: wallet.walletId,
          amount: voucherAmount,
          type: 'refund',
          status: 'completed',
          description: `Cash-out @ EasyPay cancelled - voucher refund: ${voucher.easyPayCode}`,
          currency: 'ZAR',
          fee: 0,
          metadata: {
            voucherId: voucher.id,
            voucherCode: voucher.easyPayCode,
            voucherType: 'easypay_cashout',
            originalAmount: voucherAmount,
            refundAmount: voucherAmount,
            cancellationReason: 'user_requested',
            cancelledAt: new Date().toISOString(),
            isCashoutVoucherRefund: true
          }
        }, { transaction: t });

        // Create refund transaction 2: Fee amount
        const feeRefundId = `FEE-REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Transaction.create({
          transactionId: feeRefundId,
          userId: req.user.id,
          walletId: wallet.walletId,
          amount: userFee,
          type: 'refund',
          status: 'completed',
          description: 'Transaction Fee Refund',
          currency: 'ZAR',
          fee: 0,
          metadata: {
            voucherId: voucher.id,
            voucherCode: voucher.easyPayCode,
            voucherType: 'easypay_cashout',
            feeRefundAmount: userFee,
            cancellationReason: 'user_requested',
            cancelledAt: new Date().toISOString(),
            isCashoutFeeRefund: true,
            relatedTransactionId: voucherRefundId
          }
        }, { transaction: t });

        // Post ledger entries (contra entries) - Optional
        try {
          const ledgerService = require('../services/ledgerService');
          const LEDGER_ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT;
          
          if (LEDGER_ACCOUNT_CLIENT_FLOAT) {
            // Get EasyPay Cash-out Float ledger account code (from float record or env var)
            const LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT = process.env.LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT;
            const floatLedgerCode = cashoutFloat.ledgerAccountCode || LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT;
            
            if (!floatLedgerCode) {
              console.warn('⚠️ Ledger posting skipped: EasyPay Cash-out Float ledger account code not configured');
            } else {
              await ledgerService.postJournalEntry({
                description: `EasyPay Cash-out Cancellation: ${voucher.easyPayCode}`,
                lines: [
                  { accountCode: floatLedgerCode, dc: 'debit', amount: voucherAmount, memo: 'EasyPay Cash-out Float debit (refund)' },
                  { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'credit', amount: totalRefund, memo: 'User wallet credit (voucher + fee refund)' }
                ],
                reference: voucherRefundId
              });
            }
            console.log('✅ Ledger entry posted for cash-out cancellation');
          } else {
            console.warn('⚠️ Ledger posting skipped: missing LEDGER_ACCOUNT_CLIENT_FLOAT env var');
          }
        } catch (ledgerErr) {
          // Don't fail cancellation if ledger posting fails
          console.error('⚠️ Failed to post cancellation journal entry:', ledgerErr.message);
        }

        console.log(`✅ Cash-out voucher cancelled: ${voucher.easyPayCode}, Refunded: R${totalRefund} (Voucher: R${voucherAmount} + Fee: R${userFee})`);
        
        return { voucherRefundId, feeRefundId };
      });

      const { voucherRefundId, feeRefundId } = result;

      // Reload wallet to get updated balance
      await wallet.reload();

      res.json({
        success: true,
        message: 'EasyPay cash-out voucher cancelled successfully',
        data: {
          voucherId: voucher.id,
          easyPayCode: voucher.easyPayCode,
          originalAmount: voucherAmount,
          transactionFee: userFee,
          totalRefund: totalRefund,
          newWalletBalance: wallet.balance,
          cancelledAt: new Date().toISOString(),
          transactionIds: {
            voucherRefund: voucherRefundId,
            feeRefund: feeRefundId
          }
        }
      });

    } catch (error) {
      console.error('❌ Error cancelling EasyPay cash-out voucher:', error);
      res.status(500).json({ 
        error: 'Failed to cancel cash-out voucher. Please try again.' 
      });
    }

  } catch (error) {
    console.error('❌ Error in cancelEasyPayCashout:', error);
    res.status(500).json({ 
      error: 'Server error during cash-out voucher cancellation' 
    });
  }
};