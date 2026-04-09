'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bills', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'MyMoolah user ID — links EasyPay bill to wallet owner'
    });

    await queryInterface.addIndex('bills', ['userId'], {
      name: 'bills_userId_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('bills', 'bills_userId_idx');
    await queryInterface.removeColumn('bills', 'userId');
  }
};
