module.exports = (sequelize, DataTypes) => {
  const PeachPayment = sequelize.define('PeachPayment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.ENUM('payshap_rpp', 'payshap_rtp'), allowNull: false },
    merchantTransactionId: { type: DataTypes.STRING, allowNull: false, unique: true },
    peachReference: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
    // PayShap payment method fields
    paymentMethod: { type: DataTypes.ENUM('proxy', 'account_number'), allowNull: false, comment: 'PayShap proxy (mobile) or direct bank account' },
    partyAlias: { type: DataTypes.STRING, allowNull: true, comment: 'Mobile number (proxy) or bank account number' },
    bankCode: { type: DataTypes.STRING, allowNull: true, comment: 'Bank code when using account number' },
    bankName: { type: DataTypes.STRING, allowNull: true, comment: 'Bank name when using account number' },
    // Business context fields
    businessContext: { type: DataTypes.ENUM('wallet', 'client_integration'), allowNull: false, defaultValue: 'wallet', comment: 'Wallet user or client integration payment' },
    clientId: { type: DataTypes.STRING, allowNull: true, comment: 'Client ID for integration payments' },
    employeeId: { type: DataTypes.STRING, allowNull: true, comment: 'Employee ID for client payments' },
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


