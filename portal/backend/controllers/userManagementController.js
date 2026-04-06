'use strict';

const { validationResult } = require('express-validator');
const { Op, fn, col, where } = require('sequelize');

class UserManagementController {
  /**
   * GET /api/v1/admin/wallet-users
   * Search wallet users with pagination, filtering by phone/email/name/KYC status
   * Uses the main app's database via require('../../../models')
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

    try {
      const db = require('../../../models');
      const adminEmail = req.portalUser?.email || 'unknown';
      console.info(`[UserManagement] wallet-users list by ${adminEmail}`);

      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const offset = (page - 1) * limit;
      const search = req.query.search ? String(req.query.search).trim() : '';
      const kycStatus = req.query.kycStatus ? String(req.query.kycStatus).toLowerCase() : '';
      const isActiveParam = req.query.isActive;

      const userWhere = {};

      if (isActiveParam === 'true') {
        userWhere.status = 'active';
      } else if (isActiveParam === 'false') {
        userWhere.status = { [Op.ne]: 'active' };
      }

      const kycInclude = {
        model: db.Kyc,
        as: 'kyc',
        attributes: ['id', 'status', 'documentType', 'submittedAt', 'reviewedAt'],
        required: false,
      };

      if (kycStatus === 'pending') {
        userWhere.kycStatus = 'pending';
      } else if (kycStatus === 'approved') {
        userWhere.kycStatus = 'verified';
      } else if (kycStatus === 'rejected') {
        userWhere.kycStatus = 'rejected';
      } else if (kycStatus === 'reset') {
        kycInclude.where = { status: 'reset' };
        kycInclude.required = true;
      }

      if (search) {
        const pattern = `%${search}%`;
        userWhere[Op.or] = [
          { phoneNumber: { [Op.iLike]: pattern } },
          { email: { [Op.iLike]: pattern } },
          { firstName: { [Op.iLike]: pattern } },
          { lastName: { [Op.iLike]: pattern } },
          where(fn('concat', col('User.firstName'), ' ', col('User.lastName')), {
            [Op.iLike]: pattern,
          }),
        ];
      }

      const userAttributes = [
        'id',
        'email',
        'firstName',
        'lastName',
        'phoneNumber',
        'status',
        'kycStatus',
        'kyc_tier',
        'kycVerifiedAt',
        'createdAt',
        'updatedAt',
      ];

      const { count, rows } = await db.User.findAndCountAll({
        where: userWhere,
        attributes: userAttributes,
        include: [
          {
            model: db.Wallet,
            as: 'wallet',
            attributes: ['id', 'balance', 'currency', 'status'],
            required: false,
          },
          kycInclude,
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true,
        col: 'User.id',
        subQuery: false,
      });

      const users = rows.map((row) => {
        const plain = row.get({ plain: true });
        return {
          id: plain.id,
          email: plain.email,
          firstName: plain.firstName,
          lastName: plain.lastName,
          phoneNumber: plain.phoneNumber,
          status: plain.status,
          kycStatus: plain.kycStatus,
          kycTier: plain.kyc_tier,
          kycVerifiedAt: plain.kycVerifiedAt,
          createdAt: plain.createdAt,
          updatedAt: plain.updatedAt,
          isActiveWallet: plain.status === 'active',
          wallet: plain.wallet
            ? {
                id: plain.wallet.id,
                balance: plain.wallet.balance,
                currency: plain.wallet.currency,
                status: plain.wallet.status,
              }
            : null,
          kyc: plain.kyc
            ? {
                id: plain.kyc.id,
                status: plain.kyc.status,
                documentType: plain.kyc.documentType,
                submittedAt: plain.kyc.submittedAt,
                reviewedAt: plain.kyc.reviewedAt,
              }
            : null,
        };
      });

      return res.json({
        success: true,
        data: {
          users,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 0,
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

    try {
      const db = require('../../../models');
      const userId = parseInt(String(req.params.id), 10);
      const adminEmail = req.portalUser?.email || 'unknown';
      console.info(`[UserManagement] wallet-user detail ${userId} by ${adminEmail}`);

      const userAttributes = [
        'id',
        'email',
        'firstName',
        'lastName',
        'phoneNumber',
        'status',
        'kycStatus',
        'kyc_tier',
        'kycVerifiedAt',
        'idType',
        'createdAt',
        'updatedAt',
      ];

      const user = await db.User.findByPk(userId, {
        attributes: userAttributes,
        include: [
          {
            model: db.Wallet,
            as: 'wallet',
            attributes: ['id', 'walletId', 'balance', 'currency', 'status', 'kycVerified', 'createdAt', 'updatedAt'],
            required: false,
          },
          {
            model: db.Kyc,
            as: 'kyc',
            attributes: [
              'id',
              'status',
              'documentType',
              'submittedAt',
              'reviewedAt',
              'reviewedBy',
              'rejectionReason',
              'verificationScore',
              'isAutomated',
              'createdAt',
              'updatedAt',
            ],
            required: false,
          },
        ],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      const recentTransactions = await db.Transaction.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: [
          'id',
          'transactionId',
          'amount',
          'type',
          'status',
          'description',
          'fee',
          'currency',
          'createdAt',
          'updatedAt',
        ],
      });

      const u = user.get({ plain: true });

      const userPayload = {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phoneNumber,
        status: u.status,
        kycStatus: u.kycStatus,
        kycTier: u.kyc_tier,
        kycVerifiedAt: u.kycVerifiedAt,
        idType: u.idType,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        isActiveWallet: u.status === 'active',
      };

      const walletPayload = u.wallet
        ? {
            id: u.wallet.id,
            walletId: u.wallet.walletId,
            balance: u.wallet.balance,
            currency: u.wallet.currency,
            status: u.wallet.status,
            kycVerified: u.wallet.kycVerified,
            createdAt: u.wallet.createdAt,
            updatedAt: u.wallet.updatedAt,
          }
        : null;

      const kycPayload = u.kyc
        ? {
            id: u.kyc.id,
            status: u.kyc.status,
            documentType: u.kyc.documentType,
            submittedAt: u.kyc.submittedAt,
            reviewedAt: u.kyc.reviewedAt,
            reviewedBy: u.kyc.reviewedBy,
            rejectionReason: u.kyc.rejectionReason,
            verificationScore: u.kyc.verificationScore,
            isAutomated: u.kyc.isAutomated,
            createdAt: u.kyc.createdAt,
            updatedAt: u.kyc.updatedAt,
          }
        : null;

      return res.json({
        success: true,
        data: {
          user: userPayload,
          wallet: walletPayload,
          kyc: kycPayload,
          recentTransactions: recentTransactions.map((t) => t.get({ plain: true })),
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
    }
  }
}

module.exports = UserManagementController;
