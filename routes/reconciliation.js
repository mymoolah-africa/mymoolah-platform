/**
 * Reconciliation API Routes
 * 
 * Provides REST API endpoints for reconciliation management:
 * - Manual trigger
 * - Status monitoring
 * - Report access
 * - Supplier configuration
 * 
 * @module routes/reconciliation
 */

'use strict';

const express = require('express');
const router = express.Router();
const db = require('../models');
const ReconciliationOrchestrator = require('../services/reconciliation/ReconciliationOrchestrator');
// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[ReconciliationRoutes]', ...args),
  error: (...args) => console.error('[ReconciliationRoutes]', ...args),
  warn: (...args) => console.warn('[ReconciliationRoutes]', ...args),
  debug: (...args) => console.log('[ReconciliationRoutes]', ...args)
};
const { authenticateToken } = require('../middleware/auth');

const orchestrator = new ReconciliationOrchestrator();

/**
 * @route   POST /api/v1/reconciliation/runs
 * @desc    Trigger manual reconciliation run
 * @access  Private (Admin only)
 */
router.post('/runs', authenticateToken, async (req, res) => {
  try {
    const { supplier_id, file_path } = req.body;
    
    if (!supplier_id || !file_path) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['supplier_id', 'file_path']
      });
    }
    
    logger.info('[Reconciliation API] Manual run triggered', {
      supplier_id,
      user_id: req.user.id
    });
    
    const result = await orchestrator.reconcile(file_path, supplier_id, {
      userId: req.user.id
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('[Reconciliation API] Run failed', {
      error: error.message
    });
    res.status(500).json({
      error: 'Reconciliation failed',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/reconciliation/runs
 * @desc    List all reconciliation runs
 * @access  Private
 */
router.get('/runs', authenticateToken, async (req, res) => {
  try {
    const { supplier_id, status, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (supplier_id) where.supplier_id = supplier_id;
    if (status) where.status = status;
    
    const runs = await db.ReconRun.findAll({
      where,
      include: [{
        model: db.ReconSupplierConfig,
        as: 'supplier',
        attributes: ['id', 'supplier_name', 'supplier_code']
      }],
      order: [['completed_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: runs.map(run => ({
        run_id: run.run_id,
        supplier: run.supplier.supplier_name,
        file_name: run.file_name,
        status: run.status,
        match_rate: run.getMatchRate(),
        passed: run.isPassed(),
        total_transactions: run.total_transactions,
        amount_variance: parseFloat(run.amount_variance),
        completed_at: run.completed_at,
        processing_time_ms: run.processing_time_ms
      }))
    });
  } catch (error) {
    logger.error('[Reconciliation API] Failed to list runs', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to retrieve runs',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/reconciliation/runs/:runId
 * @desc    Get detailed reconciliation run
 * @access  Private
 */
router.get('/runs/:runId', authenticateToken, async (req, res) => {
  try {
    const { runId } = req.params;
    
    const run = await db.ReconRun.findOne({
      where: { run_id: runId },
      include: [
        {
          model: db.ReconSupplierConfig,
          as: 'supplier'
        },
        {
          model: db.ReconTransactionMatch,
          as: 'matches',
          limit: 100 // Limit matches for performance
        }
      ]
    });
    
    if (!run) {
      return res.status(404).json({
        error: 'Reconciliation run not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        run_id: run.run_id,
        supplier: {
          id: run.supplier.id,
          name: run.supplier.supplier_name,
          code: run.supplier.supplier_code
        },
        file: {
          name: run.file_name,
          hash: run.file_hash,
          size: run.file_size,
          received_at: run.file_received_at
        },
        status: run.status,
        processing: {
          started_at: run.started_at,
          completed_at: run.completed_at,
          time_ms: run.processing_time_ms
        },
        summary: {
          total_transactions: run.total_transactions,
          matched_exact: run.matched_exact,
          matched_fuzzy: run.matched_fuzzy,
          unmatched_mmtp: run.unmatched_mmtp,
          unmatched_supplier: run.unmatched_supplier,
          match_rate: run.getMatchRate(),
          auto_resolved: run.auto_resolved,
          manual_review_required: run.manual_review_required
        },
        financial: {
          total_amount_mmtp: parseFloat(run.total_amount_mmtp),
          total_amount_supplier: parseFloat(run.total_amount_supplier),
          amount_variance: parseFloat(run.amount_variance),
          total_commission_mmtp: parseFloat(run.total_commission_mmtp),
          total_commission_supplier: parseFloat(run.total_commission_supplier),
          commission_variance: parseFloat(run.commission_variance)
        },
        discrepancies: run.discrepancies,
        passed: run.isPassed(run.supplier.critical_variance_threshold),
        matches: run.matches.map(m => ({
          match_status: m.match_status,
          mmtp_transaction_id: m.mmtp_transaction_id,
          supplier_transaction_id: m.supplier_transaction_id,
          mmtp_amount: m.mmtp_amount ? parseFloat(m.mmtp_amount) : null,
          supplier_amount: m.supplier_amount ? parseFloat(m.supplier_amount) : null,
          has_discrepancy: m.has_discrepancy,
          discrepancy_type: m.discrepancy_type,
          resolution_status: m.resolution_status
        }))
      }
    });
  } catch (error) {
    logger.error('[Reconciliation API] Failed to get run details', {
      error: error.message,
      runId: req.params.runId
    });
    res.status(500).json({
      error: 'Failed to retrieve run details',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/reconciliation/runs/:runId/matches
 * @desc    Get transaction matches for a run
 * @access  Private
 */
router.get('/runs/:runId/matches', authenticateToken, async (req, res) => {
  try {
    const { runId } = req.params;
    const { match_status, has_discrepancy, limit = 100, offset = 0 } = req.query;
    
    const where = { run_id: runId };
    if (match_status) where.match_status = match_status;
    if (has_discrepancy !== undefined) where.has_discrepancy = has_discrepancy === 'true';
    
    const matches = await db.ReconTransactionMatch.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'ASC']]
    });
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('[Reconciliation API] Failed to get matches', {
      error: error.message,
      runId: req.params.runId
    });
    res.status(500).json({
      error: 'Failed to retrieve matches',
      message: error.message
    });
  }
});

/**
 * @route   PATCH /api/v1/reconciliation/matches/:id/resolve
 * @desc    Manually resolve a discrepancy
 * @access  Private (Admin only)
 */
router.patch('/matches/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;
    
    const match = await db.ReconTransactionMatch.findByPk(id);
    
    if (!match) {
      return res.status(404).json({
        error: 'Match not found'
      });
    }
    
    await match.update({
      resolution_status: 'resolved',
      resolution_method: 'manual_adjustment',
      resolution_notes,
      resolved_at: new Date(),
      resolved_by: req.user.id
    });
    
    logger.info('[Reconciliation API] Discrepancy resolved manually', {
      match_id: id,
      resolved_by: req.user.id
    });
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    logger.error('[Reconciliation API] Failed to resolve match', {
      error: error.message,
      matchId: req.params.id
    });
    res.status(500).json({
      error: 'Failed to resolve match',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/reconciliation/suppliers
 * @desc    List supplier configurations
 * @access  Private
 */
router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await db.ReconSupplierConfig.findAll({
      where: { is_active: true },
      attributes: ['id', 'supplier_name', 'supplier_code', 'ingestion_method', 
                   'file_format', 'last_successful_run_at', 'is_active']
    });
    
    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    logger.error('[Reconciliation API] Failed to list suppliers', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to retrieve suppliers',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/reconciliation/analytics/summary
 * @desc    Get reconciliation analytics summary
 * @access  Private
 */
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    
    const runs = await db.ReconRun.findAll({
      where: {
        completed_at: { [db.Sequelize.Op.gte]: since },
        status: 'completed'
      },
      include: [{
        model: db.ReconSupplierConfig,
        as: 'supplier',
        attributes: ['supplier_name']
      }]
    });
    
    const summary = {
      total_runs: runs.length,
      average_match_rate: runs.reduce((sum, r) => sum + r.getMatchRate(), 0) / runs.length || 0,
      total_transactions: runs.reduce((sum, r) => sum + r.total_transactions, 0),
      total_discrepancies: runs.reduce((sum, r) => sum + r.manual_review_required, 0),
      by_supplier: {}
    };
    
    runs.forEach(run => {
      const supplierName = run.supplier.supplier_name;
      if (!summary.by_supplier[supplierName]) {
        summary.by_supplier[supplierName] = {
          runs: 0,
          avg_match_rate: 0,
          total_variance: 0
        };
      }
      
      summary.by_supplier[supplierName].runs++;
      summary.by_supplier[supplierName].avg_match_rate += run.getMatchRate();
      summary.by_supplier[supplierName].total_variance += parseFloat(run.amount_variance);
    });
    
    // Calculate averages
    Object.keys(summary.by_supplier).forEach(supplier => {
      const data = summary.by_supplier[supplier];
      data.avg_match_rate = (data.avg_match_rate / data.runs).toFixed(2);
      data.total_variance = data.total_variance.toFixed(2);
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('[Reconciliation API] Failed to get analytics', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to retrieve analytics',
      message: error.message
    });
  }
});

module.exports = router;
