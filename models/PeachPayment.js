module.exports = (sequelize, DataTypes) => {
  const PeachPayment = sequelize.define('PeachPayment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.ENUM('payshap_rpp', 'payshap_rtp'), allowNull: false },
    merchantTransactionId: { type: DataTypes.STRING, allowNull: false, unique: true },
    peachReference: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
    partyAlias: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'initiated' },
    resultCode: { type: DataTypes.STRING, allowNull: true },
    resultDescription: { type: DataTypes.STRING, allowNull: true },
    rawRequest: { type: DataTypes.JSONB, allowNull: true },
    rawResponse: { type: DataTypes.JSONB, allowNull: true },
    webhookReceivedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'peach_payments',
    timestamps: true,
  });

  return PeachPayment;
};


