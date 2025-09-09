'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackSubmission extends Model {
    static associate(models) {
      // Define associations here
      FeedbackSubmission.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      
      FeedbackSubmission.belongsTo(models.FeedbackCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });
      
      FeedbackSubmission.hasMany(models.FeedbackAttachment, {
        foreignKey: 'feedbackId',
        as: 'attachments'
      });
      
      FeedbackSubmission.hasMany(models.FeedbackAiInsight, {
        foreignKey: 'feedbackId',
        as: 'aiInsights'
      });
      
      FeedbackSubmission.hasMany(models.FeedbackContentGeneration, {
        foreignKey: 'feedbackId',
        as: 'contentGenerations'
      });
    }
  }

  FeedbackSubmission.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Anonymous feedback allowed
      references: {
        model: 'users',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'feedback_categories',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 5000] // Minimum 10 chars, maximum 5000
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5,
        isInt: true
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'reviewing', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'pending'
    },
    sentiment: {
      type: DataTypes.ENUM('very_negative', 'negative', 'neutral', 'positive', 'very_positive'),
      allowNull: true
    },
    aiAnalysis: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      validate: {
        isValidTags(value) {
          if (value && value.length > 10) {
            throw new Error('Maximum 10 tags allowed');
          }
          if (value && value.some(tag => tag.length > 50)) {
            throw new Error('Tags must be 50 characters or less');
          }
        }
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FeedbackSubmission',
    tableName: 'feedback_submissions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['sentiment']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (feedback, options) => {
        // Auto-generate tags from title and description
        if (!feedback.tags || feedback.tags.length === 0) {
          const text = `${feedback.title} ${feedback.description}`.toLowerCase();
          const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
          const words = text.split(/\s+/).filter(word => 
            word.length > 3 && !commonWords.includes(word)
          );
          feedback.tags = [...new Set(words)].slice(0, 5); // Max 5 auto-generated tags
        }
      }
    }
  });

  return FeedbackSubmission;
};
