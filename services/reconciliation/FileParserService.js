/**
 * File Parser Service
 * 
 * Parses supplier reconciliation files using adapter pattern.
 * Supports multiple formats (CSV, JSON, XML, fixed-width) and
 * supplier-specific adapters.
 * 
 * @module services/reconciliation/FileParserService
 */

'use strict';

const fs = require('fs').promises;
const crypto = require('crypto');
// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[FileParserService]', ...args),
  error: (...args) => console.error('[FileParserService]', ...args),
  warn: (...args) => console.warn('[FileParserService]', ...args),
  debug: (...args) => console.log('[FileParserService]', ...args)
};
const MobileMartAdapter = require('./adapters/MobileMartAdapter');
const FlashAdapter = require('./adapters/FlashAdapter');
const EasyPayAdapter = require('./adapters/EasyPayAdapter');
const ZapperAdapter = require('./adapters/ZapperAdapter');

class FileParserService {
  constructor() {
    this.adapters = {
      MobileMartAdapter: new MobileMartAdapter(),
      FlashAdapter: new FlashAdapter(),
      EasyPayAdapter: new EasyPayAdapter(),
      ZapperAdapter: new ZapperAdapter(),
    };
  }
  
  /**
   * Parse reconciliation file
   * 
   * @param {string} filePath - Path to file
   * @param {Object} supplierConfig - Supplier configuration
   * @returns {Promise<Object>} Parsed data { header, body, footer }
   */
  async parse(filePath, supplierConfig) {
    try {
      logger.info('[FileParser] Parsing file', {
        filePath,
        supplier: supplierConfig.supplier_name,
        format: supplierConfig.file_format
      });
      
      // Get appropriate adapter
      const adapter = this.getAdapter(supplierConfig.adapter_class);
      
      // Read file content
      const content = await fs.readFile(filePath, supplierConfig.encoding || 'utf-8');
      
      // Parse using adapter
      const parsedData = await adapter.parse(content, supplierConfig);
      
      // Validate parsed data
      this.validateParsedData(parsedData, supplierConfig);
      
      logger.info('[FileParser] File parsed successfully', {
        header: parsedData.header,
        bodyCount: parsedData.body.length,
        footer: parsedData.footer
      });
      
      return parsedData;
    } catch (error) {
      logger.error('[FileParser] Failed to parse file', {
        error: error.message,
        filePath,
        supplier: supplierConfig.supplier_name
      });
      throw new Error(`File parsing failed: ${error.message}`);
    }
  }
  
  /**
   * Get adapter instance
   */
  getAdapter(adapterClass) {
    const adapter = this.adapters[adapterClass];
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterClass}`);
    }
    return adapter;
  }
  
  /**
   * Validate parsed data against schema.
   * 
   * Adapts to different footer shapes:
   * - MobileMart Fulcrum: footer has total_count (body rows) only; no total_amount
   * - Other suppliers: footer has total_count + total_amount + total_commission
   */
  validateParsedData(parsedData, supplierConfig) {
    if (!parsedData.header) {
      throw new Error('Missing header in parsed data');
    }
    
    if (!Array.isArray(parsedData.body)) {
      throw new Error('Body must be an array');
    }
    
    if (parsedData.body.length === 0) {
      throw new Error('Empty body in parsed data');
    }
    
    if (!parsedData.footer) {
      throw new Error('Missing footer in parsed data');
    }
    
    const bodyCount = parsedData.body.length;
    const footerCount = parsedData.footer.total_count;
    
    if (footerCount !== undefined && footerCount !== null && bodyCount !== footerCount) {
      throw new Error(`Transaction count mismatch: body=${bodyCount}, footer=${footerCount}`);
    }
    
    if (parsedData.footer.total_amount !== undefined && parsedData.footer.total_amount !== null) {
      const bodyAmount = parsedData.body.reduce(
        (sum, txn) => sum + parseFloat(txn.supplier_amount || txn.amount || 0), 0
      );
      const footerAmount = parseFloat(parsedData.footer.total_amount);
      const diff = Math.abs(bodyAmount - footerAmount);
      
      if (diff > 0.01) {
        throw new Error(`Amount mismatch: body=${bodyAmount.toFixed(2)}, footer=${footerAmount.toFixed(2)}`);
      }
    }
    
    return true;
  }
  
  /**
   * Calculate SHA-256 hash of file for integrity and idempotency
   */
  async calculateFileHash(filePath) {
    try {
      const content = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      return hash;
    } catch (error) {
      logger.error('[FileParser] Failed to calculate file hash', {
        error: error.message,
        filePath
      });
      throw error;
    }
  }
  
  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error('[FileParser] Failed to get file size', {
        error: error.message,
        filePath
      });
      throw error;
    }
  }
}

module.exports = FileParserService;
