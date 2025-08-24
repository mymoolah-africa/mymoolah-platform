'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackCategory extends Model {
    static associate(models) {
      // Define associations here
      FeedbackCategory.hasMany(models.FeedbackSubmission, {
        foreignKey: 'categoryId',
        as: 'submissions'
      });
      
      FeedbackCategory.hasMany(models.FeedbackAnalytics, {
        foreignKey: 'categoryId',
        as: 'analytics'
      });
    }
  }

  FeedbackCategory.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'FeedbackCategory',
    tableName: 'feedback_categories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return FeedbackCategory;
};
