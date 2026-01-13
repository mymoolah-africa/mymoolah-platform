/**
 * Audit Logger for Reconciliation
 * 
 * Creates immutable audit trail entries for all reconciliation events.
 * Implements blockchain-style event chaining for integrity verification.
 * 
 * @module services/reconciliation/AuditLogger
 */

'use strict';

const db = require('../../models');
const logger = require('../../utils/logger');

class AuditLogger {
  /**
   * Log a reconciliation event to immutable audit trail
   * 
   * @param {Object} eventData - Event details
   * @param {Transaction} transaction - Optional Sequelize transaction
   * @returns {Promise<Object>} Created audit entry
   */
  async log(eventData, transaction = null) {
    try {
      const auditEntry = await db.ReconAuditTrail.create({
        run_id: eventData.run_id || null,
        event_type: eventData.event_type,
        actor_type: eventData.actor_type || 'system',
        actor_id: eventData.actor_id || 'system',
        entity_type: eventData.entity_type,
        entity_id: eventData.entity_id,
        event_data: eventData.event_data,
        ip_address: eventData.ip_address || null,
        user_agent: eventData.user_agent || null
      }, { transaction });
      
      logger.debug('[AuditLogger] Event logged', {
        event_id: auditEntry.event_id,
        event_type: auditEntry.event_type,
        run_id: auditEntry.run_id
      });
      
      return auditEntry;
    } catch (error) {
      logger.error('[AuditLogger] Failed to log event', {
        error: error.message,
        eventData
      });
      // Don't throw - audit logging should not break main flow
      return null;
    }
  }
  
  /**
   * Verify integrity of audit trail for a recon run
   * 
   * @param {string} runId - Reconciliation run ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyIntegrity(runId) {
    try {
      const events = await db.ReconAuditTrail.findAll({
        where: { run_id: runId },
        order: [['event_timestamp', 'ASC']]
      });
      
      let previousHash = null;
      let brokenChain = [];
      
      for (const event of events) {
        // Verify event hash
        if (!event.verifyIntegrity()) {
          brokenChain.push({
            event_id: event.event_id,
            reason: 'Invalid event hash'
          });
        }
        
        // Verify chain link
        if (previousHash && event.previous_event_hash !== previousHash) {
          brokenChain.push({
            event_id: event.event_id,
            reason: 'Broken chain link'
          });
        }
        
        previousHash = event.event_hash;
      }
      
      return {
        valid: brokenChain.length === 0,
        total_events: events.length,
        broken_links: brokenChain
      };
    } catch (error) {
      logger.error('[AuditLogger] Failed to verify integrity', {
        error: error.message,
        runId
      });
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get audit trail for a recon run
   * 
   * @param {string} runId - Reconciliation run ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit events
   */
  async getTrail(runId, options = {}) {
    try {
      const where = { run_id: runId };
      
      if (options.event_type) {
        where.event_type = options.event_type;
      }
      
      const events = await db.ReconAuditTrail.findAll({
        where,
        order: [['event_timestamp', options.order || 'ASC']],
        limit: options.limit || null
      });
      
      return events;
    } catch (error) {
      logger.error('[AuditLogger] Failed to get trail', {
        error: error.message,
        runId
      });
      return [];
    }
  }
}

module.exports = AuditLogger;
