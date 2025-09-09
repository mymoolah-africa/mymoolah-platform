module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM('txn_wallet_credit','txn_bank_credit','maintenance','promo'), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: true },
    severity: { type: DataTypes.ENUM('info','warning','critical'), allowNull: false, defaultValue: 'info' },
    category: { type: DataTypes.ENUM('transaction','maintenance','marketing'), allowNull: false, defaultValue: 'transaction' },
    payload: { type: DataTypes.JSON, allowNull: true },
    freezeUntilViewed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    source: { type: DataTypes.ENUM('system','admin','job'), allowNull: false, defaultValue: 'system' },
    readAt: { type: DataTypes.DATE, allowNull: true },
    acknowledgedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'notifications',
    timestamps: true,
  });
  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };
  return Notification;
};




