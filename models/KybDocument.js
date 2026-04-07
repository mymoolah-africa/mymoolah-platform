'use strict';

/**
 * KybDocument model
 * Know Your Business document uploaded during client onboarding.
 * Supports OCR extraction, automated validation, and expiry tracking.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

module.exports = (sequelize, DataTypes) => {
  const KybDocument = sequelize.define('KybDocument', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    document_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: { isIn: [['cor15', 'id_document', 'proof_of_address', 'trust_deed', 'partnership_agreement', 'npo_certificate', 'bank_confirmation', 'tax_clearance']] },
    },
    entity_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    extracted_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    validation_result: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'processing', 'verified', 'rejected', 'expired']] },
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'kyb_documents',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  KybDocument.associate = (models) => {
    KybDocument.belongsTo(models.DisbursementClient, {
      foreignKey: 'client_id',
      as: 'client',
    });
  };

  return KybDocument;
};
