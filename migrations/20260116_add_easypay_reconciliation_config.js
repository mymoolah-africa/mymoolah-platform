'use strict';

/**
 * Migration: Add EasyPay Reconciliation Configuration
 * 
 * Adds EasyPay supplier configuration to recon_supplier_configs table
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-16
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if EasyPay config already exists
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM recon_supplier_configs WHERE supplier_code = 'EASYPAY'`,
        { transaction }
      );
      
      if (existing.length > 0) {
        console.log('⚠️  EasyPay reconciliation config already exists, skipping...');
        await transaction.commit();
        return;
      }
      
      // Insert EasyPay configuration
      await queryInterface.sequelize.query(`
        INSERT INTO recon_supplier_configs (
          supplier_name,
          supplier_code,
          ingestion_method,
          file_format,
          file_name_pattern,
          delimiter,
          encoding,
          has_header,
          sftp_host,
          sftp_port,
          sftp_username,
          sftp_path,
          schema_definition,
          adapter_class,
          timezone,
          matching_rules,
          timestamp_tolerance_seconds,
          amount_tolerance_cents,
          commission_field,
          commission_calculation,
          alert_email,
          critical_variance_threshold,
          is_active
        ) VALUES (
          'EasyPay',
          'EASYPAY',
          'sftp',
          'csv',
          'easypay_recon_YYYYMMDD.csv',
          ',',
          'UTF-8',
          TRUE,
          '34.35.137.166',
          22,
          'easypay',
          '/home/easypay',
          '{
            "header": {
              "row": 0,
              "fields": {
                "transaction_id": {"column": 0, "type": "string", "required": true, "mapping": "supplier_transaction_id"},
                "easypay_code": {"column": 1, "type": "string", "required": true, "mapping": "supplier_reference"},
                "transaction_type": {"column": 2, "type": "string", "required": true},
                "merchant_id": {"column": 3, "type": "string", "required": true},
                "terminal_id": {"column": 4, "type": "string", "required": true},
                "cashier_id": {"column": 5, "type": "string", "required": false},
                "transaction_timestamp": {"column": 6, "type": "datetime", "format": "ISO8601", "required": true, "mapping": "supplier_timestamp"},
                "gross_amount": {"column": 7, "type": "decimal", "required": true, "mapping": "supplier_amount"},
                "settlement_status": {"column": 8, "type": "string", "required": true, "mapping": "supplier_status"},
                "merchant_name": {"column": 9, "type": "string", "required": false},
                "receipt_number": {"column": 10, "type": "string", "required": false}
              }
            },
            "body": {
              "start_row": 1,
              "fields": {
                "transaction_id": {"column": 0, "type": "string", "required": true, "mapping": "supplier_transaction_id"},
                "easypay_code": {"column": 1, "type": "string", "required": true, "mapping": "supplier_reference"},
                "transaction_type": {"column": 2, "type": "string", "required": true, "mapping": "supplier_product_code"},
                "merchant_id": {"column": 3, "type": "string", "required": true},
                "terminal_id": {"column": 4, "type": "string", "required": true},
                "cashier_id": {"column": 5, "type": "string", "required": false},
                "transaction_timestamp": {"column": 6, "type": "datetime", "format": "ISO8601", "required": true, "mapping": "supplier_timestamp"},
                "gross_amount": {"column": 7, "type": "decimal", "required": true, "mapping": "supplier_amount"},
                "settlement_status": {"column": 8, "type": "string", "required": true, "mapping": "supplier_status"},
                "merchant_name": {"column": 9, "type": "string", "required": false},
                "receipt_number": {"column": 10, "type": "string", "required": false}
              }
            },
            "footer": {
              "row_offset": null,
              "calculated": true,
              "fields": {
                "total_count": {"type": "integer", "calculated": true},
                "total_amount": {"type": "decimal", "calculated": true},
                "topup_count": {"type": "integer", "calculated": true},
                "cashout_count": {"type": "integer", "calculated": true},
                "settled_count": {"type": "integer", "calculated": true},
                "pending_count": {"type": "integer", "calculated": true},
                "failed_count": {"type": "integer", "calculated": true}
              }
            }
          }'::jsonb,
          'EasyPayAdapter',
          'Africa/Johannesburg',
          '{
            "primary": ["transaction_id"],
            "secondary": ["easypay_code", "amount", "timestamp"],
            "fuzzy_match": {
              "enabled": true,
              "min_confidence": 0.90
            }
          }'::jsonb,
          300,
          1,
          null,
          '{
            "method": "not_applicable",
            "note": "EasyPay reconciliation does not include commission - fees handled separately"
          }'::jsonb,
          ARRAY['finance@mymoolah.africa', 'andre@mymoolah.africa'],
          1000.00,
          TRUE
        )
      `, { transaction });
      
      await transaction.commit();
      console.log('✅ EasyPay reconciliation configuration added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to add EasyPay reconciliation config:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.sequelize.query(
        `DELETE FROM recon_supplier_configs WHERE supplier_code = 'EASYPAY'`,
        { transaction }
      );
      
      await transaction.commit();
      console.log('✅ EasyPay reconciliation configuration removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to remove EasyPay reconciliation config:', error);
      throw error;
    }
  }
};
