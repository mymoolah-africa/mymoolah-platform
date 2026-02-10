'use strict';

/**
 * NfcDepositIntent Model
 * Tracks NFC tap-to-deposit intents. paymentReference = MSISDN for Standard Bank T-PPP allocation.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

module.exports = (sequelize, DataTypes) => {
  const NfcDepositIntent = sequelize.define('NfcDepositIntent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'wallets', key: 'walletId' },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    currencyCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ZAR',
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'MSISDN (user mobile) for Standard Bank T-PPP allocation',
    },
    consumerTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'From Halo Intent API response',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
    },
    haloEnv: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'nfc_deposit_intents',
    underscored: true,
    timestamps: true,
  });

  NfcDepositIntent.associate = function (models) {
    NfcDepositIntent.belongsTo(models.User, { foreignKey: 'userId' });
    NfcDepositIntent.belongsTo(models.Wallet, { foreignKey: 'walletId' });
  };

  return NfcDepositIntent;
};
