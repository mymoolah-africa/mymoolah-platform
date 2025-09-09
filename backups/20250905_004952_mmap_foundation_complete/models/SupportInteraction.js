'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportInteraction extends Model {
    static associate(models) {
      // Define associations here
      SupportInteraction.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      
      SupportInteraction.hasMany(models.SupportFeedback, {
        foreignKey: 'interactionId',
        as: 'feedback'
      });
    }
  }
  
  SupportInteraction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow anonymous interactions
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Unique session identifier for chat conversations'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'User message content'
    },
    aiResponse: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'AI generated response'
    },
    intent: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Detected user intent'
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'AI confidence score (0-1)'
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en',
      comment: 'Language code (en, af, zu, xh, st)'
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'User context and conversation history'
    },
    currentPage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Page where support was accessed'
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Response time in milliseconds'
    }
  }, {
    sequelize,
    modelName: 'SupportInteraction',
    tableName: 'support_interactions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['sessionId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['intent']
      },
      {
        fields: ['language']
      }
    ]
  });
  
  return SupportInteraction;
};
