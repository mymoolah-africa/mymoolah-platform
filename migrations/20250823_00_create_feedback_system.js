'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableExists = async (name) => {
      const [r] = await queryInterface.sequelize.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${name}'`
      );
      return r && r.length > 0;
    };
    const safeAddIndex = async (table, cols) => {
      try {
        await queryInterface.addIndex(table, cols);
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    };

    // Create feedback_categories table (idempotent)
    if (!(await tableExists('feedback_categories'))) {
    await queryInterface.createTable('feedback_categories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7), // Hex color code
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    }

    // Create feedback_submissions table (idempotent)
    if (!(await tableExists('feedback_submissions'))) {
    await queryInterface.createTable('feedback_submissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true, // Anonymous feedback allowed
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'feedback_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      priority: {
        type: Sequelize.INTEGER, // 1-5 scale
        allowNull: false,
        defaultValue: 3
      },
      status: {
        type: Sequelize.ENUM('pending', 'reviewing', 'in_progress', 'resolved', 'closed'),
        defaultValue: 'pending'
      },
      sentiment: {
        type: Sequelize.ENUM('very_negative', 'negative', 'neutral', 'positive', 'very_positive'),
        allowNull: true
      },
      aiAnalysis: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
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
    }

    // Create feedback_attachments table (idempotent)
    if (!(await tableExists('feedback_attachments'))) {
    await queryInterface.createTable('feedback_attachments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      feedbackId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'feedback_submissions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      fileType: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      fileSize: {
        type: Sequelize.INTEGER, // Size in bytes
        allowNull: false
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    }

    // Create feedback_ai_insights table (idempotent)
    if (!(await tableExists('feedback_ai_insights'))) {
    await queryInterface.createTable('feedback_ai_insights', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      feedbackId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'feedback_submissions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      insightType: {
        type: Sequelize.ENUM('sentiment', 'topic', 'priority', 'content', 'seo', 'marketing'),
        allowNull: false
      },
      content: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      confidence: {
        type: Sequelize.DECIMAL(3, 2), // 0.00 to 1.00
        allowNull: false,
        defaultValue: 0.5
      },
      model: {
        type: Sequelize.STRING(50), // OpenAI model used
        allowNull: false
      },
      tokens: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    }

    // Create feedback_content_generation table (idempotent)
    if (!(await tableExists('feedback_content_generation'))) {
    await queryInterface.createTable('feedback_content_generation', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      feedbackId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'feedback_submissions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      contentType: {
        type: Sequelize.ENUM('blog_post', 'social_media', 'seo_meta', 'marketing_copy', 'feature_announcement'),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      keywords: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      seoScore: {
        type: Sequelize.INTEGER, // 0-100
        allowNull: true
      },
      platform: {
        type: Sequelize.STRING(50), // twitter, linkedin, blog, etc.
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'review', 'approved', 'published'),
        defaultValue: 'draft'
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true
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
    }

    // Create feedback_analytics table (idempotent)
    if (!(await tableExists('feedback_analytics'))) {
    await queryInterface.createTable('feedback_analytics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'feedback_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      totalSubmissions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      avgPriority: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      sentimentDistribution: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      topKeywords: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      contentGenerated: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      seoImpact: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    }

    // Insert default feedback categories (only if empty)
    const [catCount] = await queryInterface.sequelize.query(`SELECT COUNT(*) as c FROM feedback_categories`);
    if (catCount && catCount[0] && parseInt(catCount[0].c, 10) === 0) {
    await queryInterface.bulkInsert('feedback_categories', [
      {
        name: 'Bug Report',
        description: 'Report technical issues or bugs',
        icon: 'bug',
        color: '#ef4444',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Feature Request',
        description: 'Suggest new features or improvements',
        icon: 'lightbulb',
        color: '#3b82f6',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'User Experience',
        description: 'Feedback on app usability and design',
        icon: 'user',
        color: '#10b981',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Performance',
        description: 'Speed, responsiveness, and efficiency issues',
        icon: 'zap',
        color: '#f59e0b',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Security',
        description: 'Security concerns or suggestions',
        icon: 'shield',
        color: '#8b5cf6',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'General',
        description: 'Other feedback and suggestions',
        icon: 'message-circle',
        color: '#6b7280',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    }

    // Create indexes for performance (idempotent)
    await safeAddIndex('feedback_submissions', ['userId']);
    await safeAddIndex('feedback_submissions', ['categoryId']);
    await safeAddIndex('feedback_submissions', ['status']);
    await safeAddIndex('feedback_submissions', ['priority']);
    await safeAddIndex('feedback_submissions', ['sentiment']);
    await safeAddIndex('feedback_submissions', ['createdAt']);
    await safeAddIndex('feedback_ai_insights', ['feedbackId']);
    await safeAddIndex('feedback_ai_insights', ['insightType']);
    await safeAddIndex('feedback_content_generation', ['feedbackId']);
    await safeAddIndex('feedback_content_generation', ['contentType']);
    await safeAddIndex('feedback_content_generation', ['status']);
    await safeAddIndex('feedback_analytics', ['date']);
    await safeAddIndex('feedback_analytics', ['categoryId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('feedback_analytics');
    await queryInterface.dropTable('feedback_content_generation');
    await queryInterface.dropTable('feedback_ai_insights');
    await queryInterface.dropTable('feedback_attachments');
    await queryInterface.dropTable('feedback_submissions');
    await queryInterface.dropTable('feedback_categories');
  }
};
