module.exports = (sequelize, DataTypes) => {
  const PaymentRequest = sequelize.define('PaymentRequest', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requesterUserId: { type: DataTypes.INTEGER, allowNull: false },
    payerUserId: { type: DataTypes.INTEGER, allowNull: false },
    requesterWalletId: { type: DataTypes.STRING, allowNull: true },
    payerWalletId: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('requested', 'viewed', 'approved', 'declined', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'requested'
    },
    notificationId: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    declinedAt: { type: DataTypes.DATE, allowNull: true },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Optimistic locking version number - increments on each update'
    },
  }, {
    tableName: 'payment_requests',
    timestamps: true,
    version: true, // Enable optimistic locking in Sequelize
  });
  PaymentRequest.associate = (models) => {
    PaymentRequest.belongsTo(models.User, { foreignKey: 'requesterUserId', as: 'requester' });
    PaymentRequest.belongsTo(models.User, { foreignKey: 'payerUserId', as: 'payer' });
  };
  return PaymentRequest;
};


