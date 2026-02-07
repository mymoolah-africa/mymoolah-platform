/**
 * USDC Controller
 * 
 * Handles API endpoints for USDC purchase and transfer feature
 * 
 * Endpoints:
 * - GET    /api/v1/usdc/rate               Get current USDC/ZAR rate
 * - POST   /api/v1/usdc/quote              Get quote for purchase
 * - POST   /api/v1/usdc/send               Execute buy + send
 * - GET    /api/v1/usdc/transactions       List user's transactions
 * - GET    /api/v1/usdc/transactions/:id   Get transaction details
 * - POST   /api/v1/usdc/validate-address   Validate Solana address
 * - GET    /api/v1/usdc/health             Service health check
 */

const usdcTransactionService = require('../services/usdcTransactionService');
const { isValidSolanaAddress, detectKnownPattern } = require('../utils/solanaAddressValidator');
const logger = require('../utils/logger');

class UsdcController {
  /**
   * Get current USDC/ZAR exchange rate
   * 
   * GET /api/v1/usdc/rate
   */
  async getRate(req, res) {
    try {
      const rate = await usdcTransactionService.getCurrentRate();
      
      res.json({
        success: true,
        data: {
          pair: 'USDCZAR',
          bidPrice: rate.bidPrice,
          askPrice: rate.askPrice,
          midPrice: rate.midPrice,
          lastTrade: rate.lastTrade,
          timestamp: rate.timestamp,
          cacheTtl: 60
        }
      });
    } catch (error) {
      logger.error('[UsdcController] Failed to get rate', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'RATE_FETCH_ERROR',
          message: 'Failed to get current exchange rate. Please try again.'
        }
      });
    }
  }

  /**
   * Get quote for USDC purchase
   * 
   * POST /api/v1/usdc/quote
   * Body: { zarAmount: 100 }
   */
  async getQuote(req, res) {
    try {
      const { zarAmount } = req.body;
      const userId = req.user.id;

      // Validate amount
      if (!zarAmount || zarAmount < 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Minimum amount is R10'
          }
        });
      }

      const quote = await usdcTransactionService.getQuote(userId, zarAmount);
      
      res.json({
        success: true,
        data: {
          zarAmount: quote.zarAmount,
          usdcAmount: quote.usdcAmount,
          exchangeRate: quote.valrRate,
          platformFee: quote.platformFeeZar,
          platformFeeVat: quote.platformFeeVatCents / 100,
          networkFee: quote.networkFeeZar,
          total: quote.zarAmount,
          expiresAt: quote.expiresAt,
          valrOrderId: quote.valrOrderId
        }
      });
    } catch (error) {
      logger.error('[UsdcController] Failed to get quote', {
        error: error.message,
        userId: req.user?.id,
        zarAmount: req.body.zarAmount
      });

      if (error.code === 'INSUFFICIENT_KYC_TIER') {
        return res.status(403).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            requiredTier: error.requiredTier,
            currentTier: error.currentTier
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'QUOTE_ERROR',
          message: 'Failed to get quote. Please try again.'
        }
      });
    }
  }

  /**
   * Execute USDC buy and send transaction
   * 
   * POST /api/v1/usdc/send
   * Body: { zarAmount, beneficiaryId, purpose, idempotencyKey }
   */
  async executeSend(req, res) {
    try {
      const { zarAmount, beneficiaryId, purpose, idempotencyKey } = req.body;
      const userId = req.user.id;
      const walletId = req.user.walletId;

      // Validate required fields
      if (!zarAmount || !beneficiaryId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'zarAmount and beneficiaryId are required'
          }
        });
      }

      // Execute transaction
      const result = await usdcTransactionService.executeBuyAndSend(userId, walletId, {
        zarAmount,
        beneficiaryId,
        purpose,
        idempotencyKey: idempotencyKey || `USDC-${Date.now()}-${req.user.id}`
      });

      // Handle compliance hold
      if (result.status === 'compliance_hold') {
        return res.status(202).json({
          success: true,
          status: 'compliance_hold',
          message: 'Transaction is under compliance review. This typically takes 2-24 hours.',
          data: {
            transactionId: result.transaction.transactionId,
            complianceFlags: result.complianceResult.flags,
            severity: result.complianceResult.severity,
            estimatedReviewTime: '2-24 hours'
          }
        });
      }

      // Success response
      res.status(200).json({
        success: true,
        message: 'USDC sent successfully',
        data: {
          transactionId: result.transaction.transactionId,
          zarAmount: Math.abs(result.transaction.amount) / 100,
          usdcAmount: result.transaction.metadata.usdcAmount,
          beneficiaryName: result.transaction.metadata.beneficiaryName,
          beneficiaryWalletAddress: result.transaction.metadata.beneficiaryWalletAddress,
          blockchainTxHash: result.transaction.metadata.blockchainTxHash,
          blockchainStatus: result.transaction.metadata.blockchainStatus,
          valrWithdrawalId: result.withdrawal.id,
          explorerUrl: result.transaction.metadata.blockchainTxHash 
            ? `https://solscan.io/tx/${result.transaction.metadata.blockchainTxHash}`
            : null
        }
      });
    } catch (error) {
      logger.error('[UsdcController] Failed to execute send', {
        error: error.message,
        code: error.code,
        userId: req.user?.id,
        zarAmount: req.body.zarAmount,
        beneficiaryId: req.body.beneficiaryId
      });

      // Handle specific error codes
      if (error.code === 'INSUFFICIENT_KYC_TIER') {
        return res.status(403).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            requiredTier: error.requiredTier,
            currentTier: error.currentTier
          }
        });
      }

      if (error.code === 'LIMIT_EXCEEDED') {
        return res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            limitDetails: error.limitDetails
          }
        });
      }

      if (error.code === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            required: error.required / 100,
            available: error.available / 100
          }
        });
      }

      if (error.code === 'BENEFICIARY_COOLDOWN') {
        return res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            cooldownUntil: error.cooldownUntil
          }
        });
      }

      if (error.code === 'CIRCUIT_BREAKER_OPEN') {
        return res.status(503).json({
          success: false,
          error: {
            code: error.code,
            message: 'USDC service is temporarily unavailable. Please try again in a few minutes.'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to execute USDC send. Please try again or contact support.'
        }
      });
    }
  }

  /**
   * Get USDC transaction history
   * 
   * GET /api/v1/usdc/transactions?limit=50&offset=0&status=completed
   */
  async getTransactions(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0, status } = req.query;

      const transactions = await usdcTransactionService.getTransactionHistory(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status
      });

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: transactions.length
        }
      });
    } catch (error) {
      logger.error('[UsdcController] Failed to get transactions', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to get transaction history'
        }
      });
    }
  }

  /**
   * Get transaction details by ID
   * 
   * GET /api/v1/usdc/transactions/:transactionId
   */
  async getTransaction(req, res) {
    try {
      const userId = req.user.id;
      const { transactionId } = req.params;

      const transaction = await Transaction.findOne({
        where: {
          transactionId,
          userId,
          'metadata.transactionType': 'usdc_send'
        }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: transaction.id,
          transactionId: transaction.transactionId,
          zarAmount: Math.abs(transaction.amount) / 100,
          usdcAmount: parseFloat(transaction.metadata.usdcAmount),
          exchangeRate: parseFloat(transaction.metadata.exchangeRate),
          platformFee: transaction.metadata.platformFee / 100,
          platformFeeVat: transaction.metadata.platformFeeVat / 100,
          networkFee: transaction.metadata.networkFee / 100,
          beneficiaryName: transaction.metadata.beneficiaryName,
          beneficiaryWalletAddress: transaction.metadata.beneficiaryWalletAddress,
          beneficiaryCountry: transaction.metadata.beneficiaryCountry,
          beneficiaryRelationship: transaction.metadata.beneficiaryRelationship,
          purpose: transaction.metadata.beneficiaryPurpose,
          valrOrderId: transaction.metadata.valrOrderId,
          valrWithdrawalId: transaction.metadata.valrWithdrawalId,
          blockchainTxHash: transaction.metadata.blockchainTxHash,
          blockchainStatus: transaction.metadata.blockchainStatus,
          blockchainConfirmations: transaction.metadata.blockchainConfirmations,
          explorerUrl: transaction.metadata.blockchainTxHash
            ? `https://solscan.io/tx/${transaction.metadata.blockchainTxHash}`
            : null,
          status: transaction.status,
          complianceHold: transaction.metadata.complianceHold,
          createdAt: transaction.createdAt
        }
      });
    } catch (error) {
      logger.error('[UsdcController] Failed to get transaction', {
        error: error.message,
        userId: req.user?.id,
        transactionId: req.params.transactionId
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to get transaction details'
        }
      });
    }
  }

  /**
   * Validate Solana wallet address
   * 
   * POST /api/v1/usdc/validate-address
   * Body: { address: "8xKt...4Fd2" }
   */
  async validateAddress(req, res) {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ADDRESS',
            message: 'Wallet address is required'
          }
        });
      }

      const validation = isValidSolanaAddress(address);
      const knownPattern = validation.valid ? detectKnownPattern(address) : null;

      res.json({
        success: true,
        data: {
          address,
          valid: validation.valid,
          isOnCurve: validation.isOnCurve,
          reason: validation.reason,
          warning: validation.warning,
          knownPattern: knownPattern
        }
      });
    } catch (error) {
      logger.error('[UsdcController] Failed to validate address', {
        error: error.message,
        address: req.body.address
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate address'
        }
      });
    }
  }

  /**
   * Health check for USDC service
   * 
   * GET /api/v1/usdc/health
   */
  async healthCheck(req, res) {
    try {
      const health = await usdcTransactionService.healthCheck();
      
      const statusCode = health.overall ? 200 : 503;
      
      res.status(statusCode).json({
        success: health.overall,
        data: {
          status: health.overall ? 'healthy' : 'degraded',
          checks: {
            valrConfigured: health.valrConfigured,
            valrHealthy: health.valrHealthy,
            circuitBreaker: {
              open: health.circuitBreakerStatus.open,
              failureCount: health.circuitBreakerStatus.failureCount
            }
          },
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('[UsdcController] Health check failed', {
        error: error.message
      });
      
      res.status(503).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed'
        }
      });
    }
  }
}

module.exports = new UsdcController();
