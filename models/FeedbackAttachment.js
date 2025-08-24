'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeedbackAttachment extends Model {
    static associate(models) {
      FeedbackAttachment.belongsTo(models.FeedbackSubmission, {
        foreignKey: 'feedbackId',
        as: 'feedback'
      });
    }
  }

  FeedbackAttachment.init({
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
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'FeedbackAttachment',
    tableName: 'feedback_attachments',
    timestamps: true
  });

  return FeedbackAttachment;
};
