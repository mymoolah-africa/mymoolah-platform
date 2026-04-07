'use strict';

/**
 * @module DisbursementClientPortalController
 * @description Client-facing portal endpoints for disbursement runs.
 * All queries are scoped to the authenticated client's client_id via
 * req.clientUser (set by clientPortalAuth middleware).
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

const { validationResult } = require('express-validator');
const db = require('../models');
const disbursementService = require('../services/standardbank/disbursementService');
const { parseFile } = require('../services/disbursement/fileParserService');

const LOG_PREFIX = '[ClientPortal]';

class DisbursementClientPortalController {

  /**
   * GET /api/v1/client-portal/runs
   * List disbursement runs for the authenticated client.
   */
  async listRuns(req, res) {
    try {
      const { clientId } = req.clientUser;
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
      const offset = (page - 1) * limit;

      const where = { client_id: clientId };
      if (req.query.status) where.status = req.query.status;

      const { count, rows } = await db.DisbursementRun.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: [
          'id', 'run_reference', 'rail', 'pay_period', 'total_amount', 'total_count',
          'success_count', 'failed_count', 'pending_count', 'status',
          'maker_user_id', 'checker_user_id', 'submitted_at', 'completed_at', 'created_at',
        ],
      });

      res.json({
        success: true,
        data: {
          runs: rows,
          pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
        },
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} listRuns:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch runs' });
    }
  }

  /**
   * GET /api/v1/client-portal/runs/:id
   * Run detail with payments — scoped to client_id.
   */
  async getRun(req, res) {
    try {
      const { clientId } = req.clientUser;
      const runId = parseInt(req.params.id, 10);

      const run = await db.DisbursementRun.findOne({
        where: { id: runId, client_id: clientId },
        include: [{ model: db.DisbursementPayment, as: 'payments' }],
      });

      if (!run) {
        return res.status(404).json({ success: false, error: 'Run not found' });
      }

      res.json({ success: true, data: run });
    } catch (err) {
      console.error(`${LOG_PREFIX} getRun:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch run' });
    }
  }

  /**
   * POST /api/v1/client-portal/runs
   * Create a new disbursement run (maker role).
   */
  async createRun(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { clientId, clientUserId } = req.clientUser;
      const { rail, payPeriod, beneficiaries, notificationChannels } = req.body;

      const result = await disbursementService.createRun({
        clientId,
        makerUserId: clientUserId,
        rail: rail || 'eft',
        payPeriod,
        beneficiaries,
        notificationChannels,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error(`${LOG_PREFIX} createRun:`, err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/client-portal/runs/:id/submit
   * Submit a draft run for checker approval.
   */
  async submitForApproval(req, res) {
    try {
      const { clientId, clientUserId } = req.clientUser;
      const runId = parseInt(req.params.id, 10);

      const run = await db.DisbursementRun.findOne({
        where: { id: runId, client_id: clientId },
      });

      if (!run) {
        return res.status(404).json({ success: false, error: 'Run not found' });
      }

      const result = await disbursementService.submitForApproval(runId, clientUserId);
      res.json({ success: true, message: 'Run submitted for approval', data: result });
    } catch (err) {
      console.error(`${LOG_PREFIX} submitForApproval:`, err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/client-portal/runs/:id/results
   * Download results as CSV — scoped to client_id.
   */
  async downloadResults(req, res) {
    try {
      const { clientId } = req.clientUser;
      const runId = parseInt(req.params.id, 10);

      const run = await db.DisbursementRun.findOne({
        where: { id: runId, client_id: clientId },
        include: [{ model: db.DisbursementPayment, as: 'payments' }],
      });

      if (!run) {
        return res.status(404).json({ success: false, error: 'Run not found' });
      }

      const csvHeader = 'Employee Ref,Beneficiary Name,Account Number,Branch Code,Bank Name,Amount,Reference,Status,Rejection Code,Rejection Reason,Processed At\n';
      const csvRows = (run.payments || []).map((p) => {
        const fields = [
          p.employee_ref || '',
          (p.beneficiary_name || '').replace(/,/g, ' '),
          p.account_number || '',
          p.branch_code || '',
          (p.bank_name || '').replace(/,/g, ' '),
          p.amount || '0',
          (p.reference || '').replace(/,/g, ' '),
          p.status || '',
          p.rejection_code || '',
          (p.rejection_reason || '').replace(/,/g, ' '),
          p.processed_at ? new Date(p.processed_at).toISOString() : '',
        ];
        return fields.join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${run.run_reference}_results.csv"`,
      );
      res.send(csv);
    } catch (err) {
      console.error(`${LOG_PREFIX} downloadResults:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to generate results' });
    }
  }

  /**
   * POST /api/v1/client-portal/upload-beneficiaries
   * Upload and parse a beneficiary file (CSV/Excel/XML).
   * Returns parsed beneficiaries for preview — no run is created.
   */
  async uploadBeneficiaries(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'File upload required' });
      }

      const buffer = req.file.buffer;
      const filename = req.file.originalname;

      const beneficiaries = parseFile(buffer, filename);

      const totalAmount = beneficiaries
        .filter(b => b.validation.valid)
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      const validCount = beneficiaries.filter(b => b.validation.valid).length;
      const invalidCount = beneficiaries.length - validCount;

      res.json({
        success: true,
        data: {
          beneficiaries,
          summary: {
            total: beneficiaries.length,
            valid: validCount,
            invalid: invalidCount,
            totalAmount: Math.round(totalAmount * 100) / 100,
          },
          filename,
        },
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} uploadBeneficiaries:`, err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/client-portal/summary
   * Dashboard summary stats for the client.
   */
  async getSummary(req, res) {
    try {
      const { clientId } = req.clientUser;

      const [totalRuns, activeRuns, totalDisbursedResult, failedPayments] = await Promise.all([
        db.DisbursementRun.count({ where: { client_id: clientId } }),
        db.DisbursementRun.count({
          where: {
            client_id: clientId,
            status: { [db.Sequelize.Op.in]: ['draft', 'pending_approval', 'approved', 'submitted', 'processing'] },
          },
        }),
        db.DisbursementRun.sum('total_amount', { where: { client_id: clientId, status: 'completed' } }),
        db.DisbursementPayment.count({
          include: [{
            model: db.DisbursementRun,
            as: 'run',
            attributes: [],
            where: { client_id: clientId },
          }],
          where: { status: 'failed' },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalRuns,
          activeRuns,
          totalDisbursed: totalDisbursedResult || 0,
          failedPayments,
        },
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} getSummary:`, err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch summary' });
    }
  }
}

module.exports = new DisbursementClientPortalController();
