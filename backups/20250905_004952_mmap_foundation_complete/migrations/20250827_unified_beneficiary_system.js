'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add new columns for unified beneficiary system
    await queryInterface.addColumn('beneficiaries', 'paymentMethods', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Unified payment methods: mymoolah wallet, bank accounts'
    });

    await queryInterface.addColumn('beneficiaries', 'vasServices', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'VAS services: airtime, data providers'
    });

    await queryInterface.addColumn('beneficiaries', 'utilityServices', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Utility services: electricity, water meters'
    });

    await queryInterface.addColumn('beneficiaries', 'billerServices', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Biller services: DSTV, insurance, etc.'
    });

    await queryInterface.addColumn('beneficiaries', 'voucherServices', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Voucher services: gaming, streaming platforms'
    });

    await queryInterface.addColumn('beneficiaries', 'preferredPaymentMethod', {
      type: Sequelize.ENUM('mymoolah', 'bank', 'airtime', 'data', 'electricity', 'biller', 'voucher'),
      allowNull: true,
      comment: 'User preferred payment method for this beneficiary'
    });

    await queryInterface.addColumn('beneficiaries', 'isFavorite', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this beneficiary is marked as favorite'
    });

    await queryInterface.addColumn('beneficiaries', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'User notes about this beneficiary'
    });

    // Step 2: Add indexes for performance
    await queryInterface.addIndex('beneficiaries', ['userId', 'isFavorite']);
    await queryInterface.addIndex('beneficiaries', ['preferredPaymentMethod']);
    await queryInterface.addIndex('beneficiaries', ['paymentMethods'], { using: 'gin' });
    await queryInterface.addIndex('beneficiaries', ['vasServices'], { using: 'gin' });
    await queryInterface.addIndex('beneficiaries', ['utilityServices'], { using: 'gin' });

    // Step 3: Update existing beneficiaries to use new structure
    // This will be done in the down migration if needed
  },

  async down(queryInterface, Sequelize) {
    // Remove all new columns
    await queryInterface.removeColumn('beneficiaries', 'paymentMethods');
    await queryInterface.removeColumn('beneficiaries', 'vasServices');
    await queryInterface.removeColumn('beneficiaries', 'utilityServices');
    await queryInterface.removeColumn('beneficiaries', 'billerServices');
    await queryInterface.removeColumn('beneficiaries', 'voucherServices');
    await queryInterface.removeColumn('beneficiaries', 'preferredPaymentMethod');
    await queryInterface.removeColumn('beneficiaries', 'isFavorite');
    await queryInterface.removeColumn('beneficiaries', 'notes');

    // Remove indexes
    await queryInterface.removeIndex('beneficiaries', ['userId', 'isFavorite']);
    await queryInterface.removeIndex('beneficiaries', ['preferredPaymentMethod']);
    await queryInterface.removeIndex('beneficiaries', ['paymentMethods']);
    await queryInterface.removeIndex('beneficiaries', ['vasServices']);
    await queryInterface.removeIndex('beneficiaries', ['utilityServices']);
  }
};
