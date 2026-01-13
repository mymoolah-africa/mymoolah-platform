/**
 * Migration: Create Reconciliation System
 * 
 * Creates banking-grade automated reconciliation system for multi-supplier
 * transaction reconciliation with immutable audit trails and comprehensive
 * discrepancy detection.
 * 
 * @author MMTP Agent
 * @date 2026-01-13
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Create recon_supplier_configs table
      await queryInterface.createTable('recon_supplier_configs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        supplier_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        supplier_code: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true
        },
        
        // Ingestion configuration
        ingestion_method: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'sftp, api, s3, email'
        },
        file_format: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'csv, json, xml, fixed_width'
        },
        file_name_pattern: {
          type: Sequelize.STRING(255),
          comment: 'e.g., recon_YYYYMMDD.csv'
        },
        delimiter: {
          type: Sequelize.STRING(10),
          comment: 'For CSV files'
        },
        encoding: {
          type: Sequelize.STRING(20),
          defaultValue: 'UTF-8'
        },
        has_header: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        
        // SFTP details
        sftp_host: {
          type: Sequelize.STRING(255)
        },
        sftp_port: {
          type: Sequelize.INTEGER
        },
        sftp_username: {
          type: Sequelize.STRING(100)
        },
        sftp_path: {
          type: Sequelize.STRING(500)
        },
        
        // File schema
        schema_definition: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Column definitions, types, mappings'
        },
        
        // Processing configuration
        adapter_class: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'MobileMartAdapter, FlashAdapter, etc.'
        },
        timezone: {
          type: Sequelize.STRING(50),
          defaultValue: 'Africa/Johannesburg'
        },
        
        // Matching rules
        matching_rules: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Primary and secondary matching criteria'
        },
        timestamp_tolerance_seconds: {
          type: Sequelize.INTEGER,
          defaultValue: 300,
          comment: '5 minutes default'
        },
        amount_tolerance_cents: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Exact match by default'
        },
        
        // Commission configuration
        commission_field: {
          type: Sequelize.STRING(100),
          comment: 'Field name in supplier file'
        },
        commission_calculation: {
          type: Sequelize.JSONB,
          comment: 'Method, rate, VAT details'
        },
        
        // Alerting & SLA
        sla_hours: {
          type: Sequelize.INTEGER,
          defaultValue: 24,
          comment: 'Expected file delivery window'
        },
        alert_email: {
          type: Sequelize.ARRAY(Sequelize.TEXT),
          comment: 'Email addresses for alerts'
        },
        critical_variance_threshold: {
          type: Sequelize.DECIMAL(15, 2),
          defaultValue: 1000.00,
          comment: 'Alert if variance exceeds this amount'
        },
        
        // Status
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        last_successful_run_at: {
          type: Sequelize.DATE
        },
        
        // Audit
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      await queryInterface.addIndex('recon_supplier_configs', ['is_active'], {
        name: 'idx_recon_supplier_active',
        transaction
      });
      
      // 2. Create recon_runs table
      await queryInterface.createTable('recon_runs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        run_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          defaultValue: Sequelize.literal('gen_random_uuid()')
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'recon_supplier_configs',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        file_name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        file_hash: {
          type: Sequelize.STRING(64),
          allowNull: false,
          comment: 'SHA-256 hash'
        },
        file_size: {
          type: Sequelize.BIGINT,
          allowNull: false
        },
        file_received_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        
        // Reconciliation metadata
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'pending, processing, completed, failed'
        },
        started_at: {
          type: Sequelize.DATE
        },
        completed_at: {
          type: Sequelize.DATE
        },
        
        // Transaction counts
        total_transactions: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        matched_exact: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        matched_fuzzy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        unmatched_mmtp: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        unmatched_supplier: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        auto_resolved: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        manual_review_required: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        
        // Financial totals
        total_amount_mmtp: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0
        },
        total_amount_supplier: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0
        },
        amount_variance: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0
        },
        total_commission_mmtp: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0
        },
        total_commission_supplier: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0
        },
        commission_variance: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0
        },
        
        // Discrepancy summary
        discrepancies: {
          type: Sequelize.JSONB,
          comment: 'Summary of all discrepancies found'
        },
        error_log: {
          type: Sequelize.JSONB,
          comment: 'Errors encountered during processing'
        },
        
        // ML & Analytics
        ml_anomalies: {
          type: Sequelize.JSONB,
          comment: 'Machine learning detected anomalies'
        },
        processing_time_ms: {
          type: Sequelize.INTEGER,
          comment: 'Time taken to process'
        },
        
        // Alerting
        alerts_sent: {
          type: Sequelize.JSONB,
          comment: 'Channels and recipients for alerts sent'
        },
        
        // Audit
        created_by: {
          type: Sequelize.STRING(100)
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      // Add unique constraint for idempotency
      await queryInterface.addConstraint('recon_runs', {
        fields: ['supplier_id', 'file_hash'],
        type: 'unique',
        name: 'recon_runs_file_hash_unique',
        transaction
      });
      
      await queryInterface.addIndex('recon_runs', ['supplier_id'], {
        name: 'idx_recon_runs_supplier',
        transaction
      });
      
      await queryInterface.addIndex('recon_runs', ['status'], {
        name: 'idx_recon_runs_status',
        transaction
      });
      
      await queryInterface.addIndex('recon_runs', ['completed_at'], {
        name: 'idx_recon_runs_completed',
        transaction
      });
      
      await queryInterface.addIndex('recon_runs', ['run_id'], {
        name: 'idx_recon_runs_run_id',
        transaction
      });
      
      // 3. Create recon_transaction_matches table
      await queryInterface.createTable('recon_transaction_matches', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        run_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'recon_runs',
            key: 'run_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        
        // MMTP transaction data
        mmtp_transaction_id: {
          type: Sequelize.STRING(100)
        },
        mmtp_order_id: {
          type: Sequelize.INTEGER
        },
        mmtp_reference: {
          type: Sequelize.STRING(100)
        },
        mmtp_amount: {
          type: Sequelize.DECIMAL(15, 2)
        },
        mmtp_commission: {
          type: Sequelize.DECIMAL(15, 2)
        },
        mmtp_status: {
          type: Sequelize.STRING(50)
        },
        mmtp_timestamp: {
          type: Sequelize.DATE
        },
        mmtp_product_id: {
          type: Sequelize.INTEGER
        },
        mmtp_product_name: {
          type: Sequelize.STRING(255)
        },
        mmtp_metadata: {
          type: Sequelize.JSONB,
          comment: 'Full MMTP transaction metadata'
        },
        
        // Supplier transaction data
        supplier_transaction_id: {
          type: Sequelize.STRING(100)
        },
        supplier_reference: {
          type: Sequelize.STRING(100)
        },
        supplier_amount: {
          type: Sequelize.DECIMAL(15, 2)
        },
        supplier_commission: {
          type: Sequelize.DECIMAL(15, 2)
        },
        supplier_status: {
          type: Sequelize.STRING(50)
        },
        supplier_timestamp: {
          type: Sequelize.DATE
        },
        supplier_product_code: {
          type: Sequelize.STRING(100)
        },
        supplier_product_name: {
          type: Sequelize.STRING(255)
        },
        supplier_metadata: {
          type: Sequelize.JSONB,
          comment: 'Full supplier record'
        },
        
        // Match result
        match_status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'exact_match, fuzzy_match, unmatched_mmtp, unmatched_supplier'
        },
        match_confidence: {
          type: Sequelize.DECIMAL(5, 4),
          comment: '0.0000 to 1.0000 (ML confidence score)'
        },
        match_method: {
          type: Sequelize.STRING(100),
          comment: 'transaction_id, reference, amount_timestamp_product'
        },
        
        // Discrepancies
        has_discrepancy: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        discrepancy_type: {
          type: Sequelize.STRING(100),
          comment: 'amount_mismatch, status_mismatch, timestamp_diff, product_mismatch'
        },
        discrepancy_details: {
          type: Sequelize.JSONB,
          comment: 'Specific details of discrepancies'
        },
        
        // Resolution
        resolution_status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'pending, auto_resolved, manual_review, resolved, escalated'
        },
        resolution_method: {
          type: Sequelize.STRING(100),
          comment: 'auto_timing, auto_rounding, manual_adjustment, supplier_correction'
        },
        resolution_notes: {
          type: Sequelize.TEXT
        },
        resolved_at: {
          type: Sequelize.DATE
        },
        resolved_by: {
          type: Sequelize.STRING(100)
        },
        
        // Metadata for analytics & marketing
        enriched_metadata: {
          type: Sequelize.JSONB,
          comment: 'Customer segment, product category, region for analytics'
        },
        
        // Audit
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      await queryInterface.addIndex('recon_transaction_matches', ['run_id'], {
        name: 'idx_recon_matches_run',
        transaction
      });
      
      await queryInterface.addIndex('recon_transaction_matches', ['mmtp_transaction_id'], {
        name: 'idx_recon_matches_mmtp_tx',
        transaction
      });
      
      await queryInterface.addIndex('recon_transaction_matches', ['supplier_transaction_id'], {
        name: 'idx_recon_matches_supplier_tx',
        transaction
      });
      
      await queryInterface.addIndex('recon_transaction_matches', ['match_status'], {
        name: 'idx_recon_matches_status',
        transaction
      });
      
      // Partial index for unresolved discrepancies
      await queryInterface.sequelize.query(
        'CREATE INDEX idx_recon_matches_discrepancy ON recon_transaction_matches(has_discrepancy) WHERE has_discrepancy = TRUE',
        { transaction }
      );
      
      // Partial index for unresolved matches
      await queryInterface.sequelize.query(
        'CREATE INDEX idx_recon_matches_resolution ON recon_transaction_matches(resolution_status) WHERE resolution_status != \'resolved\'',
        { transaction }
      );
      
      // 4. Create recon_audit_trail table (immutable)
      await queryInterface.createTable('recon_audit_trail', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        event_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          defaultValue: Sequelize.literal('gen_random_uuid()')
        },
        run_id: {
          type: Sequelize.UUID,
          references: {
            model: 'recon_runs',
            key: 'run_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        
        // Event details
        event_type: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'file_received, validation_started, match_found, discrepancy_detected, resolution_applied'
        },
        event_timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        
        // Actor
        actor_type: {
          type: Sequelize.STRING(50),
          comment: 'system, user, cron, api'
        },
        actor_id: {
          type: Sequelize.STRING(100)
        },
        
        // Event data
        entity_type: {
          type: Sequelize.STRING(100),
          comment: 'recon_run, transaction_match, supplier_config'
        },
        entity_id: {
          type: Sequelize.STRING(100)
        },
        event_data: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Full event context'
        },
        
        // Security
        ip_address: {
          type: Sequelize.INET
        },
        user_agent: {
          type: Sequelize.TEXT
        },
        
        // Integrity (blockchain-style chaining without blockchain)
        event_hash: {
          type: Sequelize.STRING(64),
          allowNull: false,
          comment: 'SHA-256(event_id + timestamp + event_data)'
        },
        previous_event_hash: {
          type: Sequelize.STRING(64),
          comment: 'Link to previous event for immutability'
        },
        
        // Append-only (no updates allowed)
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });
      
      await queryInterface.addIndex('recon_audit_trail', ['run_id'], {
        name: 'idx_recon_audit_run',
        transaction
      });
      
      await queryInterface.addIndex('recon_audit_trail', ['event_type'], {
        name: 'idx_recon_audit_type',
        transaction
      });
      
      await queryInterface.addIndex('recon_audit_trail', ['event_timestamp'], {
        name: 'idx_recon_audit_timestamp',
        transaction
      });
      
      await queryInterface.addIndex('recon_audit_trail', ['actor_id'], {
        name: 'idx_recon_audit_actor',
        transaction
      });
      
      // Insert MobileMart configuration
      await queryInterface.sequelize.query(`
        INSERT INTO recon_supplier_configs (
          supplier_name,
          supplier_code,
          ingestion_method,
          file_format,
          file_name_pattern,
          delimiter,
          has_header,
          sftp_host,
          sftp_port,
          sftp_username,
          sftp_path,
          schema_definition,
          adapter_class,
          matching_rules,
          timestamp_tolerance_seconds,
          commission_field,
          commission_calculation,
          alert_email,
          critical_variance_threshold
        ) VALUES (
          'MobileMart',
          'MMART',
          'sftp',
          'csv',
          'recon_YYYYMMDD.csv',
          ',',
          TRUE,
          '34.35.168.101',
          22,
          'mobilemart',
          '/home/mobilemart',
          '{"header": {"row": 0, "fields": {"merchant_id": {"column": 0, "type": "string", "required": true}, "merchant_name": {"column": 1, "type": "string", "required": true}, "settlement_date": {"column": 2, "type": "date", "format": "YYYY-MM-DD", "required": true}, "total_transactions": {"column": 3, "type": "integer", "required": true}, "total_amount": {"column": 4, "type": "decimal", "required": true}, "total_commission": {"column": 5, "type": "decimal", "required": true}}}, "body": {"start_row": 1, "fields": {"transaction_id": {"column": 0, "type": "string", "required": true, "mapping": "supplier_transaction_id"}, "transaction_date": {"column": 1, "type": "datetime", "format": "YYYY-MM-DD HH:mm:ss", "required": true, "mapping": "supplier_timestamp"}, "product_code": {"column": 2, "type": "string", "required": true, "mapping": "supplier_product_code"}, "product_name": {"column": 3, "type": "string", "required": true, "mapping": "supplier_product_name"}, "amount": {"column": 4, "type": "decimal", "required": true, "mapping": "supplier_amount"}, "commission": {"column": 5, "type": "decimal", "required": true, "mapping": "supplier_commission"}, "status": {"column": 6, "type": "string", "required": true, "mapping": "supplier_status"}, "reference": {"column": 7, "type": "string", "required": false, "mapping": "supplier_reference"}}}, "footer": {"row_offset": -1, "fields": {"total_count": {"column": 0, "type": "integer", "required": true}, "total_amount": {"column": 1, "type": "decimal", "required": true}, "total_commission": {"column": 2, "type": "decimal", "required": true}}}}',
          'MobileMartAdapter',
          '{"primary": ["transaction_id", "reference"], "secondary": ["amount", "timestamp", "product_code"], "fuzzy_match": {"enabled": true, "min_confidence": 0.85}}',
          300,
          'commission',
          '{"method": "from_file", "field": "commission", "vat_inclusive": true, "vat_rate": 0.15}',
          ARRAY['finance@mymoolah.africa', 'andre@mymoolah.africa'],
          1000.00
        )
      `, { transaction });
      
      await transaction.commit();
      console.log('✅ Reconciliation system created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to create reconciliation system:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop tables in reverse order (respecting foreign keys)
      await queryInterface.dropTable('recon_audit_trail', { transaction });
      await queryInterface.dropTable('recon_transaction_matches', { transaction });
      await queryInterface.dropTable('recon_runs', { transaction });
      await queryInterface.dropTable('recon_supplier_configs', { transaction });
      
      await transaction.commit();
      console.log('✅ Reconciliation system dropped successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to drop reconciliation system:', error);
      throw error;
    }
  }
};
