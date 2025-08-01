const { Wallet, Transaction, User } = require('../models');

class WalletController {
  constructor() {
    // No need to instantiate models as they're already singletons
  }

  // Get all wallets (for admin/testing purposes)
  async getAllWallets(req, res) {
    try {
      const wallets = await Wallet.findAll({
        include: [{ model: User, as: 'user' }],
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        message: 'Wallets retrieved successfully',
        data: { wallets }
      });
    } catch (error) {
      console.error('❌ Error in getAllWallets:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Get user's wallet balance
  async getBalance(req, res) {
    try {
      const userId = req.user.id;

      // Get wallet by userId
      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });
      
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
      const userId = req.user.id;

      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });
      
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

  // Credit wallet
  async creditWallet(req, res) {
    try {
      const userId = req.user.id;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      // Get wallet by userId
      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Update wallet balance
      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      await wallet.update({ balance: newBalance });

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId: `TXN-${Date.now()}`,
        userId: userId,
        walletId: wallet.walletId,
        amount: amount,
        type: 'credit',
        status: 'completed',
        description: description || 'Wallet credit',
        currency: wallet.currency
      });

      res.json({
        success: true,
        message: 'Wallet credited successfully',
        data: {
          walletId: wallet.walletId,
          previousBalance: wallet.balance,
          newBalance: newBalance,
          amount: amount,
          transactionId: transaction.transactionId
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

  // Debit wallet
  async debitWallet(req, res) {
    try {
      const userId = req.user.id;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      // Get wallet by userId
      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Check if sufficient balance
      if (parseFloat(wallet.balance) < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Update wallet balance
      const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
      await wallet.update({ balance: newBalance });

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId: `TXN-${Date.now()}`,
        userId: userId,
        walletId: wallet.walletId,
        amount: amount,
        type: 'debit',
        status: 'completed',
        description: description || 'Wallet debit',
        currency: wallet.currency
      });

      res.json({
        success: true,
        message: 'Wallet debited successfully',
        data: {
          walletId: wallet.walletId,
          previousBalance: wallet.balance,
          newBalance: newBalance,
          amount: amount,
          transactionId: transaction.transactionId
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
      const senderUserId = req.user.id;
      const { receiverPhoneNumber, amount, description } = req.body;

      if (!receiverPhoneNumber || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Receiver phone number and valid amount are required'
        });
      }

      // Get sender wallet
      const senderWallet = await Wallet.findOne({
        where: { userId: senderUserId }
      });
      
      if (!senderWallet) {
        return res.status(404).json({
          success: false,
          message: 'Sender wallet not found'
        });
      }

      // Check sender balance
      if (parseFloat(senderWallet.balance) < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Find receiver by phone number
      const receiver = await User.findOne({
        where: { phoneNumber: receiverPhoneNumber }
      });

      if (!receiver) {
        return res.status(404).json({
          success: false,
          message: 'Receiver not found'
        });
      }

      // Get receiver wallet
      const receiverWallet = await Wallet.findOne({
        where: { userId: receiver.id }
      });

      if (!receiverWallet) {
        return res.status(404).json({
          success: false,
          message: 'Receiver wallet not found'
        });
      }

      // Perform the transfer
      const senderNewBalance = parseFloat(senderWallet.balance) - parseFloat(amount);
      const receiverNewBalance = parseFloat(receiverWallet.balance) + parseFloat(amount);

      await senderWallet.update({ balance: senderNewBalance });
      await receiverWallet.update({ balance: receiverNewBalance });

      // Create transaction records
      const senderTransaction = await Transaction.create({
        transactionId: `TXN-${Date.now()}-SEND`,
        userId: senderUserId,
        walletId: senderWallet.walletId,
        receiverWalletId: receiverWallet.walletId,
        amount: amount,
        type: 'send',
        status: 'completed',
        description: description || `Sent to ${receiver.firstName} ${receiver.lastName}`,
        currency: senderWallet.currency
      });

      const receiverTransaction = await Transaction.create({
        transactionId: `TXN-${Date.now()}-RECEIVE`,
        userId: receiver.id,
        walletId: receiverWallet.walletId,
        senderWalletId: senderWallet.walletId,
        amount: amount,
        type: 'receive',
        status: 'completed',
        description: description || `Received from ${req.user.firstName} ${req.user.lastName}`,
        currency: receiverWallet.currency
      });

      res.json({
        success: true,
        message: 'Money sent successfully',
        data: {
          transactionId: senderTransaction.transactionId,
          amount: amount,
          receiver: {
            name: `${receiver.firstName} ${receiver.lastName}`,
            phoneNumber: receiver.phoneNumber
          },
          newBalance: senderNewBalance
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
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const offset = (page - 1) * limit;

      const transactions = await Transaction.findAndCountAll({
        where: { userId: userId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        success: true,
        message: 'Transaction history retrieved successfully',
        data: {
          transactions: transactions.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(transactions.count / limit),
            totalItems: transactions.count,
            itemsPerPage: parseInt(limit)
          }
        }
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
      const userId = req.user.id;

      const transactions = await Transaction.findAll({
        where: { userId: userId },
        attributes: [
          'type',
          [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'totalAmount'],
          [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
        ],
        group: ['type']
      });

      const summary = {
        totalTransactions: 0,
        totalAmount: 0,
        byType: {}
      };

      transactions.forEach(t => {
        const type = t.type;
        const amount = parseFloat(t.dataValues.totalAmount) || 0;
        const count = parseInt(t.dataValues.count) || 0;

        summary.byType[type] = { amount, count };
        summary.totalTransactions += count;
        summary.totalAmount += amount;
      });

      res.json({
        success: true,
        message: 'Transaction summary retrieved successfully',
        data: summary
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

  // Create wallet for user
  async createWallet(req, res) {
    try {
      const { userId, initialBalance = 0 } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Check if wallet already exists
      const existingWallet = await Wallet.findOne({
        where: { userId: userId }
      });

      if (existingWallet) {
        return res.status(400).json({
          success: false,
          message: 'Wallet already exists for this user'
        });
      }

      // Create wallet
      const wallet = await Wallet.create({
        userId: userId,
        walletId: `WAL-${Date.now()}`,
        balance: initialBalance,
        currency: 'ZAR',
        status: 'active'
      });

      res.status(201).json({
        success: true,
        message: 'Wallet created successfully',
        data: {
          walletId: wallet.walletId,
          balance: wallet.balance,
          currency: wallet.currency,
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

  // Get wallet by ID (admin function)
  async getWalletById(req, res) {
    try {
      const { walletId } = req.params;

      const wallet = await Wallet.findByPk(walletId, {
        include: [{ model: User, as: 'user' }]
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        message: 'Wallet retrieved successfully',
        data: { wallet }
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

  // Get wallet balance by ID (admin function)
  async getWalletBalance(req, res) {
    try {
      const { walletId } = req.params;

      const wallet = await Wallet.findByPk(walletId);

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
          walletId: wallet.walletId,
          balance: wallet.balance,
          currency: wallet.currency,
          status: wallet.status
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

  // Credit wallet by ID (admin function)
  async creditWalletById(req, res) {
    try {
      const { walletId } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      const wallet = await Wallet.findByPk(walletId);

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Update wallet balance
      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      await wallet.update({ balance: newBalance });

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId: `TXN-${Date.now()}`,
        userId: wallet.userId,
        walletId: wallet.walletId,
        amount: amount,
        type: 'credit',
        status: 'completed',
        description: description || 'Admin wallet credit',
        currency: wallet.currency
      });

      res.json({
        success: true,
        message: 'Wallet credited successfully',
        data: {
          walletId: wallet.walletId,
          previousBalance: wallet.balance,
          newBalance: newBalance,
          amount: amount,
          transactionId: transaction.transactionId
        }
      });

    } catch (error) {
      console.error('❌ Error crediting wallet by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Debit wallet by ID (admin function)
  async debitWalletById(req, res) {
    try {
      const { walletId } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      const wallet = await Wallet.findByPk(walletId);

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Check if sufficient balance
      if (parseFloat(wallet.balance) < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Update wallet balance
      const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
      await wallet.update({ balance: newBalance });

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId: `TXN-${Date.now()}`,
        userId: wallet.userId,
        walletId: wallet.walletId,
        amount: amount,
        type: 'debit',
        status: 'completed',
        description: description || 'Admin wallet debit',
        currency: wallet.currency
      });

      res.json({
        success: true,
        message: 'Wallet debited successfully',
        data: {
          walletId: wallet.walletId,
          previousBalance: wallet.balance,
          newBalance: newBalance,
          amount: amount,
          transactionId: transaction.transactionId
        }
      });

    } catch (error) {
      console.error('❌ Error debiting wallet by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get wallet transactions (admin function)
  async getWalletTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const offset = (page - 1) * limit;

      const transactions = await Transaction.findAndCountAll({
        where: { walletId: walletId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        success: true,
        message: 'Wallet transactions retrieved successfully',
        data: {
          transactions: transactions.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(transactions.count / limit),
            totalItems: transactions.count,
            itemsPerPage: parseInt(limit)
          }
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

module.exports = new WalletController();