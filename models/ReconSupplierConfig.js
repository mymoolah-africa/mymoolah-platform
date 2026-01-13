/**
 * ReconSupplierConfig Model
 * 
 * Stores configuration for each reconciliation supplier including
 * file format, SFTP details, matching rules, and commission settings.
 * 
 * @module models/ReconSupplierConfig
 */

'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ReconSupplierConfig extends Model {
    static associate(models) {
      // A supplier can have many reconciliation runs
      this.hasMany(models.ReconRun, {
        foreignKey: 'supplier_id',
        as: 'reconRuns'
      });
    }
  }

  ReconSupplierConfig.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    supplier_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    supplier_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    
    // Ingestion configuration
    ingestion_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['sftp', 'api', 's3', 'email']]
      }
    },
    file_format: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['csv', 'json', 'xml', 'fixed_width']]
      }
    },
    file_name_pattern: {
      type: DataTypes.STRING(255)
    },
    delimiter: {
      type: DataTypes.STRING(10)
    },
    encoding: {
      type: DataTypes.STRING(20),
      defaultValue: 'UTF-8'
    },
    has_header: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // SFTP details
    sftp_host: {
      type: DataTypes.STRING(255)
    },
    sftp_port: {
      type: DataTypes.INTEGER
    },
    sftp_username: {
      type: DataTypes.STRING(100)
    },
    sftp_path: {
      type: DataTypes.STRING(500)
    },
    
    // File schema
    schema_definition: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    
    // Processing configuration
    adapter_class: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'Africa/Johannesburg'
    },
    
    // Matching rules
    matching_rules: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    timestamp_tolerance_seconds: {
      type: DataTypes.INTEGER,
      defaultValue: 300
    },
    amount_tolerance_cents: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Commission configuration
    commission_field: {
      type: DataTypes.STRING(100)
    },
    commission_calculation: {
      type: DataTypes.JSONB
    },
    
    // Alerting & SLA
    sla_hours: {
      type: DataTypes.INTEGER,
      defaultValue: 24
    },
    alert_email: {
      type: DataTypes.ARRAY(DataTypes.TEXT)
    },
    critical_variance_threshold: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 1000.00
    },
    
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    last_successful_run_at: {
      type: DataTypes.DATE
    },
    
    // Audit
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ReconSupplierConfig',
    tableName: 'recon_supplier_configs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['is_active']
      }
    ]
  });

  return ReconSupplierConfig;
};
