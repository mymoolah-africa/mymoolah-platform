/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const colExists = async (table, col) => {
      const [r] = await queryInterface.sequelize.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='${col}'`
      );
      return r && r.length > 0;
    };
    const safeAddColumn = async (table, col, def) => {
      if (await colExists(table, col)) return;
      await queryInterface.addColumn(table, col, def);
    };
    const safeAddIndex = async (table, cols) => {
      try {
        await queryInterface.addIndex(table, cols);
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    };

    // Add new columns to peach_payments table (idempotent)
    // Note: comments removed - were causing "syntax error at or near or" in PostgreSQL
    await safeAddColumn('peach_payments', 'paymentMethod', {
      type: Sequelize.ENUM('proxy', 'account_number'),
      allowNull: false,
      defaultValue: 'proxy'
    });

    await safeAddColumn('peach_payments', 'bankCode', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await safeAddColumn('peach_payments', 'bankName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await safeAddColumn('peach_payments', 'businessContext', {
      type: Sequelize.ENUM('wallet', 'client_integration'),
      allowNull: false,
      defaultValue: 'wallet'
    });

    await safeAddColumn('peach_payments', 'clientId', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await safeAddColumn('peach_payments', 'employeeId', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // addColumn with defaultValue already sets values for existing rows - no UPDATE needed

    // Add indexes for better performance (idempotent)
    await safeAddIndex('peach_payments', ['paymentMethod']);
    await safeAddIndex('peach_payments', ['businessContext']);
    await safeAddIndex('peach_payments', ['clientId']);
    await safeAddIndex('peach_payments', ['employeeId']);
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
