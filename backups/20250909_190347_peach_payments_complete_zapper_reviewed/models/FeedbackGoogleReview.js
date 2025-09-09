'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackGoogleReview extends Model {
    static associate(models) {
      FeedbackGoogleReview.belongsTo(models.FeedbackSubmission, {
        foreignKey: 'feedbackId',
        as: 'feedback'
      });
      
      FeedbackGoogleReview.hasMany(models.GoogleReviewResponse, {
        foreignKey: 'googleReviewId',
        sourceKey: 'googleReviewId',
        as: 'responses'
      });
    }
  }

  FeedbackGoogleReview.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    feedbackId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'feedback_submissions',
        key: 'id'
      }
    },
    googleReviewId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Google My Business review ID if posted via API'
    },
    reviewContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'AI-generated review content'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      },
      comment: 'Review rating (1-5 stars)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'generated', 'posted', 'failed', 'rejected'),
      defaultValue: 'pending',
      comment: 'Review processing status'
    },
    aiGenerationData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'AI generation metadata and confidence scores'
    },
    postingAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of attempts to post to Google'
    },
    lastPostingAttempt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last posting attempt'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error details if posting failed'
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When review was successfully posted'
    }
  }, {
    sequelize,
    modelName: 'FeedbackGoogleReview',
    tableName: 'feedback_google_reviews',
    timestamps: true,
    indexes: [
      {
        fields: ['feedbackId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (review, options) => {
        // Auto-generate rating from sentiment if not provided
        if (!review.rating && review.aiGenerationData?.sentiment) {
          review.rating = getRatingFromSentiment(review.aiGenerationData.sentiment);
        }
      }
    }
  });

  // Helper function to calculate rating from sentiment
  const getRatingFromSentiment = (sentiment) => {
    const ratingMap = {
      'very_positive': 5,
      'positive': 4,
      'neutral': 4,
      'negative': 3,
      'very_negative': 2
    };
    return ratingMap[sentiment] || 4;
  };

  return FeedbackGoogleReview;
};
