const { Wallet, Transaction, User } = require('../models');
const notificationService = require('../services/notificationService');

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
    const startTime = Date.now();
    try {
      const userId = req.user.id;

      // Get wallet by userId
      const queryStart = Date.now();
      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });
      const queryTime = Date.now() - queryStart;
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const totalTime = Date.now() - startTime;
      console.log(`⏱️  Wallet Balance Performance: Total=${totalTime}ms | Query=${queryTime}ms`);

      res.json({
        success: true,
        message: 'Balance retrieved successfully',
        data: {
          // Backward compatibility: expose both available and balance fields
          available: parseFloat(wallet.balance),
          balance: parseFloat(wallet.balance),
          pending: 0, // TODO: Implement pending balance logic
          currency: wallet.currency
        }
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Error getting balance (${totalTime}ms):`, error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging' ? error.message : 'Something went wrong'
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
        type: 'deposit',
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
      const senderUser = await User.findByPk(senderUserId);
      
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
      const senderTransactionId = `TXN-${Date.now()}-SEND`;
      const receiverTransactionId = `TXN-${Date.now()}-RECEIVE`;
      
      // Use the user-entered description if provided, otherwise create a default one
      const userDescription = description || 'Money transfer';
      
      // For sender transaction: show recipient name + user description
      const recipientName = receiver ? `${receiver.firstName} ${receiver.lastName}`.trim() : 'Unknown recipient';
      const senderDesc = `${recipientName} | ${userDescription}`;
      
      const senderTransaction = await Transaction.create({
        transactionId: senderTransactionId,
        userId: senderUserId,
        walletId: senderWallet.walletId,
        receiverWalletId: receiverWallet.walletId,
        amount: amount,
        type: 'send',
        status: 'completed',
        description: senderDesc,
        metadata: { counterpartyIdentifier: receiver.phoneNumber },
        currency: senderWallet.currency
      });

      // For receiver transaction: show sender name + user description
      const senderName = senderUser ? `${senderUser.firstName} ${senderUser.lastName}`.trim() : 'Unknown sender';
      const receiverDesc = `${senderName} | ${userDescription}`;

      const receiverTransaction = await Transaction.create({
        transactionId: receiverTransactionId,
        userId: receiver.id,
        walletId: receiverWallet.walletId,
        senderWalletId: senderWallet.walletId,
        amount: amount,
        type: 'receive',
        status: 'completed',
        description: receiverDesc,
        metadata: { counterpartyIdentifier: senderUser ? senderUser.phoneNumber : undefined, originalDescription: description },
        currency: receiverWallet.currency
      });
 
      // NOTE: Do NOT create Beneficiary records for wallet-to-wallet sends.
      // Beneficiaries are reserved for 3rd-party bank account payments only.

      // Create notification for receiver (non-blocking)
      try {
        await notificationService.createNotification(
          receiver.id,
          'txn_wallet_credit',
          'Money received',
          `You received ${parseFloat(amount).toFixed(2)} from ${senderName}`,
          {
            payload: {
              amount: parseFloat(amount),
              currency: receiverWallet.currency,
              senderName,
              senderWalletId: senderWallet.walletId,
              transactionId: receiverTransaction.transactionId,
              description: receiverTransaction.description,
            },
            freezeUntilViewed: false,
            severity: 'info',
            category: 'transaction',
          }
        );
      } catch (e) {
        console.warn('Notification create failed', e.message);
      }

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

  // Get transaction history - OPTIMIZED with keyset pagination and trimmed payloads
  async getTransactionHistory(req, res) {
    const startTime = Date.now();
    try {
      const userId = req.user.id;
      const { cursor, limit = 10 } = req.query;
      const { Op } = require('sequelize');

      // First, get the user's wallet to get walletId
      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Build where clause for keyset pagination
      // Query transactions by userId - each transaction is already assigned to the correct user
      // Exclude zero-amount 'request' type transactions (e.g., top-up requests with no wallet movement)
      // Also exclude zero-amount cash-out settlement audit transactions
      const whereClause = {
        userId: userId,
        [Op.and]: [
          {
            [Op.or]: [
              { type: { [Op.ne]: 'request' } },
              { amount: { [Op.ne]: 0 } }
            ]
          },
          // Exclude zero-amount transactions (including cash-out settlement audit transactions)
          {
            [Op.or]: [
              { amount: { [Op.ne]: 0 } },
              // Allow zero-amount only if it's not a cash-out settlement audit transaction
              {
                [Op.and]: [
                  { amount: 0 },
                  { 
                    [Op.not]: {
                      description: { [Op.like]: '%Cash-out @ EasyPay settled%' }
                    }
                  }
                ]
              }
            ]
          }
        ]
      };
      if (cursor) {
        // Parse cursor (ISO timestamp string)
        const cursorDate = new Date(cursor);
        if (!isNaN(cursorDate.getTime())) {
          whereClause.createdAt = { [Op.lt]: cursorDate };
        }
      }

      // Fetch transactions with keyset pagination
      // For dashboard (limit <= 10), fetch more to ensure we get enough non-fee transactions after filtering
      const requestedLimit = parseInt(limit);
      const isDashboard = requestedLimit <= 10;
      const fetchLimit = isDashboard ? 50 : Math.min(requestedLimit, 100); // Fetch 50 for dashboard to ensure 10 non-fee results
      
      const queryStart = Date.now();
      const transactions = await Transaction.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: fetchLimit,
        attributes: [
          'id',
          'transactionId',
          'walletId',
          'amount',
          'type',
          'status',
          'description',
          'currency',
          'fee',
          'createdAt',
          'senderWalletId',
          'receiverWalletId',
          'metadata'
        ],
        raw: false, // Keep as model instances for hooks/associations
        validate: false // Skip validation on read (data already validated on write)
      });
      const queryTime = Date.now() - queryStart;

      // Transform to trimmed payload with banking-grade type mapping
      const transformStart = Date.now();
      const normalizedRows = transactions.map((t) => {
        const metadata = t.metadata || {};
        let displayAmount = parseFloat(t.amount || 0);
        
        // For top-up transactions in Recent Transactions: show gross amount
        // Check if this is a top-up net amount transaction and we're showing Recent Transactions
        if (isDashboard && metadata.isTopUpNetAmount && metadata.grossAmount) {
          displayAmount = parseFloat(metadata.grossAmount);
        }
        
        // For cash-out transactions: show voucher amount only (fee is separate transaction)
        // Cash-out voucher amount is already correct (negative for debit), no adjustment needed
        // Fee transaction will be filtered out in Recent Transactions
        
        return {
          id: t.id,
          transactionId: t.transactionId || `tx_${t.id}`, // Fallback if missing
          amount: displayAmount,
          type: t.type === 'credit' ? 'deposit' : 
                t.type === 'debit' ? 'payment' : 
                t.type === 'send' ? 'sent' : 
                t.type === 'receive' ? 'received' : t.type,
          status: t.status || 'completed',
          description: t.description || 'Transaction',
          currency: t.currency || 'ZAR',
          fee: t.fee ? parseFloat(t.fee) : 0,
          createdAt: t.createdAt,
          // Essential fields for frontend icon classification
          senderWalletId: t.senderWalletId || null,
          receiverWalletId: t.receiverWalletId || null,
          metadata: metadata
        };
      });

      // CRITICAL FIX: Deduplicate by transaction ID to prevent duplicates
      const uniqueTransactions = new Map();
      normalizedRows.forEach(tx => {
        // Use transactionId as primary key, or fallback to id
        const key = tx.transactionId || `id_${tx.id}`;
        if (!uniqueTransactions.has(key)) {
          uniqueTransactions.set(key, tx);
        } else {
          // Log duplicate detection
          console.warn(`⚠️ [DUPLICATE DETECTED] Transaction ID: ${key}, Database ID: ${tx.id}`);
        }
      });
      const deduplicatedRows = Array.from(uniqueTransactions.values());

      // Filter out internal accounting transactions (float credits, revenue, VAT)
      // Dashboard (limit <= 10): Also exclude Transaction Fees
      // Transactions page (limit > 10): Keep Transaction Fees, exclude only internal accounting
      const filteredRows = deduplicatedRows.filter((tx) => {
        const desc = (tx.description || '').toLowerCase();
        const type = (tx.type || '').toLowerCase();
        
        // CRITICAL: Filter by transaction type first (most reliable)
        const internalAccountingTypes = [
          'vat_payable',
          'mymoolah_revenue',
          'zapper_float_credit',
          'float_credit',
          'revenue'
        ];
        if (internalAccountingTypes.includes(type)) {
          return false;
        }
        
        // CRITICAL: Filter by description patterns (comprehensive matching)
        // VAT patterns
        if (desc.includes('vat payable') || 
            desc.includes('vat payable to') ||
            desc.includes('vat to') ||
            (desc.includes('vat') && desc.includes('payable'))) {
          return false;
        }
        
        // Revenue patterns
        if (desc.includes('mymoolah revenue') ||
            desc.includes('revenue from') ||
            desc.includes('revenue f') ||
            (desc.includes('revenue') && desc.includes('mymoolah'))) {
          return false;
        }
        
        // Float credit patterns
        if (desc.includes('float credit') ||
            desc.includes('float credit from') ||
            desc.includes('zapper float credit') ||
            (desc.includes('float') && desc.includes('credit'))) {
          return false;
        }
        
        // Dashboard: Exclude Transaction Fees (for top-up and cash-out transactions)
        // Transactions page: Keep Transaction Fees
        if (isDashboard && (
          desc === 'transaction fee' || 
          (tx.metadata && (tx.metadata.isTopUpFee || tx.metadata.isCashoutFee))
        )) {
          return false;
        }
        
        // Keep all customer-facing transactions
        return true;
      });

      // Limit filtered results to requested limit (especially for dashboard)
      const limitedRows = filteredRows.slice(0, requestedLimit);

      // Generate next cursor for pagination (based on original transactions, not filtered)
      const nextCursor = transactions.length > 0 ? 
        transactions[transactions.length - 1].createdAt.toISOString() : null;

      const transformTime = Date.now() - transformStart;
      const totalTime = Date.now() - startTime;
      console.log(`⏱️  Transaction History Performance: Total=${totalTime}ms | Query=${queryTime}ms | Transform=${transformTime}ms | Count=${transactions.length}`);

      res.json({
        success: true,
        message: 'Transaction history retrieved successfully',
        data: {
          transactions: limitedRows,
          pagination: {
            hasMore: transactions.length === fetchLimit,
            nextCursor: nextCursor,
            count: limitedRows.length
          }
        }
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Error getting transaction history (${totalTime}ms):`, error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging' ? error.message : 'Something went wrong'
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
 
      const wallet = await Wallet.findOne({
        where: { walletId },
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
 
      const wallet = await Wallet.findOne({ where: { walletId } });
 
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
        type: 'deposit',
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