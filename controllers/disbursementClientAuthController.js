'use strict';

/**
 * @module DisbursementClientAuthController
 * @description Authentication endpoints for the disbursement client portal.
 * Handles login, password change, and user profile retrieval.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../models');

const LOG_PREFIX = '[ClientAuth]';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '8h';
const BCRYPT_ROUNDS = 10;

class DisbursementClientAuthController {
  /**
   * POST /api/v1/client-portal/login
   * Authenticate a DisbursementClientUser, return JWT.
   */
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const user = await db.DisbursementClientUser.findOne({
        where: { email: email.toLowerCase().trim() },
        include: [{
          model: db.DisbursementClient,
          as: 'client',
          attributes: ['id', 'company_name', 'client_code', 'status', 'white_label_slug'],
        }],
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      if (!user.is_active) {
        return res.status(403).json({ success: false, error: 'Account is disabled' });
      }

      if (user.client && user.client.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Client account is not active' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        {
          clientUserId: user.id,
          clientId: user.client_id,
          role: user.role,
          email: user.email,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY },
      );

      await user.update({ last_login_at: new Date() });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clientId: user.client_id,
            companyName: user.client?.company_name || null,
            clientCode: user.client?.client_code || null,
            whiteLabel: user.client?.white_label_slug || null,
          },
        },
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} login error:`, err.message);
      res.status(500).json({ success: false, error: 'Authentication failed' });
    }
  }

  /**
   * POST /api/v1/client-portal/change-password
   * Change password for the authenticated client user.
   */
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { currentPassword, newPassword } = req.body;
      const { clientUserId } = req.clientUser;

      const user = await db.DisbursementClientUser.findByPk(clientUserId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const validCurrent = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validCurrent) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }

      const hashedNew = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await user.update({ password_hash: hashedNew });

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error(`${LOG_PREFIX} changePassword error:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to change password' });
    }
  }

  /**
   * GET /api/v1/client-portal/me
   * Return the authenticated client user's info.
   */
  async getMe(req, res) {
    try {
      const { clientUserId } = req.clientUser;

      const user = await db.DisbursementClientUser.findByPk(clientUserId, {
        attributes: ['id', 'email', 'name', 'role', 'client_id', 'is_active', 'last_login_at', 'created_at'],
        include: [{
          model: db.DisbursementClient,
          as: 'client',
          attributes: ['id', 'company_name', 'client_code', 'status', 'white_label_slug'],
        }],
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.client_id,
          isActive: user.is_active,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          companyName: user.client?.company_name || null,
          clientCode: user.client?.client_code || null,
          clientStatus: user.client?.status || null,
          whiteLabel: user.client?.white_label_slug || null,
        },
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} getMe error:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch user info' });
    }
  }
}

module.exports = new DisbursementClientAuthController();
