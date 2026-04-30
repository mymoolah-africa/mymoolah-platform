'use strict';

module.exports = (sequelize, DataTypes) => {
  const SBSAInboundCreditEventSource = sequelize.define('SBSAInboundCreditEventSource', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'event_id',
    },
    sourceType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'source_type',
    },
    sourceFingerprint: {
      type: DataTypes.STRING(96),
      allowNull: false,
      unique: true,
      field: 'source_fingerprint',
    },
    sourceTransactionId: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'source_transaction_id',
    },
    sourceReference: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'source_reference',
    },
    statementRunId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'statement_run_id',
    },
    statementTransactionId: {
      type: DataTypes.STRING(96),
      allowNull: true,
      field: 'statement_transaction_id',
    },
    valueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'value_date',
    },
    observedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'observed_at',
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'primary',
    },
    rawPayload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'raw_payload',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  }, {
    tableName: 'sbsa_inbound_credit_event_sources',
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['source_fingerprint'] },
      { fields: ['event_id'] },
      { fields: ['source_type', 'created_at'] },
      { fields: ['statement_run_id'] },
    ],
  });

  SBSAInboundCreditEventSource.associate = (models) => {
    SBSAInboundCreditEventSource.belongsTo(models.SBSAInboundCreditEvent, {
      foreignKey: 'eventId',
      as: 'event',
    });
  };

  return SBSAInboundCreditEventSource;
};
