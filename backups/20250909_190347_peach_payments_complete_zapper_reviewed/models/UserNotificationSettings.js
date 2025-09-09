module.exports = (sequelize, DataTypes) => {
  const UserNotificationSettings = sequelize.define('UserNotificationSettings', {
    userId: { type: DataTypes.INTEGER, primaryKey: true },
    inAppEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    marketingEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    maintenanceEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    freezeOnBankCredit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    freezeOnWalletCredit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    soundEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    flashBell: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dndStart: { type: DataTypes.TIME, allowNull: true },
    dndEnd: { type: DataTypes.TIME, allowNull: true },
  }, {
    tableName: 'user_notification_settings',
    timestamps: true,
  });
  UserNotificationSettings.associate = (models) => {
    UserNotificationSettings.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };
  return UserNotificationSettings;
};




