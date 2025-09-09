'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoogleReviewAnalytics extends Model {
    static associate(models) {
      GoogleReviewAnalytics.belongsTo(models.FeedbackCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
    }
  }

  GoogleReviewAnalytics.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date for analytics data'
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total reviews generated from feedback'
    },
    postedReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Reviews successfully posted to Google'
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      comment: 'Average rating of generated reviews'
    },
    ratingDistribution: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Distribution of ratings (1-5 stars)'
    },
    responseRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Percentage of reviews that received responses'
    },
    seoImpact: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'SEO metrics and keyword performance'
    }
  }, {
    sequelize,
    modelName: 'GoogleReviewAnalytics',
    tableName: 'google_review_analytics',
    timestamps: true,
    indexes: [
      {
        fields: ['date']
      }
    ]
  });

  return GoogleReviewAnalytics;
};
