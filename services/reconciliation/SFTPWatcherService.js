/**
 * SFTP Watcher Service
 * 
 * Monitors SFTP directory for new reconciliation files.
 * Triggers reconciliation process when new files arrive.
 * 
 * Integration with Google Cloud Storage SFTP service.
 * 
 * @module services/reconciliation/SFTPWatcherService
 */

'use strict';

const { Storage } = require('@google-cloud/storage');
// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[SFTPWatcherService]', ...args),
  error: (...args) => console.error('[SFTPWatcherService]', ...args),
  warn: (...args) => console.warn('[SFTPWatcherService]', ...args),
  debug: (...args) => console.log('[SFTPWatcherService]', ...args)
};
const db = require('../../models');
const ReconciliationOrchestrator = require('./ReconciliationOrchestrator');
const path = require('path');
const fs = require('fs').promises;

class SFTPWatcherService {
  constructor() {
    this.storage = new Storage();
    this.bucketName = process.env.SFTP_BUCKET_NAME || 'mymoolah-sftp-inbound';
    this.orchestrator = new ReconciliationOrchestrator();
    this.processedFiles = new Set(); // Track processed files in memory
  }
  
  /**
   * Start watching for new files
   * 
   * @param {Object} options - Watch options
   */
  async start(options = {}) {
    const interval = options.pollIntervalSeconds || 60; // Default: check every 60 seconds
    
    logger.info('[SFTPWatcher] Starting SFTP watcher', {
      bucket: this.bucketName,
      poll_interval_seconds: interval
    });
    
    // Load processed file hashes from database
    await this.loadProcessedFiles();
    
    // Start polling
    this.watchInterval = setInterval(() => {
      this.checkForNewFiles().catch(error => {
        logger.error('[SFTPWatcher] Error checking for files', {
          error: error.message
        });
      });
    }, interval * 1000);
    
    // Run initial check
    await this.checkForNewFiles();
  }
  
  /**
   * Stop watching
   */
  stop() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      logger.info('[SFTPWatcher] Stopped SFTP watcher');
    }
  }
  
  /**
   * Check for new files in GCS bucket
   */
  async checkForNewFiles() {
    try {
      logger.debug('[SFTPWatcher] Checking for new files');
      
      // Get active supplier configs
      const suppliers = await db.ReconSupplierConfig.findAll({
        where: { is_active: true, ingestion_method: 'sftp' }
      });
      
      for (const supplier of suppliers) {
        const supplierPath = `${supplier.supplier_code.toLowerCase()}/`;
        
        try {
          // List files in supplier directory
          const [files] = await this.storage
            .bucket(this.bucketName)
            .getFiles({ prefix: supplierPath });
          
          for (const file of files) {
            // Skip directories
            if (file.name.endsWith('/')) continue;
            
            // Check if file matches pattern
            if (!this.matchesPattern(file.name, supplier.file_name_pattern)) {
              continue;
            }
            
            // Check if already processed
            const fileHash = await this.getFileHash(file);
            if (this.processedFiles.has(fileHash)) {
              logger.debug('[SFTPWatcher] File already processed', {
                file: file.name,
                hash: fileHash
              });
              continue;
            }
            
            // Check database for idempotency
            const existingRun = await db.ReconRun.findOne({
              where: {
                supplier_id: supplier.id,
                file_hash: fileHash
              }
            });
            
            if (existingRun) {
              this.processedFiles.add(fileHash);
              continue;
            }
            
            // New file found!
            logger.info('[SFTPWatcher] New file detected', {
              file: file.name,
              supplier: supplier.supplier_name,
              size: file.metadata.size
            });
            
            // Download and process
            await this.processFile(file, supplier);
            
            // Mark as processed
            this.processedFiles.add(fileHash);
          }
        } catch (error) {
          logger.error('[SFTPWatcher] Error processing supplier files', {
            supplier: supplier.supplier_name,
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.error('[SFTPWatcher] Error checking for files', {
        error: error.message
      });
    }
  }
  
  /**
   * Process a new file
   */
  async processFile(file, supplier) {
    const tempDir = '/tmp/recon';
    const localPath = path.join(tempDir, path.basename(file.name));
    
    try {
      // Ensure temp directory exists
      await fs.mkdir(tempDir, { recursive: true });
      
      // Download file
      logger.info('[SFTPWatcher] Downloading file', {
        file: file.name,
        destination: localPath
      });
      
      await file.download({ destination: localPath });
      
      // Trigger reconciliation
      logger.info('[SFTPWatcher] Starting reconciliation', {
        file: file.name,
        supplier: supplier.supplier_name
      });
      
      const result = await this.orchestrator.reconcile(localPath, supplier.id, {
        userId: 'sftp_watcher'
      });
      
      if (result.success) {
        // Move file to processed directory
        const processedPath = `processed/${supplier.supplier_code.toLowerCase()}/${path.basename(file.name)}`;
        await file.move(processedPath);
        
        logger.info('[SFTPWatcher] File processed successfully', {
          file: file.name,
          run_id: result.run_id,
          match_rate: result.match_rate,
          archived_to: processedPath
        });
      } else {
        // Move to failed directory
        const failedPath = `failed/${supplier.supplier_code.toLowerCase()}/${path.basename(file.name)}`;
        await file.move(failedPath);
        
        logger.error('[SFTPWatcher] File processing failed', {
          file: file.name,
          archived_to: failedPath
        });
      }
      
      // Clean up local file
      await fs.unlink(localPath);
    } catch (error) {
      logger.error('[SFTPWatcher] Error processing file', {
        file: file.name,
        error: error.message,
        stack: error.stack
      });
      
      // Move to error directory
      try {
        const errorPath = `error/${supplier.supplier_code.toLowerCase()}/${path.basename(file.name)}`;
        await file.move(errorPath);
      } catch (moveError) {
        logger.error('[SFTPWatcher] Failed to move error file', {
          error: moveError.message
        });
      }
      
      // Clean up local file if exists
      try {
        await fs.unlink(localPath);
      } catch (unlinkError) {
        // Ignore
      }
    }
  }
  
  /**
   * Check if filename matches pattern
   */
  matchesPattern(filename, pattern) {
    if (!pattern) return true;
    
    // Extract just the filename without directory
    const basename = path.basename(filename);
    
    // Convert pattern to regex
    // Example: recon_YYYYMMDD.csv -> recon_\d{8}\.csv
    const regexPattern = pattern
      .replace(/YYYY/g, '\\d{4}')
      .replace(/MM/g, '\\d{2}')
      .replace(/DD/g, '\\d{2}')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(basename);
  }
  
  /**
   * Get file hash (MD5 from GCS metadata)
   */
  async getFileHash(file) {
    const [metadata] = await file.getMetadata();
    return metadata.md5Hash;
  }
  
  /**
   * Load processed files from database
   */
  async loadProcessedFiles() {
    try {
      const runs = await db.ReconRun.findAll({
        attributes: ['file_hash'],
        where: {
          status: ['completed', 'processing']
        }
      });
      
      runs.forEach(run => {
        this.processedFiles.add(run.file_hash);
      });
      
      logger.info('[SFTPWatcher] Loaded processed files', {
        count: this.processedFiles.size
      });
    } catch (error) {
      logger.error('[SFTPWatcher] Failed to load processed files', {
        error: error.message
      });
    }
  }
}

module.exports = SFTPWatcherService;
