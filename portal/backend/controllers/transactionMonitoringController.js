'use strict';

const { validationResult } = require('express-validator');
const { getClient } = require('../helpers/getDbClient');

/** Admin query type -> DB Transaction.type enum values */
const TYPE_FILTER_MAP = {
  deposit: ['deposit', 'nfc_deposit'],
  withdrawal: ['withdraw'],
  purchase: ['payment'],
  transfer: ['transfer'],
};

/**
 * Escape %, _, \ for ILIKE so user search cannot broaden the pattern.
 */
function ilikePattern(term) {
  const escaped = String(term).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${escaped}%`;
}

function num(v) {
  if (v === null || v === undefined) return v;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : v;
}

function buildTransactionWhere(query) {
  const parts = [];
  const params = [];
  let i = 1;

  const typeFilter = query.type ? String(query.type).toLowerCase() : '';
  const statusFilter = query.status ? String(query.status).toLowerCase() : '';
  const dateFrom = query.dateFrom ? String(query.dateFrom) : '';
  const dateTo = query.dateTo ? String(query.dateTo) : '';
  const search = query.search ? String(query.search).trim() : '';
  const userIdParam =
    query.userId !== undefined && query.userId !== ''
      ? parseInt(String(query.userId), 10)
      : null;

  if (userIdParam !== null && !Number.isNaN(userIdParam)) {
    parts.push(`t."userId" = $${i++}`);
    params.push(userIdParam);
  }

  if (typeFilter && TYPE_FILTER_MAP[typeFilter]) {
    const types = TYPE_FILTER_MAP[typeFilter];
    const ph = types.map(() => `$${i++}`).join(', ');
    parts.push(`t.type IN (${ph})`);
    params.push(...types);
  }

  if (statusFilter === 'pending') {
    parts.push(`t.status IN ($${i++}, $${i++})`);
    params.push('pending', 'processing');
  } else if (statusFilter === 'completed') {
    parts.push(`t.status = $${i++}`);
    params.push('completed');
  } else if (statusFilter === 'failed') {
    parts.push(`t.status = $${i++}`);
    params.push('failed');
  }

  if (dateFrom) {
    parts.push(`t."createdAt" >= $${i++}`);
    params.push(new Date(dateFrom));
  }
  if (dateTo) {
    parts.push(`t."createdAt" <= $${i++}`);
    params.push(new Date(dateTo));
  }

  if (search) {
    const pat = ilikePattern(search);
    parts.push(`(t."transactionId" ILIKE $${i} ESCAPE '\\' OR t.description ILIKE $${i} ESCAPE '\\')`);
    params.push(pat);
    i += 1;
  }

  const whereSql = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  return { whereSql, params };
}

function mapTransactionRow(row) {
  const u =
    row.user_firstName != null || row.user_lastName != null || row.user_phoneNumber != null
      ? {
          firstName: row.user_firstName,
          lastName: row.user_lastName,
          phoneNumber: row.user_phoneNumber,
        }
      : null;

  return {
    id: row.id,
    transactionId: row.transactionId,
    userId: row.userId,
    walletId: row.walletId,
    senderWalletId: row.senderWalletId,
    receiverWalletId: row.receiverWalletId,
    amount: num(row.amount),
    type: row.type,
    status: row.status,
    description: row.description,
    fee: num(row.fee),
    currency: row.currency,
    exchangeRate: row.exchangeRate != null ? num(row.exchangeRate) : row.exchangeRate,
    failureReason: row.failureReason,
    processingTime: row.processingTime,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: u,
  };
}

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

    const adminEmail = req.portalUser?.email || 'unknown';
    console.info(`[TransactionMonitoring] transactions list by ${adminEmail}`);

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const offset = (page - 1) * limit;

    const { whereSql, params: baseParams } = buildTransactionWhere(req.query);

    const client = await getClient();
    try {
      const countSql = `SELECT COUNT(*)::int AS cnt FROM transactions t ${whereSql}`;
      const sumSql = `SELECT COALESCE(SUM(t.amount), 0) AS total FROM transactions t ${whereSql}`;

      const listParamStart = baseParams.length + 1;
      const listSql = `
        SELECT
          t.id,
          t."transactionId",
          t."userId",
          t."walletId",
          t."senderWalletId",
          t."receiverWalletId",
          t.amount,
          t.type,
          t.status,
          t.description,
          t.fee,
          t.currency,
          t."exchangeRate",
          t."failureReason",
          t."processingTime",
          t.metadata,
          t."createdAt",
          t."updatedAt",
          u."firstName" AS "user_firstName",
          u."lastName" AS "user_lastName",
          u."phoneNumber" AS "user_phoneNumber"
        FROM transactions t
        LEFT JOIN users u ON u.id = t."userId"
        ${whereSql}
        ORDER BY t."createdAt" DESC
        LIMIT $${listParamStart} OFFSET $${listParamStart + 1}
      `;

      const [countRes, sumRes, listRes] = await Promise.all([
        client.query(countSql, baseParams),
        client.query(sumSql, baseParams),
        client.query(listSql, [...baseParams, limit, offset]),
      ]);

      const count = countRes.rows[0]?.cnt ?? 0;
      const totalAmountRaw = sumRes.rows[0]?.total;
      const totalAmount =
        totalAmountRaw === null || totalAmountRaw === undefined ? 0 : num(totalAmountRaw);

      const transactions = listRes.rows.map((row) => mapTransactionRow(row));

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
    } finally {
      client.release();
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

    const id = parseInt(String(req.params.id), 10);
    const adminEmail = req.portalUser?.email || 'unknown';
    console.info(`[TransactionMonitoring] transaction detail id=${id} by ${adminEmail}`);

    const client = await getClient();
    try {
      const txnSql = `
        SELECT
          t.id,
          t."transactionId",
          t."userId",
          t."walletId",
          t."senderWalletId",
          t."receiverWalletId",
          t."paymentId",
          t.amount,
          t.type,
          t.status,
          t.description,
          t.fee,
          t.currency,
          t."exchangeRate",
          t."failureReason",
          t."processingTime",
          t.metadata,
          t."createdAt",
          t."updatedAt",
          u."firstName" AS "user_firstName",
          u."lastName" AS "user_lastName",
          u."phoneNumber" AS "user_phoneNumber"
        FROM transactions t
        LEFT JOIN users u ON u.id = t."userId"
        WHERE t.id = $1
      `;
      const txnRes = await client.query(txnSql, [id]);

      if (!txnRes.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      const row = txnRes.rows[0];
      const tid = row.transactionId;

      const jeSql = `
        SELECT
          je.id AS "je_id",
          je.reference AS "je_reference",
          je.description AS "je_description",
          je."postedAt" AS "je_postedAt",
          jl.id AS "jl_id",
          jl."entryId" AS "jl_entryId",
          jl."accountId" AS "jl_accountId",
          jl.dc AS "jl_dc",
          jl.amount AS "jl_amount",
          jl.memo AS "jl_memo",
          la.id AS "la_id",
          la.code AS "la_code",
          la.name AS "la_name",
          la.type AS "la_type",
          la."normalSide" AS "la_normalSide"
        FROM journal_entries je
        LEFT JOIN journal_lines jl ON jl."entryId" = je.id
        LEFT JOIN ledger_accounts la ON la.id = jl."accountId"
        WHERE je.reference = $1
           OR je.reference LIKE $2
           OR je.reference LIKE $3
        ORDER BY je."postedAt" DESC, jl.id ASC
      `;
      const jeRes = await client.query(jeSql, [tid, `${tid}%`, `%${tid}`]);

      const entryMap = new Map();
      for (const r of jeRes.rows) {
        const jeId = r.je_id;
        if (!entryMap.has(jeId)) {
          entryMap.set(jeId, {
            id: jeId,
            reference: r.je_reference,
            description: r.je_description,
            postedAt: r.je_postedAt,
            lines: [],
          });
        }
        if (r.jl_id != null) {
          entryMap.get(jeId).lines.push({
            id: r.jl_id,
            entryId: r.jl_entryId,
            accountId: r.jl_accountId,
            dc: r.jl_dc,
            amount: num(r.jl_amount),
            memo: r.jl_memo,
            account:
              r.la_id != null
                ? {
                    id: r.la_id,
                    code: r.la_code,
                    name: r.la_name,
                    type: r.la_type,
                    normalSide: r.la_normalSide,
                  }
                : null,
          });
        }
      }
      const journalEntriesPayload = [...entryMap.values()];

      const transactionPayload = {
        id: row.id,
        transactionId: row.transactionId,
        userId: row.userId,
        walletId: row.walletId,
        senderWalletId: row.senderWalletId,
        receiverWalletId: row.receiverWalletId,
        paymentId: row.paymentId,
        amount: num(row.amount),
        type: row.type,
        status: row.status,
        description: row.description,
        fee: num(row.fee),
        currency: row.currency,
        exchangeRate: row.exchangeRate != null ? num(row.exchangeRate) : row.exchangeRate,
        failureReason: row.failureReason,
        processingTime: row.processingTime,
        metadata: row.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      const userPayload =
        row.user_firstName != null || row.user_lastName != null || row.user_phoneNumber != null
          ? {
              firstName: row.user_firstName,
              lastName: row.user_lastName,
              phoneNumber: row.user_phoneNumber,
            }
          : null;

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
    } finally {
      client.release();
    }
  }
}

module.exports = TransactionMonitoringController;
