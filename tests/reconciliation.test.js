/**
 * Reconciliation System Tests
 * 
 * Comprehensive test suite for the automated reconciliation system.
 * 
 * Run: npm test tests/reconciliation.test.js
 * 
 * @author MMTP Agent
 * @date 2026-01-13
 */

'use strict';

const { expect } = require('chai');
const db = require('../models');
const ReconciliationOrchestrator = require('../services/reconciliation/ReconciliationOrchestrator');
const MatchingEngine = require('../services/reconciliation/MatchingEngine');
const DiscrepancyDetector = require('../services/reconciliation/DiscrepancyDetector');
const SelfHealingResolver = require('../services/reconciliation/SelfHealingResolver');
const FileParserService = require('../services/reconciliation/FileParserService');
const MobileMartAdapter = require('../services/reconciliation/adapters/MobileMartAdapter');

describe('Reconciliation System', () => {
  let supplierConfig;
  
  before(async () => {
    // Create test supplier config
    supplierConfig = await db.ReconSupplierConfig.create({
      supplier_name: 'Test Supplier',
      supplier_code: 'TEST',
      ingestion_method: 'sftp',
      file_format: 'csv',
      delimiter: ',',
      has_header: true,
      schema_definition: {
        header: {
          row: 0,
          fields: {
            merchant_id: { column: 0, type: 'string', required: true },
            settlement_date: { column: 1, type: 'date', format: 'YYYY-MM-DD', required: true }
          }
        },
        body: {
          start_row: 1,
          fields: {
            transaction_id: { column: 0, type: 'string', required: true, mapping: 'supplier_transaction_id' },
            amount: { column: 1, type: 'decimal', required: true, mapping: 'supplier_amount' }
          }
        },
        footer: {
          row_offset: -1,
          fields: {
            total_count: { column: 0, type: 'integer', required: true },
            total_amount: { column: 1, type: 'decimal', required: true }
          }
        }
      },
      adapter_class: 'MobileMartAdapter',
      matching_rules: {
        primary: ['transaction_id'],
        secondary: ['amount', 'timestamp'],
        fuzzy_match: {
          enabled: true,
          min_confidence: 0.85
        }
      },
      timestamp_tolerance_seconds: 300,
      commission_calculation: {
        method: 'from_file',
        field: 'commission'
      },
      alert_email: ['test@mymoolah.africa']
    });
  });
  
  after(async () => {
    // Clean up
    if (supplierConfig) {
      await db.ReconRun.destroy({ where: { supplier_id: supplierConfig.id } });
      await supplierConfig.destroy();
    }
  });
  
  describe('Matching Engine', () => {
    let matchingEngine;
    
    beforeEach(() => {
      matchingEngine = new MatchingEngine();
    });
    
    it('should match transactions exactly by transaction ID', async () => {
      const mmtpTransactions = [
        {
          transaction_id: 'TXN001',
          amount: 100.00,
          timestamp: new Date('2026-01-13T10:00:00Z')
        }
      ];
      
      const supplierRecords = [
        {
          supplier_transaction_id: 'TXN001',
          supplier_amount: 100.00,
          supplier_timestamp: new Date('2026-01-13T10:00:00Z')
        }
      ];
      
      const result = await matchingEngine.match(
        mmtpTransactions,
        supplierRecords,
        supplierConfig,
        'test-run-id'
      );
      
      expect(result.exactMatches).to.equal(1);
      expect(result.fuzzyMatches).to.equal(0);
      expect(result.unmatchedMMTP).to.be.empty;
      expect(result.unmatchedSupplier).to.be.empty;
    });
    
    it('should detect unmatched transactions', async () => {
      const mmtpTransactions = [
        {
          transaction_id: 'TXN001',
          amount: 100.00
        },
        {
          transaction_id: 'TXN002',
          amount: 200.00
        }
      ];
      
      const supplierRecords = [
        {
          supplier_transaction_id: 'TXN001',
          supplier_amount: 100.00
        },
        {
          supplier_transaction_id: 'TXN003',
          supplier_amount: 300.00
        }
      ];
      
      const result = await matchingEngine.match(
        mmtpTransactions,
        supplierRecords,
        supplierConfig,
        'test-run-id'
      );
      
      expect(result.exactMatches).to.equal(1);
      expect(result.unmatchedMMTP).to.have.lengthOf(1);
      expect(result.unmatchedMMTP[0].transaction_id).to.equal('TXN002');
      expect(result.unmatchedSupplier).to.have.lengthOf(1);
      expect(result.unmatchedSupplier[0].supplier_transaction_id).to.equal('TXN003');
    });
    
    it('should calculate string similarity correctly', () => {
      const similarity1 = matchingEngine.calculateStringSimilarity('hello', 'hello');
      expect(similarity1).to.equal(1.0);
      
      const similarity2 = matchingEngine.calculateStringSimilarity('hello', 'hallo');
      expect(similarity2).to.be.greaterThan(0.7);
      
      const similarity3 = matchingEngine.calculateStringSimilarity('hello', 'world');
      expect(similarity3).to.be.lessThan(0.5);
    });
  });
  
  describe('Discrepancy Detector', () => {
    let discrepancyDetector;
    
    beforeEach(() => {
      discrepancyDetector = new DiscrepancyDetector();
    });
    
    it('should detect amount mismatch', async () => {
      const matches = [
        {
          id: 1,
          match_status: 'exact_match',
          mmtp_amount: 100.00,
          supplier_amount: 105.00,
          mmtp_status: 'completed',
          supplier_status: 'completed'
        }
      ];
      
      const discrepancies = await discrepancyDetector.detect(matches, 'test-run-id');
      
      expect(discrepancies).to.have.lengthOf(1);
      expect(discrepancies[0].discrepancy_type).to.include('amount_mismatch');
      expect(discrepancies[0].discrepancy_details.amount_diff).to.equal('-5.00');
    });
    
    it('should detect status mismatch', async () => {
      const matches = [
        {
          id: 1,
          match_status: 'exact_match',
          mmtp_amount: 100.00,
          supplier_amount: 100.00,
          mmtp_status: 'pending',
          supplier_status: 'failed'
        }
      ];
      
      const discrepancies = await discrepancyDetector.detect(matches, 'test-run-id');
      
      expect(discrepancies).to.have.lengthOf(1);
      expect(discrepancies[0].discrepancy_type).to.include('status_mismatch');
    });
    
    it('should not flag minor discrepancies (<1 cent)', async () => {
      const matches = [
        {
          id: 1,
          match_status: 'exact_match',
          mmtp_amount: 100.00,
          supplier_amount: 100.005, // Rounding difference
          mmtp_status: 'completed',
          supplier_status: 'completed'
        }
      ];
      
      const discrepancies = await discrepancyDetector.detect(matches, 'test-run-id');
      
      expect(discrepancies).to.be.empty;
    });
  });
  
  describe('Self-Healing Resolver', () => {
    let resolver;
    
    beforeEach(() => {
      resolver = new SelfHealingResolver();
    });
    
    it('should auto-resolve timing differences <5 minutes', () => {
      const discrepancy = {
        id: 1,
        discrepancy_type: 'timestamp_diff',
        discrepancy_details: {
          timestamp_diff_seconds: 120 // 2 minutes
        }
      };
      
      const resolution = resolver.attemptAutoResolve(discrepancy);
      
      expect(resolution.resolved).to.be.true;
      expect(resolution.method).to.equal('auto_timing');
    });
    
    it('should auto-resolve rounding errors <R0.10', () => {
      const discrepancy = {
        id: 1,
        discrepancy_type: 'amount_mismatch',
        discrepancy_details: {
          amount_diff: '0.05'
        }
      };
      
      const resolution = resolver.attemptAutoResolve(discrepancy);
      
      expect(resolution.resolved).to.be.true;
      expect(resolution.method).to.equal('auto_rounding');
    });
    
    it('should escalate large amount discrepancies', () => {
      const discrepancy = {
        id: 1,
        discrepancy_type: 'amount_mismatch',
        discrepancy_details: {
          amount_diff: '150.00' // >R100
        }
      };
      
      const resolution = resolver.attemptAutoResolve(discrepancy);
      
      expect(resolution.resolved).to.be.false;
      expect(resolution.escalate).to.be.true;
    });
    
    it('should require manual review for complex discrepancies', () => {
      const discrepancy = {
        id: 1,
        discrepancy_type: 'amount_mismatch,status_mismatch,product_mismatch',
        discrepancy_details: {
          amount_diff: '5.00'
        }
      };
      
      const resolution = resolver.attemptAutoResolve(discrepancy);
      
      expect(resolution.resolved).to.be.false;
      expect(resolution.escalate).to.be.true; // Multiple issues
    });
  });
  
  describe('File Parser Service', () => {
    let fileParser;
    
    beforeEach(() => {
      fileParser = new FileParserService();
    });
    
    it('should get correct adapter by class name', () => {
      const adapter = fileParser.getAdapter('MobileMartAdapter');
      expect(adapter).to.be.instanceOf(MobileMartAdapter);
    });
    
    it('should throw error for unknown adapter', () => {
      expect(() => {
        fileParser.getAdapter('UnknownAdapter');
      }).to.throw('Adapter not found');
    });
    
    it('should validate parsed data correctly', () => {
      const validData = {
        header: { merchant_id: 'TEST001', settlement_date: '2026-01-13' },
        body: [
          { transaction_id: 'TXN001', amount: 100.00 },
          { transaction_id: 'TXN002', amount: 200.00 }
        ],
        footer: { total_count: 2, total_amount: 300.00 }
      };
      
      expect(() => {
        fileParser.validateParsedData(validData, supplierConfig);
      }).to.not.throw();
    });
    
    it('should detect count mismatch', () => {
      const invalidData = {
        header: { merchant_id: 'TEST001' },
        body: [
          { transaction_id: 'TXN001', amount: 100.00 }
        ],
        footer: { total_count: 2, total_amount: 100.00 } // Count mismatch
      };
      
      expect(() => {
        fileParser.validateParsedData(invalidData, supplierConfig);
      }).to.throw('Transaction count mismatch');
    });
    
    it('should detect amount mismatch', () => {
      const invalidData = {
        header: { merchant_id: 'TEST001' },
        body: [
          { transaction_id: 'TXN001', amount: 100.00 },
          { transaction_id: 'TXN002', amount: 200.00 }
        ],
        footer: { total_count: 2, total_amount: 400.00 } // Amount mismatch
      };
      
      expect(() => {
        fileParser.validateParsedData(invalidData, supplierConfig);
      }).to.throw('Amount mismatch');
    });
  });
  
  describe('MobileMart Adapter', () => {
    let adapter;
    
    beforeEach(() => {
      adapter = new MobileMartAdapter();
    });
    
    it('should extract integer field correctly', () => {
      const row = ['123', 'test'];
      const fieldDef = { column: 0 };
      
      const value = adapter.extractIntegerField(row, fieldDef, 'test_field');
      expect(value).to.equal(123);
    });
    
    it('should throw error for invalid integer', () => {
      const row = ['abc', 'test'];
      const fieldDef = { column: 0 };
      
      expect(() => {
        adapter.extractIntegerField(row, fieldDef, 'test_field');
      }).to.throw('Invalid integer format');
    });
    
    it('should extract decimal field correctly', () => {
      const row = ['123.45', 'test'];
      const fieldDef = { column: 0 };
      
      const value = adapter.extractDecimalField(row, fieldDef, 'test_field');
      expect(value).to.equal('123.45');
    });
    
    it('should handle optional fields', () => {
      const row = ['', 'test'];
      const fieldDef = { column: 0 };
      
      const value = adapter.extractField(row, fieldDef, 'test_field', false);
      expect(value).to.be.null;
    });
  });
  
  describe('Integration Tests', () => {
    it('should create recon run with idempotency', async () => {
      const run1 = await db.ReconRun.create({
        supplier_id: supplierConfig.id,
        file_name: 'test_recon.csv',
        file_hash: 'test-hash-123',
        file_size: 1024,
        file_received_at: new Date()
      });
      
      // Try to create duplicate (should fail unique constraint)
      try {
        await db.ReconRun.create({
          supplier_id: supplierConfig.id,
          file_name: 'test_recon.csv',
          file_hash: 'test-hash-123',
          file_size: 1024,
          file_received_at: new Date()
        });
        expect.fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.name).to.equal('SequelizeUniqueConstraintError');
      }
      
      await run1.destroy();
    });
    
    it('should calculate match rate correctly', async () => {
      const run = await db.ReconRun.create({
        supplier_id: supplierConfig.id,
        file_name: 'test.csv',
        file_hash: 'hash-001',
        file_size: 1024,
        file_received_at: new Date(),
        total_transactions: 100,
        matched_exact: 90,
        matched_fuzzy: 5,
        unmatched_mmtp: 3,
        unmatched_supplier: 2
      });
      
      const matchRate = run.getMatchRate();
      expect(matchRate).to.equal(95.0); // (90 + 5) / 100 * 100
      
      await run.destroy();
    });
    
    it('should determine pass/fail correctly', async () => {
      const passingRun = await db.ReconRun.create({
        supplier_id: supplierConfig.id,
        file_name: 'test.csv',
        file_hash: 'hash-002',
        file_size: 1024,
        file_received_at: new Date(),
        total_transactions: 100,
        matched_exact: 99,
        matched_fuzzy: 1,
        amount_variance: 5.00
      });
      
      expect(passingRun.isPassed(1000.00)).to.be.true;
      
      const failingRun = await db.ReconRun.create({
        supplier_id: supplierConfig.id,
        file_name: 'test2.csv',
        file_hash: 'hash-003',
        file_size: 1024,
        file_received_at: new Date(),
        total_transactions: 100,
        matched_exact: 90,
        matched_fuzzy: 5,
        amount_variance: 1500.00
      });
      
      expect(failingRun.isPassed(1000.00)).to.be.false; // Variance too high
      
      await passingRun.destroy();
      await failingRun.destroy();
    });
  });
});
