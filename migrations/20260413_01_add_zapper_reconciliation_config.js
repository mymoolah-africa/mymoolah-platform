/**
 * Migration: Add Zapper Reconciliation Configuration
 * 
 * Adds Zapper supplier configuration to recon_supplier_configs table.
 * Zapper pushes daily mark-off CSV files via SFTP to gs://mymoolah-sftp-inbound/zapper/
 * 
 * @author MMTP Agent
 * @date 2026-04-13
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM recon_supplier_configs WHERE supplier_code = 'ZAPPER'`,
        { transaction }
      );
      
      if (existing.length > 0) {
        console.log('⚠️  Zapper reconciliation config already exists, skipping...');
        await transaction.commit();
        return;
      }
      
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
          'Zapper',
          'ZAPPER',
          'sftp',
          'csv',
          'zapper_markoff_YYYYMMDD.csv',
          ',',
          'UTF-8',
          TRUE,
          '34.35.137.166',
          5022,
          'zapper',
          '/home/zapper',
          '{
            "header": {
              "row": 0,
              "fields": {
                "zapper_id": {"column": 0, "type": "string", "required": true, "mapping": "supplier_transaction_id"},
                "processor_reference": {"column": 1, "type": "string", "required": true, "mapping": "supplier_reference"},
                "payment_date": {"column": 2, "type": "datetime", "format": "MMM D, YYYY h:mma", "required": true, "mapping": "supplier_timestamp"},
                "processed_amount": {"column": 3, "type": "decimal", "required": true, "mapping": "supplier_amount"},
                "merchant_id": {"column": 4, "type": "string", "required": false},
                "merchant_name": {"column": 5, "type": "string", "required": false, "mapping": "supplier_product_name"},
                "organisation_reference": {"column": 6, "type": "string", "required": false},
                "payment_method_type": {"column": 7, "type": "string", "required": false},
                "payment_method_title": {"column": 8, "type": "string", "required": false},
                "third_party_vouchers": {"column": 9, "type": "decimal", "required": false},
                "merchant_vouchers": {"column": 10, "type": "decimal", "required": false}
              }
            },
            "body": {
              "start_row": 1,
              "fields": {
                "zapper_id": {"column": 0, "type": "string", "required": true, "mapping": "supplier_transaction_id"},
                "processor_reference": {"column": 1, "type": "string", "required": true, "mapping": "supplier_reference"},
                "payment_date": {"column": 2, "type": "datetime", "format": "MMM D, YYYY h:mma", "required": true, "mapping": "supplier_timestamp"},
                "processed_amount": {"column": 3, "type": "decimal", "required": true, "mapping": "supplier_amount"},
                "merchant_id": {"column": 4, "type": "string", "required": false},
                "merchant_name": {"column": 5, "type": "string", "required": false, "mapping": "supplier_product_name"},
                "organisation_reference": {"column": 6, "type": "string", "required": false}
              }
            },
            "footer": {
              "row_offset": null,
              "calculated": true,
              "fields": {
                "total_count": {"type": "integer", "calculated": true},
                "total_amount": {"type": "decimal", "calculated": true}
              }
            }
          }'::jsonb,
          'ZapperAdapter',
          'UTC',
          '{
            "primary": ["zapper_id", "processor_reference"],
            "secondary": ["amount", "timestamp", "merchant_name"],
            "fuzzy_match": {
              "enabled": true,
              "min_confidence": 0.85
            }
          }'::jsonb,
          600,
          0,
          NULL,
          '{
            "method": "percentage",
            "rate": 0.00,
            "vat_inclusive": false,
            "vat_rate": 0.15,
            "note": "Zapper charges MyMoolah — no commission earned. Settlement is cost-only."
          }'::jsonb,
          ARRAY['finance@mymoolah.africa'],
          500.00,
          TRUE
        )
      `, { transaction });
      
      await transaction.commit();
      console.log('✅ Zapper reconciliation configuration added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to add Zapper reconciliation config:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.sequelize.query(
        `DELETE FROM recon_supplier_configs WHERE supplier_code = 'ZAPPER'`,
        { transaction }
      );
      
      await transaction.commit();
      console.log('✅ Zapper reconciliation configuration removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to remove Zapper reconciliation config:', error);
      throw error;
    }
  }
};
