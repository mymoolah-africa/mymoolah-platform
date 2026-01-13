/**
 * Report Generator
 * 
 * Generates comprehensive reconciliation reports in multiple formats:
 * - PDF: Executive summary for management
 * - Excel: Detailed transaction list for finance team
 * - JSON: Raw data for systems integration
 * 
 * @module services/reconciliation/ReportGenerator
 */

'use strict';

const logger = require('../../utils/logger');
const db = require('../../models');
const path = require('path');
const fs = require('fs').promises;
const ExcelJS = require('exceljs');
const moment = require('moment');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports/reconciliation');
  }
  
  /**
   * Generate reconciliation reports
   * 
   * @param {Object} reconRun - Reconciliation run record
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Report file paths
   */
  async generate(reconRun, options = {}) {
    try {
      logger.info('[ReportGenerator] Generating reports', {
        run_id: reconRun.run_id,
        formats: options.formats || ['pdf', 'excel', 'json']
      });
      
      // Ensure reports directory exists
      await fs.mkdir(this.reportsDir, { recursive: true });
      
      const formats = options.formats || ['excel', 'json'];
      const reportPaths = {};
      
      // Fetch full run data with associations
      const fullRun = await db.ReconRun.findOne({
        where: { run_id: reconRun.run_id },
        include: [
          {
            model: db.ReconSupplierConfig,
            as: 'supplier'
          },
          {
            model: db.ReconTransactionMatch,
            as: 'matches'
          }
        ]
      });
      
      // Generate Excel report
      if (formats.includes('excel')) {
        reportPaths.excel = await this.generateExcelReport(fullRun);
      }
      
      // Generate JSON report
      if (formats.includes('json')) {
        reportPaths.json = await this.generateJSONReport(fullRun);
      }
      
      // PDF generation would require additional library (pdfkit, puppeteer, etc.)
      // For now, we'll focus on Excel and JSON which are most useful
      
      logger.info('[ReportGenerator] Reports generated', {
        run_id: reconRun.run_id,
        reports: reportPaths
      });
      
      return reportPaths;
    } catch (error) {
      logger.error('[ReportGenerator] Report generation failed', {
        error: error.message,
        run_id: reconRun.run_id
      });
      throw error;
    }
  }
  
  /**
   * Generate Excel report
   */
  async generateExcelReport(reconRun) {
    const filename = `recon_${reconRun.supplier.supplier_code}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    const filepath = path.join(this.reportsDir, filename);
    
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];
    
    summarySheet.addRows([
      { metric: 'Supplier', value: reconRun.supplier.supplier_name },
      { metric: 'Run ID', value: reconRun.run_id },
      { metric: 'File Name', value: reconRun.file_name },
      { metric: 'File Received', value: moment(reconRun.file_received_at).format('YYYY-MM-DD HH:mm:ss') },
      { metric: 'Processing Time (ms)', value: reconRun.processing_time_ms },
      { metric: 'Status', value: reconRun.status },
      { metric: '', value: '' },
      { metric: 'Total Transactions', value: reconRun.total_transactions },
      { metric: 'Exact Matches', value: reconRun.matched_exact },
      { metric: 'Fuzzy Matches', value: reconRun.matched_fuzzy },
      { metric: 'Unmatched MMTP', value: reconRun.unmatched_mmtp },
      { metric: 'Unmatched Supplier', value: reconRun.unmatched_supplier },
      { metric: 'Match Rate', value: `${reconRun.getMatchRate().toFixed(2)}%` },
      { metric: '', value: '' },
      { metric: 'Total Amount MMTP', value: `R${parseFloat(reconRun.total_amount_mmtp).toFixed(2)}` },
      { metric: 'Total Amount Supplier', value: `R${parseFloat(reconRun.total_amount_supplier).toFixed(2)}` },
      { metric: 'Amount Variance', value: `R${parseFloat(reconRun.amount_variance).toFixed(2)}` },
      { metric: '', value: '' },
      { metric: 'Total Commission MMTP', value: `R${parseFloat(reconRun.total_commission_mmtp).toFixed(2)}` },
      { metric: 'Total Commission Supplier', value: `R${parseFloat(reconRun.total_commission_supplier).toFixed(2)}` },
      { metric: 'Commission Variance', value: `R${parseFloat(reconRun.commission_variance).toFixed(2)}` },
      { metric: '', value: '' },
      { metric: 'Auto Resolved', value: reconRun.auto_resolved },
      { metric: 'Manual Review Required', value: reconRun.manual_review_required }
    ]);
    
    // Transactions sheet
    const transactionsSheet = workbook.addWorksheet('Transactions');
    transactionsSheet.columns = [
      { header: 'Match Status', key: 'match_status', width: 20 },
      { header: 'MMTP Txn ID', key: 'mmtp_txn_id', width: 20 },
      { header: 'Supplier Txn ID', key: 'supplier_txn_id', width: 20 },
      { header: 'MMTP Amount', key: 'mmtp_amount', width: 15 },
      { header: 'Supplier Amount', key: 'supplier_amount', width: 15 },
      { header: 'Amount Diff', key: 'amount_diff', width: 15 },
      { header: 'MMTP Commission', key: 'mmtp_commission', width: 15 },
      { header: 'Supplier Commission', key: 'supplier_commission', width: 15 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Has Discrepancy', key: 'has_discrepancy', width: 15 },
      { header: 'Discrepancy Type', key: 'discrepancy_type', width: 30 },
      { header: 'Resolution Status', key: 'resolution_status', width: 20 }
    ];
    
    reconRun.matches.forEach(match => {
      const amountDiff = match.mmtp_amount && match.supplier_amount
        ? (parseFloat(match.mmtp_amount) - parseFloat(match.supplier_amount)).toFixed(2)
        : '';
      
      transactionsSheet.addRow({
        match_status: match.match_status,
        mmtp_txn_id: match.mmtp_transaction_id || '',
        supplier_txn_id: match.supplier_transaction_id || '',
        mmtp_amount: match.mmtp_amount ? `R${parseFloat(match.mmtp_amount).toFixed(2)}` : '',
        supplier_amount: match.supplier_amount ? `R${parseFloat(match.supplier_amount).toFixed(2)}` : '',
        amount_diff: amountDiff ? `R${amountDiff}` : '',
        mmtp_commission: match.mmtp_commission ? `R${parseFloat(match.mmtp_commission).toFixed(2)}` : '',
        supplier_commission: match.supplier_commission ? `R${parseFloat(match.supplier_commission).toFixed(2)}` : '',
        product: match.mmtp_product_name || match.supplier_product_name || '',
        has_discrepancy: match.has_discrepancy ? 'YES' : 'NO',
        discrepancy_type: match.discrepancy_type || '',
        resolution_status: match.resolution_status
      });
    });
    
    // Discrepancies sheet (only rows with discrepancies)
    const discrepancies = reconRun.matches.filter(m => m.has_discrepancy);
    if (discrepancies.length > 0) {
      const discSheet = workbook.addWorksheet('Discrepancies');
      discSheet.columns = transactionsSheet.columns;
      
      discrepancies.forEach(match => {
        const amountDiff = match.mmtp_amount && match.supplier_amount
          ? (parseFloat(match.mmtp_amount) - parseFloat(match.supplier_amount)).toFixed(2)
          : '';
        
        discSheet.addRow({
          match_status: match.match_status,
          mmtp_txn_id: match.mmtp_transaction_id || '',
          supplier_txn_id: match.supplier_transaction_id || '',
          mmtp_amount: match.mmtp_amount ? `R${parseFloat(match.mmtp_amount).toFixed(2)}` : '',
          supplier_amount: match.supplier_amount ? `R${parseFloat(match.supplier_amount).toFixed(2)}` : '',
          amount_diff: amountDiff ? `R${amountDiff}` : '',
          mmtp_commission: match.mmtp_commission ? `R${parseFloat(match.mmtp_commission).toFixed(2)}` : '',
          supplier_commission: match.supplier_commission ? `R${parseFloat(match.supplier_commission).toFixed(2)}` : '',
          product: match.mmtp_product_name || match.supplier_product_name || '',
          has_discrepancy: 'YES',
          discrepancy_type: match.discrepancy_type || '',
          resolution_status: match.resolution_status
        });
      });
    }
    
    await workbook.xlsx.writeFile(filepath);
    
    logger.info('[ReportGenerator] Excel report generated', { filepath });
    return filepath;
  }
  
  /**
   * Generate JSON report
   */
  async generateJSONReport(reconRun) {
    const filename = `recon_${reconRun.supplier.supplier_code}_${moment().format('YYYYMMDD_HHmmss')}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    const report = {
      run_id: reconRun.run_id,
      supplier: {
        id: reconRun.supplier.id,
        name: reconRun.supplier.supplier_name,
        code: reconRun.supplier.supplier_code
      },
      file: {
        name: reconRun.file_name,
        hash: reconRun.file_hash,
        size: reconRun.file_size,
        received_at: reconRun.file_received_at
      },
      processing: {
        status: reconRun.status,
        started_at: reconRun.started_at,
        completed_at: reconRun.completed_at,
        processing_time_ms: reconRun.processing_time_ms
      },
      summary: {
        total_transactions: reconRun.total_transactions,
        matched_exact: reconRun.matched_exact,
        matched_fuzzy: reconRun.matched_fuzzy,
        unmatched_mmtp: reconRun.unmatched_mmtp,
        unmatched_supplier: reconRun.unmatched_supplier,
        match_rate: reconRun.getMatchRate(),
        auto_resolved: reconRun.auto_resolved,
        manual_review_required: reconRun.manual_review_required
      },
      financial: {
        total_amount_mmtp: parseFloat(reconRun.total_amount_mmtp),
        total_amount_supplier: parseFloat(reconRun.total_amount_supplier),
        amount_variance: parseFloat(reconRun.amount_variance),
        total_commission_mmtp: parseFloat(reconRun.total_commission_mmtp),
        total_commission_supplier: parseFloat(reconRun.total_commission_supplier),
        commission_variance: parseFloat(reconRun.commission_variance)
      },
      discrepancies: reconRun.discrepancies,
      matches: reconRun.matches.map(match => ({
        match_status: match.match_status,
        match_confidence: match.match_confidence ? parseFloat(match.match_confidence) : null,
        mmtp_transaction_id: match.mmtp_transaction_id,
        supplier_transaction_id: match.supplier_transaction_id,
        mmtp_amount: match.mmtp_amount ? parseFloat(match.mmtp_amount) : null,
        supplier_amount: match.supplier_amount ? parseFloat(match.supplier_amount) : null,
        has_discrepancy: match.has_discrepancy,
        discrepancy_type: match.discrepancy_type,
        resolution_status: match.resolution_status
      }))
    };
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');
    
    logger.info('[ReportGenerator] JSON report generated', { filepath });
    return filepath;
  }
}

module.exports = ReportGenerator;
