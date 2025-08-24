'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackAiInsight extends Model {
    static associate(models) {
      FeedbackAiInsight.belongsTo(models.FeedbackSubmission, {
        foreignKey: 'feedbackId',
        as: 'feedback'
      });
    }
  }

  FeedbackAiInsight.init({
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
    insightType: {
      type: DataTypes.ENUM('sentiment', 'topic', 'priority', 'content', 'seo', 'marketing'),
      allowNull: false
    },
    content: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.5
    },
    model: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tokens: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FeedbackAiInsight',
    tableName: 'feedback_ai_insights',
    timestamps: true,
    indexes: [
      {
        fields: ['feedbackId']
      },
      {
        fields: ['insightType']
      }
    ]
  });

  return FeedbackAiInsight;
};
