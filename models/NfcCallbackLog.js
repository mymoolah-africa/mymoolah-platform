'use strict';

/**
 * NfcCallbackLog Model
 * Audit log for NFC deposit confirmations.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

module.exports = (sequelize, DataTypes) => {
  const NfcCallbackLog = sequelize.define('NfcCallbackLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rawPayload: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'For debugging - redact PAN',
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    walletCredited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'nfc_callback_logs',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  });

  return NfcCallbackLog;
};
