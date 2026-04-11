const Transaction = require('../models/Transaction');

class TransactionController {
  constructor() {
    this.transactionModel = new Transaction();
  }

  // Get all transactions
  async getAllTransactions(req, res) {
    try {
      // Note: This would typically be restricted to admin users
      // For now, we'll get all transactions but in production this should be protected
      const transactions = await this.transactionModel.getAllTransactions();
      
      res.json({ 
        success: true,
        message: 'Transactions retrieved successfully',
        data: { transactions }
      });
    } catch (error) {
      console.error('Error in getAllTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'TRANSACTIONS_FETCH_FAILED',
        message: 'Could not load transactions. Please try again.'
      });
    }
  }

  // Get transaction by ID
  async getTransactionById(req, res) {
    try {
      const { transactionId } = req.params;
      const transaction = await this.transactionModel.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ 
          success: false,
          message: 'Transaction not found' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Transaction retrieved successfully',
        data: { transaction }
      });
    } catch (error) {
      console.error('Error in getTransactionById:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'TRANSACTION_LOOKUP_FAILED',
        message: 'Could not load transaction details. Please try again.'
      });
    }
  }

  // Get transactions by wallet ID
  async getTransactionsByWallet(req, res) {
    try {
      const { walletId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const transactions = await this.transactionModel.getWalletTransactions(walletId, parseInt(limit), parseInt(offset));
      
      res.json({ 
        success: true,
        message: 'Wallet transactions retrieved successfully',
        data: { 
          walletId,
          transactions,
          count: transactions.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error in getTransactionsByWallet:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_TRANSACTIONS_FETCH_FAILED',
        message: 'Could not load wallet transactions. Please try again.'
      });
    }
  }

  // Get recent transactions for a wallet
  async getRecentTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const { limit = 10 } = req.query;
      
      const transactions = await this.transactionModel.getRecentTransactions(walletId, parseInt(limit));
      
      res.json({ 
        success: true,
        message: 'Recent transactions retrieved successfully',
        data: { 
          walletId,
          transactions,
          count: transactions.length,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error in getRecentTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'RECENT_TRANSACTIONS_FETCH_FAILED',
        message: 'Could not load recent transactions. Please try again.'
      });
    }
  }

  // Get wallet statistics
  async getWalletStats(req, res) {
    try {
      const { walletId } = req.params;
      
      const stats = await this.transactionModel.getWalletStats(walletId);
      
      res.json({ 
        success: true,
        message: 'Wallet statistics retrieved successfully',
        data: { 
          walletId,
          stats
        }
      });
    } catch (error) {
      console.error('Error in getWalletStats:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_STATS_FETCH_FAILED',
        message: 'Could not load wallet statistics. Please try again.'
      });
    }
  }

  // Update transaction status (admin function)
  async updateTransactionStatus(req, res) {
    try {
      const { transactionId } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: pending, completed, failed, cancelled'
        });
      }
      
      const result = await this.transactionModel.updateTransactionStatus(transactionId, status);
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Transaction status updated successfully',
        data: {
          transactionId,
          status,
          changes: result.changes
        }
      });
    } catch (error) {
      console.error('Error in updateTransactionStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'TRANSACTION_STATUS_UPDATE_FAILED',
        message: 'Could not update transaction status. Please try again.'
      });
    }
  }
}

// Create instance and export methods
const transactionController = new TransactionController();

module.exports = {
  getAllTransactions: transactionController.getAllTransactions.bind(transactionController),
  getTransactionById: transactionController.getTransactionById.bind(transactionController),
  getTransactionsByWallet: transactionController.getTransactionsByWallet.bind(transactionController),
  getRecentTransactions: transactionController.getRecentTransactions.bind(transactionController),
  getWalletStats: transactionController.getWalletStats.bind(transactionController),
  updateTransactionStatus: transactionController.updateTransactionStatus.bind(transactionController)
}; 