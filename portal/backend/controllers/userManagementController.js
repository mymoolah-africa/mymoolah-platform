'use strict';

const { validationResult } = require('express-validator');
const { getClient } = require('../helpers/getDbClient');

class UserManagementController {
  /**
   * GET /api/v1/admin/wallet-users
   * Search wallet users with pagination, filtering by phone/email/name/KYC status
   * Uses pg via scripts/db-connection-helper (no main-app Sequelize models).
   */
  async getWalletUsers(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array().map((e) => e.msg).join('; '),
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const client = await getClient();
    try {
      const adminEmail = req.portalUser?.email || 'unknown';
      console.info(`[UserManagement] wallet-users list by ${adminEmail}`);

      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const offset = (page - 1) * limit;
      const search = req.query.search ? String(req.query.search).trim() : '';
      const kycStatus = req.query.kycStatus ? String(req.query.kycStatus).toLowerCase() : '';
      const isActiveParam = req.query.isActive;

      const conditions = [];
      const params = [];
      let p = 1;

      if (isActiveParam === 'true') {
        conditions.push(`u.status = $${p}`);
        params.push('active');
        p += 1;
      } else if (isActiveParam === 'false') {
        conditions.push(`u.status <> $${p}`);
        params.push('active');
        p += 1;
      }

      if (kycStatus === 'pending') {
        conditions.push(`u."kycStatus" = $${p}`);
        params.push('pending');
        p += 1;
      } else if (kycStatus === 'approved') {
        conditions.push(`u."kycStatus" = $${p}`);
        params.push('verified');
        p += 1;
      } else if (kycStatus === 'rejected') {
        conditions.push(`u."kycStatus" = $${p}`);
        params.push('rejected');
        p += 1;
      }

      const kycJoin =
        kycStatus === 'reset'
          ? `INNER JOIN LATERAL (
          SELECT id, status, "documentType", "submittedAt", "reviewedAt"
          FROM kyc
          WHERE "userId" = u.id AND status = 'reset'
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) k ON true`
          : `LEFT JOIN LATERAL (
          SELECT id, status, "documentType", "submittedAt", "reviewedAt"
          FROM kyc
          WHERE "userId" = u.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) k ON true`;

      if (search) {
        const pattern = `%${search}%`;
        conditions.push(`(
          u."phoneNumber" ILIKE $${p}
          OR u."email" ILIKE $${p}
          OR u."firstName" ILIKE $${p}
          OR u."lastName" ILIKE $${p}
          OR (u."firstName" || ' ' || u."lastName") ILIKE $${p}
        )`);
        params.push(pattern);
        p += 1;
      }

      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const countSql = `
        SELECT COUNT(DISTINCT u.id)::bigint AS total
        FROM users u
        LEFT JOIN wallets w ON w."userId" = u.id
        ${kycJoin}
        ${whereSql}
      `;

      const countResult = await client.query(countSql, params);
      const total = parseInt(String(countResult.rows[0]?.total || '0'), 10);

      const listParams = [...params, limit, offset];
      const limitIdx = p;
      const offsetIdx = p + 1;

      const listSql = `
        SELECT DISTINCT ON (u.id)
          u.id AS user_id,
          u."email" AS email,
          u."firstName" AS "firstName",
          u."lastName" AS "lastName",
          u."phoneNumber" AS "phoneNumber",
          u.status AS user_status,
          u."kycStatus" AS "kycStatus",
          u.kyc_tier AS kyc_tier,
          u."kycVerifiedAt" AS "kycVerifiedAt",
          u."createdAt" AS "createdAt",
          u."updatedAt" AS "updatedAt",
          w.id AS w_id,
          w.balance AS w_balance,
          w.currency AS w_currency,
          w.status AS w_status,
          k.id AS k_id,
          k.status AS k_status,
          k."documentType" AS k_document_type,
          k."submittedAt" AS k_submitted_at,
          k."reviewedAt" AS k_reviewed_at
        FROM users u
        LEFT JOIN wallets w ON w."userId" = u.id
        ${kycJoin}
        ${whereSql}
        ORDER BY u.id, w.id DESC NULLS LAST
      `;

      const innerSql = `SELECT * FROM (${listSql}) ordered_rows ORDER BY "createdAt" DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

      const { rows } = await client.query(innerSql, listParams);

      const users = rows.map((row) => ({
        id: row.user_id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phoneNumber: row.phoneNumber,
        status: row.user_status,
        kycStatus: row.kycStatus,
        kycTier: row.kyc_tier,
        kycVerifiedAt: row.kycVerifiedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isActiveWallet: row.user_status === 'active',
        wallet: row.w_id
          ? {
              id: row.w_id,
              balance: row.w_balance,
              currency: row.w_currency,
              status: row.w_status,
            }
          : null,
        kyc: row.k_id
          ? {
              id: row.k_id,
              status: row.k_status,
              documentType: row.k_document_type,
              submittedAt: row.k_submitted_at,
              reviewedAt: row.k_reviewed_at,
            }
          : null,
      }));

      return res.json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[UserManagementController] getWalletUsers error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet users',
        data: null,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  }

  /**
   * GET /api/v1/admin/wallet-users/:id
   * Get detailed user info (single user view with wallet + KYC details)
   */
  async getWalletUserDetail(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array().map((e) => e.msg).join('; '),
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const userId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(userId) || userId < 1) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const client = await getClient();
    try {
      const adminEmail = req.portalUser?.email || 'unknown';
      console.info(`[UserManagement] wallet-user detail ${userId} by ${adminEmail}`);

      const userSql = `
        SELECT
          u.id,
          u."email",
          u."firstName",
          u."lastName",
          u."phoneNumber",
          u.status,
          u."kycStatus",
          u.kyc_tier,
          u."kycVerifiedAt",
          u."idType",
          u."createdAt",
          u."updatedAt",
          w.id AS w_id,
          w."walletId" AS w_wallet_id,
          w.balance AS w_balance,
          w.currency AS w_currency,
          w.status AS w_status,
          w."kycVerified" AS w_kyc_verified,
          w."createdAt" AS w_created_at,
          w."updatedAt" AS w_updated_at,
          k.id AS k_id,
          k.status AS k_status,
          k."documentType" AS k_document_type,
          k."submittedAt" AS k_submitted_at,
          k."reviewedAt" AS k_reviewed_at,
          k."reviewedBy" AS k_reviewed_by,
          k."rejectionReason" AS k_rejection_reason,
          k."verificationScore" AS k_verification_score,
          k."isAutomated" AS k_is_automated,
          k."createdAt" AS k_created_at,
          k."updatedAt" AS k_updated_at
        FROM users u
        LEFT JOIN wallets w ON w."userId" = u.id
        LEFT JOIN LATERAL (
          SELECT
            id,
            status,
            "documentType",
            "submittedAt",
            "reviewedAt",
            "reviewedBy",
            "rejectionReason",
            "verificationScore",
            "isAutomated",
            "createdAt",
            "updatedAt"
          FROM kyc
          WHERE "userId" = u.id
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) k ON true
        WHERE u.id = $1
      `;

      const userResult = await client.query(userSql, [userId]);
      const row = userResult.rows[0];

      if (!row) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      const txnSql = `
        SELECT
          id,
          "transactionId",
          amount,
          type,
          status,
          description,
          fee,
          currency,
          "createdAt",
          "updatedAt"
        FROM transactions
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 10
      `;

      const txnResult = await client.query(txnSql, [userId]);

      const userPayload = {
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phoneNumber: row.phoneNumber,
        status: row.status,
        kycStatus: row.kycStatus,
        kycTier: row.kyc_tier,
        kycVerifiedAt: row.kycVerifiedAt,
        idType: row.idType,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isActiveWallet: row.status === 'active',
      };

      const walletPayload = row.w_id
        ? {
            id: row.w_id,
            walletId: row.w_wallet_id,
            balance: row.w_balance,
            currency: row.w_currency,
            status: row.w_status,
            kycVerified: row.w_kyc_verified,
            createdAt: row.w_created_at,
            updatedAt: row.w_updated_at,
          }
        : null;

      const kycPayload = row.k_id
        ? {
            id: row.k_id,
            status: row.k_status,
            documentType: row.k_document_type,
            submittedAt: row.k_submitted_at,
            reviewedAt: row.k_reviewed_at,
            reviewedBy: row.k_reviewed_by,
            rejectionReason: row.k_rejection_reason,
            verificationScore: row.k_verification_score,
            isAutomated: row.k_is_automated,
            createdAt: row.k_created_at,
            updatedAt: row.k_updated_at,
          }
        : null;

      return res.json({
        success: true,
        data: {
          user: userPayload,
          wallet: walletPayload,
          kyc: kycPayload,
          recentTransactions: txnResult.rows.map((t) => ({
            id: t.id,
            transactionId: t.transactionId,
            amount: t.amount,
            type: t.type,
            status: t.status,
            description: t.description,
            fee: t.fee,
            currency: t.currency,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[UserManagementController] getWalletUserDetail error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet user',
        data: null,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  }
}

module.exports = UserManagementController;
