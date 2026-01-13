/**
 * ReconAuditTrail Model
 * 
 * Immutable audit log for all reconciliation events.
 * Provides blockchain-style event chaining without blockchain.
 * 
 * @module models/ReconAuditTrail
 */

'use strict';

const { Model, DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class ReconAuditTrail extends Model {
    static associate(models) {
      // An audit entry belongs to a recon run
      this.belongsTo(models.ReconRun, {
        foreignKey: 'run_id',
        targetKey: 'run_id',
        as: 'reconRun'
      });
    }
    
    /**
     * Calculate event hash for integrity verification
     */
    static calculateEventHash(eventId, timestamp, eventData) {
      const data = `${eventId}${timestamp}${JSON.stringify(eventData)}`;
      return crypto.createHash('sha256').update(data).digest('hex');
    }
    
    /**
     * Verify event integrity
     */
    verifyIntegrity() {
      const calculatedHash = ReconAuditTrail.calculateEventHash(
        this.event_id,
        this.event_timestamp,
        this.event_data
      );
      return this.event_hash === calculatedHash;
    }
  }

  ReconAuditTrail.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    run_id: {
      type: DataTypes.UUID
    },
    
    // Event details
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    event_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    
    // Actor
    actor_type: {
      type: DataTypes.STRING(50)
    },
    actor_id: {
      type: DataTypes.STRING(100)
    },
    
    // Event data
    entity_type: {
      type: DataTypes.STRING(100)
    },
    entity_id: {
      type: DataTypes.STRING(100)
    },
    event_data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    
    // Security
    ip_address: {
      type: DataTypes.INET
    },
    user_agent: {
      type: DataTypes.TEXT
    },
    
    // Integrity
    event_hash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    previous_event_hash: {
      type: DataTypes.STRING(64)
    },
    
    // Append-only
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ReconAuditTrail',
    tableName: 'recon_audit_trail',
    timestamps: false, // Only created_at, no updated_at
    updatedAt: false,
    indexes: [
      {
        fields: ['run_id']
      },
      {
        fields: ['event_type']
      },
      {
        fields: ['event_timestamp']
      },
      {
        fields: ['actor_id']
      }
    ],
    hooks: {
      beforeCreate: async (auditEntry) => {
        // Calculate event hash before insert
        auditEntry.event_hash = ReconAuditTrail.calculateEventHash(
          auditEntry.event_id,
          auditEntry.event_timestamp,
          auditEntry.event_data
        );
        
        // Link to previous event (blockchain-style chaining)
        const lastEvent = await ReconAuditTrail.findOne({
          where: {
            run_id: auditEntry.run_id
          },
          order: [['event_timestamp', 'DESC']],
          attributes: ['event_hash']
        });
        
        if (lastEvent) {
          auditEntry.previous_event_hash = lastEvent.event_hash;
        }
      }
    }
  });

  return ReconAuditTrail;
};
