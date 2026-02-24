'use strict';

/**
 * Migration: Add metadata JSONB column to standard_bank_transactions and standard_bank_rtp_requests
 *
 * Required by standardbankRppService and standardbankRtpService which store:
 *   { feeBreakdown, monthlyRppCount/monthlyRtpCount, pricingTier }
 * for tiered pricing audit trail and fee recalculation on callbacks.
 *
 * Also adds originalMessageId index to standard_bank_rtp_requests for
 * efficient callback lookups (processRtpCallback queries by this field).
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-24
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add metadata to standard_bank_transactions
    await queryInterface.addColumn('standard_bank_transactions', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Fee breakdown, pricing tier, and other transaction metadata',
    });
    console.log('✅ metadata column added to standard_bank_transactions');

    // 2. Add metadata to standard_bank_rtp_requests
    await queryInterface.addColumn('standard_bank_rtp_requests', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Fee breakdown, pricing tier, and other RTP request metadata',
    });
    console.log('✅ metadata column added to standard_bank_rtp_requests');

    // 3. Add originalMessageId index to standard_bank_rtp_requests
    //    (processRtpCallback queries by this field on every callback)
    await queryInterface.addIndex('standard_bank_rtp_requests', ['originalMessageId'], {
      name: 'idx_sb_rtp_requests_original_message_id',
    });
    console.log('✅ originalMessageId index added to standard_bank_rtp_requests');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('standard_bank_rtp_requests', 'idx_sb_rtp_requests_original_message_id');
    await queryInterface.removeColumn('standard_bank_rtp_requests', 'metadata');
    await queryInterface.removeColumn('standard_bank_transactions', 'metadata');
    console.log('✅ Rolled back: metadata columns and originalMessageId index removed');
  },
};
