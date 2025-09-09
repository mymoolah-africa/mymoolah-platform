'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create feedback_google_reviews table
    await queryInterface.createTable('feedback_google_reviews', {
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
      googleReviewId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Google My Business review ID if posted via API'
      },
      reviewContent: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'AI-generated review content'
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        },
        comment: 'Review rating (1-5 stars)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'generated', 'posted', 'failed', 'rejected'),
        defaultValue: 'pending',
        comment: 'Review processing status'
      },
      aiGenerationData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'AI generation metadata and confidence scores'
      },
      postingAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of attempts to post to Google'
      },
      lastPostingAttempt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of last posting attempt'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if posting failed'
      },
      postedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When review was successfully posted'
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

    // Create google_review_responses table
    await queryInterface.createTable('google_review_responses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      googleReviewId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Google review ID to respond to'
      },
      responseContent: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'AI-generated response content'
      },
      status: {
        type: Sequelize.ENUM('pending', 'posted', 'failed'),
        defaultValue: 'pending'
      },
      aiGenerationData: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      postedAt: {
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

    // Create google_review_analytics table
    await queryInterface.createTable('google_review_analytics', {
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
      totalReviews: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total reviews generated from feedback'
      },
      postedReviews: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Reviews successfully posted to Google'
      },
      averageRating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0,
        comment: 'Average rating of generated reviews'
      },
      ratingDistribution: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Distribution of ratings (1-5 stars)'
      },
      responseRate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Percentage of reviews that received responses'
      },
      seoImpact: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'SEO metrics and keyword performance'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create google_api_config table
    await queryInterface.createTable('google_api_config', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      apiKey: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Google My Business API key'
      },
      clientId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Google OAuth client ID'
      },
      clientSecret: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Google OAuth client secret'
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'OAuth refresh token'
      },
      accessToken: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'OAuth access token'
      },
      tokenExpiry: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Access token expiry time'
      },
      locationId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Google My Business location ID'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether Google API integration is active'
      },
      lastSync: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last successful API sync'
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

    // Insert default Google API config
    await queryInterface.bulkInsert('google_api_config', [
      {
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create indexes for performance
    await queryInterface.addIndex('feedback_google_reviews', ['feedbackId']);
    await queryInterface.addIndex('feedback_google_reviews', ['status']);
    await queryInterface.addIndex('feedback_google_reviews', ['rating']);
    await queryInterface.addIndex('feedback_google_reviews', ['createdAt']);
    await queryInterface.addIndex('google_review_responses', ['googleReviewId']);
    await queryInterface.addIndex('google_review_responses', ['status']);
    await queryInterface.addIndex('google_review_analytics', ['date']);
    await queryInterface.addIndex('google_api_config', ['isActive']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('google_review_analytics');
    await queryInterface.dropTable('google_review_responses');
    await queryInterface.dropTable('feedback_google_reviews');
    await queryInterface.dropTable('google_api_config');
  }
};
