'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ai_knowledge_base', 'faqId', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: false,
      comment: 'External FAQ identifier e.g. Q2.1'
    });
    await queryInterface.addColumn('ai_knowledge_base', 'audience', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'end-user',
      comment: 'Primary audience (end-user | business | developer | internal)'
    });
    await queryInterface.addColumn('ai_knowledge_base', 'keywords', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Comma-separated keywords for search matching'
    });
    await queryInterface.addColumn('ai_knowledge_base', 'relatedIds', {
      type: Sequelize.STRING(120),
      allowNull: true,
      comment: 'Comma-separated related FAQ IDs'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ai_knowledge_base', 'faqId');
    await queryInterface.removeColumn('ai_knowledge_base', 'audience');
    await queryInterface.removeColumn('ai_knowledge_base', 'keywords');
    await queryInterface.removeColumn('ai_knowledge_base', 'relatedIds');
  }
};

