'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackAnalytics extends Model {
    static associate(models) {
      FeedbackAnalytics.belongsTo(models.FeedbackCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
    }
  }

  FeedbackAnalytics.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'feedback_categories',
        key: 'id'
      }
    },
    totalSubmissions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    avgPriority: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    },
    sentimentDistribution: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    topKeywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    contentGenerated: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    seoImpact: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'FeedbackAnalytics',
    tableName: 'feedback_analytics',
    timestamps: true,
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['categoryId']
      }
    ]
  });

  return FeedbackAnalytics;
};
