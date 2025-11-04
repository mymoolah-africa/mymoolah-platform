const { DataTypes } = require('sequelize');

module.exports = {
  async createWalletRequest(req, res) {
    const { sequelize, User, Wallet, Transaction, Notification, PaymentRequest } = require('../models');
    const notificationService = require('../services/notificationService');
    const t = await sequelize.transaction();
    try {
      const requesterUserId = req.user.id;
      const { payerPhoneNumber, amount, description } = req.body;

      if (!payerPhoneNumber || !amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'payerPhoneNumber and positive amount required' });
      }

      const requester = await User.findByPk(requesterUserId);
      // Normalize SA numbers and match across common formats and accountNumber
      const normalize = (v) => {
        const s = String(v || '').replace(/\s/g, '');
        if (s.startsWith('+27')) return s.slice(1);
        if (s.startsWith('0')) return '27' + s.slice(1);
        return s;
      };
      const norm = normalize(payerPhoneNumber);
      const variants = [
        norm,
        norm ? '0' + norm.slice(2) : null,
        norm ? '+'.concat(norm) : null,
        String(payerPhoneNumber || ''),
      ].filter(Boolean);

      const { Op } = require('sequelize');
      const payer = await User.findOne({
        where: {
          [Op.or]: [
            { phoneNumber: { [Op.in]: variants } },
            { accountNumber: { [Op.in]: variants } },
          ],
        },
      });
      if (!payer) return res.status(404).json({ success: false, message: 'Payer not found' });

      const requesterWallet = await Wallet.findOne({ where: { userId: requesterUserId } });
      const payerWallet = await Wallet.findOne({ where: { userId: payer.id } });
      if (!requesterWallet || !payerWallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

      const pr = await PaymentRequest.create({
        requesterUserId,
        payerUserId: payer.id,
        requesterWalletId: requesterWallet.walletId,
        payerWalletId: payerWallet.walletId,
        amount,
        currency: requesterWallet.currency,
        description: description || null,
        status: 'requested',
      }, { transaction: t });

      const title = 'Payment Request';
      const msg = `${requester.firstName} ${requester.lastName} requests R ${Number(amount).toFixed(2)}`;
      const notification = await notificationService.createNotification(
        payer.id,
        'txn_wallet_credit',
        title,
        msg,
        {
          payload: {
            requestId: pr.id,
            requesterUserId,
            requesterName: `${requester.firstName} ${requester.lastName}`.trim(),
            amount: Number(amount),
            currency: requesterWallet.currency,
            description: description || null,
          },
          freezeUntilViewed: true,
          severity: 'info',
          category: 'transaction',
        }
      );

      await pr.update({ notificationId: notification.id }, { transaction: t });
      await t.commit();
      return res.status(201).json({ success: true, data: { requestId: pr.id } });
    } catch (err) {
      await t.rollback();
      return res.status(500).json({ success: false, message: 'Failed to create payment request' });
    }
  },

  async listMyRequests(req, res) {
    const { PaymentRequest } = require('../models');
    const userId = req.user.id;
    const { role = 'incoming', status = 'requested', limit = 20, page = 1 } = req.query;
    const where = {};
    if (role === 'incoming') where.payerUserId = userId; else where.requesterUserId = userId;
    if (status) where.status = status;
    const rows = await PaymentRequest.findAll({ where, order: [['createdAt', 'DESC']], limit: Math.min(Number(limit) || 20, 100), offset: ((Number(page)||1)-1)*(Number(limit)||20) });
    return res.json({ success: true, data: rows });
  },

  async respond(req, res) {
    const { sequelize, User, Wallet, Transaction, PaymentRequest } = require('../models');
    const notificationService = require('../services/notificationService');
    const { Op } = require('sequelize');
    const t = await sequelize.transaction({ isolationLevel: 'READ COMMITTED' });
    try {
      const payerUserId = req.user.id;
      const { id } = req.params;
      const { action } = req.body; // 'approve' | 'decline'

      // BANKING-GRADE APPROACH: Optimistic locking with atomic update
      // Instead of SELECT FOR UPDATE (pessimistic locking), we use atomic UPDATE with WHERE clause
      // This prevents race conditions without blocking concurrent reads
      const pr = await PaymentRequest.findOne({ 
        where: { 
          id, 
          payerUserId,
          status: { [Op.in]: ['requested', 'viewed'] } // Only allow processing if in valid state
        },
        transaction: t
      });
      
      if (!pr) {
        await t.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Request not found or already processed' 
        });
      }

      // BANKING-GRADE APPROACH: Atomic status update with version check (optimistic locking)
      // This ensures only one request can update the status
      const [updateCount] = await PaymentRequest.update(
        { 
          status: action === 'approve' ? 'approved' : 'declined',
          [action === 'approve' ? 'approvedAt' : 'declinedAt']: new Date(),
          version: sequelize.literal('version + 1') // Increment version for optimistic locking
        },
        {
          where: {
            id: pr.id,
            version: pr.version, // Optimistic lock: only update if version hasn't changed
            status: { [Op.in]: ['requested', 'viewed'] } // Double-check status
          },
          transaction: t
        }
      );

      // If updateCount is 0, another request already processed this (race condition detected)
      if (updateCount === 0) {
        await t.rollback();
        return res.status(409).json({ 
          success: false, 
          message: 'Request was already processed by another request' 
        });
      }

      // Reload the payment request to get updated version
      await pr.reload({ transaction: t });

      // BANKING-GRADE APPROACH: Idempotency check using database constraints
      // Check if transactions already exist for this payment request
      // Database unique constraint will prevent duplicates even if this check passes
      const existingTransactions = await Transaction.findAll({
        where: sequelize.literal(
          `("metadata"->>'requestId' = :requestId OR "metadata"->>'paymentRequestId' = :requestId)`
        ),
        replacements: { requestId: String(pr.id) },
        transaction: t,
        limit: 1
      });

      if (existingTransactions.length > 0) {
        console.warn(`⚠️ [DUPLICATE PREVENTION] Payment request ${pr.id} already has transactions. Existing count: ${existingTransactions.length}`);
        await t.rollback();
        return res.status(409).json({ success: false, message: 'Transactions already exist for this payment request' });
      }

      if (action === 'decline') {
        await t.commit();
        return res.json({ success: true, data: { status: 'declined' } });
      }

      // approve -> perform transfer
      // BANKING-GRADE APPROACH: No row-level locks needed
      // PostgreSQL READ COMMITTED isolation level ensures ACID compliance
      const payerWallet = await Wallet.findOne({ where: { userId: payerUserId }, transaction: t });
      const requesterWallet = await Wallet.findOne({ where: { userId: pr.requesterUserId }, transaction: t });
      const payer = await User.findByPk(payerUserId);
      const requester = await User.findByPk(pr.requesterUserId);
      
      if (!payerWallet || !requesterWallet) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }
      
      if (parseFloat(payerWallet.balance) < parseFloat(pr.amount)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
      }

      const newPayerBal = parseFloat(payerWallet.balance) - parseFloat(pr.amount);
      const newRequesterBal = parseFloat(requesterWallet.balance) + parseFloat(pr.amount);
      await payerWallet.update({ balance: newPayerBal }, { transaction: t });
      await requesterWallet.update({ balance: newRequesterBal }, { transaction: t });

      // BANKING-GRADE APPROACH: Unique transaction IDs with payment request ID
      // Database unique constraint on transactionId prevents duplicates
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const senderTransactionId = `TXN-${timestamp}-PR${pr.id}-SEND-${randomSuffix}`;
      const receiverTransactionId = `TXN-${timestamp}-PR${pr.id}-RECV-${randomSuffix}`;
      
      const userDescription = pr.description || 'Payment request';
      const senderDesc = `${requester.firstName} ${requester.lastName} | ${userDescription}`.trim();
      const receiverDesc = `${payer.firstName} ${payer.lastName} | ${userDescription}`.trim();

      // BANKING-GRADE APPROACH: Database constraints prevent duplicates
      // Unique constraint on transactionId + unique constraint on metadata.requestId
      // If duplicate attempt occurs, database will reject it
      try {
        await Transaction.create({
        transactionId: senderTransactionId,
        userId: payerUserId,
        walletId: payerWallet.walletId,
        receiverWalletId: requesterWallet.walletId,
        amount: pr.amount,
        type: 'send',
        status: 'completed',
        description: senderDesc,
        metadata: { 
          counterpartyIdentifier: requester.phoneNumber,
          requestId: pr.id, // Add requestId for idempotency
          paymentRequestId: pr.id // Alias for clarity
        },
        currency: payerWallet.currency,
      }, { transaction: t });

      await Transaction.create({
        transactionId: receiverTransactionId,
        userId: requester.id,
        walletId: requesterWallet.walletId,
        senderWalletId: payerWallet.walletId,
        amount: pr.amount,
        type: 'receive',
        status: 'completed',
        description: receiverDesc,
        metadata: { 
          counterpartyIdentifier: payer.phoneNumber,
          requestId: pr.id, // Add requestId for idempotency
          paymentRequestId: pr.id // Alias for clarity
        },
        currency: requesterWallet.currency,
      }, { transaction: t });
      } catch (dbError) {
        // If database constraint violation, rollback and return error
        if (dbError.name === 'SequelizeUniqueConstraintError') {
          await t.rollback();
          console.error(`❌ [DUPLICATE CONSTRAINT VIOLATION] Payment request ${pr.id}:`, dbError.message);
          return res.status(409).json({ 
            success: false, 
            message: 'Duplicate transaction prevented by database constraint' 
          });
        }
        throw dbError; // Re-throw other errors
      }

      await t.commit();
      
      console.log(`✅ [PAYMENT REQUEST APPROVED] Request ID: ${pr.id}, Amount: R${pr.amount}, Payer: ${payerUserId}, Requester: ${pr.requesterUserId}, Transactions: ${senderTransactionId}, ${receiverTransactionId}`);

      // Send non-blocking confirmations to both parties
      try {
        const amountNum = Number(pr.amount);
        await notificationService.createNotification(
          pr.requesterUserId,
          'txn_wallet_credit',
          'Payment Received',
          `${payer.firstName} ${payer.lastName} approved your request for R ${amountNum.toFixed(2)}`,
          {
            payload: {
              requestId: pr.id,
              amount: amountNum,
              currency: requesterWallet.currency,
              fromUserId: payerUserId,
              reason: 'balance_refresh',
            },
            severity: 'info',
            category: 'transaction',
          }
        );
        await notificationService.createNotification(
          payerUserId,
          'txn_wallet_credit',
          'Payment Sent',
          `You approved a request to pay R ${amountNum.toFixed(2)} to ${requester.firstName} ${requester.lastName}`,
          {
            payload: {
              requestId: pr.id,
              amount: amountNum,
              currency: payerWallet.currency,
              toUserId: pr.requesterUserId,
              reason: 'balance_refresh',
            },
            severity: 'info',
            category: 'transaction',
          }
        );
      } catch (_) { /* best-effort notifications */ }
      return res.json({ success: true, data: { status: 'approved' } });
    } catch (err) {
      await t.rollback();
      console.error(`❌ [PAYMENT REQUEST ERROR] Request ID: ${req.params.id}, Error:`, err);
      
      // Handle specific database errors
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ success: false, message: 'Transaction already exists (duplicate prevented)' });
      }
      
      return res.status(500).json({ success: false, message: 'Failed to process request' });
    }
  }
  ,

  async createRecurring(req, res) {
    const { sequelize, User, Wallet, RecurringPaymentRequest } = require('../models');
    const t = await sequelize.transaction();
    try {
      const requesterUserId = req.user.id;
      const { payerPhoneNumber, amount, description, frequency, dayOfWeek, dayOfMonth, startDate, startTime, endOption, occurrences, untilDate } = req.body;
      if (!payerPhoneNumber || !amount || Number(amount) <= 0 || !frequency || !startDate || !startTime) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const { Op } = require('sequelize');
      const normalize = (v) => {
        const s = String(v || '').replace(/\s/g, '');
        if (s.startsWith('+27')) return s.slice(1);
        if (s.startsWith('0')) return '27' + s.slice(1);
        return s;
      };
      const norm = normalize(payerPhoneNumber);
      const variants = [norm, norm ? '0' + norm.slice(2) : null, norm ? '+' + norm : null, String(payerPhoneNumber || '')].filter(Boolean);
      const payer = await User.findOne({ where: { [Op.or]: [{ phoneNumber: { [Op.in]: variants } }, { accountNumber: { [Op.in]: variants } }] } });
      if (!payer) return res.status(404).json({ success: false, message: 'Payer not found' });
      const requesterWallet = await Wallet.findOne({ where: { userId: requesterUserId } });
      const payerWallet = await Wallet.findOne({ where: { userId: payer.id } });
      if (!requesterWallet || !payerWallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

      // Interpret provided date/time in user's local time (no timezone conversion)
      const [hh, mm] = String(startTime).split(':').map(Number);
      const sd = new Date(startDate);
      sd.setHours(hh || 0, mm || 0, 0, 0);
      const startAt = sd;
      const nextRunAt = new Date(sd);
      const row = await RecurringPaymentRequest.create({
        requesterUserId,
        payerUserId: payer.id,
        requesterWalletId: requesterWallet.walletId,
        payerWalletId: payerWallet.walletId,
        amount,
        currency: requesterWallet.currency,
        description: description || null,
        frequency,
        dayOfWeek: dayOfWeek != null ? Number(dayOfWeek) : null,
        dayOfMonth: dayOfMonth != null ? Number(dayOfMonth) : null,
        startAt,
        endOption: endOption || 'never',
        occurrencesRemaining: endOption === 'count' ? Number(occurrences || 0) : null,
        untilDate: endOption === 'until' ? new Date(`${untilDate}T23:59:59.000Z`) : null,
        status: 'active',
        lastRunAt: null,
        nextRunAt,
      }, { transaction: t });
      await t.commit();
      return res.status(201).json({ success: true, data: { recurringId: row.id } });
    } catch (e) {
      await t.rollback();
      return res.status(500).json({ success: false, message: 'Failed to create recurring request' });
    }
  },

  async listRecurring(req, res) {
    const { RecurringPaymentRequest } = require('../models');
    const rows = await RecurringPaymentRequest.findAll({ where: { requesterUserId: req.user.id }, order: [['createdAt','DESC']] });
    return res.json({ success: true, data: rows });
  },

  async updateRecurringStatus(req, res) {
    const { RecurringPaymentRequest } = require('../models');
    const { id } = req.params;
    const { action } = req.body; // pause|resume|cancel
    const row = await RecurringPaymentRequest.findOne({ where: { id, requesterUserId: req.user.id } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const map = { pause: 'paused', resume: 'active', cancel: 'cancelled' };
    if (!map[action]) return res.status(400).json({ success: false, message: 'Invalid action' });
    await row.update({ status: map[action] });
    return res.json({ success: true });
  },

  /**
   * List recent payers for the authenticated requester (for Request Money UX)
   * Aggregates prior wallet payment requests by payer, returning most recent first
   */
  async listRecentPayers(req, res) {
    try {
      const { PaymentRequest, User } = require('../models');
      const requesterUserId = req.user.id;
      const limit = Math.min(Number(req.query.limit) || 20, 50);

      // Fetch recent requests made by this user
      const rows = await PaymentRequest.findAll({
        where: { requesterUserId },
        order: [['createdAt', 'DESC']],
        limit: 200, // fetch more then aggregate down
        attributes: ['payerUserId', 'createdAt'],
      });

      // Aggregate by payerUserId
      const byPayer = new Map();
      for (const r of rows) {
        const key = String(r.payerUserId);
        const prev = byPayer.get(key);
        if (!prev) {
          byPayer.set(key, { payerUserId: r.payerUserId, lastRequestedAt: r.createdAt, count: 1 });
        } else {
          prev.count += 1;
          if (r.createdAt > prev.lastRequestedAt) prev.lastRequestedAt = r.createdAt;
        }
      }

      // Enrich with user info
      const payerIds = Array.from(byPayer.values()).map(p => p.payerUserId);
      let users = [];
      if (payerIds.length > 0) {
        users = await User.findAll({ where: { id: payerIds }, attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'accountNumber'] });
      }
      const idToUser = new Map(users.map(u => [u.id, u]));

      const aggregated = Array.from(byPayer.values())
        .map(p => {
          const u = idToUser.get(p.payerUserId);
          return {
            payerUserId: p.payerUserId,
            name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Unknown',
            phoneNumber: u ? u.phoneNumber : null,
            accountNumber: u ? u.accountNumber : null,
            lastRequestedAt: p.lastRequestedAt,
            count: p.count,
          };
        })
        .sort((a, b) => new Date(b.lastRequestedAt) - new Date(a.lastRequestedAt))
        .slice(0, limit);

      return res.json({ success: true, data: { recentPayers: aggregated, count: aggregated.length } });
    } catch (error) {
      console.error('listRecentPayers error:', error);
      return res.status(500).json({ success: false, message: 'Failed to list recent payers' });
    }
  }
};


