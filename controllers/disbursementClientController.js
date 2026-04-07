'use strict';

/**
 * @module DisbursementClientController
 * @description CRUD, KYB, fee configuration, and beneficiary file parsing
 * for disbursement platform clients.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../models');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { parseFile } = require('../services/disbursement/fileParserService');

const LOG_PREFIX = '[DisbursementClientController]';

const REQUIRED_KYB_DOCS = Object.freeze({
  company:          ['cor15', 'id_document', 'proof_of_address', 'bank_confirmation'],
  sole_proprietor:  ['id_document', 'proof_of_address', 'bank_confirmation'],
  trust:            ['trust_deed', 'id_document', 'proof_of_address', 'bank_confirmation'],
  partnership:      ['partnership_agreement', 'id_document', 'proof_of_address', 'bank_confirmation'],
  npo:              ['npo_certificate', 'id_document', 'proof_of_address', 'bank_confirmation'],
});

class DisbursementClientController {

  /** GET / — paginated client list */
  async listClients(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
      const offset = (page - 1) * limit;

      const where = {};
      const isPortalUser = !!req.user?.portalUserId;
      if (!req.user?.isAdmin && !isPortalUser) {
        const userId = req.user?.id;
        if (userId) where.created_by = userId;
      }
      if (req.query.status) where.status = req.query.status;
      if (req.query.kyb_status) where.kyb_status = req.query.kyb_status;

      const { count, rows } = await db.DisbursementClient.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: [
          'id', 'client_code', 'company_name', 'entity_type', 'status',
          'kyb_status', 'contact_email', 'created_at',
        ],
      });

      res.json({
        success: true,
        data: {
          clients: rows,
          pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
        },
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} listClients:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch clients' });
    }
  }

  /** GET /:clientId — single client with fees, notifications, KYB summary */
  async getClient(req, res) {
    try {
      const client = await db.DisbursementClient.findByPk(req.params.clientId, {
        include: [
          {
            model: db.DisbursementClientFee,
            as: 'fees',
            where: { effective_to: null },
            required: false,
          },
          {
            model: db.DisbursementNotificationPreference,
            as: 'notificationPreferences',
          },
          {
            model: db.DisbursementClientUser,
            as: 'users',
            attributes: ['id', 'client_id', 'email', 'name', 'role', 'is_active', 'last_login_at', 'created_at'],
            required: false,
          },
        ],
      });

      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      const kybSummary = await db.KybDocument.findAll({
        where: { client_id: client.id },
        attributes: [
          'status',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      const data = client.toJSON();
      data.kybDocumentSummary = kybSummary;

      res.json({ success: true, data });
    } catch (err) {
      console.error(`${LOG_PREFIX} getClient:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch client' });
    }
  }

  /** POST / — create a new disbursement client */
  async createClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const {
        client_code, company_name, contact_email, entity_type,
        registration_number, contact_name, contact_phone,
        white_label_slug, float_limit,
      } = req.body;

      const existing = await db.DisbursementClient.findOne({
        where: { client_code },
      });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Client code already exists' });
      }

      const api_key = crypto.randomBytes(16).toString('hex');

      const client = await db.DisbursementClient.create({
        client_code,
        company_name,
        contact_email,
        entity_type: entity_type || 'company',
        registration_number: registration_number || null,
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        white_label_slug: white_label_slug || null,
        float_limit: float_limit != null ? float_limit : null,
        api_key,
        created_by: req.user?.id,
      });

      res.status(201).json({ success: true, data: client });
    } catch (err) {
      console.error(`${LOG_PREFIX} createClient:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to create client' });
    }
  }

  /** PATCH /:clientId — update allowed fields */
  async updateClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const client = await db.DisbursementClient.findByPk(req.params.clientId);
      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      const UPDATABLE = [
        'company_name', 'contact_name', 'contact_email', 'contact_phone',
        'status', 'float_limit', 'white_label_slug', 'white_label_config',
        'notification_channels',
      ];

      const updates = {};
      for (const field of UPDATABLE) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No valid fields to update' });
      }

      await client.update(updates);
      await client.reload();

      res.json({ success: true, data: client });
    } catch (err) {
      console.error(`${LOG_PREFIX} updateClient:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to update client' });
    }
  }

  /** POST /:clientId/kyb-documents — upload a KYB document */
  async uploadKybDocument(req, res) {
    try {
      const client = await db.DisbursementClient.findByPk(req.params.clientId);
      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      const document_type = req.body.document_type;
      const entity_type = req.body.entity_type;
      const original_filename = req.file ? req.file.originalname : (req.body.original_filename || 'upload');

      if (!document_type || !entity_type) {
        return res.status(400).json({
          success: false,
          error: 'document_type and entity_type are required',
        });
      }

      const fileUuid = crypto.randomUUID();
      const gcsPath = `kyb-documents/${client.id}/${fileUuid}_${original_filename}`;

      const doc = await db.KybDocument.create({
        client_id: client.id,
        document_type,
        entity_type,
        file_url: gcsPath,
        status: 'pending',
      });

      setImmediate(async () => {
        try {
          const { analyzeDocument } = require('../services/disbursement/kybComplianceService');
          await analyzeDocument({
            clientId: client.id,
            documentType: document_type,
            fileUrl: gcsPath,
          });
        } catch (analysisErr) {
          console.warn(`${LOG_PREFIX} KYB auto-analysis failed (non-blocking):`, analysisErr.message);
        }
      });

      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      console.error(`${LOG_PREFIX} uploadKybDocument:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to upload KYB document' });
    }
  }

  /** PATCH /:clientId/kyb-documents/:docId — admin reviews a KYB document */
  async reviewKybDocument(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const doc = await db.KybDocument.findOne({
        where: {
          id: req.params.docId,
          client_id: req.params.clientId,
        },
      });

      if (!doc) {
        return res.status(404).json({ success: false, error: 'KYB document not found' });
      }

      const { status, rejection_reason } = req.body;

      await doc.update({
        status,
        rejection_reason: status === 'rejected' ? (rejection_reason || null) : null,
        verified_at: status === 'verified' ? new Date() : null,
        verified_by: status === 'verified' ? String(req.user?.id) : null,
      });

      if (status === 'verified') {
        await this._checkAutoVerifyKyb(req.params.clientId);
      }

      await doc.reload();
      res.json({ success: true, data: doc });
    } catch (err) {
      console.error(`${LOG_PREFIX} reviewKybDocument:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to review KYB document' });
    }
  }

  /** GET /:clientId/fees — list all fee configs (current + historical) */
  async listFees(req, res) {
    try {
      const fees = await db.DisbursementClientFee.findAll({
        where: { client_id: req.params.clientId },
        order: [['effective_from', 'DESC'], ['rail', 'ASC']],
      });

      res.json({ success: true, data: { fees } });
    } catch (err) {
      console.error(`${LOG_PREFIX} listFees:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch fees' });
    }
  }

  /** POST /:clientId/fees — create a new fee config, expiring the previous one */
  async setFee(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const client = await db.DisbursementClient.findByPk(req.params.clientId, { transaction: t });
      if (!client) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      const { rail, fee_type, flat_fee_cents, percentage_fee, min_fee_cents, max_fee_cents } = req.body;
      const today = new Date().toISOString().split('T')[0];

      await db.DisbursementClientFee.update(
        { effective_to: today },
        {
          where: {
            client_id: client.id,
            rail,
            effective_to: null,
          },
          transaction: t,
        },
      );

      const fee = await db.DisbursementClientFee.create({
        client_id: client.id,
        rail,
        fee_type,
        flat_fee_cents,
        percentage_fee,
        min_fee_cents: min_fee_cents || 0,
        max_fee_cents: max_fee_cents != null ? max_fee_cents : null,
        effective_from: today,
        created_by: req.user?.id,
      }, { transaction: t });

      await t.commit();
      res.status(201).json({ success: true, data: fee });
    } catch (err) {
      await t.rollback();
      console.error(`${LOG_PREFIX} setFee:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to set fee' });
    }
  }

  /** POST /:clientId/upload-beneficiaries — parse a beneficiary file for preview.
   *  Accepts multipart file upload (field: "file") or JSON { file_path, original_filename }.
   */
  async uploadBeneficiaryFile(req, res) {
    try {
      const client = await db.DisbursementClient.findByPk(req.params.clientId);
      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      let buffer;
      let filename;

      if (req.file) {
        buffer = req.file.buffer;
        filename = req.file.originalname;
      } else if (req.body.file_path) {
        const fs = require('fs');
        const path = require('path');
        if (!fs.existsSync(req.body.file_path)) {
          return res.status(400).json({ success: false, error: 'file_path does not exist' });
        }
        buffer = fs.readFileSync(req.body.file_path);
        filename = req.body.original_filename || path.basename(req.body.file_path);
      } else {
        return res.status(400).json({ success: false, error: 'Upload a file or provide file_path' });
      }

      const result = parseFile(buffer, filename);

      res.json({
        success: true,
        data: {
          beneficiaries: result.beneficiaries || result,
          warnings: result.warnings || [],
          errors: result.errors || [],
          filename,
        },
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} uploadBeneficiaryFile:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to parse beneficiary file' });
    }
  }

  /** GET /:clientId/users — list all users for a client */
  async listClientUsers(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const users = await db.DisbursementClientUser.findAll({
        where: { client_id: req.params.clientId },
        attributes: ['id', 'client_id', 'email', 'name', 'role', 'is_active', 'last_login_at', 'created_at'],
        order: [['created_at', 'DESC']],
      });

      res.json({ success: true, data: { users } });
    } catch (err) {
      console.error(`${LOG_PREFIX} listClientUsers:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch client users' });
    }
  }

  /** POST /:clientId/users — create a new user for a client */
  async createClientUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { email, name, role, password } = req.body;

      const existing = await db.DisbursementClientUser.findOne({
        where: { client_id: req.params.clientId, email },
      });
      if (existing) {
        return res.status(409).json({ success: false, error: 'A user with this email already exists for this client' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const user = await db.DisbursementClientUser.create({
        client_id: req.params.clientId,
        email,
        name,
        role,
        password_hash,
      });

      const { password_hash: _ph, ...userData } = user.toJSON();
      res.status(201).json({ success: true, data: userData });
    } catch (err) {
      console.error(`${LOG_PREFIX} createClientUser:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to create client user' });
    }
  }

  /** PATCH /:clientId/users/:userId — update a client user */
  async updateClientUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const user = await db.DisbursementClientUser.findOne({
        where: { id: req.params.userId, client_id: req.params.clientId },
      });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Client user not found' });
      }

      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.role !== undefined) updates.role = req.body.role;
      if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
      if (req.body.password) {
        updates.password_hash = await bcrypt.hash(req.body.password, 10);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No valid fields to update' });
      }

      await user.update(updates);
      await user.reload();

      const { password_hash: _ph, ...userData } = user.toJSON();
      res.json({ success: true, data: userData });
    } catch (err) {
      console.error(`${LOG_PREFIX} updateClientUser:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to update client user' });
    }
  }

  /**
   * After a KYB doc is verified, check if all required docs for the
   * client's entity_type are now verified. If so, auto-set kyb_status.
   */
  async _checkAutoVerifyKyb(clientId) {
    const client = await db.DisbursementClient.findByPk(clientId);
    if (!client) return;

    const required = REQUIRED_KYB_DOCS[client.entity_type];
    if (!required) return;

    const verified = await db.KybDocument.findAll({
      where: {
        client_id: clientId,
        status: 'verified',
      },
      attributes: ['document_type'],
      raw: true,
    });

    const verifiedTypes = new Set(verified.map(d => d.document_type));
    const allVerified = required.every(t => verifiedTypes.has(t));

    if (allVerified && client.kyb_status !== 'verified') {
      await client.update({ kyb_status: 'verified' });
    }
  }
}

module.exports = new DisbursementClientController();
