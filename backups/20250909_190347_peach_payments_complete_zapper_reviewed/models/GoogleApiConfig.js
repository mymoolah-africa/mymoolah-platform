'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoogleApiConfig extends Model {
    static associate(models) {
      // This model doesn't have direct associations
    }
  }

  GoogleApiConfig.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    apiKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Google My Business API key'
    },
    clientId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Google OAuth client ID'
    },
    clientSecret: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Google OAuth client secret'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'OAuth refresh token'
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'OAuth access token'
    },
    tokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Access token expiry time'
    },
    locationId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Google My Business location ID'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether Google API integration is active'
    },
    lastSync: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last successful API sync'
    }
  }, {
    sequelize,
    modelName: 'GoogleApiConfig',
    tableName: 'google_api_config',
    timestamps: true,
    indexes: [
      {
        fields: ['isActive']
      }
    ]
  });

  return GoogleApiConfig;
};
