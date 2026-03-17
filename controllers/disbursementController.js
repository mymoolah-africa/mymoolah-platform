'use strict';

/**
 * Disbursement Controller
 * Admin-portal-only endpoints for wage/salary disbursement feature.
 * All routes require portal JWT authentication + maker or checker role.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

const { validationResult } = require('express-validator');
const disbursementService   = require('../services/standardbank/disbursementService');
const db                    = require('../models');

class DisbursementController {

  /**
   * GET /api/v1/disbursements
   * List disbursement runs for the authenticated client.
   */
  async listRuns(req, res) {
    try {
      const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
      const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
      const offset = (page - 1) * limit;
      const status = req.query.status;

      const where = {};
      // Admin sees all; non-admin sees only their own client
      if (!req.user?.isAdmin) {
        where.client_id = req.user?.id;
      }
      if (status) where.status = status;

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
      console.error('[DisbursementController] listRuns:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch disbursement runs' });
    }
  }

  /**
   * GET /api/v1/disbursements/:id
   * Get full run detail including all payment lines.
   */
  async getRun(req, res) {
    try {
      const run = await db.DisbursementRun.findByPk(req.params.id, {
        include: [{ model: db.DisbursementPayment, as: 'payments' }],
      });
      if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
      res.json({ success: true, data: run });
    } catch (err) {
      console.error('[DisbursementController] getRun:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch run' });
    }
  }

  /**
   * POST /api/v1/disbursements
   * Maker creates a new disbursement run.
   */
  async createRun(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { rail, payPeriod, beneficiaries, notificationChannels } = req.body;
      const result = await disbursementService.createRun({
        clientId:    req.user?.clientId || req.user?.id,
        makerUserId: req.user?.id,
        rail,
        payPeriod,
        beneficiaries,
        notificationChannels,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error('[DisbursementController] createRun:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/disbursements/:id/submit
   * Maker submits a draft run for checker approval.
   */
  async submitForApproval(req, res) {
    try {
      const run = await disbursementService.submitForApproval(
        parseInt(req.params.id, 10),
        req.user?.id
      );
      res.json({ success: true, message: 'Run submitted for approval', data: run });
    } catch (err) {
      console.error('[DisbursementController] submitForApproval:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/disbursements/:id/approve
   * Checker approves a pending_approval run → triggers Pain.001 submission.
   */
  async approveRun(req, res) {
    try {
      const result = await disbursementService.approveRun(
        parseInt(req.params.id, 10),
        req.user?.id
      );
      res.json({ success: true, message: 'Run approved and submitted to SBSA', data: result });
    } catch (err) {
      console.error('[DisbursementController] approveRun:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/disbursements/:id/reject
   * Checker rejects a pending_approval run.
   */
  async rejectRun(req, res) {
    try {
      const run = await disbursementService.rejectRun(
        parseInt(req.params.id, 10),
        req.user?.id,
        req.body?.reason
      );
      res.json({ success: true, message: 'Run rejected', data: run });
    } catch (err) {
      console.error('[DisbursementController] rejectRun:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/disbursements/:id/resubmit-failed
   * Maker creates a new run for the failed payments from a partial/failed run.
   */
  async resubmitFailed(req, res) {
    try {
      const result = await disbursementService.resubmitFailed(
        parseInt(req.params.id, 10),
        req.user?.id,
        req.body?.corrections || []
      );
      res.status(201).json({
        success: true,
        message: `Resubmission run created: ${result.run.run_reference}`,
        data: result,
      });
    } catch (err) {
      console.error('[DisbursementController] resubmitFailed:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/disbursements/:id/payments
   * List payments within a run with optional status filter.
   */
  async listPayments(req, res) {
    try {
      const where = { run_id: req.params.id };
      if (req.query.status) where.status = req.query.status;

      const payments = await db.DisbursementPayment.findAll({
        where,
        order: [['id', 'ASC']],
      });
      res.json({ success: true, data: payments });
    } catch (err) {
      console.error('[DisbursementController] listPayments:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
  }
}

module.exports = new DisbursementController();
