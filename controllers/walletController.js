const { Wallet, Transaction, User } = require('../models');
const notificationService = require('../services/notificationService');
const { getLimitsForTier } = require('../config/kycTierLimits');

const OTT_PAYOUT_PROVIDER_LABELS = {
  '112': 'ABSA CashSend',
  '10': 'Nedbank Cardless Withdrawal',
};

function asMoney(value) {
  return Math.round((Math.abs(parseFloat(value || 0)) + Number.EPSILON) * 100) / 100;
}

function getOttPayoutProviderLabelFromRow(row = {}) {
  const metadata = row.metadata || {};
  const providerCode = String(
    metadata.providerCode ||
    ''
  );

  if (OTT_PAYOUT_PROVIDER_LABELS[providerCode]) return OTT_PAYOUT_PROVIDER_LABELS[providerCode];

  const description = `${row.description || ''}`.toLowerCase();
  if (description.includes('absa')) return OTT_PAYOUT_PROVIDER_LABELS['112'];
  if (description.includes('nedbank')) return OTT_PAYOUT_PROVIDER_LABELS['10'];

  return 'Cash payout';
}

function sanitizeOttPayoutDisplayRows(rows = []) {
  const providerLabelsByPayoutId = new Map();
  rows.forEach((tx) => {
    const metadata = tx.metadata || {};
    if (!metadata.ottPayoutId) return;
    const providerLabel = getOttPayoutProviderLabelFromRow(tx);
    if (providerLabel !== 'Cash payout') {
      providerLabelsByPayoutId.set(String(metadata.ottPayoutId), providerLabel);
    }
  });

  return rows.map((tx) => {
    const metadata = tx.metadata || {};
    if (!metadata.ottPayoutId) return tx;

    const providerLabel = providerLabelsByPayoutId.get(String(metadata.ottPayoutId)) || getOttPayoutProviderLabelFromRow(tx);
    const transactionId = String(tx.transactionId || '');

    if (tx.type === 'refund' || transactionId.startsWith('OTT-REV-')) {
      return {
        ...tx,
        description: `Withdraw Cash refund - ${providerLabel}`,
        metadata: {
          ...metadata,
          safeOttPayoutDescription: true,
        },
      };
    }

    if (tx.type === 'fee' || transactionId.startsWith('OTT-FEE-')) {
      return {
        ...tx,
        description: 'Transaction fee',
        metadata: {
          ...metadata,
          safeOttPayoutDescription: true,
        },
      };
    }

    return {
      ...tx,
      description: `Withdraw Cash - ${providerLabel}`,
      metadata: {
        ...metadata,
        safeOttPayoutDescription: true,
      },
    };
  });
}

function dashboardRelationKeys(tx = {}) {
  const metadata = tx.metadata || {};
  const keys = new Set();
  const transactionId = String(tx.transactionId || '');

  if (tx.reference) keys.add(`ref:${tx.reference}`);
  if (metadata.ottPayoutId) keys.add(`ott:${metadata.ottPayoutId}`);
  if (metadata.vasTransactionId) keys.add(`vas:${metadata.vasTransactionId}`);
  if (metadata.voucherId) keys.add(`voucher:${metadata.voucherId}`);
  if (metadata.usdcSendGroupId) keys.add(`usdc:${metadata.usdcSendGroupId}`);
  if (metadata.payshapType === 'rpp') keys.add(`rpp:${transactionId.replace(/^RPP-FEE-/, '').replace(/^RPP-/, '')}`);
  if (metadata.payshapType === 'rtp') keys.add(`rtp:${transactionId.replace(/^RTP-FEE-/, '').replace(/^RTP-/, '')}`);

  return keys;
}

function isDashboardMainTransaction(tx = {}) {
  const metadata = tx.metadata || {};
  if ((tx.type || '').toLowerCase() === 'fee') return false;
  if (metadata.isTopUpFee || metadata.isCashoutFee || metadata.isFlashCashoutFee || metadata.isEasyPayVoucherFee) return false;
  if (metadata.isCashoutFeeRefund || metadata.isEasyPayVoucherFeeRefund) return false;
  if (metadata.lineType === 'usdc_fee') return false;
  if (metadata.payshapType && (tx.type || '').toLowerCase() === 'fee') return false;
  return true;
}

function selectDashboardLineItemRows(rows = [], mainLimit = 10) {
  const selectedIds = new Set();
  const selectedRelationKeys = new Set();
  let mainCount = 0;

  rows.forEach((tx) => {
    if (mainCount >= mainLimit || !isDashboardMainTransaction(tx)) return;
    selectedIds.add(tx.transactionId || `id_${tx.id}`);
    dashboardRelationKeys(tx).forEach((key) => selectedRelationKeys.add(key));
    mainCount += 1;
  });

  return rows.filter((tx) => {
    if (selectedIds.has(tx.transactionId || `id_${tx.id}`)) return true;
    const keys = dashboardRelationKeys(tx);
    return Array.from(keys).some((key) => selectedRelationKeys.has(key));
  });
}

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
      console.error('Error in getAllWallets:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLETS_FETCH_FAILED',
        message: 'Could not load wallets. Please try again.'
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

      const user = await User.findByPk(userId, { attributes: ['kyc_tier'] });
      const kycTier = user?.kyc_tier !== null && user?.kyc_tier !== undefined
        ? Number(user.kyc_tier) : 0;
      const tierLimits = getLimitsForTier(kycTier);

      const totalTime = Date.now() - startTime;
      console.log(`⏱️  Wallet Balance Performance: Total=${totalTime}ms | Query=${queryTime}ms`);

      res.json({
        success: true,
        message: 'Balance retrieved successfully',
        data: {
          available: parseFloat(wallet.balance),
          balance: parseFloat(wallet.balance),
          pending: 0,
          currency: wallet.currency,
          kycTier,
          tierLimits: {
            label: tierLimits.label,
            singleTransactionLimit: tierLimits.singleTransactionLimit,
            dailyLimit: tierLimits.dailyLimit,
            monthlyLimit: tierLimits.monthlyLimit,
            maxBalance: tierLimits.maxBalance,
            canSendMoney: tierLimits.canSendMoney,
            canWithdrawCash: tierLimits.canWithdrawCash,
            canTransferInternational: tierLimits.canTransferInternational,
          }
        }
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`Error getting balance (${totalTime}ms):`, error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'BALANCE_FETCH_FAILED',
        message: 'Could not load your balance. Please try again.'
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
      console.error('Error getting wallet details:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_DETAILS_FETCH_FAILED',
        message: 'Could not load wallet details. Please try again.'
      });
    }
  }

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

      const wallet = await Wallet.findOne({
        where: { userId: userId }
      });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const user = await User.findByPk(userId);
      const kycTier = user?.kyc_tier !== null && user?.kyc_tier !== undefined
        ? Number(user.kyc_tier) : 0;
      const tierLimits = getLimitsForTier(kycTier);

      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      if (newBalance > tierLimits.maxBalance) {
        return res.status(400).json({
          success: false,
          message: `Maximum wallet balance R${tierLimits.maxBalance.toLocaleString()} would be exceeded for your KYC level (${tierLimits.label}). Please upgrade your KYC.`,
          code: 'BALANCE_LIMIT_EXCEEDED'
        });
      }

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
      console.error('Error crediting wallet:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_CREDIT_FAILED',
        message: 'Wallet operation could not be completed. Please try again.'
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
      console.error('Error debiting wallet:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_DEBIT_FAILED',
        message: 'Wallet operation could not be completed. Please try again.'
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

      const kycTier = senderUser?.kyc_tier !== null && senderUser?.kyc_tier !== undefined
        ? Number(senderUser.kyc_tier) : 0;
      const tierLimits = getLimitsForTier(kycTier);

      if (!tierLimits.canSendMoney) {
        return res.status(403).json({
          success: false,
          message: `Sending money is not available at your current KYC level (${tierLimits.label}). Please upgrade your KYC by uploading your ID document.`,
          code: 'KYC_TIER_RESTRICTED'
        });
      }

      if (parseFloat(amount) > tierLimits.singleTransactionLimit) {
        return res.status(400).json({
          success: false,
          message: `Maximum R${tierLimits.singleTransactionLimit.toLocaleString()} per transaction for your KYC level (${tierLimits.label}).`,
          code: 'TRANSACTION_LIMIT_EXCEEDED'
        });
      }

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
      const senderTransactionId = `TXN-${Date.now()}-SEND`;
      const receiverTransactionId = `TXN-${Date.now()}-RECEIVE`;
      const senderNewBalance = parseFloat(senderWallet.balance) - parseFloat(amount);
      const receiverNewBalance = parseFloat(receiverWallet.balance) + parseFloat(amount);

      await senderWallet.update({ balance: senderNewBalance });
      try {
        const { releaseRestrictedFunds } = require('../services/restrictedFundsService');
        await releaseRestrictedFunds(senderWallet, amount, senderTransactionId);
      } catch (releaseErr) {
        console.error('[restrictedFunds] Release failed:', releaseErr.message);
      }
      await receiverWallet.update({ balance: receiverNewBalance });

      // Create transaction records
      
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

      // Post P2P journal entry (DR/CR Client Float — audit trail, net zero)
      try {
        const ledgerService = require('../services/ledgerService');
        await ledgerService.postJournalEntry({
          reference: `P2P-${senderTransactionId}`,
          description: `P2P transfer ${parseFloat(amount).toFixed(2)} — ${senderUser.firstName} to ${receiver.firstName}`,
          lines: [
            { accountCode: '2100-01-01', dc: 'debit', amount: parseFloat(amount), memo: `Sender wallet debit (${senderUser.phoneNumber})` },
            { accountCode: '2100-01-01', dc: 'credit', amount: parseFloat(amount), memo: `Receiver wallet credit (${receiver.phoneNumber})` }
          ]
        });
      } catch (jeErr) {
        console.error('Journal entry failed for P2P transfer:', jeErr.message);
      }

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
      console.error('Error sending money:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'SEND_MONEY_FAILED',
        message: 'Could not send money. Please try again.'
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
      // Exclude zero-amount transactions (e.g., top-up requests, cash-out settlement audit transactions)
      const whereClause = {
        userId: userId,
        amount: { [Op.ne]: 0 } // Exclude all zero-amount transactions
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
      const normalizedRows = sanitizeOttPayoutDisplayRows(transactions.map((t) => {
        const metadata = t.metadata || {};
        let displayAmount = parseFloat(t.amount || 0);
        const isOttPayoutFee =
          metadata.ottPayoutId &&
          (t.type === 'fee' || (t.transactionId || '').startsWith('OTT-FEE-'));
        
        // For top-up transactions: transaction amount already shows gross amount
        // No adjustment needed - transaction.amount is already grossAmount
        
        // For cash-out transactions: show voucher amount only (fee is separate transaction)
        // Cash-withdrawal amount is already correct (negative for debit), no adjustment needed
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
          description: isOttPayoutFee ? 'Transaction fee' : (t.description || 'Transaction'),
          currency: t.currency || 'ZAR',
          fee: t.fee ? parseFloat(t.fee) : 0,
          createdAt: t.createdAt,
          // Essential fields for frontend icon classification
          senderWalletId: t.senderWalletId || null,
          receiverWalletId: t.receiverWalletId || null,
          metadata: metadata
        };
      }));

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
        
        // Keep all customer-facing transactions
        return true;
      });

      // Dashboard: show the latest 10 main transactions plus linked fee/refund rows.
      // Transaction History keeps the usual paginated raw line-item limit.
      const limitedRows = isDashboard
        ? selectDashboardLineItemRows(filteredRows, requestedLimit)
        : filteredRows.slice(0, requestedLimit);

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
      console.error(`Error getting transaction history (${totalTime}ms):`, error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'TRANSACTION_HISTORY_FAILED',
        message: 'Could not load transaction history. Please try again.'
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
      console.error('Error getting transaction summary:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'TRANSACTION_SUMMARY_FAILED',
        message: 'Could not load transaction summary. Please try again.'
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
      console.error('Error creating wallet:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_CREATE_FAILED',
        message: 'Wallet could not be created. Please try again.'
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
      console.error('Error getting wallet by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_LOOKUP_FAILED',
        message: 'Could not load wallet. Please try again.'
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
      console.error('Error getting wallet balance:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_BALANCE_FETCH_FAILED',
        message: 'Could not load wallet balance. Please try again.'
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
      console.error('Error crediting wallet by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_CREDIT_BY_ID_FAILED',
        message: 'Wallet operation could not be completed. Please try again.'
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
      console.error('Error debiting wallet by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_DEBIT_BY_ID_FAILED',
        message: 'Wallet operation could not be completed. Please try again.'
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
      console.error('Error getting wallet transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Request could not be completed',
        errorCode: 'WALLET_TRANSACTIONS_FETCH_FAILED',
        message: 'Could not load wallet transactions. Please try again.'
      });
    }
  }
}

const walletController = new WalletController();
walletController._private = {
  sanitizeOttPayoutDisplayRows,
  getOttPayoutProviderLabelFromRow,
  selectDashboardLineItemRows,
  isDashboardMainTransaction,
};

module.exports = walletController;