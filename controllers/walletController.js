const walletModel = require('../models/walletModel');
const transactionModel = require('../models/transactionModel');
const { User } = require('../models/User');

class WalletController {
  constructor() {
    // No need to instantiate models as they're already singletons
  }

  // Get user's wallet balance
  async getBalance(req, res) {
    try {
      const userId = req.user.userId;

      // Get wallet by userId
      const wallet = await walletModel.getWalletByUserId(userId);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        message: 'Balance retrieved successfully',
        data: {
          walletId: wallet.walletId,
          balance: wallet.balance,
          currency: wallet.currency,
          status: wallet.status
        }
      });

    } catch (error) {
      console.error('❌ Error getting balance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get wallet details
  async getWalletDetails(req, res) {
    try {
      const userId = req.user.userId;

      const wallet = await walletModel.getWalletByUserId(userId);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        message: 'Wallet details retrieved successfully',
        data: {
          wallet: {
            id: wallet.id,
            walletId: wallet.walletId,
            balance: wallet.balance,
            currency: wallet.currency,
            status: wallet.status,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting wallet details:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Credit wallet (add funds)
  async creditWallet(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, description = 'Wallet credit' } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      const wallet = await walletModel.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Credit the wallet
      const result = await walletModel.creditWallet(wallet.walletId, amount);

      // Record the transaction
      let transaction;
      try {
        transaction = await transactionModel.createTransaction({
          walletId: wallet.walletId,
          type: 'credit',
          amount: amount,
          description: description,
          status: 'completed'
        });
        console.log('✅ Transaction created:', transaction);
      } catch (transactionError) {
        console.error('❌ Error creating transaction:', transactionError);
        // Continue without transaction recording for now
        transaction = null;
      }

      const responseData = {
        walletId: wallet.walletId,
        newBalance: result.newBalance,
        amountCredited: amount
      };

      if (transaction) {
        responseData.transaction = {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          createdAt: transaction.createdAt
        };
      }

      res.json({
        success: true,
        message: 'Wallet credited successfully',
        data: responseData
      });

    } catch (error) {
      console.error('❌ Error crediting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Debit wallet (spend funds)
  async debitWallet(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, description = 'Wallet debit' } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      const wallet = await walletModel.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Debit the wallet
      const result = await walletModel.debitWallet(wallet.walletId, amount);

      // Record the transaction
      const transaction = await transactionModel.createTransaction({
        walletId: wallet.walletId,
        type: 'debit',
        amount: amount,
        description: description,
        status: 'completed'
      });

      res.json({
        success: true,
        message: 'Wallet debited successfully',
        data: {
          walletId: wallet.walletId,
          newBalance: result.newBalance,
          amountDebited: amount,
          transaction: {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            createdAt: transaction.createdAt
          }
        }
      });

    } catch (error) {
      console.error('❌ Error debiting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Send money to another user
  async sendMoney(req, res) {
    try {
      const senderUserId = req.user.userId;
      const { receiverEmail, amount, description = 'Money transfer' } = req.body;

      // Validate input
      if (!receiverEmail || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid receiver email or amount'
        });
      }

      // Get sender's wallet
      const senderWallet = await walletModel.getWalletByUserId(senderUserId);
      if (!senderWallet) {
        return res.status(404).json({
          success: false,
          message: 'Sender wallet not found'
        });
      }

      // Check if sender has sufficient balance
      if (senderWallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Find receiver by email
      const receiver = await User.findByEmail(receiverEmail);
      if (!receiver) {
        return res.status(404).json({
          success: false,
          message: 'Receiver not found'
        });
      }

      // Get receiver's wallet
      const receiverWallet = await walletModel.getWalletByUserId(receiver.id);
      if (!receiverWallet) {
        return res.status(404).json({
          success: false,
          message: 'Receiver wallet not found'
        });
      }

      // Prevent sending to yourself
      if (senderUserId === receiver.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot send money to yourself'
        });
      }

      // Calculate transaction fee (1% of amount)
      const transactionFee = amount * 0.01;
      const totalAmount = amount + transactionFee;

      // Check if sender has sufficient balance including fee
      if (senderWallet.balance < totalAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Need ${totalAmount} (amount: ${amount} + fee: ${transactionFee})`
        });
      }

      // Perform the transfer
      const senderResult = await walletModel.debitWallet(senderWallet.walletId, totalAmount);
      const receiverResult = await walletModel.creditWallet(receiverWallet.walletId, amount);

      // Create transaction records
      const senderTransaction = await transactionModel.createTransaction({
        walletId: senderWallet.walletId,
        type: 'transfer_sent',
        amount: amount,
        description: `Sent to ${receiver.firstName} ${receiver.lastName} (${receiverEmail})`,
        status: 'completed',
        reference: `TRF-${Date.now()}-${senderWallet.walletId}`,
        metadata: JSON.stringify({
          receiverEmail,
          receiverWalletId: receiverWallet.walletId,
          fee: transactionFee
        })
      });

      const receiverTransaction = await transactionModel.createTransaction({
        walletId: receiverWallet.walletId,
        type: 'transfer_received',
        amount: amount,
        description: `Received from ${req.user.firstName} ${req.user.lastName}`,
        status: 'completed',
        reference: `TRF-${Date.now()}-${receiverWallet.walletId}`,
        metadata: JSON.stringify({
          senderEmail: req.user.email,
          senderWalletId: senderWallet.walletId
        })
      });

      res.json({
        success: true,
        message: 'Money sent successfully',
        data: {
          transactionId: senderTransaction.id,
          amount: amount,
          fee: transactionFee,
          totalAmount: totalAmount,
          senderNewBalance: senderResult.newBalance,
          receiverNewBalance: receiverResult.newBalance,
          receiver: {
            email: receiverEmail,
            firstName: receiver.firstName,
            lastName: receiver.lastName
          },
          description: description,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error sending money:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get transaction history
  async getTransactionHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, type, startDate, endDate } = req.query;

      const wallet = await walletModel.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const transactions = await transactionModel.getTransactionsByWalletId(wallet.walletId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        startDate,
        endDate
      });

      res.json({
        success: true,
        message: 'Transaction history retrieved successfully',
        data: transactions
      });

    } catch (error) {
      console.error('❌ Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get transaction summary
  async getTransactionSummary(req, res) {
    try {
      const userId = req.user.userId;

      const wallet = await walletModel.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const summary = await transactionModel.getTransactionSummary(wallet.walletId);

      res.json({
        success: true,
        message: 'Transaction summary retrieved successfully',
        data: {
          walletId: wallet.walletId,
          summary: summary
        }
      });

    } catch (error) {
      console.error('❌ Error getting transaction summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Create a new wallet
  async createWallet(req, res) {
    try {
      const { user_id, account_number } = req.body;

      if (!user_id || typeof user_id !== 'number' || user_id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user_id'
        });
      }

      // Check if user exists
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if wallet already exists for this user
      const existingWallet = await walletModel.getWalletByUserId(user_id);
      if (existingWallet) {
        return res.status(409).json({
          success: false,
          message: 'Wallet already exists for this user'
        });
      }

      // Create wallet
      const wallet = await walletModel.createWallet(user_id, account_number);

      res.status(201).json({
        success: true,
        message: 'Wallet created successfully',
        data: {
          wallet_id: wallet.id,
          account_number: wallet.accountNumber,
          user_id: wallet.userId,
          balance: wallet.balance,
          status: wallet.status
        }
      });

    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get wallet by ID
  async getWalletById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet ID'
        });
      }

      const wallet = await walletModel.getWalletByNumericId(parseInt(id));
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        message: 'Wallet retrieved successfully',
        data: {
          wallet_id: wallet.id,
          account_number: wallet.walletId,
          user_id: wallet.userId,
          balance: wallet.balance,
          status: wallet.status,
          created_at: wallet.createdAt,
          updated_at: wallet.updatedAt
        }
      });

    } catch (error) {
      console.error('❌ Error getting wallet by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get wallet balance by wallet ID
  async getWalletBalance(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet ID'
        });
      }

      const wallet = await walletModel.getWalletByNumericId(parseInt(id));
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        message: 'Wallet balance retrieved successfully',
        data: {
          wallet_id: wallet.id,
          balance: wallet.balance,
          currency: wallet.currency || 'ZAR'
        }
      });

    } catch (error) {
      console.error('❌ Error getting wallet balance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Credit wallet by wallet ID
  async creditWalletById(req, res) {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet ID'
        });
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      const wallet = await walletModel.getWalletByNumericId(parseInt(id));
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Credit the wallet
      const result = await walletModel.creditWallet(wallet.walletId, amount);

      // Record the transaction
      const transaction = await transactionModel.createTransaction({
        walletId: wallet.walletId,
        type: 'credit',
        amount: amount,
        description: 'Wallet credit',
        status: 'completed'
      });

      res.json({
        success: true,
        message: 'Wallet credited successfully',
        data: {
          wallet_id: wallet.id,
          new_balance: result.newBalance,
          amount_credited: amount,
          transaction_id: transaction.id
        }
      });

    } catch (error) {
      console.error('❌ Error crediting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Debit wallet by wallet ID
  async debitWalletById(req, res) {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet ID'
        });
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      const wallet = await walletModel.getWalletByNumericId(parseInt(id));
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Check if sufficient funds
      if (wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient funds'
        });
      }

      // Debit the wallet
      const result = await walletModel.debitWallet(wallet.walletId, amount);

      // Record the transaction
      const transaction = await transactionModel.createTransaction({
        walletId: wallet.walletId,
        type: 'debit',
        amount: amount,
        description: 'Wallet debit',
        status: 'completed'
      });

      res.json({
        success: true,
        message: 'Wallet debited successfully',
        data: {
          wallet_id: wallet.id,
          new_balance: result.newBalance,
          amount_debited: amount,
          transaction_id: transaction.id
        }
      });

    } catch (error) {
      console.error('❌ Error debiting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get wallet transactions by wallet ID
  async getWalletTransactions(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet ID'
        });
      }

      const wallet = await walletModel.getWalletByNumericId(parseInt(id));
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const transactions = await transactionModel.getTransactionsByWalletId(wallet.walletId);

      res.json({
        success: true,
        message: 'Wallet transactions retrieved successfully',
        data: {
          wallet_id: wallet.id,
          transactions: transactions
        }
      });

    } catch (error) {
      console.error('❌ Error getting wallet transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = WalletController;