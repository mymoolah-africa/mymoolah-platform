/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns to peach_payments table
    await queryInterface.addColumn('peach_payments', 'paymentMethod', {
      type: Sequelize.ENUM('proxy', 'account_number'),
      allowNull: false,
      defaultValue: 'proxy',
      comment: 'PayShap proxy (mobile) or direct bank account'
    });

    await queryInterface.addColumn('peach_payments', 'bankCode', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Bank code when using account number'
    });

    await queryInterface.addColumn('peach_payments', 'bankName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Bank name when using account number'
    });

    await queryInterface.addColumn('peach_payments', 'businessContext', {
      type: Sequelize.ENUM('wallet', 'client_integration'),
      allowNull: false,
      defaultValue: 'wallet',
      comment: 'Wallet user or client integration payment'
    });

    await queryInterface.addColumn('peach_payments', 'clientId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Client ID for integration payments'
    });

    await queryInterface.addColumn('peach_payments', 'employeeId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Employee ID for client payments'
    });

    // Update existing records to have paymentMethod = 'proxy' and businessContext = 'wallet'
    await queryInterface.sequelize.query(`
      UPDATE peach_payments 
      SET 
        paymentMethod = 'proxy',
        businessContext = 'wallet'
      WHERE paymentMethod IS NULL OR businessContext IS NULL
    `);

    // Add indexes for better performance
    await queryInterface.addIndex('peach_payments', ['paymentMethod']);
    await queryInterface.addIndex('peach_payments', ['businessContext']);
    await queryInterface.addIndex('peach_payments', ['clientId']);
    await queryInterface.addIndex('peach_payments', ['employeeId']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('peach_payments', ['paymentMethod']);
    await queryInterface.removeIndex('peach_payments', ['businessContext']);
    await queryInterface.removeIndex('peach_payments', ['clientId']);
    await queryInterface.removeIndex('peach_payments', ['employeeId']);

    // Remove columns
    await queryInterface.removeColumn('peach_payments', 'employeeId');
    await queryInterface.removeColumn('peach_payments', 'clientId');
    await queryInterface.removeColumn('peach_payments', 'businessContext');
    await queryInterface.removeColumn('peach_payments', 'bankName');
    await queryInterface.removeColumn('peach_payments', 'bankCode');
    await queryInterface.removeColumn('peach_payments', 'paymentMethod');

    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_peach_payments_paymentMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_peach_payments_businessContext;');
  }
};
