/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('peach_payments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      type: { type: Sequelize.ENUM('payshap_rpp', 'payshap_rtp'), allowNull: false },
      merchantTransactionId: { type: Sequelize.STRING, allowNull: false, unique: true },
      peachReference: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.DECIMAL(15,2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      partyAlias: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'initiated' },
      resultCode: { type: Sequelize.STRING, allowNull: true },
      resultDescription: { type: Sequelize.STRING, allowNull: true },
      rawRequest: { type: Sequelize.JSONB, allowNull: true },
      rawResponse: { type: Sequelize.JSONB, allowNull: true },
      webhookReceivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('peach_payments');
  }
};


