/**
 * Overlay Services Routes - MyMoolah Treasury Platform
 * 
 * Routes for overlay-specific services (airtime/data, electricity, bill payments)
 * Integrates with existing Flash and MobileMart services
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ========================================
// AIRTIME & DATA OVERLAY ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/overlay/airtime-data/catalog
 * @desc    Get airtime/data catalog for a beneficiary
 * @access  Private
 * @query   { beneficiaryId, country }
 */
router.get('/airtime-data/catalog', auth, async (req, res) => {
  try {
    const { beneficiaryId, country = 'ZA' } = req.query;
    
    if (!beneficiaryId) {
      return res.status(400).json({
        success: false,
        error: 'beneficiaryId is required'
      });
    }

    // Get beneficiary details
    const { Beneficiary } = require('../models');
    const beneficiary = await Beneficiary.findOne({
      where: { id: beneficiaryId, userId: req.user.id }
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiary not found'
      });
    }

    // Get beneficiary network from metadata
    const beneficiaryNetwork = beneficiary.metadata?.network || 'Vodacom'; // Default to Vodacom
    console.log(`📱 Beneficiary network: ${beneficiaryNetwork}`);
    
    // Get products from database instead of calling supplier APIs
    let airtimeProducts = [];
    let dataProducts = [];
    
    try {
      const { VasProduct } = require('../models');
      
      // Determine if this is a Global provider selection coming from beneficiary
      const isGlobalAirtime = beneficiaryNetwork === 'global-airtime';
      const isGlobalData = beneficiaryNetwork === 'global-data';

      // Get airtime and data products from database, filtered by network (or Global) and transaction type
      airtimeProducts = await VasProduct.findAll({
        where: {
          vasType: 'airtime',
          isActive: true,
          provider: isGlobalAirtime ? 'Global' : beneficiaryNetwork,
          transactionType: 'topup' // Only show top-ups, not vouchers
        },
        order: [['priority', 'ASC'], ['productName', 'ASC']]
      });
      
      dataProducts = await VasProduct.findAll({
        where: {
          vasType: 'data',
          isActive: true,
          provider: isGlobalData ? 'Global' : beneficiaryNetwork,
          transactionType: 'topup' // Only show top-ups, not vouchers
        },
        order: [['priority', 'ASC'], ['productName', 'ASC']]
      });
      
      console.log(`✅ Found ${airtimeProducts.length} airtime products and ${dataProducts.length} data products for ${beneficiaryNetwork}`);
    } catch (modelError) {
      console.error('❌ Error loading VasProduct model:', modelError);
      // Fallback to mock data if model is not available
      airtimeProducts = [];
      dataProducts = [];
    }
    
    // Combine and format for overlay
    const providers = ['MTN', 'Vodacom', 'CellC', 'Telkom', 'eeziAirtime', 'Global'];
    const products = [];
    
    // Add airtime products from database with deduplication
    const airtimeAmounts = new Set(); // Track unique amounts
    airtimeProducts.forEach(product => {
      // Create products for each predefined amount
      const amounts = product.predefinedAmounts || [product.minAmount];
      amounts.forEach(amount => {
        // Cap airtime & data products to R1,000 maximum
        const maxAmountCents = 100000; // R1,000 in cents
        const cappedAmount = Math.min(amount, maxAmountCents);
        
        if (cappedAmount >= product.minAmount && cappedAmount <= product.maxAmount) {
          // Only add if this amount hasn't been added yet
          const amountKey = `${product.vasType}_${cappedAmount}`;
          if (!airtimeAmounts.has(amountKey)) {
            airtimeAmounts.add(amountKey);
            products.push({
              id: `${product.vasType}_${product.supplierId}_${product.supplierProductId}_${cappedAmount}`,
              name: `${product.provider} ${product.vasType === 'airtime' ? 'Airtime' : 'Data'} Top-up`,
              size: `R${(cappedAmount / 100).toFixed(2)}`,
              price: cappedAmount / 100, // Convert cents to rand
              provider: product.provider,
              type: product.vasType,
              validity: 'Immediate',
              isBestDeal: product.priority === 1,
              supplier: product.supplierId,
              description: product.metadata?.description || '',
              commission: product.commission,
              fixedFee: product.fixedFee
            });
          }
        }
      });
    });
    
    // Add data products from database with deduplication
    const dataAmounts = new Set(); // Track unique amounts
    dataProducts.forEach(product => {
      // Create products for each predefined amount
      const amounts = product.predefinedAmounts || [product.minAmount];
      amounts.forEach(amount => {
        // Cap airtime & data products to R1,000 maximum
        const maxAmountCents = 100000; // R1,000 in cents
        const cappedAmount = Math.min(amount, maxAmountCents);
        
        if (cappedAmount >= product.minAmount && cappedAmount <= product.maxAmount) {
          // Only add if this amount hasn't been added yet
          const amountKey = `${product.vasType}_${cappedAmount}`;
          if (!dataAmounts.has(amountKey)) {
            dataAmounts.add(amountKey);
            products.push({
              id: `${product.vasType}_${product.supplierId}_${product.supplierProductId}_${cappedAmount}`,
              name: `${product.provider} ${product.vasType === 'airtime' ? 'Airtime' : 'Data'} Top-up`,
              size: `${(cappedAmount / 100).toFixed(0)}MB`,
              price: cappedAmount / 100, // Convert cents to rand
              provider: product.provider,
              type: product.vasType,
              validity: '30 days',
              isBestDeal: product.priority === 1,
              supplier: product.supplierId,
              description: product.metadata?.description || '',
              commission: product.commission,
              fixedFee: product.fixedFee
            });
          }
        }
      });
    });

    // If no DB-backed entries for global selections, provide safe fallbacks
    if (products.length === 0 && (beneficiaryNetwork === 'global-airtime' || beneficiaryNetwork === 'global-data')) {
      const globalAmounts = [1000, 2000, 5000, 10000]; // cents: R10, R20, R50, R100
      globalAmounts.forEach((cents) => {
        products.push({
          id: `${beneficiaryNetwork.startsWith('global-airtime') ? 'airtime' : 'data'}_flash_GLOBAL_${cents}`,
          name: `Global ${beneficiaryNetwork === 'global-airtime' ? 'Airtime' : 'Data'} Top-up`,
          size: `R${(cents / 100).toFixed(2)}`,
          price: cents / 100,
          provider: 'Global',
          type: beneficiaryNetwork === 'global-airtime' ? 'airtime' : 'data',
          validity: 'Immediate',
          isBestDeal: cents === 5000,
          supplier: 'flash',
          description: 'Flash Global VAS',
          commission: 0,
          fixedFee: 0
        });
      });
    }

    // Sort products by highest commission, then by lowest price
    products.sort((a, b) => {
      const commissionDiff = (b.commission || 0) - (a.commission || 0);
      if (commissionDiff !== 0) {
        return commissionDiff;
      }
      return (a.price || 0) - (b.price || 0);
    });

    // Only show products for the specific beneficiary's network
    // International products are not shown for specific network beneficiaries

    res.json({
      success: true,
      data: {
        beneficiary: {
          id: beneficiary.id,
          label: beneficiary.name,
          identifier: beneficiary.identifier,
          network: beneficiary.metadata?.network
        },
        providers,
        products,
        bestDealSku: products.find(p => p.isBestDeal)?.id
      }
    });

  } catch (error) {
    console.error('❌ Airtime/Data Catalog Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load airtime/data catalog',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/v1/overlay/airtime-data/purchase
 * @desc    Purchase airtime/data for a beneficiary
 * @access  Private
 * @body    { beneficiaryId, productId, amount, idempotencyKey }
 * @security Banking-grade transaction processing with idempotency
 */
router.post('/airtime-data/purchase', auth, async (req, res) => {
  const context = {
    beneficiaryId: req.body?.beneficiaryId,
    productId: req.body?.productId,
    amount: req.body?.amount,
    idempotencyKey: req.body?.idempotencyKey
  };

  const beneficiaryId = context.beneficiaryId;
  const productId = context.productId;
  const amount = context.amount;
  const idempotencyKey = context.idempotencyKey;

  try {
    
    // Banking-grade input validation
    const requiredFields = { beneficiaryId, productId, amount, idempotencyKey };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Validate idempotency key format
    if (!/^[a-zA-Z0-9_-]{10,100}$/.test(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid idempotency key format'
      });
    }
    
    // Validate beneficiaryId format (should be numeric)
    if (!/^\d+$/.test(beneficiaryId.toString())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid beneficiary ID format'
      });
    }

    // Get beneficiary details
    const { Beneficiary, VasTransaction, Wallet, Transaction, User, sequelize } = require('../models');
    const beneficiary = await Beneficiary.findOne({
      where: { id: beneficiaryId, userId: req.user.id }
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiary not found'
      });
    }

    // Parse product details (new format includes index: type_supplier_productCode_amount_index)
    const parts = productId.split('_');
    const type = parts[0];
    const supplier = parts[1];
    const productCode = parts.slice(2, -1).join('_'); // Everything between supplier and amount
    const amountInCents = parts[parts.length - 1];
    
    // Find the VasProduct record to get vasProductId
    const { VasProduct } = require('../models');
    const vasProduct = await VasProduct.findOne({
      where: {
        supplierId: supplier,
        supplierProductId: productCode,
        vasType: type,
        isActive: true
      }
    });
    
    if (!vasProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in catalog'
      });
    }
    
    // Banking-grade amount validation
    const maxAmount = 1000;
    const minAmount = 0.01;
    
    // Validate amount type and range
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount format'
      });
    }
    
    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({
        success: false,
        error: `Amount must be between R${minAmount.toFixed(2)} and R${maxAmount.toLocaleString()}`
      });
    }
    
    // Validate amount precision (max 2 decimal places)
    if (amount !== Math.round(amount * 100) / 100) {
      return res.status(400).json({
        success: false,
        error: 'Amount cannot have more than 2 decimal places'
      });
    }

    const normalizedAmount = parseFloat(amount.toFixed(2));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount received'
      });
    }
    
    // Banking-grade transaction processing with idempotency
    // Check for existing transaction with same idempotency key
    const existingTransaction = await VasTransaction.findOne({
      where: { reference: idempotencyKey }
    });
    
    if (existingTransaction) {
      let existingLedger = null;
      if (existingTransaction.metadata?.walletTransactionId) {
        existingLedger = await Transaction.findOne({
          where: { transactionId: existingTransaction.metadata.walletTransactionId }
        });
      }
      
      // Return existing transaction (idempotency)
      return res.json({
        success: true,
        data: {
          transactionId: existingLedger?.transactionId || existingTransaction.id,
          walletTransactionId: existingLedger?.transactionId || existingTransaction.metadata?.walletTransactionId || null,
          status: existingLedger?.status || existingTransaction.status,
          reference: idempotencyKey,
          message: 'Transaction already processed',
          beneficiaryIsMyMoolahUser: Boolean(existingTransaction.metadata?.beneficiaryUserId)
        }
      });
    }
    
    // Banking-grade database transaction with rollback capability
    const transaction = await sequelize.transaction();
    let committedVasTransaction;
    let committedLedgerTransaction;
    let updatedWalletBalance = null;

    try {
      const wallet = await Wallet.findOne({
        where: { userId: req.user.id },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Wallet not found'
        });
      }

      const debitCheck = wallet.canDebit(normalizedAmount);
      if (!debitCheck.allowed) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: debitCheck.reason || 'Insufficient balance',
          errorCode: 'INSUFFICIENT_FUNDS'
        });
      }

      // Generate transactionId for VasTransaction
      const vasTransactionId = `VAS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Create a new transaction record with banking-grade validation
      const vasTransaction = await VasTransaction.create({
        transactionId: vasTransactionId,
        userId: req.user.id,
        walletId: wallet.walletId,
        beneficiaryId: beneficiary.id,
        vasProductId: vasProduct.id,
        vasType: type,
        transactionType: vasProduct.transactionType || 'topup',
        supplierId: supplier,
        supplierProductId: productCode,
        amount: Math.round(normalizedAmount * 100), // store in cents
        mobileNumber: beneficiary.identifier,
        status: 'completed',
        reference: idempotencyKey,
        metadata: {
          beneficiaryId,
          type,
          userId: req.user.id,
          simulated: true,
          originalAmount: amountInCents ? parseInt(amountInCents, 10) / 100 : normalizedAmount,
          processedAt: new Date().toISOString(),
          version: '1.0'
        }
      }, { transaction });
      
      // Update beneficiary lastPaidAt within the same transaction
      await beneficiary.update({
        lastPaidAt: new Date(),
        timesPaid: beneficiary.timesPaid + 1
      }, { transaction });
      
      // Debit purchaser wallet
      await wallet.debit(normalizedAmount, 'payment', { transaction });

      // Create wallet ledger transaction
      const ledgerTransaction = await Transaction.create({
        userId: req.user.id,
        walletId: wallet.walletId,
        amount: normalizedAmount,
        type: 'payment',
        status: 'completed',
        description: `${type === 'airtime' ? 'Airtime' : 'Data'} purchase for ${beneficiary.name}`,
        metadata: {
          beneficiaryId,
          beneficiaryPhone: beneficiary.identifier,
          supplierCode: supplier,
          supplierProductId: productCode,
          idempotencyKey,
          vasTransactionId: vasTransaction.id,
          vasType: type,
          amountCents: Math.round(normalizedAmount * 100),
          channel: 'overlay_services'
        },
        currency: wallet.currency
      }, { transaction });

      // Link wallet ledger transaction to vas transaction metadata
      await vasTransaction.update({
        metadata: {
          ...(vasTransaction.metadata || {}),
          walletTransactionId: ledgerTransaction.transactionId,
          walletId: wallet.walletId
        }
      }, { transaction });

      // Commit the transaction
      await transaction.commit();
      
      committedVasTransaction = vasTransaction;
      committedLedgerTransaction = ledgerTransaction;
      updatedWalletBalance = parseFloat(wallet.balance);
      
    } catch (dbError) {
      // Rollback transaction on database error
      await transaction.rollback();
      
      console.error(`❌ [DB_TXN_ERR] Database transaction failed:`, {
        error: dbError.message,
        userId: req.user?.id,
        beneficiaryId: context.beneficiaryId,
        idempotencyKey: context.idempotencyKey,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({
        success: false,
        error: 'Transaction processing failed',
        message: 'Please try again'
      });
    }
    
    const resultTransactionId = committedLedgerTransaction?.transactionId || committedVasTransaction?.id;
    const beneficiaryUser = await User.findOne({
      where: { phone: beneficiary.identifier }
    });

    if (beneficiaryUser && committedVasTransaction) {
      try {
        await committedVasTransaction.update({
          metadata: {
            ...(committedVasTransaction.metadata || {}),
            beneficiaryUserId: beneficiaryUser.id
          }
        });
      } catch (updateError) {
        console.warn('⚠️ Failed to persist beneficiaryUserId on vasTransaction:', updateError.message);
      }
    }

    // Prepare receipt data
    const receiptData = {
      transactionId: resultTransactionId || `TXN_${Date.now()}`,
      reference: idempotencyKey,
      amount: normalizedAmount,
      type: type,
      productId: productId,
      beneficiaryName: beneficiary.name,
      beneficiaryPhone: beneficiary.identifier,
      purchasedAt: new Date().toISOString(),
      status: 'completed'
    };

    // Send notification to beneficiary if they are a MyMoolah user
    if (beneficiaryUser) {
      try {
        const NotificationService = require('../services/notificationService');
        const notificationService = new NotificationService();
        
        await notificationService.sendToUser(beneficiaryUser.id, {
          type: 'airtime_data_received',
          title: `${type === 'airtime' ? 'Airtime' : 'Data'} Received`,
          body: `R${amount} ${type} has been added to your account`,
          data: {
            receipt: receiptData,
            action: 'view_receipt'
          },
          priority: 'high'
        });
        
        console.log(`✅ Notification sent to beneficiary user ${beneficiaryUser.id}`);
      } catch (notifError) {
        console.error('❌ Failed to send notification to beneficiary:', notifError.message);
      }
    }

    // Always send notification to purchaser
    try {
      const NotificationService = require('../services/notificationService');
      const notificationService = new NotificationService();
      
      await notificationService.sendToUser(req.user.id, {
        type: 'airtime_data_purchase',
        title: `${type === 'airtime' ? 'Airtime' : 'Data'} Purchase Successful`,
        body: `Your ${type} purchase for ${beneficiary.name} was successful`,
        data: {
          receipt: receiptData,
          action: 'view_receipt'
        },
        priority: 'high'
      });
      
      console.log(`✅ Notification sent to purchaser ${req.user.id}`);
    } catch (notifError) {
      console.error('❌ Failed to send notification to purchaser:', notifError.message);
    }

    res.json({
      success: true,
      data: {
        transactionId: resultTransactionId || `TXN_${Date.now()}`,
        walletTransactionId: resultTransactionId || null,
        status: 'completed',
        reference: idempotencyKey,
        beneficiaryIsMyMoolahUser: !!beneficiaryUser,
        walletBalance: updatedWalletBalance
      }
    });

  } catch (error) {
    // Banking-grade error handling and logging
    const errorId = `TXN_ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.error(`❌ [${errorId}] Airtime/Data Purchase Error:`, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      beneficiaryId: context.beneficiaryId,
      productId: context.productId,
      amount: context.amount,
      idempotencyKey: context.idempotencyKey,
      timestamp: new Date().toISOString()
    });
    
    // Don't expose internal error details to client
    res.status(500).json({
      success: false,
      error: 'Transaction processing failed',
      errorId, // For support reference
      message: 'Please try again or contact support if the issue persists'
    });
  }
});

// ========================================
// ELECTRICITY OVERLAY ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/overlay/electricity/catalog
 * @desc    Get electricity catalog for a beneficiary
 * @access  Private
 * @query   { beneficiaryId }
 */
router.get('/electricity/catalog', auth, async (req, res) => {
  try {
    const { beneficiaryId, meterNumber } = req.query;
    
    if (!beneficiaryId && !meterNumber) {
      return res.status(400).json({
        success: false,
        error: 'Either beneficiaryId or meterNumber is required'
      });
    }

    let meterType = 'Eskom'; // Default provider
    let beneficiary = null;

    // If beneficiaryId is provided, get beneficiary details
    if (beneficiaryId) {
      const { Beneficiary } = require('../models');
      beneficiary = await Beneficiary.findOne({
        where: { id: beneficiaryId, userId: req.user.id }
      });

      if (!beneficiary) {
        return res.status(404).json({
          success: false,
          error: 'Beneficiary not found'
        });
      }

      // Get the meter type (provider) from beneficiary metadata
      meterType = beneficiary.metadata?.meterType || 'Eskom';
      if (meterType && meterType.toLowerCase().includes('global')) {
        meterType = 'Global';
      }
    } else if (meterNumber) {
      // For direct meter number input, use default provider
      // In a live system, this would validate the meter number with the provider
      meterType = 'Eskom'; // Default to Eskom for now
    }

    // Get electricity products from database
    const { VasProduct } = require('../models');
    
    // Fetch electricity products for the specific provider
    const electricityProducts = await VasProduct.findAll({
      where: {
        vasType: 'electricity',
        supplierId: 'flash',
        provider: meterType === 'Global' ? 'Global' : meterType,
        isActive: true
      },
      order: [['priority', 'ASC'], ['minAmount', 'ASC']]
    });
    
    // Extract predefined amounts from products
    const suggestedAmounts = [];
    let globalMinAmount = 20; // Default minimum for electricity
    
    electricityProducts.forEach(product => {
      // Update global minimum amount based on products
      if (product.minAmount) {
        const productMinRand = product.minAmount / 100;
        globalMinAmount = Math.max(globalMinAmount, productMinRand);
      }
      
      if (product.predefinedAmounts) {
        product.predefinedAmounts.forEach(amount => {
          const amountInRand = amount / 100; // Convert cents to rand
          if (amountInRand <= 2000 && amountInRand >= globalMinAmount && !suggestedAmounts.includes(amountInRand)) {
            suggestedAmounts.push(amountInRand);
          }
        });
      }
    });
    
    // Sort amounts and cap at R2,000
    suggestedAmounts.sort((a, b) => a - b);
    const cappedAmounts = suggestedAmounts.filter(amount => amount >= globalMinAmount && amount <= 2000);
    
    // Validate meter number (simplified for demo)
    const isValid = beneficiary.identifier.length >= 10;
    
    res.json({
      success: true,
      data: {
        beneficiary: {
          id: beneficiary.id,
          label: beneficiary.name,
          identifier: beneficiary.identifier,
          meterType: meterType
        },
        meterValid: isValid,
        providers: ['Flash'], // Only Flash for now
        minAmount: globalMinAmount, // Minimum allowed amount for electricity
        suggestedAmounts: cappedAmounts.length > 0 ? cappedAmounts : [globalMinAmount, 50, 100, 200, 500, 1000, 2000].filter(amount => amount >= globalMinAmount),
        maxAmount: 2000, // Maximum allowed amount for electricity
        products: electricityProducts.map(product => ({
          id: product.supplierProductId,
          name: product.productName,
          minAmount: product.minAmount / 100,
          maxAmount: product.maxAmount / 100,
          commission: product.commission,
          description: product.metadata?.description || ''
        }))
      }
    });

  } catch (error) {
    console.error('❌ Electricity Catalog Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load electricity catalog',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/v1/overlay/electricity/purchase
 * @desc    Purchase electricity for a beneficiary - single call handles validation and purchase
 * @access  Private
 * @body    { beneficiaryId, amount, idempotencyKey, acceptTerms }
 */
router.post('/electricity/purchase', auth, async (req, res) => {
  try {
    const { beneficiaryId, amount, idempotencyKey, acceptTerms } = req.body;
    
    if (!beneficiaryId || !amount || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'beneficiaryId, amount, and idempotencyKey are required'
      });
    }

    if (!acceptTerms) {
      return res.status(400).json({
        success: false,
        error: 'Terms and conditions must be accepted'
      });
    }

    // Get electricity beneficiary details (includes meter number)
    const { Beneficiary } = require('../models');
    const beneficiary = await Beneficiary.findOne({
      where: { 
        id: beneficiaryId, 
        userId: req.user.id,
        accountType: 'electricity' // Ensure it's an electricity beneficiary
      }
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'Electricity beneficiary not found'
      });
    }

    const meterNumber = beneficiary.identifier;

    // Simulate electricity purchase using database
    const { VasTransaction } = require('../models');
    
    // Validate amount (R20 minimum, R2,000 maximum for electricity)
    const minAmount = 20;
    const maxAmount = 2000;
    
    if (amount < minAmount) {
      return res.status(400).json({
        success: false,
        error: `Amount cannot be less than R${minAmount}`,
        errorCode: 'AMOUNT_TOO_LOW'
      });
    }
    
    if (amount > maxAmount) {
      return res.status(400).json({
        success: false,
        error: `Amount cannot exceed R${maxAmount.toLocaleString()}`,
        errorCode: 'AMOUNT_TOO_HIGH'
      });
    }

    // Simulate meter validation and purchase in one call
    // In a live system, this would call the supplier API with meter number and amount
    // and get back either success with token or error with reason
    
    // Simulate meter validation (basic format check)
    const isValidMeterFormat = meterNumber.length >= 10 && /^[0-9]+$/.test(meterNumber);
    if (!isValidMeterFormat) {
      return res.status(400).json({
        success: false,
        error: 'Invalid meter number format',
        errorCode: 'INVALID_METER_FORMAT',
        details: 'Meter number must be at least 10 digits'
      });
    }

    // Simulate supplier API call - in real implementation this would be:
    // const supplierResponse = await flashService.purchaseElectricity(meterNumber, amount);
    
    // For demo purposes, simulate some meter numbers as invalid
    const invalidMeterNumbers = ['1234567890', '0000000000', '9999999999'];
    if (invalidMeterNumbers.includes(meterNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Meter number not found',
        errorCode: 'METER_NOT_FOUND',
        details: 'This meter number is not registered with the electricity provider'
      });
    }

    // If we get here, meter is valid - proceed with purchase
    // Create electricity transaction
    const transaction = await VasTransaction.create({
      userId: req.user.id,
      beneficiaryId: beneficiary.id,
      vasType: 'electricity',
      supplierId: 'flash',
      supplierProductId: 'FLASH_ELECTRICITY_PREPAID',
      amount: amount * 100, // Convert to cents
      mobileNumber: beneficiary.identifier, // Using identifier as meter number
      status: 'completed',
      reference: idempotencyKey,
      metadata: {
        beneficiaryId,
        type: 'electricity',
        userId: req.user.id,
        simulated: true,
        meterNumber: beneficiary.identifier,
        meterType: beneficiary.metadata?.meterType || 'Prepaid'
      }
    });
    
    // Simulate successful result
    const purchaseResult = {
      success: true,
      data: {
        transactionId: transaction.id,
        status: 'completed',
        reference: idempotencyKey,
        token: `${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}`
      }
    };

    // Update beneficiary lastPaidAt
    await beneficiary.update({
      lastPaidAt: new Date(),
      timesPaid: beneficiary.timesPaid + 1
    });

    // Check if beneficiary is a MyMoolah user
    const { User } = require('../models');
    const beneficiaryUser = await User.findOne({
      where: { phone: beneficiary.identifier }
    });

    // Prepare token and receipt data
    const electricityToken = purchaseResult.data?.token || `${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}`;
    const receiptData = {
      transactionId: purchaseResult.data?.transactionId || `TXN_${Date.now()}`,
      reference: idempotencyKey,
      amount: amount,
      type: 'electricity',
      beneficiaryName: beneficiary.name,
      beneficiaryMeter: beneficiary.identifier,
      meterType: beneficiary.metadata?.meterType || 'Prepaid',
      electricityToken: electricityToken,
      purchasedAt: new Date().toISOString(),
      status: purchaseResult.data?.status || 'completed'
    };

    // Send notification to beneficiary if they are a MyMoolah user
    if (beneficiaryUser) {
      try {
        const NotificationService = require('../services/notificationService');
        const notificationService = new NotificationService();
        
        await notificationService.sendToUser(beneficiaryUser.id, {
          type: 'electricity_token_received',
          title: 'Electricity Token Received',
          body: `R${amount} electricity token has been purchased for your meter`,
          data: {
            receipt: receiptData,
            token: electricityToken,
            action: 'view_token'
          },
          priority: 'high'
        });
        
        console.log(`✅ Electricity token notification sent to beneficiary user ${beneficiaryUser.id}`);
      } catch (notifError) {
        console.error('❌ Failed to send electricity notification to beneficiary:', notifError.message);
      }
    }

    // Always send notification to purchaser
    try {
      const NotificationService = require('../services/notificationService');
      const notificationService = new NotificationService();
      
      await notificationService.sendToUser(req.user.id, {
        type: 'electricity_purchase',
        title: 'Electricity Purchase Successful',
        body: `Your electricity purchase for ${beneficiary.name} was successful`,
        data: {
          receipt: receiptData,
          token: electricityToken,
          action: 'view_token'
        },
        priority: 'high'
      });
      
      console.log(`✅ Electricity notification sent to purchaser ${req.user.id}`);
    } catch (notifError) {
      console.error('❌ Failed to send electricity notification to purchaser:', notifError.message);
    }

    res.json({
      success: true,
      data: {
        transactionId: purchaseResult.data?.transactionId || `TXN_${Date.now()}`,
        token: electricityToken,
        receiptUrl: purchaseResult.data?.receiptUrl,
        reference: idempotencyKey,
        beneficiaryIsMyMoolahUser: !!beneficiaryUser
      }
    });

  } catch (error) {
    console.error('❌ Electricity Purchase Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process electricity purchase',
      message: error.message
    });
  }
});

// ========================================
// BILL PAYMENTS OVERLAY ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/overlay/bills/search
 * @desc    Search for billers
 * @access  Private
 * @query   { q, category }
 */
router.get('/bills/search', auth, async (req, res) => {
  try {
    const { q, category } = req.query;
    
    // Mock biller data (in production, this would come from Flash/MobileMart APIs)
    const billers = [
      { id: 'discovery', name: 'Discovery Health', category: 'insurance' },
      { id: 'dstv', name: 'DStv', category: 'entertainment' },
      { id: 'unisa', name: 'University of South Africa', category: 'education' },
      { id: 'city-power', name: 'City Power', category: 'municipal' },
      { id: 'vodacom-contract', name: 'Vodacom Contract', category: 'telecoms' },
      { id: 'edgars', name: 'Edgars Account', category: 'retail' }
    ];

    let results = billers;
    
    if (q) {
      results = billers.filter(biller =>
        biller.name.toLowerCase().includes(q.toLowerCase()) ||
        biller.category.toLowerCase().includes(q.toLowerCase())
      );
    }
    
    if (category) {
      results = results.filter(biller => biller.category === category);
    }

    res.json({
      success: true,
      data: {
        billers: results
      }
    });

  } catch (error) {
    console.error('❌ Bill Search Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search billers',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/overlay/bills/categories
 * @desc    Get bill payment categories
 * @access  Private
 */
router.get('/bills/categories', auth, async (req, res) => {
  try {
    const categories = [
      { id: 'insurance', name: 'Insurance' },
      { id: 'entertainment', name: 'Entertainment' },
      { id: 'education', name: 'Education' },
      { id: 'municipal', name: 'Municipal' },
      { id: 'telecoms', name: 'Telecoms' },
      { id: 'retail', name: 'Retail Credit' }
    ];

    res.json({
      success: true,
      data: {
        categories
      }
    });

  } catch (error) {
    console.error('❌ Bill Categories Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load bill categories',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/v1/overlay/bills/pay
 * @desc    Pay a bill
 * @access  Private
 * @body    { beneficiaryId, amount, idempotencyKey }
 */
router.post('/bills/pay', auth, async (req, res) => {
  try {
    const { beneficiaryId, amount, idempotencyKey } = req.body;
    
    if (!beneficiaryId || !amount || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'beneficiaryId, amount, and idempotencyKey are required'
      });
    }

    // Get beneficiary details
    const { Beneficiary } = require('../models');
    const beneficiary = await Beneficiary.findOne({
      where: { id: beneficiaryId, userId: req.user.id }
    });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiary not found'
      });
    }

    // Simulate bill payment using database
    const { VasTransaction } = require('../models');
    
    // Create a simulated bill payment transaction
    const transaction = await VasTransaction.create({
      userId: req.user.id,
      beneficiaryId: beneficiary.id,
      vasType: 'bill_payment',
      supplierId: 'flash',
      supplierProductId: 'FLASH_BILL_PAYMENT',
      amount: amount * 100, // Convert to cents
      mobileNumber: beneficiary.identifier, // Using identifier as account number
      status: 'completed',
      reference: idempotencyKey,
      metadata: {
        beneficiaryId,
        type: 'bill_payment',
        userId: req.user.id,
        simulated: true,
        billerName: beneficiary.metadata?.billerName || 'Unknown Biller',
        accountNumber: beneficiary.identifier
      }
    });
    
    const transactionId = transaction.id;
    
    // Update beneficiary lastPaidAt
    await beneficiary.update({
      lastPaidAt: new Date(),
      timesPaid: beneficiary.timesPaid + 1
    });

    // Check if beneficiary is a MyMoolah user
    const { User } = require('../models');
    const beneficiaryUser = await User.findOne({
      where: { phone: beneficiary.identifier }
    });

    // Prepare receipt data
    const receiptData = {
      transactionId: transactionId,
      reference: idempotencyKey,
      amount: amount,
      type: 'bill_payment',
      beneficiaryName: beneficiary.name,
      beneficiaryAccount: beneficiary.identifier,
      billerName: beneficiary.metadata?.billerName || 'Unknown Biller',
      purchasedAt: new Date().toISOString(),
      status: 'completed'
    };

    // Send notification to beneficiary if they are a MyMoolah user
    if (beneficiaryUser) {
      try {
        const NotificationService = require('../services/notificationService');
        const notificationService = new NotificationService();
        
        await notificationService.sendToUser(beneficiaryUser.id, {
          type: 'bill_payment_received',
          title: 'Bill Payment Received',
          body: `R${amount} bill payment has been made on your behalf`,
          data: {
            receipt: receiptData,
            action: 'view_receipt'
          },
          priority: 'high'
        });
        
        console.log(`✅ Bill payment notification sent to beneficiary user ${beneficiaryUser.id}`);
      } catch (notifError) {
        console.error('❌ Failed to send bill payment notification to beneficiary:', notifError.message);
      }
    }

    // Always send notification to purchaser
    try {
      const NotificationService = require('../services/notificationService');
      const notificationService = new NotificationService();
      
      await notificationService.sendToUser(req.user.id, {
        type: 'bill_payment_success',
        title: 'Bill Payment Successful',
        body: `Your bill payment for ${beneficiary.name} was successful`,
        data: {
          receipt: receiptData,
          action: 'view_receipt'
        },
        priority: 'high'
      });
      
      console.log(`✅ Bill payment notification sent to purchaser ${req.user.id}`);
    } catch (notifError) {
      console.error('❌ Failed to send bill payment notification to purchaser:', notifError.message);
    }

    res.json({
      success: true,
      data: {
        transactionId,
        status: 'completed',
        reference: idempotencyKey,
        beneficiaryIsMyMoolahUser: !!beneficiaryUser
      }
    });

  } catch (error) {
    console.error('❌ Bill Payment Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process bill payment',
      message: error.message
    });
  }
});

module.exports = router;
