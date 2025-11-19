/**
 * QR Payment Controller - MyMoolah Treasury Platform
 * 
 * Handles QR code scanning, merchant validation, and payment processing
 */

const { validationResult } = require('express-validator');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const ZapperService = require('../services/zapperService');
const tierFeeService = require('../services/tierFeeService');
const { Wallet, Transaction, User, SupplierFloat, TaxTransaction, sequelize } = require('../models');
const ledgerService = require('../services/ledgerService');

// Zapper fee configuration (banking-grade, Mojaloop-aligned)
const VAT_RATE = Number(process.env.VAT_RATE || 0.15);
const LEDGER_ACCOUNT_MM_COMMISSION_CLEARING = process.env.LEDGER_ACCOUNT_MM_COMMISSION_CLEARING || null;
const LEDGER_ACCOUNT_COMMISSION_REVENUE = process.env.LEDGER_ACCOUNT_COMMISSION_REVENUE || null;
const LEDGER_ACCOUNT_VAT_CONTROL = process.env.LEDGER_ACCOUNT_VAT_CONTROL || null;
const ZAPPER_FLOAT_ACCOUNT_NUMBER = process.env.ZAPPER_FLOAT_ACCOUNT_NUMBER || 'ZAPPER_FLOAT_001';

/**
 * DEPRECATED: Replaced by tierFeeService.calculateTierFees()
 * Kept for backward compatibility during migration
 */
function calculateZapperFeeBreakdown(feeInclVat) {
  const vatAmount = Number((feeInclVat * VAT_RATE / (1 + VAT_RATE)).toFixed(2));
  const netFeeAmount = Number((feeInclVat - vatAmount).toFixed(2));
  return {
    feeInclVat: Number(feeInclVat.toFixed(2)),
    vatAmount,
    netFeeAmount
  };
}

/**
 * Allocate Zapper fee to VAT control and MM revenue accounts (banking-grade)
 * Similar to allocateCommissionAndVat for VAS transactions
 */
async function allocateZapperFeeAndVat({
  feeInclVat,
  walletTransactionId,
  idempotencyKey,
  userId,
  paymentAmount,
  merchantName
}) {
  try {
    if (!feeInclVat || feeInclVat <= 0) {
      return; // No fee to allocate
    }

    const feeBreakdown = calculateZapperFeeBreakdown(feeInclVat);
    const { vatAmount, netFeeAmount } = feeBreakdown;

    // Create TaxTransaction record for VAT tracking
    const taxTransactionId = `TAX-ZAPPER-${uuidv4()}`;
    const now = new Date();
    const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const taxPayload = {
      taxTransactionId,
      originalTransactionId: walletTransactionId,
      taxCode: 'VAT_15',
      taxName: 'VAT 15%',
      taxType: 'vat',
      baseAmount: netFeeAmount,
      taxAmount: vatAmount,
      totalAmount: feeInclVat,
      taxRate: VAT_RATE,
      calculationMethod: 'inclusive',
      businessContext: 'wallet_user',
      transactionType: 'zapper_qr_payment',
      entityId: 'ZAPPER',
      entityType: 'payment_processor',
      taxPeriod,
      taxYear: now.getFullYear(),
      status: 'calculated',
      metadata: {
        idempotencyKey,
        userId,
        vatRate: VAT_RATE,
        paymentAmount,
        merchantName
      },
    };

    try {
      await TaxTransaction.create(taxPayload);
    } catch (taxErr) {
      console.error('⚠️ Failed to persist tax transaction for Zapper fee:', taxErr.message);
    }

    // Post ledger entries for VAT and revenue allocation
    if (
      LEDGER_ACCOUNT_MM_COMMISSION_CLEARING &&
      LEDGER_ACCOUNT_COMMISSION_REVENUE &&
      LEDGER_ACCOUNT_VAT_CONTROL
    ) {
      try {
        await ledgerService.postJournalEntry({
          reference: `ZAPPER-FEE-${walletTransactionId}`,
          description: `Zapper QR payment fee allocation (${merchantName || 'Merchant'})`,
          lines: [
            {
              accountCode: LEDGER_ACCOUNT_MM_COMMISSION_CLEARING,
              dc: 'debit',
              amount: feeInclVat,
              memo: 'Zapper fee clearing',
            },
            {
              accountCode: LEDGER_ACCOUNT_VAT_CONTROL,
              dc: 'credit',
              amount: vatAmount,
              memo: 'VAT payable on Zapper fee (15%)',
            },
            {
              accountCode: LEDGER_ACCOUNT_COMMISSION_REVENUE,
              dc: 'credit',
              amount: netFeeAmount,
              memo: 'Zapper fee revenue (net of VAT)',
            },
          ],
        });
      } catch (ledgerErr) {
        console.error('⚠️ Failed to post Zapper fee journal:', ledgerErr.message);
      }
    } else {
      console.warn(
        '⚠️ Zapper fee ledger posting skipped: missing LEDGER_ACCOUNT_MM_COMMISSION_CLEARING, LEDGER_ACCOUNT_COMMISSION_REVENUE, or LEDGER_ACCOUNT_VAT_CONTROL env vars'
      );
    }
  } catch (err) {
    console.error('⚠️ Zapper fee/VAT allocation failed:', err.message);
  }
}

class QRPaymentController {
  constructor() {
    this.zapperService = new ZapperService();
    this.supportedMerchants = [
      {
        id: 'woolworths',
        name: 'Woolworths',
        logo: '🛒',
        category: 'Groceries',
        locations: '400+ stores',
        qrType: 'zapper',
        isActive: true
      },
      {
        id: 'checkers',
        name: 'Checkers',
        logo: '🛍️',
        category: 'Groceries',
        locations: '230+ stores',
        qrType: 'zapper',
        isActive: true
      },
      {
        id: 'steers',
        name: 'Steers',
        logo: '🍔',
        category: 'Fast Food',
        locations: '500+ restaurants',
        qrType: 'zapper',
        isActive: true
      },
      {
        id: 'ocean_basket',
        name: 'Ocean Basket',
        logo: '🐟',
        category: 'Restaurant',
        locations: '100+ restaurants',
        qrType: 'zapper',
        isActive: true
      },
      {
        id: 'pick_n_pay',
        name: 'Pick n Pay',
        logo: '🛒',
        category: 'Groceries',
        locations: '1,500+ stores',
        qrType: 'zapper',
        isActive: true
      },
      {
        id: 'spar',
        name: 'SPAR',
        logo: '🛒',
        category: 'Groceries',
        locations: '1,000+ stores',
        qrType: 'zapper',
        isActive: true
      }
    ];

    this.pendingPayments = new Map();
  }

  // QR CODE SCANNING METHODS

  /**
   * Scan and decode QR code
   */
  async scanQRCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { qrCode, qrType = 'generic' } = req.body;

      // Decode QR code based on type
      let decodedData;
      switch (qrType) {
        case 'zapper':
          try {
            // Use real Zapper API for Zapper QR codes
            decodedData = await this.zapperService.decodeQRCode(qrCode);
          } catch (zapperError) {
            console.error('Zapper API error:', zapperError);
            // Fallback to local decoding
            decodedData = this.decodeZapperQR(qrCode);
          }
          break;
        case 'merchant':
          decodedData = this.decodeMerchantQR(qrCode);
          break;
        default:
          decodedData = this.decodeGenericQR(qrCode);
      }

      if (!decodedData) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code format',
          message: 'Unable to decode QR code'
        });
      }

      res.json({
        success: true,
        data: {
          qrCode,
          qrType,
          decodedData,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('QR scan error:', error);
      res.status(500).json({
        success: false,
        error: 'QR scan failed',
        message: 'Failed to process QR code'
      });
    }
  }

  /**
   * Validate QR code and get merchant details
   * Uses Zapper API first, falls back to local decoding
   */
  async validateQRCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { qrCode, amount } = req.body;

      // Try Zapper API first for real Zapper QR codes
      let decodedData = null;
      let zapperDecoded = false;
      
      try {
        // Attempt to decode with Zapper API
        const zapperResult = await this.zapperService.decodeQRCode(qrCode);
        
        // Transform Zapper API response to our format
        if (zapperResult && zapperResult.merchant) {
          // Extract tip information from merchant features
          const tipEnabled = zapperResult.merchant?.features?.tipEnabled || false;
          const defaultTipPercent = zapperResult.merchant?.features?.defaultTipPercent || (tipEnabled ? 10 : null);
          
          // Extract reference - check for empty strings explicitly
          let reference = null;
          if (zapperResult.invoice?.orderReference && zapperResult.invoice.orderReference.trim() !== '') {
            reference = zapperResult.invoice.orderReference;
          } else if (zapperResult.invoice?.invoiceReference && zapperResult.invoice.invoiceReference.trim() !== '') {
            reference = zapperResult.invoice.invoiceReference;
          }
          
          decodedData = {
            type: 'zapper',
            merchant: zapperResult.merchant.merchantName,
            merchantId: zapperResult.merchant.merchantReference,
            amount: zapperResult.invoice ? (zapperResult.invoice.amount / 100) : 0, // Convert cents to rands
            currency: zapperResult.invoice?.currencyISOCode || 'ZAR',
            reference: reference, // null if no reference provided
            tipEnabled: tipEnabled,
            defaultTipPercent: defaultTipPercent,
            description: `Payment to ${zapperResult.merchant.merchantName}`,
            isRealZapper: true,
            zapperData: zapperResult
          };
          zapperDecoded = true;
          console.log('✅ QR code decoded via Zapper API:', decodedData);
        }
      } catch (zapperError) {
        console.log('⚠️ Zapper API decode failed, trying local fallback:', zapperError.message);
        // Fall back to local decoding
        decodedData = this.decodeGenericQR(qrCode);
      }

      // If Zapper API didn't work, try local decoding
      if (!decodedData) {
        decodedData = this.decodeGenericQR(qrCode);
      }

      if (!decodedData) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code',
          message: 'Unable to decode QR code'
        });
      }

      // Extract merchant information
      let merchantInfo = this.extractMerchantInfo(decodedData);
      if (!merchantInfo) {
        // For real Zapper QR codes, create a generic merchant if not in our list
        if (decodedData.isRealZapper && decodedData.merchant) {
          merchantInfo = {
            id: `zapper_${decodedData.merchantId || 'generic'}`,
            name: decodedData.merchant,
            logo: '🏪',
            category: 'General',
            locations: 'Nationwide',
            qrType: 'zapper',
            isActive: true,
            isRealZapper: true
          };
        } else {
          return res.status(400).json({
            success: false,
            error: 'Unsupported merchant',
            message: 'QR code is not from a supported merchant'
          });
        }
      }

      // Validate amount if provided
      if (amount && decodedData.amount) {
        if (parseFloat(amount) !== parseFloat(decodedData.amount)) {
          return res.status(400).json({
            success: false,
            error: 'Amount mismatch',
            message: 'QR code amount does not match provided amount'
          });
        }
      }

      // Extract tip information from decoded data or URL fallback
      let tipEnabled = decodedData.tipEnabled || false;
      let defaultTipPercent = decodedData.defaultTipPercent || null;
      
      // Fallback: Parse tip from URL if not in API response
      // URL format: [34|0.00|3,40|278|13 indicates tip enabled
      // Pattern: 40|278|13 might indicate tip (40 = field code, 278 = tip percent * 10, 13 = ?)
      if (!tipEnabled) {
        const tipMatch = qrCode.match(/40\|(\d+)\|/);
        if (tipMatch) {
          tipEnabled = true;
          // If tip percentage is encoded (e.g., 278 = 27.8%), divide by 10
          // Otherwise assume it's a percentage (e.g., 10 = 10%)
          const tipValue = parseInt(tipMatch[1]);
          defaultTipPercent = tipValue > 100 ? (tipValue / 10) : tipValue;
          // Default to 10% if value seems invalid or if not provided
          if (!defaultTipPercent || defaultTipPercent > 100 || defaultTipPercent < 0) {
            defaultTipPercent = 10;
          }
        }
      }
      
      // Detect custom/editable reference from URL format
      // Pattern: 33|REF12345|1|CustomRef: indicates custom editable reference
      // Format: 33|<reference>|1|<customLabel>:
      let referenceEditable = false;
      let customReferenceLabel = null;
      const customRefMatch = qrCode.match(/33\|([^|]+)\|1\|([^:]+):/);
      if (customRefMatch) {
        referenceEditable = true;
        customReferenceLabel = customRefMatch[2]; // e.g., "CustomRef"
      }
      
      // Frontend expects { qrCode, merchant, paymentDetails, isValid } at root level
      // apiService.request returns { success: true, data: <backend_response> }
      // So we return the validation result directly (not nested in data)
      res.json({
        success: true,
        qrCode,
        merchant: merchantInfo,
          paymentDetails: {
          amount: decodedData.amount !== undefined ? decodedData.amount : (amount || 0),
          currency: decodedData.currency || 'ZAR',
          reference: decodedData.reference,
          description: decodedData.description,
          tipEnabled: tipEnabled,
          defaultTipPercent: defaultTipPercent,
          referenceEditable: referenceEditable,
          customReferenceLabel: customReferenceLabel
        },
        isValid: true,
        zapperDecoded,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('QR validation error:', error);
      res.status(500).json({
        success: false,
        error: 'QR validation failed',
        message: 'Failed to validate QR code'
      });
    }
  }

  // MERCHANT METHODS

  /**
   * Get list of supported QR merchants
   */
  async getMerchants(req, res) {
    try {
      const { category, qrType } = req.query;
      
      let merchants = this.supportedMerchants;

      // Filter by category
      if (category) {
        merchants = merchants.filter(m => m.category.toLowerCase() === category.toLowerCase());
      }

      // Filter by QR type
      if (qrType) {
        merchants = merchants.filter(m => m.qrType === qrType);
      }

      // Only return active merchants
      merchants = merchants.filter(m => m.isActive);

      // Frontend expects { merchants: [...] } in response.data
      res.json({
        success: true,
        data: {
          merchants,
          total: merchants.length,
          timestamp: new Date().toISOString()
        },
        // Include merchants at root level for frontend (apiService expects response.data.merchants)
        merchants
      });

    } catch (error) {
      console.error('Get merchants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get merchants',
        message: 'Unable to retrieve merchant list'
      });
    }
  }

  /**
   * Get specific merchant details
   */
  async getMerchantDetails(req, res) {
    try {
      const { merchantId } = req.params;

      const merchant = this.supportedMerchants.find(m => m.id === merchantId && m.isActive);

      if (!merchant) {
        return res.status(404).json({
          success: false,
          error: 'Merchant not found',
          message: 'Merchant not found or inactive'
        });
      }

      res.json({
        success: true,
        data: {
          merchant,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get merchant details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get merchant details',
        message: 'Unable to retrieve merchant information'
      });
    }
  }

  /**
   * Validate wallet at specific merchant
   */
  async validateWalletAtMerchant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { merchantId } = req.params;
      const { walletId, amount } = req.body;

      // Check if merchant exists and is active
      const merchant = this.supportedMerchants.find(m => m.id === merchantId && m.isActive);
      if (!merchant) {
        return res.status(404).json({
          success: false,
          error: 'Merchant not found',
          message: 'Merchant not found or inactive'
        });
      }

      // Try to validate with Zapper API first
      let zapperValidation = null;
      try {
        zapperValidation = await this.zapperService.validateWallet(merchantId, walletId, amount);
      } catch (zapperError) {
        console.error('Zapper validation error:', zapperError);
        // Continue with local validation as fallback
      }

      // Local wallet validation (fallback)
      const localValidation = {
        walletId,
        amount,
        isValid: true,
        availableBalance: 10000.00, // Mock balance
        transactionLimit: 5000.00,  // Mock limit
        canProcess: true
      };

      res.json({
        success: true,
        data: {
          merchant,
          walletValidation: zapperValidation || localValidation,
          validationSource: zapperValidation ? 'zapper' : 'local',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Wallet validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Wallet validation failed',
        message: 'Failed to validate wallet at merchant'
      });
    }
  }

  // PAYMENT PROCESSING METHODS

  /**
   * Initiate QR payment - processes payment immediately and creates transaction
   */
  async initiatePayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { qrCode, amount, walletId, reference, tipAmount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required'
        });
      }

      // Validate amount
      const paymentAmount = parseFloat(amount);
      if (!paymentAmount || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount',
          message: 'Payment amount must be greater than 0'
        });
      }

      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          error: 'Wallet not found',
          message: 'User wallet not found'
        });
      }

      // Validate wallet ID matches
      if (walletId && wallet.walletId !== walletId) {
        return res.status(400).json({
          success: false,
          error: 'Wallet mismatch',
          message: 'Wallet ID does not match user wallet'
        });
      }

      // Parse tip amount (if provided)
      const tip = tipAmount ? parseFloat(tipAmount) : 0;
      
      // Check sufficient balance (payment + tip)
      const totalPaymentAmount = paymentAmount + tip;
      if (parseFloat(wallet.balance) < totalPaymentAmount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance',
          message: `Insufficient balance. Required: R${totalPaymentAmount.toFixed(2)} (Payment: R${paymentAmount.toFixed(2)}${tip > 0 ? ` + Tip: R${tip.toFixed(2)}` : ''}). Available: R${parseFloat(wallet.balance).toFixed(2)}`
        });
      }

      // Decode QR code (try Zapper API first, then local)
      let decodedData = null;
      let zapperDecoded = false;
      
      try {
        const zapperResult = await this.zapperService.decodeQRCode(qrCode);
        if (zapperResult && zapperResult.merchant) {
          // Extract reference - check for empty strings explicitly
          let ref = null;
          if (zapperResult.invoice?.orderReference && zapperResult.invoice.orderReference.trim() !== '') {
            ref = zapperResult.invoice.orderReference;
          } else if (zapperResult.invoice?.invoiceReference && zapperResult.invoice.invoiceReference.trim() !== '') {
            ref = zapperResult.invoice.invoiceReference;
          } else if (reference && reference.trim() !== '') {
            ref = reference;
          }
          
          decodedData = {
            type: 'zapper',
            merchant: zapperResult.merchant.merchantName,
            merchantId: zapperResult.merchant.merchantReference,
            amount: zapperResult.invoice ? (zapperResult.invoice.amount / 100) : paymentAmount,
            currency: zapperResult.invoice?.currencyISOCode || 'ZAR',
            reference: ref, // null if no reference provided
            description: `Payment to ${zapperResult.merchant.merchantName}`,
            isRealZapper: true,
            zapperData: zapperResult
          };
          zapperDecoded = true;
        }
      } catch (zapperError) {
        console.log('⚠️ Zapper API decode failed, trying local fallback:', zapperError.message);
        decodedData = this.decodeGenericQR(qrCode);
      }

      if (!decodedData) {
        decodedData = this.decodeGenericQR(qrCode);
      }

      if (!decodedData) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code',
          message: 'Unable to decode QR code'
        });
      }

      // Extract merchant information
      let merchantInfo = this.extractMerchantInfo(decodedData);
      if (!merchantInfo && decodedData.isRealZapper && decodedData.merchant) {
        merchantInfo = {
          id: `zapper_${decodedData.merchantId || 'generic'}`,
          name: decodedData.merchant,
          logo: '🏪',
          category: 'General',
          locations: 'Nationwide',
          qrType: 'zapper',
          isActive: true,
          isRealZapper: true
        };
      }

      if (!merchantInfo) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported merchant',
          message: 'QR code is not from a supported merchant'
        });
      }

      // Use amount from request (user-entered) or QR code, but prefer request amount
      // Add tip to the final amount (tip goes to merchant)
      const finalAmount = (paymentAmount || (decodedData.amount || 0)) + tip;
      const finalReference = reference || decodedData.reference || null;

      // Calculate tier-based fees using generic service
      const finalAmountCents = Math.round(finalAmount * 100);
      const fees = await tierFeeService.calculateTierFees(
        userId,
        'ZAPPER',
        'qr_payment',
        finalAmountCents
      );

      // Convert back to Rands for wallet operations
      const totalDebitAmount = fees.totalUserPaysCents / 100;
      const feeInclVat = fees.totalFeeCents / 100;
      const supplierCost = fees.supplierCostCents / 100;
      const mmFee = fees.mmFeeCents / 100;

      // Check sufficient balance (payment amount + total fee)
      if (parseFloat(wallet.balance) < totalDebitAmount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance',
          message: `Insufficient balance. Required: ${fees.display.totalUserPays} (Payment: ${fees.display.transactionAmount} + Fee: ${fees.display.totalFee}). Available: R${parseFloat(wallet.balance).toFixed(2)}`,
          breakdown: {
            paymentAmount: fees.display.transactionAmount,
            zapperCost: fees.display.supplierCost,
            mmFee: fees.display.mmFee,
            totalFee: fees.display.totalFee,
            tierLevel: fees.display.tierLevel
          }
        });
      }

      // Performance timing
      const startTime = Date.now();
      let userLookupTime, dbTransactionTime, walletReloadTime;

      // Get user information for Zapper payment (outside transaction for better performance)
      const userLookupStart = Date.now();
      const user = await User.findByPk(userId);
      userLookupTime = Date.now() - userLookupStart;

      // Get or create Zapper float account
      let zapperFloat = await SupplierFloat.findOne({
        where: { supplierId: 'zapper', floatAccountNumber: ZAPPER_FLOAT_ACCOUNT_NUMBER }
      });

      if (!zapperFloat) {
        // Create Zapper float account if it doesn't exist
        zapperFloat = await SupplierFloat.create({
          supplierId: 'zapper',
          supplierName: 'Zapper',
          floatAccountNumber: ZAPPER_FLOAT_ACCOUNT_NUMBER,
          floatAccountName: 'Zapper QR Payments Float',
          currentBalance: 0.00,
          initialBalance: 0.00,
          minimumBalance: 0.00,
          maximumBalance: 1000000.00,
          settlementPeriod: 'real_time',
          settlementMethod: 'prefunded',
          status: 'active',
          isActive: true,
          metadata: {
            supplierType: 'qr_payment_processor',
            settlementCurrency: 'ZAR'
          }
        });
      }

      // Process payment within a transaction
      const dbTransactionStart = Date.now();
      const result = await sequelize.transaction(async (t) => {
        // Debit wallet (payment amount + total fee)
        await wallet.debit(totalDebitAmount, 'qr_payment', { transaction: t });

        // Credit Zapper float account with:
        // 1. Payment amount (goes to merchant)
        // 2. Tip amount (goes to merchant)
        // 3. Zapper's pass-through fee (supplier cost)
        // MM's fee stays as revenue
        const zapperTotalAmount = finalAmount + supplierCost; // finalAmount already includes tip
        await zapperFloat.increment('currentBalance', { 
          by: zapperTotalAmount, 
          transaction: t 
        });

        // Create payment transaction record (shows payment amount to merchant)
        const transactionId = `QR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const paymentTransaction = await Transaction.create({
          transactionId: transactionId,
          userId: userId,
          walletId: wallet.walletId,
          amount: finalAmount, // Payment amount (what user paid to merchant)
          type: 'payment',
          status: 'completed',
          description: `QR Payment to ${merchantInfo.name}`,
          currency: decodedData.currency || 'ZAR',
          fee: 0, // Fee shown as separate transaction
          reference: finalReference,
          metadata: {
            qrCode: qrCode,
            merchantId: merchantInfo.id,
            merchantName: merchantInfo.name,
            zapperDecoded: zapperDecoded,
            zapperData: decodedData.zapperData || null,
            paymentAmount: paymentAmount, // Base payment amount (excluding tip)
            tipAmount: tip, // Tip amount (if any)
            totalAmount: finalAmount, // Payment + tip
            tierFeeBreakdown: {
              tierLevel: fees.tierLevel,
              supplierCost: fees.display.supplierCost,
              mmFee: fees.display.mmFee,
              totalFee: fees.display.totalFee,
              mmNetRevenue: fees.display.netRevenue
            },
            zapperFloatAccount: zapperFloat.floatAccountNumber,
            totalDebitAmount: totalDebitAmount,
            isZapperPayment: true
          }
        }, { transaction: t });

        // Create separate fee transaction record (shows combined fee to user)
        const feeTransactionId = `QR_FEE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const feeTransaction = await Transaction.create({
          transactionId: feeTransactionId,
          userId: userId,
          walletId: wallet.walletId,
          amount: feeInclVat, // Total fee (Zapper cost + MM fee)
          type: 'payment', // Same type as payment so it shows in history
          status: 'completed',
          description: `Transaction Fee`,
          currency: decodedData.currency || 'ZAR',
          fee: 0, // Fee is the amount itself, not an additional fee
          reference: `${finalReference}_FEE`,
          metadata: {
            originalTransactionId: transactionId,
            tierLevel: fees.tierLevel,
            tierFeeBreakdown: {
              supplierCost: fees.display.supplierCost,
              supplierCostCents: fees.supplierCostCents,
              mmFee: fees.display.mmFee,
              mmFeeCents: fees.mmFeeCents,
              totalFee: fees.display.totalFee,
              totalFeeCents: fees.totalFeeCents,
              mmVatAmount: fees.display.netRevenue, // VAT on MM's fee only
              mmNetRevenue: fees.mmFeeNetRevenue
            },
            isZapperFee: true,
            merchantName: merchantInfo.name,
            feeConfig: fees.feeConfig
          }
        }, { transaction: t });
        
        console.log(`✅ Created Zapper fee transaction: ${feeTransactionId} | Amount: ${fees.display.totalFee} | Tier: ${fees.display.tierLevel} | MM Revenue: ${fees.display.netRevenue}`);

        return {
          transaction: paymentTransaction,
          feeTransaction: feeTransaction,
          merchant: merchantInfo,
          amount: finalAmount,
          fee: feeInclVat,
          mmFee: mmFee,
          supplierCost: supplierCost,
          tierLevel: fees.tierLevel,
          reference: finalReference,
          zapperFloat,
          fees: fees
        };
      });
      dbTransactionTime = Date.now() - dbTransactionStart;

      // Allocate MM's fee (only) to VAT control and revenue accounts (non-blocking)
      // Zapper's cost is pass-through and goes to supplier float
      const idempotencyKey = `ZAPPER-${result.transaction.transactionId}`;
      setImmediate(async () => {
        await allocateZapperFeeAndVat({
          feeInclVat: result.mmFee, // Only MM's portion, not Zapper's cost
          walletTransactionId: result.transaction.transactionId,
          idempotencyKey,
          userId,
          paymentAmount: finalAmount,
          merchantName: merchantInfo.name
        });
      });

      // Process Zapper API call in background (truly non-blocking)
      // This allows us to return the response immediately without waiting for Zapper
      if (zapperDecoded && merchantInfo.isRealZapper) {
        // Fire and forget - process in background
        setImmediate(async () => {
          try {
            const zapperApiStart = Date.now();
            // Base64 encode the QR code for Zapper API
            const base64QRCode = Buffer.from(qrCode, 'utf8').toString('base64');
            
            const zapperResult = await this.zapperService.processWalletPayment({
              reference: finalReference,
              code: base64QRCode,
              amount: finalAmount, // Will be converted to cents in service
              paymentUTCDate: new Date().toISOString(),
              customer: {
                id: `CUST-${userId}`,
                firstName: user?.firstName || 'Customer',
                lastName: user?.lastName || 'Unknown'
              }
            });
            
            const zapperTransactionId = zapperResult.id || zapperResult.transactionId || zapperResult.reference;
            const zapperApiTime = Date.now() - zapperApiStart;
            console.log(`✅ Zapper API processed in background: ${zapperApiTime}ms | TransactionID: ${zapperTransactionId}`);
            
            // Update transaction metadata with Zapper transaction ID
            if (zapperTransactionId) {
              await result.transaction.update({
                metadata: {
                  ...result.transaction.metadata,
                  zapperTransactionId: zapperTransactionId
                }
              });
            }
          } catch (zapperError) {
            console.error('⚠️ Zapper payment processing failed (background):', zapperError.message);
            // Transaction is already created, so this is non-critical
          }
        });
      }

      // Reload wallet to get updated balance
      const walletReloadStart = Date.now();
      await wallet.reload();
      walletReloadTime = Date.now() - walletReloadStart;

      // Log performance metrics
      const totalTime = Date.now() - startTime;
      console.log(`⏱️  QR Payment Performance: Total=${totalTime}ms | UserLookup=${userLookupTime}ms | DBTransaction=${dbTransactionTime}ms | WalletReload=${walletReloadTime}ms | ZapperAPI=background`);

      res.json({
        success: true,
        data: {
          paymentId: result.transaction.transactionId,
          transactionId: result.transaction.transactionId,
          merchant: result.merchant,
          amount: result.amount, // Payment amount (to merchant)
          fee: result.fee, // Total fee (Zapper cost + MM fee)
          currency: decodedData.currency || 'ZAR',
          reference: result.reference,
          status: 'completed',
          walletBalance: parseFloat(wallet.balance),
          zapperTransactionId: null, // Will be updated in background
          tierLevel: result.tierLevel,
          feeBreakdown: {
            supplierCost: result.fees.display.supplierCost,
            mmFee: result.fees.display.mmFee,
            totalFee: result.fees.display.totalFee,
            tierLevel: result.fees.display.tierLevel
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
        message: error.message || 'Failed to process payment'
      });
    }
  }

  /**
   * Confirm QR payment
   */
  async confirmPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { paymentId, otp } = req.body;

      // Get payment record
      const payment = this.pendingPayments.get(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
          message: 'Payment not found or expired'
        });
      }

      // Check if payment expired
      if (new Date() > new Date(payment.expiresAt)) {
        this.pendingPayments.delete(paymentId);
        return res.status(400).json({
          success: false,
          error: 'Payment expired',
          message: 'Payment session has expired'
        });
      }

      // TODO: Validate OTP if required
      // This would typically validate the OTP sent to the user

      // Process payment
      const transactionResult = await this.processPayment(payment);

      // Remove from pending payments
      this.pendingPayments.delete(paymentId);

      res.json({
        success: true,
        data: {
          paymentId,
          transaction: transactionResult,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment confirmation failed',
        message: 'Failed to confirm payment'
      });
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = this.pendingPayments.get(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
          message: 'Payment not found or completed'
        });
      }

      res.json({
        success: true,
        data: {
          paymentId,
          status: payment.status,
          payment,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment status',
        message: 'Unable to retrieve payment status'
      });
    }
  }

  // QR CODE GENERATION METHODS

  /**
   * Generate QR code for payment
   */
  async generateQRCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { amount, merchantId, reference } = req.body;

      // Generate QR code data
      const qrData = {
        type: 'payment',
        amount: parseFloat(amount),
        currency: 'ZAR',
        merchantId: merchantId || 'mymoolah',
        reference: reference || `QR_${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

      res.json({
        success: true,
        data: {
          qrCode: qrCodeDataURL,
          qrData,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('QR generation error:', error);
      res.status(500).json({
        success: false,
        error: 'QR generation failed',
        message: 'Failed to generate QR code'
      });
    }
  }

  // HEALTH AND STATUS METHODS

  /**
   * Health check for QR payment service
   */
  async healthCheck(req, res) {
    try {
      // Check Zapper service health
      const zapperHealth = await this.zapperService.healthCheck();
      
      res.json({
        success: true,
        data: {
          service: 'QR Payment Service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          zapper: zapperHealth
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.json({
        success: true,
        data: {
          service: 'QR Payment Service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          zapper: {
            status: 'unavailable',
            error: error.message
          }
        }
      });
    }
  }

  /**
   * Get QR payment service status
   */
  async getServiceStatus(req, res) {
    res.json({
      success: true,
      data: {
        service: 'QR Payment Service',
        status: 'operational',
        features: {
          qrScanning: true,
          merchantValidation: true,
          paymentProcessing: true,
          qrGeneration: true
        },
        supportedMerchants: this.supportedMerchants.length,
        pendingPayments: this.pendingPayments.size,
        timestamp: new Date().toISOString()
      }
    });
  }

  // HELPER METHODS

  /**
   * Decode Zapper QR code
   */
  decodeZapperQR(qrCode) {
    try {
      // Handle real Zapper URLs
      if (qrCode.startsWith('http://') || qrCode.startsWith('https://')) {
        if (qrCode.includes('zap.pe') || qrCode.includes('zapper')) {
          return this.parseZapperURL(qrCode);
        }
      }
      
      // Handle our mock format for testing
      if (qrCode.startsWith('ZAPPER_')) {
        const parts = qrCode.split('_');
        return {
          type: 'zapper',
          merchant: parts[1] || 'unknown',
          amount: parseFloat(parts[2]) || 0,
          currency: 'ZAR',
          reference: parts[3] || `ZAP_${Date.now()}`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Zapper QR decode error:', error);
      return null;
    }
  }

  /**
   * Parse real Zapper payment URLs
   */
  parseZapperURL(url) {
    try {
      const urlObj = new URL(url);
      
      // Extract parameters from Zapper URL
      const params = new URLSearchParams(urlObj.search);
      const pathParts = urlObj.pathname.split('/');
      
      // Parse Zapper-specific format
      // Example: http://2.zap.pe?t=6&i=40895:49955:7[34|0.00|3:10[39|ZAR,38|DillonDev
      const transactionId = params.get('i') || pathParts[pathParts.length - 1];
      const amount = this.extractAmountFromZapperURL(url);
      const merchant = this.extractMerchantFromZapperURL(url);
      
      // Extract a cleaner reference from the transaction ID
      // Production QR codes may not have a reference - only extract if present
      let reference = null;
      if (transactionId && transactionId.includes('[')) {
        // Remove the complex part after the bracket to get base reference
        const baseRef = transactionId.split('[')[0];
        // Only use if it looks like a valid reference (not just merchant IDs)
        // Production format: 41791:51169:7 - this is merchant:site:invoice, not a user reference
        // If it contains colons, it's likely not a user reference
        if (baseRef && !baseRef.includes(':')) {
          reference = baseRef;
        }
      }
      
      return {
        type: 'zapper',
        merchant: merchant || 'Zapper Merchant',
        amount: amount || 0,
        currency: 'ZAR',
        reference: reference, // null if no reference (matches production QR behavior)
        originalUrl: url,
        isRealZapper: true
      };
    } catch (error) {
      console.error('Zapper URL parsing error:', error);
      return null;
    }
  }

  /**
   * Extract amount from Zapper URL
   */
  extractAmountFromZapperURL(url) {
    try {
      // Look for amount patterns in the URL
      const amountMatch = url.match(/\[(\d+)\|(\d+\.\d+)/);
      if (amountMatch) {
        return parseFloat(amountMatch[2]);
      }
      
      // Handle Zapper format: [34|0.00|3:10[39|ZAR,38|DillonDev
      const zapperAmountMatch = url.match(/\[(\d+)\|(\d+\.\d+)\|/);
      if (zapperAmountMatch) {
        const amount = parseFloat(zapperAmountMatch[2]);
        return amount; // This will return 0.00 for no tip
      }
      
      // Alternative pattern matching
      const altAmountMatch = url.match(/(\d+\.\d{2})/);
      if (altAmountMatch) {
        return parseFloat(altAmountMatch[1]);
      }
      
      // Look for amount in the format: |0.00|
      const pipeAmountMatch = url.match(/\|(\d+\.\d+)\|/);
      if (pipeAmountMatch) {
        return parseFloat(pipeAmountMatch[1]);
      }
      
      return 0;
    } catch (error) {
      console.error('Amount extraction error:', error);
      return 0;
    }
  }

  /**
   * Extract merchant from Zapper URL
   * Production format: http://2.zap.pe?t=6&i=41791:51169:7[34|0.00|3:10[39|ZAR,38|Dillon Prod Test
   * Merchant name appears after "38|" and can contain spaces
   */
  extractMerchantFromZapperURL(url) {
    try {
      // Look for merchant name pattern: 38|Merchant Name (at end of URL or before end)
      // Handle both with and without spaces in merchant name
      const merchantMatch = url.match(/38\|([^,]+?)(?:$|,)/);
      if (merchantMatch && merchantMatch[1]) {
        return merchantMatch[1].trim();
      }
      
      // Fallback: Look for merchant name after last pipe before end
      // Pattern: |MerchantName (allowing spaces and special chars)
      const fallbackMatch = url.match(/\|([^|\[\]]+?)(?:$|,)/);
      if (fallbackMatch && fallbackMatch[1]) {
        return fallbackMatch[1].trim();
      }
      
      // Alternative: extract from domain or path
      if (url.includes('zap.pe')) {
        return 'Zapper Merchant';
      }
      
      return 'Unknown Zapper Merchant';
    } catch (error) {
      console.error('Merchant extraction error:', error);
      return 'Unknown Zapper Merchant';
    }
  }

  /**
   * Decode merchant QR code
   */
  decodeMerchantQR(qrCode) {
    try {
      // Mock merchant QR decoding
      if (qrCode.startsWith('MERCHANT_')) {
        const parts = qrCode.split('_');
        return {
          type: 'merchant',
          merchantId: parts[1] || 'unknown',
          amount: parseFloat(parts[2]) || 0,
          currency: 'ZAR',
          reference: parts[3] || `MER_${Date.now()}`
        };
      }
      return null;
    } catch (error) {
      console.error('Merchant QR decode error:', error);
      return null;
    }
  }

  /**
   * Decode generic QR code
   */
  decodeGenericQR(qrCode) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qrCode);
      if (parsed.type === 'payment') {
        return parsed;
      }
    } catch (error) {
      // Not JSON, try other formats
    }

    // Try Zapper format first (including real URLs)
    const zapperData = this.decodeZapperQR(qrCode);
    if (zapperData) return zapperData;

    // Try merchant format
    const merchantData = this.decodeMerchantQR(qrCode);
    if (merchantData) return merchantData;

    // If it's a URL but not Zapper, try to extract basic info
    if (qrCode.startsWith('http://') || qrCode.startsWith('https://')) {
      return {
        type: 'url',
        merchant: 'Web Merchant',
        amount: 0,
        currency: 'ZAR',
        reference: `URL_${Date.now()}`,
        originalUrl: qrCode,
        isWebPayment: true
      };
    }

    return null;
  }

  /**
   * Extract merchant information from decoded data
   */
  extractMerchantInfo(decodedData) {
    if (decodedData.merchantId) {
      return this.supportedMerchants.find(m => m.id === decodedData.merchantId);
    }
    if (decodedData.merchant) {
      // Try to find exact match first
      let merchant = this.supportedMerchants.find(m => m.name.toLowerCase() === decodedData.merchant.toLowerCase());
      
      // If no exact match, try partial match
      if (!merchant) {
        merchant = this.supportedMerchants.find(m => m.name.toLowerCase().includes(decodedData.merchant.toLowerCase()));
      }
      
      // If still no match, create a generic merchant for real Zapper codes
      if (!merchant && decodedData.isRealZapper) {
        return {
          id: 'zapper_generic',
          name: decodedData.merchant || 'Zapper Merchant',
          logo: '🏪',
          category: 'General',
          locations: 'Nationwide',
          qrType: 'zapper',
          isActive: true,
          isRealZapper: true
        };
      }
      
      return merchant;
    }
    return null;
  }

  /**
   * Create wallet transaction record using the transaction API
   */
  async createWalletTransaction(payment, transactionResult) {
    try {
      // Generate unique transaction ID
      const transactionId = `QR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Create transaction using the transaction API
      const transactionData = {
        transactionId,
        walletId: payment.walletId,
        senderWalletId: payment.walletId,
        amount: payment.amount,
        type: 'payment',
        status: 'completed',
        description: `QR Payment to ${payment.merchant.name}`,
        fee: 0.00,
        currency: 'ZAR',
        reference: payment.reference
      };

      // Call the transaction API to create the transaction
      const response = await axios.post('http://localhost:3001/api/v1/transactions', transactionData);
      
      if (response.data && response.data.success) {

        return response.data.data;
      } else {
        throw new Error('Failed to create transaction via API');
      }

    } catch (error) {
      console.error('❌ Failed to create wallet transaction:', error);
      // Don't throw error - just log it so the payment can still complete
      
    }
  }

  /**
   * Process payment with Zapper API and wallet transaction creation
   */
  async processPayment(payment) {
    try {
      // Try to process with Zapper API first
      const zapperPaymentData = {
        walletId: payment.walletId,
        amount: payment.amount,
        reference: payment.reference,
        merchantId: payment.merchant.id
      };

      const zapperResult = await this.zapperService.processWalletPayment(
        payment.merchant.id,
        zapperPaymentData
      );

      const transactionResult = {
        id: zapperResult.id || `TXN_${Date.now()}`,
        amount: payment.amount,
        currency: 'ZAR',
        merchant: payment.merchant.name,
        reference: payment.reference,
        status: 'completed',
        timestamp: new Date().toISOString(),
        zapperTransactionId: zapperResult.transactionId,
        processingSource: 'zapper'
      };

      // Create wallet transaction record
      await this.createWalletTransaction(payment, transactionResult);

      return transactionResult;

    } catch (zapperError) {
      console.error('Zapper payment processing failed:', zapperError);
      
      const transactionResult = {
        id: `TXN_${Date.now()}`,
        amount: payment.amount,
        currency: 'ZAR',
        merchant: payment.merchant.name,
        reference: payment.reference,
        status: 'completed',
        timestamp: new Date().toISOString(),
        processingSource: 'local'
      };

      // Create wallet transaction record even for local processing
      await this.createWalletTransaction(payment, transactionResult);

      return transactionResult;
    }
  }
}

module.exports = QRPaymentController;
