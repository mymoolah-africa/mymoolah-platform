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

const crypto = require('crypto');
const usdcTransactionService = require('../services/usdcTransactionService');
const { Wallet } = require('../models');
const { isValidSolanaAddress, detectKnownPattern } = require('../utils/solanaAddressValidator');

const ADDRESS_MAX_LENGTH = 64;
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

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
      console.error('[UsdcController] Failed to get rate', {
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
      console.error('[UsdcController] Failed to get quote', {
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

      if (error.code === 'VALR_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          error: {
            code: 'QUOTE_SERVICE_UNAVAILABLE',
            message: 'Quote service is temporarily unavailable. Please try again later.'
          }
        });
      }
      const isValrAuthError = error.response?.status === 401 ||
        /401|API key or secret is invalid|VALR.*request failed/i.test(error.message || '');
      if (isValrAuthError) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'QUOTE_SERVICE_UNAVAILABLE',
            message: 'Quote service is temporarily unavailable. Please try again later.'
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

      // Resolve user's wallet (User model does not have walletId; wallet is looked up by userId)
      const wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WALLET_NOT_FOUND',
            message: 'Wallet not found for this account'
          }
        });
      }
      const walletId = wallet.walletId;

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

      // Banking-grade idempotency: client-supplied key or cryptographically secure server-generated
      const effectiveIdempotencyKey = (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.length <= IDEMPOTENCY_KEY_MAX_LENGTH)
        ? idempotencyKey.trim().slice(0, IDEMPOTENCY_KEY_MAX_LENGTH)
        : crypto.randomUUID();

      const result = await usdcTransactionService.executeBuyAndSend(userId, walletId, {
        zarAmount,
        beneficiaryId,
        purpose,
        idempotencyKey: effectiveIdempotencyKey
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
      console.error('[UsdcController] Failed to execute send', {
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

      if (error.code === 'CIRCUIT_BREAKER_OPEN' || error.code === 'VALR_NOT_CONFIGURED' || error.code === 'INSUFFICIENT_VALR_FLOAT' || error.code === 'INSUFFICIENT_VALR_BALANCE') {
        const message = error.code === 'INSUFFICIENT_VALR_FLOAT'
          ? 'USDC service is temporarily unavailable. Please try again later.'
          : error.code === 'INSUFFICIENT_VALR_BALANCE'
            ? 'USDC is temporarily unavailable due to liquidity limits. Please try again later or a smaller amount.'
            : 'USDC service is temporarily unavailable. Please try again in a few minutes.';
        return res.status(503).json({
          success: false,
          error: {
            code: error.code === 'VALR_NOT_CONFIGURED' ? 'SERVICE_UNAVAILABLE' : error.code,
            message
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
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
      const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
      const status = req.query.status;

      const transactions = await usdcTransactionService.getTransactionHistory(userId, {
        limit,
        offset,
        status
      });

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit,
          offset,
          total: transactions.length
        }
      });
    } catch (error) {
      console.error('[UsdcController] Failed to get transactions', {
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
      const transaction = await usdcTransactionService.getTransactionById(userId, transactionId);

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
          ...transaction,
          explorerUrl: transaction.blockchainTxHash
            ? `https://solscan.io/tx/${transaction.blockchainTxHash}`
            : null
        }
      });
    } catch (error) {
      console.error('[UsdcController] Failed to get transaction', {
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
      const rawAddress = req.body?.address;
      if (rawAddress == null || typeof rawAddress !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ADDRESS',
            message: 'Wallet address is required'
          }
        });
      }
      const address = rawAddress.trim().slice(0, ADDRESS_MAX_LENGTH);

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
      console.error('[UsdcController] Failed to validate address', {
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
      console.error('[UsdcController] Health check failed', {
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
