'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RecentPayerHides', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      requesterUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      payerUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      context: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'request-money'
      },
      hiddenAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addConstraint('RecentPayerHides', {
      fields: ['requesterUserId', 'payerUserId', 'context'],
      type: 'unique',
      name: 'recent_payer_hides_unique_requester_payer_context'
    });

    await queryInterface.addIndex('RecentPayerHides', ['requesterUserId']);
    await queryInterface.addIndex('RecentPayerHides', ['payerUserId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('RecentPayerHides');
  }
};

