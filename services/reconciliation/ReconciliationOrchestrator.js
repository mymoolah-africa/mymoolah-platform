/**
 * Reconciliation Orchestrator
 * 
 * Main orchestrator for automated reconciliation process.
 * Coordinates file ingestion, parsing, matching, discrepancy detection,
 * resolution, and reporting.
 * 
 * @module services/reconciliation/ReconciliationOrchestrator
 */

'use strict';

const logger = require('../../utils/logger');
const db = require('../../models');
const FileParserService = require('./FileParserService');
const MatchingEngine = require('./MatchingEngine');
const DiscrepancyDetector = require('./DiscrepancyDetector');
const SelfHealingResolver = require('./SelfHealingResolver');
const CommissionReconciliation = require('./CommissionReconciliation');
const ReportGenerator = require('./ReportGenerator');
const AlertService = require('./AlertService');
const AuditLogger = require('./AuditLogger');

class ReconciliationOrchestrator {
  constructor() {
    this.fileParser = new FileParserService();
    this.matchingEngine = new MatchingEngine();
    this.discrepancyDetector = new DiscrepancyDetector();
    this.selfHealingResolver = new SelfHealingResolver();
    this.commissionRecon = new CommissionReconciliation();
    this.reportGenerator = new ReportGenerator();
    this.alertService = new AlertService();
    this.auditLogger = new AuditLogger();
  }
  
  /**
   * Orchestrate full reconciliation process
   * 
   * @param {string} filePath - Path to reconciliation file
   * @param {number} supplierId - Supplier configuration ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Reconciliation results
   */
  async reconcile(filePath, supplierId, options = {}) {
    const startTime = Date.now();
    let reconRun = null;
    let transaction = null;
    
    try {
      // Load supplier configuration
      const supplierConfig = await db.ReconSupplierConfig.findByPk(supplierId);
      if (!supplierConfig) {
        throw new Error(`Supplier configuration not found: ${supplierId}`);
      }
      
      if (!supplierConfig.is_active) {
        throw new Error(`Supplier is inactive: ${supplierConfig.supplier_name}`);
      }
      
      logger.info(`[Recon] Starting reconciliation for ${supplierConfig.supplier_name}`, {
        filePath,
        supplierId
      });
      
      // Calculate file hash for idempotency
      const fileHash = await this.fileParser.calculateFileHash(filePath);
      const fileSize = await this.fileParser.getFileSize(filePath);
      
      // Check if file already processed (idempotency)
      const existingRun = await db.ReconRun.findOne({
        where: {
          supplier_id: supplierId,
          file_hash: fileHash
        }
      });
      
      if (existingRun && !options.forceReprocess) {
        logger.warn(`[Recon] File already processed: ${filePath}`, {
          existingRunId: existingRun.run_id
        });
        return {
          success: false,
          message: 'File already processed',
          run_id: existingRun.run_id
        };
      }
      
      // Create reconciliation run record
      transaction = await db.sequelize.transaction();
      
      reconRun = await db.ReconRun.create({
        supplier_id: supplierId,
        file_name: require('path').basename(filePath),
        file_hash: fileHash,
        file_size: fileSize,
        file_received_at: new Date(),
        status: 'processing',
        started_at: new Date(),
        created_by: options.userId || 'system'
      }, { transaction });
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'file_received',
        actor_type: 'system',
        actor_id: options.userId || 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          file_name: reconRun.file_name,
          file_hash: fileHash,
          file_size: fileSize,
          supplier: supplierConfig.supplier_name
        }
      }, transaction);
      
      await transaction.commit();
      transaction = null;
      
      // STEP 1: Parse supplier file
      logger.info(`[Recon] Parsing file: ${filePath}`);
      const parsedData = await this.fileParser.parse(filePath, supplierConfig);
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'file_parsed',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          transactions_parsed: parsedData.body.length,
          header: parsedData.header,
          footer: parsedData.footer
        }
      });
      
      // STEP 2: Fetch MMTP transactions for the same period
      logger.info(`[Recon] Fetching MMTP transactions`);
      const mmtpTransactions = await this.fetchMMTPTransactions(
        supplierConfig,
        parsedData
      );
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'mmtp_transactions_fetched',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          transactions_fetched: mmtpTransactions.length
        }
      });
      
      // STEP 3: Match transactions
      logger.info(`[Recon] Matching transactions`);
      const matchResults = await this.matchingEngine.match(
        mmtpTransactions,
        parsedData.body,
        supplierConfig,
        reconRun.run_id
      );
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'matching_completed',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          exact_matches: matchResults.exactMatches,
          fuzzy_matches: matchResults.fuzzyMatches,
          unmatched_mmtp: matchResults.unmatchedMMTP.length,
          unmatched_supplier: matchResults.unmatchedSupplier.length
        }
      });
      
      // STEP 4: Detect discrepancies
      logger.info(`[Recon] Detecting discrepancies`);
      const discrepancies = await this.discrepancyDetector.detect(
        matchResults.matches,
        reconRun.run_id
      );
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'discrepancies_detected',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          total_discrepancies: discrepancies.length,
          by_type: this.groupByType(discrepancies)
        }
      });
      
      // STEP 5: Self-healing resolution
      logger.info(`[Recon] Applying self-healing resolution`);
      const resolutionResults = await this.selfHealingResolver.resolve(
        discrepancies,
        reconRun.run_id
      );
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'self_healing_completed',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          auto_resolved: resolutionResults.autoResolved,
          manual_review: resolutionResults.manualReview,
          escalated: resolutionResults.escalated
        }
      });
      
      // STEP 6: Commission reconciliation
      logger.info(`[Recon] Reconciling commissions`);
      const commissionResults = await this.commissionRecon.reconcile(
        matchResults.matches,
        supplierConfig,
        reconRun.run_id
      );
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'commission_reconciled',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: commissionResults
      });
      
      // STEP 7: Calculate totals and update recon run
      const processingTime = Date.now() - startTime;
      
      transaction = await db.sequelize.transaction();
      
      await reconRun.update({
        status: 'completed',
        completed_at: new Date(),
        total_transactions: parsedData.body.length,
        matched_exact: matchResults.exactMatches,
        matched_fuzzy: matchResults.fuzzyMatches,
        unmatched_mmtp: matchResults.unmatchedMMTP.length,
        unmatched_supplier: matchResults.unmatchedSupplier.length,
        auto_resolved: resolutionResults.autoResolved,
        manual_review_required: resolutionResults.manualReview,
        total_amount_mmtp: matchResults.totalAmountMMTP,
        total_amount_supplier: matchResults.totalAmountSupplier,
        amount_variance: matchResults.totalAmountMMTP - matchResults.totalAmountSupplier,
        total_commission_mmtp: commissionResults.totalCommissionMMTP,
        total_commission_supplier: commissionResults.totalCommissionSupplier,
        commission_variance: commissionResults.variance,
        discrepancies: {
          summary: this.groupByType(discrepancies),
          unmatched_mmtp_ids: matchResults.unmatchedMMTP.map(t => t.id),
          unmatched_supplier_ids: matchResults.unmatchedSupplier.map(t => t.transaction_id)
        },
        processing_time_ms: processingTime
      }, { transaction });
      
      await transaction.commit();
      transaction = null;
      
      // STEP 8: Generate report
      logger.info(`[Recon] Generating report`);
      const reportPaths = await this.reportGenerator.generate(reconRun, {
        formats: ['pdf', 'excel', 'json']
      });
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'report_generated',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          report_paths: reportPaths
        }
      });
      
      // STEP 9: Send alerts if needed
      const shouldAlert = this.shouldSendAlert(reconRun, supplierConfig);
      
      if (shouldAlert) {
        logger.info(`[Recon] Sending alerts`);
        await this.alertService.sendReconAlert(reconRun, supplierConfig, {
          reports: reportPaths,
          severity: this.getAlertSeverity(reconRun, supplierConfig)
        });
        
        await reconRun.update({
          alerts_sent: {
            email: supplierConfig.alert_email,
            sent_at: new Date(),
            severity: this.getAlertSeverity(reconRun, supplierConfig)
          }
        });
      }
      
      // Update supplier last successful run
      await supplierConfig.update({
        last_successful_run_at: new Date()
      });
      
      await this.auditLogger.log({
        run_id: reconRun.run_id,
        event_type: 'reconciliation_completed',
        actor_type: 'system',
        entity_type: 'recon_run',
        entity_id: reconRun.run_id,
        event_data: {
          status: 'success',
          match_rate: reconRun.getMatchRate(),
          passed: reconRun.isPassed(supplierConfig.critical_variance_threshold),
          processing_time_ms: processingTime
        }
      });
      
      logger.info(`[Recon] Reconciliation completed successfully`, {
        run_id: reconRun.run_id,
        match_rate: `${reconRun.getMatchRate().toFixed(2)}%`,
        processing_time_ms: processingTime
      });
      
      return {
        success: true,
        run_id: reconRun.run_id,
        match_rate: reconRun.getMatchRate(),
        passed: reconRun.isPassed(supplierConfig.critical_variance_threshold),
        summary: {
          total_transactions: reconRun.total_transactions,
          matched: reconRun.matched_exact + reconRun.matched_fuzzy,
          unmatched: reconRun.unmatched_mmtp + reconRun.unmatched_supplier,
          amount_variance: parseFloat(reconRun.amount_variance),
          commission_variance: parseFloat(reconRun.commission_variance)
        },
        reports: reportPaths
      };
      
    } catch (error) {
      logger.error('[Recon] Reconciliation failed', {
        error: error.message,
        stack: error.stack,
        filePath,
        supplierId
      });
      
      if (transaction) {
        await transaction.rollback();
      }
      
      if (reconRun) {
        await reconRun.update({
          status: 'failed',
          error_log: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date()
          }
        });
        
        await this.auditLogger.log({
          run_id: reconRun.run_id,
          event_type: 'reconciliation_failed',
          actor_type: 'system',
          entity_type: 'recon_run',
          entity_id: reconRun.run_id,
          event_data: {
            error: error.message,
            stack: error.stack
          }
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch MMTP transactions for reconciliation period
   */
  async fetchMMTPTransactions(supplierConfig, parsedData) {
    // Extract date range from parsed data
    const settlementDate = parsedData.header.settlement_date;
    const startDate = new Date(settlementDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(settlementDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Fetch transactions from database
    const transactions = await db.sequelize.query(`
      SELECT 
        t.transaction_id,
        t.order_id,
        t.reference_number as reference,
        t.amount,
        t.status,
        t.created_at as timestamp,
        p.id as product_id,
        p.name as product_name,
        p.supplier_id,
        pv.supplier_product_code,
        (
          SELECT SUM(amount)
          FROM journal_entries je
          WHERE je.transaction_id = t.transaction_id
            AND je.account_code = '7000'
            AND je.entry_type = 'credit'
        ) as commission
      FROM transactions t
      LEFT JOIN product_variants pv ON t.product_variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE t.created_at BETWEEN :startDate AND :endDate
        AND t.status IN ('completed', 'pending')
        AND p.supplier_id IN (
          SELECT id FROM suppliers WHERE name = :supplierName
        )
      ORDER BY t.created_at ASC
    `, {
      replacements: {
        startDate,
        endDate,
        supplierName: supplierConfig.supplier_name
      },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    return transactions;
  }
  
  /**
   * Group discrepancies by type
   */
  groupByType(discrepancies) {
    return discrepancies.reduce((acc, disc) => {
      const type = disc.discrepancy_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }
  
  /**
   * Determine if alert should be sent
   */
  shouldSendAlert(reconRun, supplierConfig) {
    const matchRate = reconRun.getMatchRate();
    const variance = Math.abs(parseFloat(reconRun.amount_variance || 0));
    const threshold = parseFloat(supplierConfig.critical_variance_threshold || 1000);
    
    // Alert if match rate <99% or variance exceeds threshold
    return matchRate < 99.0 || variance > threshold || reconRun.status === 'failed';
  }
  
  /**
   * Get alert severity level
   */
  getAlertSeverity(reconRun, supplierConfig) {
    const matchRate = reconRun.getMatchRate();
    const variance = Math.abs(parseFloat(reconRun.amount_variance || 0));
    const threshold = parseFloat(supplierConfig.critical_variance_threshold || 1000);
    
    if (reconRun.status === 'failed') return 'critical';
    if (matchRate < 95.0 || variance > threshold * 2) return 'critical';
    if (matchRate < 98.0 || variance > threshold) return 'high';
    if (matchRate < 99.0) return 'medium';
    return 'low';
  }
}

module.exports = ReconciliationOrchestrator;
