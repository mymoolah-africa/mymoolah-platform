"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("recurring_payment_requests", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      requesterUserId: { type: Sequelize.INTEGER, allowNull: false },
      payerUserId: { type: Sequelize.INTEGER, allowNull: false },
      requesterWalletId: { type: Sequelize.STRING, allowNull: false },
      payerWalletId: { type: Sequelize.STRING, allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      description: { type: Sequelize.TEXT, allowNull: true },
      frequency: { type: Sequelize.ENUM('daily','weekly','monthly'), allowNull: false },
      dayOfWeek: { type: Sequelize.INTEGER, allowNull: true }, // 0=Sun..6=Sat
      dayOfMonth: { type: Sequelize.INTEGER, allowNull: true }, // 1..31
      startAt: { type: Sequelize.DATE, allowNull: false },
      endOption: { type: Sequelize.ENUM('never','count','until'), allowNull: false, defaultValue: 'never' },
      occurrencesRemaining: { type: Sequelize.INTEGER, allowNull: true },
      untilDate: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.ENUM('active','paused','cancelled','completed'), allowNull: false, defaultValue: 'active' },
      lastRunAt: { type: Sequelize.DATE, allowNull: true },
      nextRunAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('recurring_payment_requests', ['status','nextRunAt']);
    await queryInterface.addIndex('recurring_payment_requests', ['requesterUserId']);
    await queryInterface.addIndex('recurring_payment_requests', ['payerUserId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("recurring_payment_requests");
  }
};


