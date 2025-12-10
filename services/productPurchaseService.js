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
        if (!product.isValidDenomination(denomination)) {
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
        transaction
      );

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
        const debitAmountRand = Number((pricing.totalAmount / 100).toFixed(2));

        await wallet.debit(debitAmountRand, 'payment', { transaction });

        const transactionId = `VOUCHER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const walletTransaction = await Transaction.create({
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

        // Post VAT (output) on commission and ledger entries
        await this.allocateCommissionVatAndLedger({
          commissionCents: pricing.commissionCents,
          walletTransactionId: walletTransaction.transactionId,
          idempotencyKey,
          purchaserUserId: userId,
          serviceType: this.mapProductTypeToServiceType(product.type),
          supplierCode: product.supplier.code,
          transaction
        });
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
          errorData: supplierResult.error
        }, { transaction });
      }

      await transaction.commit();

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
    await commissionVatService.postCommissionVatAndLedger({
      commissionCents,
      supplierCode,
      serviceType,
      walletTransactionId,
      sourceTransactionId: walletTransactionId,
      idempotencyKey,
      purchaserUserId,
    transaction
    });
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

    // Calculate commission
    const commissionRate = await supplierPricingService.getCommissionRatePct(
      supplierCode,
      serviceType,
      product.id
    );
    const commissionCents = supplierPricingService.computeCommission(denomination, commissionRate);
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
  async processWithSupplier(product, denomination, recipient, supplierTransaction, transaction) {
    const supplierCode = product.supplier.code;
    
    try {
      // Route to appropriate supplier service
      switch (supplierCode) {
        case 'FLASH':
          return await this.processWithFlash(product, denomination, recipient, supplierTransaction, transaction);
        
        // Add other suppliers here
        default:
          throw new Error(`Unsupported supplier: ${supplierCode}`);
      }
    } catch (error) {
      console.error(`Supplier processing error for ${supplierCode}:`, error);
      
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
   * @param {Object} product - Product object
   * @param {number} denomination - Denomination in cents
   * @param {Object} recipient - Recipient information
   * @param {Object} supplierTransaction - Supplier transaction record
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Flash result
   */
  async processWithFlash(product, denomination, recipient, supplierTransaction, transaction) {
    // This would integrate with the existing Flash controller
    // For now, simulate a successful response
    const flashReference = `FLASH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Always generate a voucher code so UI can display it even in sandbox
    const voucherCode = `VOUCHER_${flashReference}`;
    
    // Simulate processing delay
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
