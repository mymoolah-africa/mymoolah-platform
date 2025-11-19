'use strict';

/**
 * Migration: Update Zapper tier fees to percentage-based model
 * - Bronze: 1.5% total (MM share 1.1% + Zapper 0.4%)
 * - Silver: 1.4% total (MM share 1.0%)
 * - Gold: 1.2% total (MM share 0.8%)
 * - Platinum: 1.0% total (MM share 0.6%)
 */

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const updates = [
        { tier: 'bronze', percentage: 0.0110 },
        { tier: 'silver', percentage: 0.0100 },
        { tier: 'gold', percentage: 0.0080 },
        { tier: 'platinum', percentage: 0.0060 }
      ];

      for (const update of updates) {
        await queryInterface.bulkUpdate(
          'supplier_tier_fees',
          {
            mm_fee_type: 'percentage',
            mm_fixed_fee_cents: 0,
            mm_percentage_fee: update.percentage
          },
          {
            supplier_code: 'ZAPPER',
            service_type: 'qr_payment',
            tier_level: update.tier
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const rollbacks = [
        { tier: 'bronze', fixed: 300 },
        { tier: 'silver', fixed: 275 },
        { tier: 'gold', fixed: 250 },
        { tier: 'platinum', fixed: 225 }
      ];

      for (const rollback of rollbacks) {
        await queryInterface.bulkUpdate(
          'supplier_tier_fees',
          {
            mm_fee_type: 'fixed',
            mm_fixed_fee_cents: rollback.fixed,
            mm_percentage_fee: 0
          },
          {
            supplier_code: 'ZAPPER',
            service_type: 'qr_payment',
            tier_level: rollback.tier
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

