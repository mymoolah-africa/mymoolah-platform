module.exports = (sequelize, DataTypes) => {
  const RecurringPaymentRequest = sequelize.define('RecurringPaymentRequest', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requesterUserId: { type: DataTypes.INTEGER, allowNull: false },
    payerUserId: { type: DataTypes.INTEGER, allowNull: false },
    requesterWalletId: { type: DataTypes.STRING, allowNull: false },
    payerWalletId: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
    description: { type: DataTypes.TEXT, allowNull: true },
    frequency: { type: DataTypes.ENUM('daily','weekly','monthly'), allowNull: false },
    dayOfWeek: { type: DataTypes.INTEGER, allowNull: true },
    dayOfMonth: { type: DataTypes.INTEGER, allowNull: true },
    startAt: { type: DataTypes.DATE, allowNull: false },
    endOption: { type: DataTypes.ENUM('never','count','until'), allowNull: false, defaultValue: 'never' },
    occurrencesRemaining: { type: DataTypes.INTEGER, allowNull: true },
    untilDate: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('active','paused','cancelled','completed'), allowNull: false, defaultValue: 'active' },
    lastRunAt: { type: DataTypes.DATE, allowNull: true },
    nextRunAt: { type: DataTypes.DATE, allowNull: false },
  }, {
    tableName: 'recurring_payment_requests',
    timestamps: true,
  });
  return RecurringPaymentRequest;
};


