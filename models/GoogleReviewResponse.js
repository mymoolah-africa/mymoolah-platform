'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoogleReviewResponse extends Model {
    static associate(models) {
      GoogleReviewResponse.belongsTo(models.FeedbackGoogleReview, {
        foreignKey: 'googleReviewId',
        sourceKey: 'googleReviewId',
        as: 'review'
      });
    }
  }

  GoogleReviewResponse.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    googleReviewId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Google review ID to respond to'
    },
    responseContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'AI-generated response content'
    },
    status: {
      type: DataTypes.ENUM('pending', 'posted', 'failed'),
      defaultValue: 'pending',
      comment: 'Response posting status'
    },
    aiGenerationData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'AI generation metadata and confidence scores'
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When response was posted to Google'
    }
  }, {
    sequelize,
    modelName: 'GoogleReviewResponse',
    tableName: 'google_review_responses',
    timestamps: true,
    indexes: [
      {
        fields: ['googleReviewId']
      },
      {
        fields: ['status']
      }
    ]
  });

  return GoogleReviewResponse;
};
