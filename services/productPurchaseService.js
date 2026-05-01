'use strict';

const {
  Order,
  Product,
  SupplierTransaction,
  User,
  Wallet,
  Transaction,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const supplierPricingService = require('./supplierPricingService');
const commissionVatService = require('./commissionVatService');
const circuitBreaker = require('./supplierCircuitBreaker');
const crypto = require('crypto');

const VOUCHER_CODE_KEY = process.env.VOUCHER_CODE_KEY || process.env.VOUCHER_PIN_KEY || null;

class ProductPurchaseService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Purchase a product with full validation and idempotency
   * @param {Object} purchaseData - Purchase request data
   * @param {number} purchaseData.productId - Product ID
   * @param {number} purchaseData.denomination - Denomination in cents
   * @param {Object} purchaseData.recipient - Recipient information
   * @param {string} purchaseData.idempotencyKey - Idempotency key
   * @param {number} userId - User ID
   * @param {number} clientId - API client ID (optional)
   * @returns {Promise<Object>} Purchase result
   */
  async purchaseProduct(purchaseData, userId, clientId = null) {
    const transaction = await sequelize.transaction();
    
    try {
      const { productId, denomination, recipient, idempotencyKey } = purchaseData;

      // Validate idempotency key
      if (!idempotencyKey) {
        throw new Error('Idempotency key is required');
      }

      // Check for existing order with same idempotency key
      const existingOrder = await Order.findOne({
        where: { idempotencyKey },
        transaction
      });

      if (existingOrder) {
        await transaction.rollback();
        return {
          success: true,
          order: existingOrder,
          message: 'Order already processed',
          isDuplicate: true
        };
      }

      // Validate product
      const product = await Product.findOne({
        where: {
          id: productId,
          status: 'active'
        },
        include: [
          {
            model: require('../models').ProductBrand,
            as: 'brand',
            where: { isActive: true },
            required: true
          },
          {
            model: require('../models').Supplier,
            as: 'supplier',
            where: { isActive: true },
            required: true
          },
          {
            model: require('../models').ProductVariant,
            as: 'variants',
            where: { status: 'active' },
            required: false
          }
        ],
        transaction
      });

      if (!product) {
        throw new Error('Product not found or inactive');
      }

      // Validate denomination
      const hasDefinedDenoms = product.denominations && Array.isArray(product.denominations) && product.denominations.length > 0;
      if (hasDefinedDenoms) {
        let isValid = product.isValidDenomination(denomination);
        // International PIN (Flash): catalog may have rands (21) or cents (2100); frontend sends cents.
        if (!isValid && product.type === 'international_pin' && product.supplier?.code === 'FLASH') {
          const check = (d) => {
            const n = Number(d);
            if (n >= 100) return [n]; // already cents
            return [n, Math.round(n * 100)]; // rands: accept both
          };
          const allValid = product.denominations.flatMap(check);
          isValid = allValid.includes(denomination);
        }
        if (!isValid) {
          throw new Error('Invalid denomination for this product');
        }
      } else {
        // If no denominations are defined, allow the request to proceed (catalog gap)
        console.warn(`Product ${product.id} has no denominations defined; allowing denomination ${denomination}`);
      }

      // Validate user
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('User not found');
      }

      // Check user limits and constraints
      await this.validateUserLimits(user, product, denomination, transaction);

      // Calculate pricing and commission
      const pricing = await this.calculatePricing(product, denomination, userId, clientId);

      // Locate and lock wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        throw new Error('Wallet not found for this user');
      }

      const debitAmountRand = Number((pricing.totalAmount / 100).toFixed(2));
      const canDebit = wallet.canDebit(debitAmountRand);
      if (!canDebit.allowed) {
        throw new Error(canDebit.reason || 'Insufficient balance');
      }

      // Create order
      const order = await Order.create({
        userId,
        clientId,
        productId,
        denomination,
        amount: pricing.totalAmount,
        status: 'pending',
        idempotencyKey,
        recipient: recipient || null,
        commissionDetails: pricing.commissionDetails,
        metadata: {
          productType: product.type,
          supplierCode: product.supplier.code,
          pricingBreakdown: pricing
        }
      }, { transaction });

      // Create supplier transaction
      const supplierTransaction = await SupplierTransaction.create({
        orderId: order.id,
        supplierId: product.supplier.id,
        amount: denomination,
        status: 'pending',
        fees: pricing.supplierFees
      }, { transaction });

      // Process with supplier
      const supplierResult = await this.processWithSupplier(
        product, 
        denomination, 
        recipient, 
        supplierTransaction,
        transaction,
        user
      );

      // Declare walletTransaction outside if/else so it's accessible in setImmediate callback
      let walletTransaction = null;

      // Update order status based on supplier result
      if (supplierResult.success) {
        const rawVoucherCode = supplierResult.data?.voucherCode;
        const maskedVoucher = this.maskVoucherCode(rawVoucherCode);
        const voucherEnvelope = this.createVoucherEnvelope(
          rawVoucherCode,
          order.orderId
        );

        const safeSupplierData = {
          ...(supplierResult.data || {}),
          maskedVoucherCode: maskedVoucher,
          voucherEnvelope
        };
        delete safeSupplierData.voucherCode;

        await order.update({
          status: 'completed',
          metadata: {
            ...order.metadata,
            supplierResponse: safeSupplierData
          }
        }, { transaction });

        await supplierTransaction.update({
          status: 'success',
          supplierReference: supplierResult.data.reference,
          responseData: safeSupplierData
        }, { transaction });

        // Debit wallet and create transaction history
        const transactionId = `VOUCHER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        await wallet.debit(debitAmountRand, 'payment', { transaction });

        try {
          const { releaseRestrictedFunds } = require('./restrictedFundsService');
          await releaseRestrictedFunds(wallet, debitAmountRand, transactionId, { transaction });
        } catch (releaseErr) {
          console.error('[restrictedFunds] Release failed:', releaseErr.message);
        }

        walletTransaction = await Transaction.create({
          transactionId,
          userId,
          walletId: wallet.walletId,
          amount: debitAmountRand,
          type: 'payment',
          status: 'completed',
          description: `Voucher purchase - ${product.name}`,
          currency: wallet.currency,
          metadata: {
            orderId: order.orderId,
            supplierCode: product.supplier.code,
            productId: product.id,
            productName: product.name,
            productType: product.type,
            commissionCents: pricing.commissionCents,
            voucher: {
              maskedCode: maskedVoucher,
              transactionRef: supplierResult.data?.reference || order.orderId,
              expiresAt: voucherEnvelope?.expiresAt || null
            },
            idempotencyKey
          }
        }, { transaction });

        // Attach wallet transaction to order metadata for traceability
        await order.update({
          metadata: {
            ...order.metadata,
            walletTransactionId: walletTransaction.transactionId
          }
        }, { transaction });

        // Note: Commission allocation moved to setImmediate callback (after transaction commit)
        // This matches the airtime/data pattern and ensures metadata is available for referral calculation
      } else {
        await order.update({
          status: 'failed',
          metadata: {
            ...order.metadata,
            error: supplierResult.error
          }
        }, { transaction });

        await supplierTransaction.update({
          status: 'failed',
          errorData: typeof supplierResult.error === 'object' ? supplierResult.error : { message: String(supplierResult.error || 'Unknown error') }
        }, { transaction });
      }

      await transaction.commit();

      // Phase 2: Commission allocation and referral system integration (non-blocking)
      // Moved to setImmediate to match airtime/data pattern - ensures metadata is available for referral calculation
      if (supplierResult.success && walletTransaction) {
        console.log(`🔍 Voucher purchase successful - starting commission allocation: userId=${userId}, commissionCents=${pricing.commissionCents}, txnId=${walletTransaction.transactionId}`);
        setImmediate(async () => {
          try {
            // STEP 1: Allocate commission and VAT FIRST (matching airtime/data pattern)
            const commissionResult = await this.allocateCommissionVatAndLedger({
              commissionCents: pricing.commissionCents,
              walletTransactionId: walletTransaction.transactionId,
              idempotencyKey,
              purchaserUserId: userId,
              serviceType: this.mapProductTypeToServiceType(product.type),
              supplierCode: product.supplier.code,
              transaction: null // No transaction needed here (already committed)
            });

            // STEP 1B: Post face-value journal (DR client float, CR supplier float)
            try {
              const ledgerService = require('./ledgerService');
              const { SupplierFloat } = require('../models');
              const { Op } = require('sequelize');
              const LEDGER_ACCOUNT_CLIENT_FLOAT = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
              const supplierCode = (product.supplier.code || '').toUpperCase();
              const supplierFloat = await SupplierFloat.findOne({
                where: { supplierId: { [Op.iLike]: supplierCode } }
              });
              if (supplierFloat?.ledgerAccountCode) {
                const faceAmountRand = Number((pricing.totalAmount / 100).toFixed(2));
                await ledgerService.postJournalEntry({
                  reference: `VAS-FACE-${walletTransaction.transactionId}`,
                  description: `Voucher face value R${faceAmountRand} (${supplierCode})`,
                  lines: [
                    { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: faceAmountRand, memo: `Client float debit (voucher)` },
                    { accountCode: supplierFloat.ledgerAccountCode, dc: 'credit', amount: faceAmountRand, memo: `Supplier float consumed (voucher)` }
                  ]
                });
                await supplierFloat.updateBalance(faceAmountRand, 'debit');
              }
            } catch (fvErr) {
              console.error('[productPurchaseService] Face-value journal failed (non-blocking):', fvErr.message);
            }

            // STEP 2: Update wallet transaction metadata with commission info
            if (commissionResult) {
              const existingMetadata = walletTransaction.metadata || {};
              await walletTransaction.update({
                metadata: {
                  ...existingMetadata,
                  commission: {
                    supplierCode: product.supplier.code,
                    serviceType: this.mapProductTypeToServiceType(product.type),
                    ratePct: pricing.commissionRate,
                    amountCents: commissionResult.commissionCents,
                    vatCents: commissionResult.vatCents ?? undefined,
                    netAmountCents: commissionResult.netCommissionCents ?? undefined,
                    vatRate: commissionResult.vatRate ?? 0.15,
                  },
                },
              });
            }

            // STEP 3: Reload wallet transaction to get updated commission metadata
            await walletTransaction.reload();
            
            // STEP 4: Calculate referral earnings (matching airtime/data pattern)
            const referralService = require('./referralService');
            const referralEarningsService = require('./referralEarningsService');
            
            // Check if first transaction and activate referral
            const isFirst = await referralService.isFirstTransaction(userId);
            if (isFirst) {
              await referralService.activateReferral(userId);
              console.log(`✅ First transaction - referral activated for user ${userId}`);
            }
            
            // Calculate referral earnings (only on successful purchases with commission)
            // Get net commission from metadata (after VAT) - matching airtime/data pattern
            const netCommissionCents = walletTransaction.metadata?.commission?.netAmountCents;
            
            console.log(`🔍 Voucher referral check: netCommissionCents=${netCommissionCents}, userId=${userId}, txnId=${walletTransaction.id}`);
            
            if (netCommissionCents && netCommissionCents > 0) {
              const earnings = await referralEarningsService.calculateEarnings({
                userId,
                id: walletTransaction.id, // Use integer ID, not string transactionId
                netRevenueCents: netCommissionCents, // MM's net commission (after VAT) - matching airtime/data
                type: 'vas_purchase'
              });
              
              if (earnings.length > 0) {
                const totalEarned = earnings.reduce((sum, e) => sum + e.earnedAmountCents, 0);
                console.log(`💰 Created ${earnings.length} referral earnings from voucher purchase (total: R${totalEarned/100})`);
              } else {
                console.log(`ℹ️ No referral earnings created (no referral chain or below minimum)`);
              }
            } else {
              console.log(`⚠️ No commission found in metadata for referral earnings calculation`);
            }
          } catch (error) {
            console.error('⚠️ Commission allocation or referral earnings failed (non-blocking):', error.message);
            console.error(error.stack);
            // Don't fail transaction if commission/referral calculation fails
          }
        });
      }

      return {
        success: supplierResult.success,
        order: {
          id: order.orderId,
          status: order.status,
          amount: order.amount,
          denomination: order.denomination,
          createdAt: order.createdAt
        },
        product: {
          id: product.id,
          name: product.name,
          type: product.type,
          brand: product.brand.name
        },
        supplier: {
          name: product.supplier.name,
          code: product.supplier.code
        },
        recipient: order.recipient,
        voucherCode: supplierResult.success ? supplierResult.data?.voucherCode || null : null,
        transactionRef: supplierResult.success
          ? supplierResult.data?.reference || order.orderId
          : null,
        message: supplierResult.success ? 'Purchase successful' : supplierResult.error
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Purchase error:', error);
      throw error;
    }
  }

  /**
   * Create a masked view of the voucher code (last 4 visible)
   */
  maskVoucherCode(code) {
    if (!code) return null;
    const cleaned = String(code).trim();
    if (cleaned.length <= 4) {
      return cleaned;
    }
    const last4 = cleaned.slice(-4);
    return `•••• ${last4}`;
  }

  /**
   * Envelope voucher code with AES-256-GCM for short-term support re-send.
   * Falls back to masking only if key is not configured.
   */
  createVoucherEnvelope(code, reference) {
    if (!code) return null;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL

    const keySource = VOUCHER_CODE_KEY || process.env.VOUCHER_CODE_KEY || process.env.VOUCHER_PIN_KEY || null;

    if (!keySource || keySource.length < 32) {
      return {
        maskedCode: this.maskVoucherCode(code),
        expiresAt
      };
    }

    try {
      const key = Buffer.from(keySource.slice(0, 32));
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const ciphertext = Buffer.concat([cipher.update(String(code), 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        algorithm: 'aes-256-gcm',
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
        reference,
        expiresAt
      };
    } catch (err) {
      console.error('⚠️ Failed to encrypt voucher code, storing masked only:', err.message);
      return {
        maskedCode: this.maskVoucherCode(code),
        expiresAt
      };
    }
  }

  /**
   * Allocate VAT on commission and post ledger entry if accounts are configured.
   * Returns commission breakdown including netCommissionCents (after VAT).
   */
  async allocateCommissionVatAndLedger({
    commissionCents,
    walletTransactionId,
    idempotencyKey,
    purchaserUserId,
    serviceType,
    supplierCode,
    transaction = null
  }) {
    const result = await commissionVatService.postCommissionVatAndLedger({
      commissionCents,
      supplierCode,
      serviceType,
      walletTransactionId,
      sourceTransactionId: walletTransactionId,
      idempotencyKey,
      purchaserUserId,
      transaction
    });
    
    return result; // Return { commissionCents, vatCents, netCommissionCents, vatRate }
  }

  /**
   * Validate user limits and product constraints
   * @param {Object} user - User object
   * @param {Object} product - Product object
   * @param {number} denomination - Denomination in cents
   * @param {Object} transaction - Database transaction
   */
  async validateUserLimits(user, product, denomination, transaction) {
    const constraints = product.getConstraints();
    
    // Check minimum amount
    if (constraints.minAmount && denomination < constraints.minAmount) {
      throw new Error(`Minimum amount is R${constraints.minAmount / 100}`);
    }

    // Check maximum amount
    if (constraints.maxAmount && denomination > constraints.maxAmount) {
      throw new Error(`Maximum amount is R${constraints.maxAmount / 100}`);
    }

    // Check daily limit
    if (constraints.dailyLimit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyTotal = await Order.sum('amount', {
        where: {
          userId: user.id,
          productId: product.id,
          status: 'completed',
          createdAt: {
            [Op.gte]: today
          }
        },
        transaction
      });

      if (dailyTotal + denomination > constraints.dailyLimit) {
        throw new Error(`Daily limit exceeded for this product`);
      }
    }

    // Check monthly limit
    if (constraints.monthlyLimit) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlyTotal = await Order.sum('amount', {
        where: {
          userId: user.id,
          productId: product.id,
          status: 'completed',
          createdAt: {
            [Op.gte]: thisMonth
          }
        },
        transaction
      });

      if (monthlyTotal + denomination > constraints.monthlyLimit) {
        throw new Error(`Monthly limit exceeded for this product`);
      }
    }
  }

  /**
   * Calculate pricing and commission for the purchase
   * @param {Object} product - Product object
   * @param {number} denomination - Denomination in cents
   * @param {number} userId - User ID
   * @param {number} clientId - API client ID
   * @returns {Promise<Object>} Pricing breakdown
   */
  async calculatePricing(product, denomination, userId, clientId) {
    const supplierId = product.supplier.id;
    const serviceType = this.mapProductTypeToServiceType(product.type);

    // Get supplier fees
    const supplierCode = product.supplier.code;
    const fees = await supplierPricingService.getFees(supplierCode, serviceType);

    // Calculate commission (supports both percentage and fixed-amount)
    const commissionInfo = await supplierPricingService.getCommissionInfo(
      supplierCode,
      serviceType,
      product.id
    );
    const commissionRate = commissionInfo.ratePct;
    const commissionCents = supplierPricingService.computeCommissionFromInfo(denomination, commissionInfo);
    const netRevenueCents = denomination - commissionCents;

    // Calculate total amount (denomination + any additional fees)
    const totalAmount = denomination + (fees.total || 0);

    // Volume placeholder (not yet tracked for vouchers)
    const currentMonthVolume = null;

    return {
      denomination,
      supplierFees: fees,
      commissionRate,
      commissionCents,
      netRevenueCents,
      totalAmount,
      commissionDetails: {
        rate: commissionRate,
        amount: commissionCents,
        netRevenue: netRevenueCents,
        volume: currentMonthVolume
      }
    };
  }

  /**
   * Process purchase with supplier
   * @param {Object} product - Product object
   * @param {number} denomination - Denomination in cents
   * @param {Object} recipient - Recipient information
   * @param {Object} supplierTransaction - Supplier transaction record
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Supplier result
   */
  async processWithSupplier(product, denomination, recipient, supplierTransaction, transaction, user = null) {
    const supplierCode = product.supplier.code;

    // Circuit breaker pre-check
    if (circuitBreaker.isOpen(supplierCode)) {
      console.warn(`[ProductPurchaseService] ${supplierCode} circuit is OPEN — skipping`);
      return {
        success: false,
        error: `Supplier ${supplierCode} is temporarily unavailable`,
        circuitBreakerOpen: true
      };
    }

    circuitBreaker.registerProbe(supplierCode);

    try {
      let result;
      switch (supplierCode) {
        case 'FLASH':
          result = await this.processWithFlash(product, denomination, recipient, supplierTransaction, transaction);
          break;
        case 'MOBILEMART':
          result = await this.processWithMobileMart(product, denomination, recipient, supplierTransaction, transaction);
          break;
        case 'OTT':
          result = await this.processWithOtt(product, denomination, recipient, supplierTransaction, transaction, user);
          break;
        default:
          throw new Error(`Unsupported supplier: ${supplierCode}`);
      }

      if (result && result.success !== false) {
        circuitBreaker.recordSuccess(supplierCode);
      }
      return result;
    } catch (error) {
      console.error(`Supplier processing error for ${supplierCode}:`, error);

      if (circuitBreaker.constructor.isTransientError(error)) {
        circuitBreaker.recordFailure(supplierCode);
      }
      
      // Update retry count and schedule retry if applicable
      if (supplierTransaction.retryCount < this.maxRetries) {
        await supplierTransaction.update({
          retryCount: supplierTransaction.retryCount + 1,
          nextRetryAt: new Date(Date.now() + this.retryDelay * Math.pow(2, supplierTransaction.retryCount))
        }, { transaction });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process purchase with Flash supplier
   * For international_pin and voucher products: calls Flash gift-voucher/purchase.
   * Uses same PIN extraction logic as eeziAirtime (flashController) for UAT/Prod compatibility.
   * @param {Object} product - Product object (must have supplierProductId for Flash productCode)
   * @param {number} denomination - Denomination in cents
   * @param {Object} recipient - Recipient information
   * @param {Object} supplierTransaction - Supplier transaction record
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Flash result
   */
  async processWithFlash(product, denomination, recipient, supplierTransaction, transaction) {
    const useFlashAPI = process.env.FLASH_LIVE_INTEGRATION === 'true';

    if (useFlashAPI && product.supplierProductId) {
      try {
        const FlashAuthService = require('./flashAuthService');
        const flashAuth = new FlashAuthService();
        const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
        if (!accountNumber) {
          throw new Error('FLASH_ACCOUNT_NUMBER not configured');
        }
        const storeId = process.env.FLASH_STORE_ID || accountNumber.replace(/-/g, '').slice(0, 12) || 'MYMOOLAHDIGITAL';
        const terminalId = process.env.FLASH_TERMINAL_ID || accountNumber.replace(/-/g, '').slice(0, 12) || 'MYMOOLAHPOS01';
        const productCode = parseInt(String(product.supplierProductId).trim(), 10);
        if (!productCode || productCode <= 0) {
          throw new Error(`Invalid Flash product code for ${product.name}: ${product.supplierProductId}`);
        }
        const reference = `VOUCH_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        const requestData = {
          reference,
          accountNumber,
          amount: denomination,
          productCode,
          storeId,
          terminalId
        };
        console.log('📤 Flash gift-voucher (International PIN):', { reference, productCode, denomination });

        const response = await flashAuth.makeAuthenticatedRequest(
          'POST',
          '/gift-voucher/purchase',
          requestData
        );

        // Extract PIN using same logic as eeziAirtime (UAT/Prod may use different response structures)
        const extractPin = (obj, keys = ['pin', 'pinNumber', 'voucherPin', 'token', 'code', 'serialNumber', 'pinCode', 'voucherCode', 'value', 'PIN']) => {
          if (!obj || typeof obj !== 'object') return null;
          for (const k of Object.keys(obj)) {
            const lower = k.toLowerCase();
            if (keys.some(key => key.toLowerCase() === lower)) {
              const v = obj[k];
              if (v != null && typeof v === 'string' && v.trim().length > 0) return v.trim();
              if (v != null && typeof v === 'number' && !Number.isNaN(v)) return String(v);
            }
          }
          return null;
        };

        const voucher = response?.voucher;
        const tx = response?.transaction || response?.data || response?.result || response;
        const vd = (typeof tx === 'object' && tx?.voucherDetails) || response?.voucherDetails;

        const voucherCode =
          extractPin(voucher) ||
          extractPin(tx) ||
          extractPin(response) ||
          extractPin(vd) ||
          (voucher && typeof voucher === 'object' && (voucher.pin || voucher.pinNumber || voucher.voucherPin || voucher.token || voucher.code || voucher.serialNumber)) ||
          (typeof tx === 'object' && (tx?.pinNumber || tx?.pin || tx?.voucherPin || tx?.token || tx?.code || tx?.serialNumber)) ||
          response?.pinNumber || response?.pin || response?.voucherPin || response?.token || response?.code ||
          (vd && (vd.pin || vd.pinNumber || vd.code)) ||
          null;

        if (!voucherCode) {
          const safeKeys = (o) => (o && typeof o === 'object' ? Object.keys(o).join(', ') : 'null');
          console.warn('⚠️ No PIN extracted from Flash gift-voucher response. Keys:', safeKeys(response), 'nested:', safeKeys(tx));
        }

        const ref = response?.transactionId || response?.reference || reference;
        console.log('✅ Flash gift-voucher result:', voucherCode ? 'PIN received' : 'No PIN', 'ref:', ref);

        return {
          success: true,
          data: {
            reference: ref,
            status: 'success',
            voucherCode: voucherCode || `PENDING_${ref}`,
            message: 'Voucher purchased successfully'
          }
        };
      } catch (apiError) {
        console.error('❌ Flash gift-voucher API Error:', apiError.message);
        console.error('❌ Flash Error Details:', {
          error: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status
        });
        throw new Error(`Flash voucher purchase failed: ${apiError.message}`);
      }
    }

    // UAT/simulation: generate placeholder for UI testing
    const flashReference = `FLASH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const voucherCode = `VOUCHER_${flashReference}`;
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      data: {
        reference: flashReference,
        status: 'success',
        voucherCode,
        message: 'Voucher purchased successfully'
      }
    };
  }

  /**
   * Process voucher purchase with MobileMart
   * Uses merchantProductId from catalog (product.supplierProductId or matching variant) when available.
   * Falls back to API fetch + name match for legacy/placeholder products.
   */
  async processWithMobileMart(product, denomination, recipient, supplierTransaction, transaction) {
    const useMobileMartAPI = process.env.MOBILEMART_LIVE_INTEGRATION === 'true';

    if (useMobileMartAPI) {
      // PRODUCTION/STAGING: Use real MobileMart API
      try {
        const MobileMartAuthService = require('./mobilemartAuthService');
        const mobileMartService = new MobileMartAuthService();

        // Resolve merchantProductId from catalog first (matches overlay services pattern)
        let merchantProductId = null;

        // 1. Try matching variant by denomination (variant may have specific supplierProductId)
        if (product.variants && product.variants.length > 0) {
          const matchingVariant = product.variants.find((v) =>
            v.denominations && Array.isArray(v.denominations) && v.denominations.includes(denomination)
          );
          if (matchingVariant?.supplierProductId) {
            const sid = String(matchingVariant.supplierProductId).trim();
            if (sid && !/^MOBILEMART_/i.test(sid)) {
              merchantProductId = sid;
            }
          }
        }

        // 2. Fall back to product-level supplierProductId
        if (!merchantProductId && product.supplierProductId) {
          const sid = String(product.supplierProductId).trim();
          if (sid && !/^MOBILEMART_/i.test(sid)) {
            merchantProductId = sid;
          }
        }

        // 3. Fallback: fetch from API and match by name (legacy/placeholder products)
        if (!merchantProductId) {
          console.log('📞 MobileMart: No catalog merchantProductId, fetching voucher products...');
          const productsResponse = await mobileMartService.makeAuthenticatedRequest(
            'GET',
            '/voucher/products'
          );
          const products = productsResponse.products || productsResponse || [];
          const voucherProduct = products.find((p) =>
            p.productName?.toLowerCase().includes(product.name?.toLowerCase()) ||
            p.contentCreator?.toLowerCase().includes(product.name?.toLowerCase())
          ) || products[0];

          if (!voucherProduct || !voucherProduct.merchantProductId) {
            throw new Error('No voucher products available from MobileMart');
          }
          merchantProductId = String(voucherProduct.merchantProductId).trim();
          console.log(`✅ Resolved from API: ${voucherProduct.productName} (${merchantProductId})`);
        } else {
          console.log(`✅ Using catalog merchantProductId: ${merchantProductId}`);
        }

        // Purchase voucher from MobileMart
        const purchasePayload = {
          requestId: `VOUCH_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          merchantProductId,
          tenderType: 'CreditCard',
          amount: denomination / 100 // Convert cents to Rands
        };

        console.log('📞 MobileMart Voucher Purchase:', JSON.stringify(purchasePayload, null, 2));
        const purchaseResponse = await mobileMartService.makeAuthenticatedRequest(
          'POST',
          '/voucher/purchase',
          purchasePayload
        );
        console.log('✅ MobileMart Voucher Response:', JSON.stringify(purchaseResponse, null, 2));

        // Extract voucher code/PIN from MobileMart response
        const mobileMartTransactionId = purchaseResponse.transactionId;
        let voucherCode = 'VOUCHER_PENDING';
        
        if (purchaseResponse.additionalDetails) {
          voucherCode = purchaseResponse.additionalDetails.pin ||
                       purchaseResponse.additionalDetails.serialNumber ||
                       purchaseResponse.additionalDetails.referenceNumber ||
                       mobileMartTransactionId;
        }

        console.log(`✅ Extracted voucher code: ${voucherCode}`);

        return {
          success: true,
          data: {
            reference: mobileMartTransactionId,
            status: 'success',
            voucherCode,
            message: 'Voucher purchased successfully',
            mobilemartResponse: purchaseResponse,
            mobilemartFulfilled: true
          }
        };

      } catch (apiError) {
        console.error('❌ MobileMart Voucher API Error:', apiError.message);
        console.error('❌ MobileMart Error Details:', {
          error: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status
        });
        
        throw new Error(`MobileMart voucher purchase failed: ${apiError.message}`);
      }
    } else {
      // UAT/SIMULATION: Use fake voucher code for UI testing
      const mobilemartReference = `MOBILEMART_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const voucherCode = `VOUCHER_${mobilemartReference}`;
      
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        data: {
          reference: mobilemartReference,
          status: 'success',
          voucherCode,
          message: 'Voucher purchased successfully (simulated)',
          mobilemartFulfilled: false
        }
      };
    }
  }

  /**
   * Process OTT voucher, gift-card, and electricity products through the OTT
   * PerformPayout API while preserving the generic wallet-backed order flow.
   */
  async processWithOtt(product, denomination, recipient = {}, supplierTransaction, transaction, user = null) {
    const { OttClient, redact } = require('./ott/ottClient');

    const providerCode = this.resolveOttProviderCode(product);
    if (!providerCode) {
      throw new Error(`OTT provider code missing for product ${product.name}`);
    }

    const uniqueReference = `MM-OTT-VAS-${supplierTransaction.id}-${Date.now()}`.slice(0, 64);
    const amountRand = Number((Number(denomination) / 100).toFixed(2));
    const recipientPayload = this.buildOttVasRecipient({ user, recipient });
    const requestPayload = {
      yourUniqueReference: uniqueReference,
      amount: amountRand.toFixed(2),
      provider: {
        providerCode: String(providerCode),
        providerName: this.resolveOttProviderName(product),
      },
      recipient: recipientPayload,
      optionalData: {
        mmtpOrderId: supplierTransaction.orderId,
        mmtpSupplierTransactionId: supplierTransaction.id,
        productId: product.id,
        productName: product.name,
      },
    };

    const client = new OttClient();
    let response;
    try {
      response = await client.performPayout(requestPayload);
    } catch (error) {
      const { isUnknownProviderOutcome } = require('./ott/ottPayoutService');
      if (!isUnknownProviderOutcome(error)) {
        throw error;
      }
      response = await client.getPaymentStatus({
        requestdate: new Date().toISOString(),
        yourUniqueReference: uniqueReference,
      });
    }
    const data = response.data || {};
    if (!this.isOttVasSuccess(data)) {
      throw new Error(data.message || data.errorMessage || 'OTT product purchase was not successful');
    }
    const voucherData = data.voucherdata || data.voucherData || data.voucher || {};
    const voucherCode = this.extractOttVoucherCode(data);
    const reference = String(
      data.paymentReference ||
      data.providerTransactionReference ||
      data.transactionId ||
      voucherData.saleID ||
      uniqueReference
    );

    return {
      success: true,
      data: {
        reference,
        status: 'success',
        voucherCode,
        message: 'OTT product purchased successfully',
        ottFulfilled: true,
        ottProviderCode: String(providerCode),
        ottUniqueReference: uniqueReference,
        ottPaymentReference: data.paymentReference || null,
        ottVoucher: {
          maskedVoucherId: this.maskVoucherCode(voucherData.voucherID || voucherData.voucherId || null),
          maskedSaleId: this.maskVoucherCode(voucherData.saleID || voucherData.saleId || null),
          maskedSerialNumber: this.maskVoucherCode(voucherData.serialNumber || null),
          amount: voucherData.amount || amountRand,
          instructions: voucherData.instructions || null,
          supplier: voucherData.supplier || null,
        },
        ottResponse: redact(data),
      },
    };
  }

  resolveOttProviderCode(product) {
    const fromMetadata = product.metadata?.providerCode || product.metadata?.ottProviderCode;
    const supplierProductId = String(product.supplierProductId || '').trim();
    if (fromMetadata) return String(fromMetadata);
    if (supplierProductId.toUpperCase().startsWith('OTT-')) {
      return supplierProductId.slice(4);
    }
    return supplierProductId || null;
  }

  resolveOttProviderName(product) {
    return String(product.metadata?.providerName || product.name || 'OTT Product').slice(0, 80);
  }

  buildOttVasRecipient({ user, recipient = {} }) {
    const fullName = String(recipient.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()).trim();
    const [firstNameFallback, ...surnameParts] = fullName.split(/\s+/);
    const firstName = user?.firstName || recipient.firstName || recipient.firstname || firstNameFallback || 'Customer';
    const surname = user?.lastName || recipient.surname || recipient.lastName || surnameParts.join(' ') || 'Customer';
    const rawIdType = String(user?.idType || recipient.idType || recipient.id_type || '').toLowerCase();
    const idType = rawIdType.includes('passport') ? 'PASSPT' : 'RSAID';

    return {
      account_name: fullName || `${firstName} ${surname}`.trim(),
      account_number: '',
      bank_id: '0',
      branch_name: '',
      branch_code: '',
      country_of_issue: 'ZA',
      date_of_birth: '',
      email: recipient.email || user?.email || '',
      firstname: String(firstName || '').slice(0, 80),
      id_number: user?.idNumber || recipient.idNumber || recipient.id_number || '',
      id_type: idType,
      middle_name: '',
      mobile: recipient.phone || recipient.mobile || user?.phoneNumber || '',
      nationality: 'ZA',
      surname: String(surname || '').slice(0, 80),
      swift_code: '',
      title: '',
    };
  }

  extractOttVoucherCode(data = {}) {
    const voucherData = data.voucherdata || data.voucherData || data.voucher || {};
    return String(
      voucherData.pin ||
      voucherData.voucherPin ||
      voucherData.code ||
      voucherData.serialNumber ||
      data.pin ||
      data.voucherPin ||
      data.code ||
      data.token ||
      data.serialNumber ||
      data.paymentReference ||
      'VOUCHER_PENDING'
    );
  }

  isOttVasSuccess(data = {}) {
    const status = String(data.status || data.Status || '').toLowerCase();
    return ['100', 'success', 'successful', 'completed', 'accepted'].includes(status);
  }

  /**
   * Map product type to service type for pricing
   * @param {string} productType - Product type
   * @returns {string} Service type
   */
  mapProductTypeToServiceType(productType) {
    const mapping = {
      // Align vouchers to the same serviceType used by commission tiers
      'voucher': 'voucher',
      'airtime': 'airtime',
      'data': 'data',
      'electricity': 'electricity',
      'bill_payment': 'bill_payment',
      'cash_out': 'cash_out'
    };
    
    return mapping[productType] || productType;
  }

  /**
   * Get order by ID
   * @param {string} orderId - Public order ID
   * @param {number} userId - User ID for authorization
   * @returns {Promise<Object>} Order details
   */
  async getOrderById(orderId, userId) {
    const order = await Order.findOne({
      where: {
        orderId,
        userId
      },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: require('../models').ProductBrand,
              as: 'brand'
            },
            {
              model: require('../models').Supplier,
              as: 'supplier'
            }
          ]
        },
        {
          model: require('../models').SupplierTransaction,
          as: 'supplierTransactions'
        }
      ]
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return {
      id: order.orderId,
      status: order.status,
      amount: order.amount,
      denomination: order.denomination,
      recipient: order.recipient,
      product: {
        id: order.product.id,
        name: order.product.name,
        type: order.product.type,
        brand: order.product.brand.name
      },
      supplier: {
        name: order.product.supplier.name,
        code: order.product.supplier.code
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      supplierTransactions: order.supplierTransactions.map(tx => ({
        id: tx.id,
        status: tx.status,
        supplierReference: tx.supplierReference,
        amount: tx.amount,
        retryCount: tx.retryCount
      }))
    };
  }

  /**
   * Get user's order history
   * @param {number} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Order history with pagination
   */
  async getUserOrders(userId, params = {}) {
    const { page = 1, limit = 20, status = null, type = null } = params;
    const offset = (page - 1) * limit;

    const where = { userId };
    if (status) where.status = status;

    const include = [
      {
        model: Product,
        as: 'product',
        where: type ? { type } : {},
        include: [
          {
            model: require('../models').ProductBrand,
            as: 'brand'
          },
          {
            model: require('../models').Supplier,
            as: 'supplier'
          }
        ]
      }
    ];

    const { count, rows } = await Order.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const orders = rows.map(order => ({
      id: order.orderId,
      status: order.status,
      amount: order.amount,
      denomination: order.denomination,
      product: {
        id: order.product.id,
        name: order.product.name,
        type: order.product.type,
        brand: order.product.brand.name
      },
      supplier: {
        name: order.product.supplier.name,
        code: order.product.supplier.code
      },
      createdAt: order.createdAt
    }));

    return {
      orders,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
      }
    };
  }
}

module.exports = ProductPurchaseService;
