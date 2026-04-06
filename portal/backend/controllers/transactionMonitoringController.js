'use strict';

const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/** Admin query type -> DB Transaction.type enum values */
const TYPE_FILTER_MAP = {
  deposit: ['deposit', 'nfc_deposit'],
  withdrawal: ['withdraw'],
  purchase: ['payment'],
  transfer: ['transfer'],
};

const TRANSACTION_LIST_ATTRIBUTES = [
  'id',
  'transactionId',
  'userId',
  'walletId',
  'senderWalletId',
  'receiverWalletId',
  'amount',
  'type',
  'status',
  'description',
  'fee',
  'currency',
  'exchangeRate',
  'failureReason',
  'processingTime',
  'metadata',
  'createdAt',
  'updatedAt',
];

const TRANSACTION_DETAIL_ATTRIBUTES = [...TRANSACTION_LIST_ATTRIBUTES, 'paymentId'];

const SAFE_USER_ATTRIBUTES = ['firstName', 'lastName', 'phoneNumber'];

class TransactionMonitoringController {
  /**
   * GET /api/v1/admin/transactions
   * Search transactions with pagination and filtering
   */
  async getTransactions(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array().map((e) => e.msg).join('; '),
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const db = require('../../../models');
      const adminEmail = req.portalUser?.email || 'unknown';
      console.info(`[TransactionMonitoring] transactions list by ${adminEmail}`);

      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const offset = (page - 1) * limit;
      const search = req.query.search ? String(req.query.search).trim() : '';
      const typeFilter = req.query.type ? String(req.query.type).toLowerCase() : '';
      const statusFilter = req.query.status ? String(req.query.status).toLowerCase() : '';
      const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : '';
      const dateTo = req.query.dateTo ? String(req.query.dateTo) : '';
      const userIdParam = req.query.userId !== undefined && req.query.userId !== '' ? parseInt(String(req.query.userId), 10) : null;

      const transactionWhere = {};

      if (userIdParam !== null && !Number.isNaN(userIdParam)) {
        transactionWhere.userId = userIdParam;
      }

      if (typeFilter && TYPE_FILTER_MAP[typeFilter]) {
        transactionWhere.type = { [Op.in]: TYPE_FILTER_MAP[typeFilter] };
      }

      if (statusFilter === 'pending') {
        transactionWhere.status = { [Op.in]: ['pending', 'processing'] };
      } else if (statusFilter === 'completed') {
        transactionWhere.status = 'completed';
      } else if (statusFilter === 'failed') {
        transactionWhere.status = 'failed';
      }

      const createdAtCond = {};
      if (dateFrom) {
        createdAtCond[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        createdAtCond[Op.lte] = new Date(dateTo);
      }
      if (Object.keys(createdAtCond).length > 0) {
        transactionWhere.createdAt = createdAtCond;
      }

      if (search) {
        const pattern = `%${search}%`;
        transactionWhere[Op.or] = [
          { transactionId: { [Op.iLike]: pattern } },
          { description: { [Op.iLike]: pattern } },
        ];
      }

      const userInclude = {
        model: db.User,
        as: 'user',
        attributes: SAFE_USER_ATTRIBUTES,
        required: false,
      };

      const [listResult, totalAmountRaw] = await Promise.all([
        db.Transaction.findAndCountAll({
          where: transactionWhere,
          attributes: TRANSACTION_LIST_ATTRIBUTES,
          include: [userInclude],
          limit,
          offset,
          order: [['createdAt', 'DESC']],
          subQuery: false,
        }),
        db.Transaction.sum('amount', { where: transactionWhere }),
      ]);

      const { count, rows } = listResult;
      const totalAmount =
        totalAmountRaw === null || totalAmountRaw === undefined ? 0 : Number(totalAmountRaw);

      const transactions = rows.map((row) => {
        const plain = row.get({ plain: true });
        const u = plain.user;
        return {
          id: plain.id,
          transactionId: plain.transactionId,
          userId: plain.userId,
          walletId: plain.walletId,
          senderWalletId: plain.senderWalletId,
          receiverWalletId: plain.receiverWalletId,
          amount: plain.amount,
          type: plain.type,
          status: plain.status,
          description: plain.description,
          fee: plain.fee,
          currency: plain.currency,
          exchangeRate: plain.exchangeRate,
          failureReason: plain.failureReason,
          processingTime: plain.processingTime,
          metadata: plain.metadata,
          createdAt: plain.createdAt,
          updatedAt: plain.updatedAt,
          user: u
            ? {
                firstName: u.firstName,
                lastName: u.lastName,
                phoneNumber: u.phoneNumber,
              }
            : null,
        };
      });

      return res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 0,
          },
          summary: {
            totalAmount,
            transactionCount: count,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[TransactionMonitoringController] getTransactions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/admin/transactions/:id
   * Single transaction with user and journal entries
   */
  async getTransactionDetail(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array().map((e) => e.msg).join('; '),
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const db = require('../../../models');
      const id = parseInt(String(req.params.id), 10);
      const adminEmail = req.portalUser?.email || 'unknown';
      console.info(`[TransactionMonitoring] transaction detail id=${id} by ${adminEmail}`);

      const txn = await db.Transaction.findByPk(id, {
        attributes: TRANSACTION_DETAIL_ATTRIBUTES,
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: SAFE_USER_ATTRIBUTES,
            required: false,
          },
        ],
      });

      if (!txn) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      const plain = txn.get({ plain: true });
      const tid = plain.transactionId;

      const journalEntries = await db.JournalEntry.findAll({
        where: {
          [Op.or]: [
            { reference: tid },
            { reference: { [Op.like]: `${tid}%` } },
            { reference: { [Op.like]: `%${tid}` } },
          ],
        },
        include: [
          {
            model: db.JournalLine,
            as: 'lines',
            attributes: ['id', 'entryId', 'accountId', 'dc', 'amount', 'memo'],
            include: [
              {
                model: db.LedgerAccount,
                as: 'account',
                attributes: ['id', 'code', 'name', 'type', 'normalSide'],
                required: false,
              },
            ],
          },
        ],
        order: [['postedAt', 'DESC']],
      });

      const transactionPayload = {
        id: plain.id,
        transactionId: plain.transactionId,
        userId: plain.userId,
        walletId: plain.walletId,
        senderWalletId: plain.senderWalletId,
        receiverWalletId: plain.receiverWalletId,
        paymentId: plain.paymentId,
        amount: plain.amount,
        type: plain.type,
        status: plain.status,
        description: plain.description,
        fee: plain.fee,
        currency: plain.currency,
        exchangeRate: plain.exchangeRate,
        failureReason: plain.failureReason,
        processingTime: plain.processingTime,
        metadata: plain.metadata,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
      };

      const userPayload = plain.user
        ? {
            firstName: plain.user.firstName,
            lastName: plain.user.lastName,
            phoneNumber: plain.user.phoneNumber,
          }
        : null;

      const journalEntriesPayload = journalEntries.map((je) => {
        const j = je.get({ plain: true });
        return {
          id: j.id,
          reference: j.reference,
          description: j.description,
          postedAt: j.postedAt,
          lines: (j.lines || []).map((line) => ({
            id: line.id,
            entryId: line.entryId,
            accountId: line.accountId,
            dc: line.dc,
            amount: line.amount,
            memo: line.memo,
            account: line.account
              ? {
                  id: line.account.id,
                  code: line.account.code,
                  name: line.account.name,
                  type: line.account.type,
                  normalSide: line.account.normalSide,
                }
              : null,
          })),
        };
      });

      return res.json({
        success: true,
        data: {
          transaction: transactionPayload,
          user: userPayload,
          journalEntries: journalEntriesPayload,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[TransactionMonitoringController] getTransactionDetail error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = TransactionMonitoringController;
