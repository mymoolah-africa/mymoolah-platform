/**
 * Add Ad Float Account fields to MerchantFloat
 * 
 * Ad credits are treated as a prefunded float account (similar to currentBalance for vouchers).
 * This allows merchants to prepay for advertising and have their ad spend debited from the float.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add ad float balance (prefunded ad spend account)
    await queryInterface.addColumn('merchant_floats', 'adFloatBalance', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Prefunded ad float account balance (separate from currentBalance which is for vouchers)'
    });

    // Add initial ad float balance tracking
    await queryInterface.addColumn('merchant_floats', 'adFloatInitialBalance', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Initial balance when ad float account was created'
    });

    // Add minimum ad float balance threshold
    await queryInterface.addColumn('merchant_floats', 'adFloatMinimumBalance', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Minimum balance threshold for ad float alerts'
    });

    // Add ledger account code for ad float (if not already present)
    const tableDescription = await queryInterface.describeTable('merchant_floats');
    if (!tableDescription.ledgerAccountCode) {
      await queryInterface.addColumn('merchant_floats', 'ledgerAccountCode', {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Ledger account code for merchant ad float (e.g., 2100-05-{merchantId})'
      });
    }

    console.log('✅ Ad float fields added to merchant_floats table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('merchant_floats', 'adFloatBalance');
    await queryInterface.removeColumn('merchant_floats', 'adFloatInitialBalance');
    await queryInterface.removeColumn('merchant_floats', 'adFloatMinimumBalance');
    
    // Only remove ledgerAccountCode if it was added by this migration
    // (check if it exists first to avoid errors)
    const tableDescription = await queryInterface.describeTable('merchant_floats');
    if (tableDescription.ledgerAccountCode) {
      await queryInterface.removeColumn('merchant_floats', 'ledgerAccountCode');
    }

    console.log('✅ Ad float fields removed from merchant_floats table');
  }
};
