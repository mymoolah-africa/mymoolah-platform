'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportFeedback extends Model {
    static associate(models) {
      // Define associations here
      SupportFeedback.belongsTo(models.SupportInteraction, {
        foreignKey: 'interactionId',
        as: 'interaction'
      });
      
      SupportFeedback.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  
  SupportFeedback.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    interactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'support_interactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    helpful: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: 'Whether the response was helpful'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      },
      comment: 'User rating (1-5 stars)'
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional feedback text'
    }
  }, {
    sequelize,
    modelName: 'SupportFeedback',
    tableName: 'support_feedback',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['interactionId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['helpful']
      }
    ]
  });
  
  return SupportFeedback;
};
