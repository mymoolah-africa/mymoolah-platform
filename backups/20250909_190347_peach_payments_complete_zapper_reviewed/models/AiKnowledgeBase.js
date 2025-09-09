'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AiKnowledgeBase extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  
  AiKnowledgeBase.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Knowledge category (api, business_logic, troubleshooting)'
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Common question or issue'
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Standard answer or solution'
    },
    confidenceScore: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.8,
      comment: 'Confidence score for this knowledge entry'
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times this knowledge was used'
    },
    successRate: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.8,
      comment: 'Success rate based on feedback'
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en',
      comment: 'Language for this knowledge entry'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this knowledge entry is active'
    }
  }, {
    sequelize,
    modelName: 'AiKnowledgeBase',
    tableName: 'ai_knowledge_base',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['language']
      },
      {
        fields: ['isActive']
      }
    ]
  });
  
  return AiKnowledgeBase;
};
