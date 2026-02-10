'use strict';

/**
 * NFC Deposit Controller
 * Tap-to-deposit via Halo Dot. MSISDN in reference for Standard Bank T-PPP.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

const nfcDepositService = require('../services/nfcDepositService');

class NfcDepositController {
  async createIntent(req, res) {
    try {
      const userId = req.user.id;
      const { amount, currencyCode = 'ZAR' } = req.body;

      const result = await nfcDepositService.createDepositIntent(userId, amount, currencyCode);

      res.json({
        success: true,
        data: {
          consumerTransactionId: result.consumerTransactionId,
          jwt: result.jwt,
          paymentReference: result.paymentReference,
          amount: result.amount,
          currencyCode: result.currencyCode,
          expiresAt: result.expiresAt,
        },
      });
    } catch (err) {
      console.error('[NfcDeposit] createIntent error:', err.message, { userId: req.user?.id });

      if (err.code === 'NFC_DISABLED') {
        return res.status(503).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      if (err.code === 'HALO_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      if (err.code === 'MSISDN_NOT_FOUND' || err.code === 'INVALID_MSISDN') {
        return res.status(400).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      if (err.code === 'INVALID_AMOUNT') {
        return res.status(400).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      if (err.code === 'HALO_API_ERROR') {
        return res.status(502).json({
          success: false,
          error: {
            code: 'HALO_API_ERROR',
            message: err.message || 'Halo Dot API error',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to create deposit intent',
        },
      });
    }
  }

  async confirmDeposit(req, res) {
    try {
      const userId = req.user.id;
      const { paymentReference, result } = req.body;

      const data = await nfcDepositService.confirmDeposit(userId, paymentReference, result);

      res.json({
        success: true,
        data: {
          amount: data.amount,
          transactionId: data.transactionId,
          walletId: data.walletId,
          alreadyProcessed: data.alreadyProcessed || false,
        },
      });
    } catch (err) {
      console.error('[NfcDeposit] confirmDeposit error:', err.message, { userId: req.user?.id });

      if (err.code === 'NFC_DISABLED') {
        return res.status(503).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      if (err.code === 'INTENT_NOT_FOUND' || err.code === 'INTENT_EXPIRED') {
        return res.status(404).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
      if (err.code === 'PAYMENT_FAILED') {
        return res.status(400).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to confirm deposit',
        },
      });
    }
  }

  async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

      const data = await nfcDepositService.getDepositHistory(userId, { limit, offset });

      res.json({
        success: true,
        data: {
          total: data.total,
          items: data.items,
        },
      });
    } catch (err) {
      console.error('[NfcDeposit] getHistory error:', err.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch deposit history',
        },
      });
    }
  }

  async healthCheck(req, res) {
    const enabled = nfcDepositService.isEnabled();
    const haloConfigured = require('../services/haloDotClient').isConfigured();

    res.json({
      success: true,
      data: {
        nfcDepositEnabled: enabled,
        haloConfigured,
        status: enabled && haloConfigured ? 'ready' : 'degraded',
      },
    });
  }
}

module.exports = new NfcDepositController();
