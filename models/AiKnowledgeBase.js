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
    faqId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'External FAQ identifier'
    },
    audience: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'end-user',
      comment: 'Target audience: end-user | business | developer | internal'
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
    keywords: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comma-separated keywords'
    },
    relatedIds: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: 'Comma-separated related FAQ IDs'
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
    },
    // RAG (Retrieval-Augmented Generation) columns
    embedding: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Semantic embedding vector for RAG search (384 dimensions from all-MiniLM-L6-v2)'
    },
    questionEnglish: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'English translation of the question for cross-language semantic search'
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
      },
      {
        fields: ['faqId']
      }
    ]
  });
  
  return AiKnowledgeBase;
};
