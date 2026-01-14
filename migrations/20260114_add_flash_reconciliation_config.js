/**
 * Migration: Add Flash Reconciliation Configuration
 * 
 * Adds Flash supplier configuration to recon_supplier_configs table
 * 
 * @author MMTP Agent
 * @date 2026-01-14
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if Flash config already exists
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM recon_supplier_configs WHERE supplier_code = 'FLASH'`,
        { transaction }
      );
      
      if (existing.length > 0) {
        console.log('⚠️  Flash reconciliation config already exists, skipping...');
        await transaction.commit();
        return;
      }
      
      // Insert Flash configuration
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
          'Flash',
          'FLASH',
          'sftp',
          'csv',
          'recon_YYYYMMDD.csv',
          ';',
          'UTF-8',
          TRUE,
          '34.35.137.166',
          22,
          'flash',
          '/home/flash',
          '{
            "header": {
              "row": 0,
              "fields": {
                "date": {"column": 0, "type": "datetime", "format": "YYYY/MM/DD HH:mm", "required": true},
                "reference": {"column": 1, "type": "string", "required": true, "mapping": "supplier_reference"},
                "transaction_id": {"column": 2, "type": "string", "required": true, "mapping": "supplier_transaction_id"},
                "transaction_type": {"column": 3, "type": "string", "required": false},
                "product_code": {"column": 4, "type": "string", "required": true, "mapping": "supplier_product_code"},
                "product": {"column": 5, "type": "string", "required": true, "mapping": "supplier_product_name"},
                "account_number": {"column": 6, "type": "string", "required": false},
                "account_name": {"column": 7, "type": "string", "required": false},
                "gross_amount": {"column": 8, "type": "decimal", "required": true, "mapping": "supplier_amount"},
                "fee": {"column": 9, "type": "decimal", "required": true},
                "commission": {"column": 10, "type": "decimal", "required": true, "mapping": "supplier_commission"},
                "net_amount": {"column": 11, "type": "decimal", "required": true},
                "status": {"column": 12, "type": "string", "required": true, "mapping": "supplier_status"},
                "metadata": {"column": 13, "type": "json", "required": false}
              }
            },
            "body": {
              "start_row": 1,
              "fields": {
                "date": {"column": 0, "type": "datetime", "format": "YYYY/MM/DD HH:mm", "required": true, "mapping": "supplier_timestamp"},
                "reference": {"column": 1, "type": "string", "required": true, "mapping": "supplier_reference"},
                "transaction_id": {"column": 2, "type": "string", "required": true, "mapping": "supplier_transaction_id"},
                "product_code": {"column": 4, "type": "string", "required": true, "mapping": "supplier_product_code"},
                "product": {"column": 5, "type": "string", "required": true, "mapping": "supplier_product_name"},
                "gross_amount": {"column": 8, "type": "decimal", "required": true, "mapping": "supplier_amount"},
                "commission": {"column": 10, "type": "decimal", "required": true, "mapping": "supplier_commission"},
                "status": {"column": 12, "type": "string", "required": true, "mapping": "supplier_status"}
              }
            },
            "footer": {
              "row_offset": null,
              "calculated": true,
              "fields": {
                "total_count": {"type": "integer", "calculated": true},
                "total_amount": {"type": "decimal", "calculated": true},
                "total_commission": {"type": "decimal", "calculated": true}
              }
            }
          }'::jsonb,
          'FlashAdapter',
          'Africa/Johannesburg',
          '{
            "primary": ["transaction_id", "reference"],
            "secondary": ["amount", "timestamp", "product_code"],
            "fuzzy_match": {
              "enabled": true,
              "min_confidence": 0.85
            }
          }'::jsonb,
          300,
          0,
          'commission',
          '{
            "method": "from_file",
            "field": "commission",
            "vat_inclusive": true,
            "vat_rate": 0.15
          }'::jsonb,
          ARRAY['finance@mymoolah.africa', 'andre@mymoolah.africa'],
          1000.00,
          TRUE
        )
      `, { transaction });
      
      await transaction.commit();
      console.log('✅ Flash reconciliation configuration added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to add Flash reconciliation config:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.sequelize.query(
        `DELETE FROM recon_supplier_configs WHERE supplier_code = 'FLASH'`,
        { transaction }
      );
      
      await transaction.commit();
      console.log('✅ Flash reconciliation configuration removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to remove Flash reconciliation config:', error);
      throw error;
    }
  }
};
