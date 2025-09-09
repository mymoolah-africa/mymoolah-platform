'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Support Chat Interactions Table
    await queryInterface.createTable('support_interactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true, // Allow anonymous interactions
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      sessionId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Unique session identifier for chat conversations'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'User message content'
      },
      aiResponse: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'AI generated response'
      },
      intent: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Detected user intent'
      },
      confidence: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment: 'AI confidence score (0-1)'
      },
      language: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'en',
        comment: 'Language code (en, af, zu, xh, st)'
      },
      context: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'User context and conversation history'
      },
      currentPage: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Page where support was accessed'
      },
      responseTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Response time in milliseconds'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Support Feedback Table
    await queryInterface.createTable('support_feedback', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      interactionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'support_interactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      helpful: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: 'Whether the response was helpful'
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        },
        comment: 'User rating (1-5 stars)'
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional feedback text'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // AI Knowledge Base Table
    await queryInterface.createTable('ai_knowledge_base', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Knowledge category (api, business_logic, troubleshooting)'
      },
      question: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Common question or issue'
      },
      answer: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Standard answer or solution'
      },
      confidenceScore: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.8,
        comment: 'Confidence score for this knowledge entry'
      },
      usageCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times this knowledge was used'
      },
      successRate: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.8,
        comment: 'Success rate based on feedback'
      },
      language: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'en',
        comment: 'Language for this knowledge entry'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this knowledge entry is active'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Support Statistics Table
    await queryInterface.createTable('support_statistics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        unique: true,
        comment: 'Date for statistics'
      },
      totalInteractions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total support interactions for the day'
      },
      averageResponseTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Average response time in milliseconds'
      },
      satisfactionRate: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Overall satisfaction rate (0-1)'
      },
      escalationRate: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Rate of escalations to human support'
      },
      commonIssues: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Most common issues for the day'
      },
      languageBreakdown: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Breakdown of interactions by language'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for better performance
    await queryInterface.addIndex('support_interactions', ['userId']);
    await queryInterface.addIndex('support_interactions', ['sessionId']);
    await queryInterface.addIndex('support_interactions', ['createdAt']);
    await queryInterface.addIndex('support_interactions', ['intent']);
    await queryInterface.addIndex('support_interactions', ['language']);

    await queryInterface.addIndex('support_feedback', ['interactionId']);
    await queryInterface.addIndex('support_feedback', ['userId']);
    await queryInterface.addIndex('support_feedback', ['helpful']);

    await queryInterface.addIndex('ai_knowledge_base', ['category']);
    await queryInterface.addIndex('ai_knowledge_base', ['language']);
    await queryInterface.addIndex('ai_knowledge_base', ['isActive']);

    await queryInterface.addIndex('support_statistics', ['date']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('support_statistics');
    await queryInterface.dropTable('ai_knowledge_base');
    await queryInterface.dropTable('support_feedback');
    await queryInterface.dropTable('support_interactions');
  }
};
