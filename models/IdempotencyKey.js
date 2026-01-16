/**
 * IdempotencyKey Model
 * Stores idempotency keys to prevent duplicate processing of requests
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class IdempotencyKey extends Model {
    static associate(models) {
      // No associations needed
    }
  }

  IdempotencyKey.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'idempotency_key',
      comment: 'Unique idempotency key from X-Idempotency-Key header'
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'API endpoint path (e.g., /api/v1/vouchers/easypay/topup/settlement)'
    },
    requestHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'request_hash',
      comment: 'SHA-256 hash of request body for validation'
    },
    responseStatus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'response_status',
      comment: 'HTTP status code of the response'
    },
    responseBody: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'response_body',
      comment: 'Cached response body (JSON)'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
      comment: 'Expiration time (24 hours from creation)'
    }
  }, {
    sequelize,
    modelName: 'IdempotencyKey',
    tableName: 'idempotency_keys',
    timestamps: true,
    updatedAt: false, // Idempotency keys are immutable once created
    indexes: [
      {
        unique: true,
        fields: ['idempotency_key']
      },
      {
        fields: ['expires_at'],
        name: 'idx_idempotency_keys_expires_at'
      },
      {
        fields: ['endpoint'],
        name: 'idx_idempotency_keys_endpoint'
      }
    ]
  });

  return IdempotencyKey;
};
