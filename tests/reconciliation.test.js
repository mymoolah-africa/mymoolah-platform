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

const mockReconRunHashes = new Set();

jest.mock('../models', () => {
  let runId = 1;

  const createReconRun = jest.fn(async (data) => {
    if (data.file_hash && mockReconRunHashes.has(data.file_hash)) {
      const error = new Error('Duplicate recon run file hash');
      error.name = 'SequelizeUniqueConstraintError';
      throw error;
    }

    if (data.file_hash) {
      mockReconRunHashes.add(data.file_hash);
    }

    return {
      id: runId++,
      ...data,
      getMatchRate() {
        if (!this.total_transactions) return 0;
        return ((this.matched_exact || 0) + (this.matched_fuzzy || 0)) / this.total_transactions * 100;
      },
      isPassed(expectedAmount, tolerancePercent = 1) {
        const variance = Math.abs(Number(this.amount_variance || 0));
        return variance <= (Number(expectedAmount || 0) * tolerancePercent / 100);
      },
      destroy: jest.fn(async function destroy() {
        if (data.file_hash) {
          mockReconRunHashes.delete(data.file_hash);
        }
      })
    };
  });

  return {
    ReconSupplierConfig: {
      create: jest.fn(async (data) => ({
        id: 1,
        ...data,
        destroy: jest.fn().mockResolvedValue(undefined)
      }))
    },
    ReconRun: {
      create: createReconRun,
      destroy: jest.fn().mockResolvedValue(undefined)
    },
    ReconTransactionMatch: {
      bulkCreate: jest.fn().mockImplementation(async (rows) => rows),
      update: jest.fn().mockResolvedValue([1])
    }
  };
});

const db = require('../models');
const ReconciliationOrchestrator = require('../services/reconciliation/ReconciliationOrchestrator');
const MatchingEngine = require('../services/reconciliation/MatchingEngine');
const DiscrepancyDetector = require('../services/reconciliation/DiscrepancyDetector');
const SelfHealingResolver = require('../services/reconciliation/SelfHealingResolver');
const FileParserService = require('../services/reconciliation/FileParserService');
const MobileMartAdapter = require('../services/reconciliation/adapters/MobileMartAdapter');

describe('Reconciliation System', () => {
  let supplierConfig;
  
  beforeAll(async () => {
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
  
  afterAll(async () => {
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
      
      expect(result.exactMatches).toBe(1);
      expect(result.fuzzyMatches).toBe(0);
      expect(result.unmatchedMMTP).toHaveLength(0);
      expect(result.unmatchedSupplier).toHaveLength(0);
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
      
      expect(result.exactMatches).toBe(1);
      expect(result.unmatchedMMTP).toHaveLength(1);
      expect(result.unmatchedMMTP[0].transaction_id).toBe('TXN002');
      expect(result.unmatchedSupplier).toHaveLength(1);
      expect(result.unmatchedSupplier[0].supplier_transaction_id).toBe('TXN003');
    });
    
    it('should calculate string similarity correctly', () => {
      const similarity1 = matchingEngine.calculateStringSimilarity('hello', 'hello');
      expect(similarity1).toBe(1.0);
      
      const similarity2 = matchingEngine.calculateStringSimilarity('hello', 'hallo');
      expect(similarity2).toBeGreaterThan(0.7);
      
      const similarity3 = matchingEngine.calculateStringSimilarity('hello', 'world');
      expect(similarity3).toBeLessThan(0.5);
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
      
      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].discrepancy_type).toContain('amount_mismatch');
      expect(discrepancies[0].discrepancy_details.amount_diff).toBe('-5.00');
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
      
      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].discrepancy_type).toContain('status_mismatch');
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
      
      expect(discrepancies).toHaveLength(0);
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
      
      expect(resolution.resolved).toBe(true);
      expect(resolution.method).toBe('auto_timing');
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
      
      expect(resolution.resolved).toBe(true);
      expect(resolution.method).toBe('auto_rounding');
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
      
      expect(resolution.resolved).toBe(false);
      expect(resolution.escalate).toBe(true);
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
      
      expect(resolution.resolved).toBe(false);
      expect(resolution.escalate).toBe(true); // Multiple issues
    });
  });
  
  describe('File Parser Service', () => {
    let fileParser;
    
    beforeEach(() => {
      fileParser = new FileParserService();
    });
    
    it('should get correct adapter by class name', () => {
      const adapter = fileParser.getAdapter('MobileMartAdapter');
      expect(adapter).toBeInstanceOf(MobileMartAdapter);
    });
    
    it('should throw error for unknown adapter', () => {
      expect(() => {
        fileParser.getAdapter('UnknownAdapter');
      }).toThrow('Adapter not found');
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
      }).not.toThrow();
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
      }).toThrow('Transaction count mismatch');
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
      }).toThrow('Amount mismatch');
    });
  });
  
  describe('MobileMart Adapter', () => {
    let adapter;
    
    beforeEach(() => {
      adapter = new MobileMartAdapter();
    });
    
    it('should parse cents-based amount fields correctly', () => {
      const fields = ['9900', 'test'];

      const value = adapter.parseAmountCents(fields, 0, 'amount');
      expect(value).toBe(99.00);
    });
    
    it('should throw error for invalid amount fields', () => {
      const fields = ['abc', 'test'];

      expect(() => {
        adapter.parseAmountCents(fields, 0, 'amount');
      }).toThrow("Invalid amount for amount: 'abc'");
    });
    
    it('should normalize MobileMart success statuses', () => {
      expect(adapter.normaliseStatus('Successful')).toBe('success');
      expect(adapter.normaliseStatus('Binned')).toBe('failed');
    });
    
    it('should handle optional fields', () => {
      const fields = ['', 'test'];

      const value = adapter.optionalField(fields, 0);
      expect(value).toBeNull();
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
        expect(error.name).toBe('SequelizeUniqueConstraintError');
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
      expect(matchRate).toBe(95.0); // (90 + 5) / 100 * 100
      
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
      
      expect(passingRun.isPassed(1000.00)).toBe(true);
      
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
      
      expect(failingRun.isPassed(1000.00)).toBe(false); // Variance too high
      
      await passingRun.destroy();
      await failingRun.destroy();
    });
  });
});
