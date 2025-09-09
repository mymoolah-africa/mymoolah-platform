const { DtMercuryTransaction, DtMercuryBank, User } = require('../models');
const { Op } = require('sequelize');

/**
 * dtMercury Controller
 * Handles PayShap payment operations (RPP & RTP)
 */
class DtMercuryController {
  /**
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      const bankCount = await DtMercuryBank.count({ where: { isActive: true } });
      const transactionCount = await DtMercuryTransaction.count();
      
      res.json({
        success: true,
        data: {
          service: 'dtMercury PayShap',
          status: 'operational',
          timestamp: new Date().toISOString(),
          stats: {
            activeBanks: bankCount,
            totalTransactions: transactionCount
          },
          features: {
            rpp: 'Rapid Payments Programme (PayShap - outbound)',
            rtp: 'Request to Pay (inbound)',
            kycTier1: 'Identification confirmed',
            kycTier2: 'Proof of address required'
          }
        }
      });
    } catch (error) {
      console.error('dtMercury health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }

  /**
   * Get list of supported banks
   */
  async getBanks(req, res) {
    try {
      const { paymentType, active } = req.query;
      
      let whereClause = {};
      
      // Filter by payment type if specified
      if (paymentType) {
        if (paymentType === 'rpp') {
          whereClause.supportsRPP = true;
        } else if (paymentType === 'rtp') {
          whereClause.supportsRTP = true;
        }
      }
      
      // Filter by active status if specified
      if (active !== undefined) {
        whereClause.isActive = active === 'true';
      } else {
        whereClause.isActive = true; // Default to active banks only
      }
      
      const banks = await DtMercuryBank.findAll({
        where: whereClause,
        order: [['bankName', 'ASC']],
        attributes: [
          'id', 'bankCode', 'bankName', 'shortName', 
          'supportsRPP', 'supportsRTP', 'processingTime', 
          'fee', 'isActive', 'metadata'
        ]
      });
      
      res.json({
        success: true,
        data: {
          banks,
          count: banks.length,
          filters: {
            paymentType,
            active: active !== undefined ? active === 'true' : true
          }
        }
      });
    } catch (error) {
      console.error('Get banks error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch banks',
        message: error.message
      });
    }
  }

  /**
   * Get bank details by code
   */
  async getBankByCode(req, res) {
    try {
      const { bankCode } = req.params;
      
      const bank = await DtMercuryBank.findOne({
        where: { bankCode: bankCode.toUpperCase() }
      });
      
      if (!bank) {
        return res.status(404).json({
          success: false,
          error: 'Bank not found',
          message: `Bank with code ${bankCode} not found`
        });
      }
      
      res.json({
        success: true,
        data: bank
      });
    } catch (error) {
      console.error('Get bank by code error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bank',
        message: error.message
      });
    }
  }

  /**
   * Initiate a PayShap payment
   */
  async initiatePayment(req, res) {
    try {
      const {
        paymentType,
        amount,
        recipientAccountNumber,
        recipientBankCode,
        recipientName,
        recipientReference,
        userId
      } = req.body;
      
      // Validate required fields
      if (!paymentType || !amount || !recipientAccountNumber || !recipientBankCode || !recipientName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'paymentType, amount, recipientAccountNumber, recipientBankCode, and recipientName are required'
        });
      }
      
      // Validate payment type
      if (!['rpp', 'rtp'].includes(paymentType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment type',
          message: 'paymentType must be either "rpp" or "rtp"'
        });
      }
      
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount',
          message: 'Amount must be a positive number'
        });
      }
      
      // Check if bank supports the payment type
      const bank = await DtMercuryBank.findOne({
        where: { 
          bankCode: recipientBankCode.toUpperCase(),
          isActive: true
        }
      });
      
      if (!bank) {
        return res.status(400).json({
          success: false,
          error: 'Bank not found',
          message: `Bank ${recipientBankCode} not found or inactive`
        });
      }
      
      if (paymentType === 'rpp' && !bank.supportsRPP) {
        return res.status(400).json({
          success: false,
          error: 'Payment type not supported',
          message: `${bank.bankName} does not support Request to Pay (RPP)`
        });
      }
      
      if (paymentType === 'rtp' && !bank.supportsRTP) {
        return res.status(400).json({
          success: false,
          error: 'Payment type not supported',
          message: `${bank.bankName} does not support Real-time Payment (RTP)`
        });
      }
      
      // Determine KYC tier based on amount
      const kycTier = numAmount >= 5000 ? 'tier2' : 'tier1';
      
      // Generate unique reference
      const reference = `DTM${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Create transaction record
      const transaction = await DtMercuryTransaction.create({
        reference,
        userId: userId || 1, // Default to user 1 for testing
        paymentType,
        amount: numAmount * 100, // Convert to cents
        recipientAccountNumber,
        recipientBankCode: recipientBankCode.toUpperCase(),
        recipientName,
        recipientReference: recipientReference || 'PayShap payment',
        kycTier,
        kycStatus: 'pending',
        status: 'pending',
        fee: bank.fee,
        metadata: {
          bankName: bank.bankName,
          paymentMethod: paymentType === 'rpp' ? 'request_to_pay' : 'real_time_payment',
          amountInRands: numAmount
        }
      });
      
      // Simulate dtMercury API response
      const dtmercuryResponseCode = paymentType === 'rpp' ? '100' : '150';
      const dtmercuryResponseMessage = paymentType === 'rpp' 
        ? 'Request to Pay initiated successfully' 
        : 'Real-time Payment processing';
      
      // Update transaction with dtMercury response
      await transaction.update({
        dtmercuryTransactionId: `DTM_TXN_${transaction.id}`,
        dtmercuryResponseCode,
        dtmercuryResponseMessage,
        status: paymentType === 'rpp' ? 'pending' : 'processing'
      });
      
      res.json({
        success: true,
        data: {
          transaction: {
            id: transaction.id,
            reference: transaction.reference,
            paymentType: transaction.paymentType,
            amount: transaction.amount / 100, // Convert back to Rands
            recipientName: transaction.recipientName,
            recipientBank: bank.shortName,
            kycTier: transaction.kycTier,
            status: transaction.status,
            fee: transaction.fee,
            estimatedProcessingTime: bank.processingTime,
            dtmercuryTransactionId: transaction.dtmercuryTransactionId
          },
          message: dtmercuryResponseMessage
        }
      });
    } catch (error) {
      console.error('Initiate payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
        message: error.message
      });
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(req, res) {
    try {
      const { reference } = req.params;
      
      const transaction = await DtMercuryTransaction.findOne({
        where: { reference },
        include: [
          {
            model: DtMercuryBank,
            as: 'bank',
            attributes: ['bankName', 'shortName', 'processingTime']
          }
        ]
      });
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
          message: `Transaction with reference ${reference} not found`
        });
      }
      
      res.json({
        success: true,
        data: {
          transaction: {
            reference: transaction.reference,
            paymentType: transaction.paymentType,
            amount: transaction.amount / 100,
            recipientName: transaction.recipientName,
            recipientBank: transaction.recipientBankCode,
            kycTier: transaction.kycTier,
            kycStatus: transaction.kycStatus,
            status: transaction.status,
            fee: transaction.fee,
            processingTime: transaction.processingTime,
            dtmercuryTransactionId: transaction.dtmercuryTransactionId,
            dtmercuryResponseCode: transaction.dtmercuryResponseCode,
            dtmercuryResponseMessage: transaction.dtmercuryResponseMessage,
            errorMessage: transaction.errorMessage,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('Get transaction status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction status',
        message: error.message
      });
    }
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(req, res) {
    try {
      const { userId } = req.params;
      const { status, paymentType, page = 1, limit = 10 } = req.query;
      
      let whereClause = { userId: parseInt(userId) };
      
      // Add filters
      if (status) {
        whereClause.status = status;
      }
      if (paymentType) {
        whereClause.paymentType = paymentType;
      }
      
      const offset = (page - 1) * limit;
      
      const { count, rows: transactions } = await DtMercuryTransaction.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: DtMercuryBank,
            as: 'bank',
            attributes: ['bankName', 'shortName']
          }
        ]
      });
      
      res.json({
        success: true,
        data: {
          transactions: transactions.map(t => ({
            id: t.id,
            reference: t.reference,
            paymentType: t.paymentType,
            amount: t.amount / 100,
            recipientName: t.recipientName,
            recipientBank: t.recipientBankCode,
            status: t.status,
            fee: t.fee,
            createdAt: t.createdAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get user transactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user transactions',
        message: error.message
      });
    }
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(req, res) {
    try {
      const { reference } = req.params;
      
      const transaction = await DtMercuryTransaction.findOne({
        where: { reference }
      });
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
          message: `Transaction with reference ${reference} not found`
        });
      }
      
      if (transaction.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel transaction',
          message: `Transaction is ${transaction.status} and cannot be cancelled`
        });
      }
      
      // Update transaction status
      await transaction.update({
        status: 'cancelled',
        dtmercuryResponseCode: 'CANCELLED',
        dtmercuryResponseMessage: 'Transaction cancelled by user',
        metadata: {
          ...transaction.metadata,
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'user'
        }
      });
      
      res.json({
        success: true,
        data: {
          transaction: {
            reference: transaction.reference,
            status: transaction.status,
            message: 'Transaction cancelled successfully'
          }
        }
      });
    } catch (error) {
      console.error('Cancel transaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel transaction',
        message: error.message
      });
    }
  }
}

module.exports = new DtMercuryController();
