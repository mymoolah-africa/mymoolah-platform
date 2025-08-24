'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackContentGeneration extends Model {
    static associate(models) {
      FeedbackContentGeneration.belongsTo(models.FeedbackSubmission, {
        foreignKey: 'feedbackId',
        as: 'feedback'
      });
    }
  }

  FeedbackContentGeneration.init({
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
    contentType: {
      type: DataTypes.ENUM('blog_post', 'social_media', 'seo_meta', 'marketing_copy', 'feature_announcement'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    seoScore: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    platform: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'review', 'approved', 'published'),
      defaultValue: 'draft'
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FeedbackContentGeneration',
    tableName: 'feedback_content_generation',
    timestamps: true,
    indexes: [
      {
        fields: ['feedbackId']
      },
      {
        fields: ['contentType']
      },
      {
        fields: ['status']
      }
    ]
  });

  return FeedbackContentGeneration;
};
