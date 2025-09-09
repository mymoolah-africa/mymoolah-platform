"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payment_requests", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      requesterUserId: { type: Sequelize.INTEGER, allowNull: false },
      payerUserId: { type: Sequelize.INTEGER, allowNull: false },
      requesterWalletId: { type: Sequelize.STRING, allowNull: true },
      payerWalletId: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('requested', 'viewed', 'approved', 'declined', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'requested',
      },
      notificationId: { type: Sequelize.INTEGER, allowNull: true },
      approvedAt: { type: Sequelize.DATE, allowNull: true },
      declinedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('payment_requests', ['payerUserId', 'status']);
    await queryInterface.addIndex('payment_requests', ['requesterUserId', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payment_requests");
  },
};


