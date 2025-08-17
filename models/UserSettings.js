// mymoolah/models/UserSettings.js

module.exports = (sequelize, DataTypes) => {
  const UserSettings = sequelize.define('UserSettings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // Quick Access Services (JSON array of service IDs)
    quickAccessServices: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['send_money', 'vouchers']
    },
    // Wallet Display Settings
    showBalance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Security Settings
    biometricEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Notification Settings
    notificationsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Transaction Limits
    dailyTransactionLimit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 5000.00
    },
    monthlyTransactionLimit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 25000.00
    },
    // Privacy Settings
    shareAnalytics: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Theme/Display Settings
    darkMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Language Settings
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en'
    },
    // Currency Display
    displayCurrency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ZAR'
    }
  }, {
    tableName: 'UserSettings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId']
      }
    ]
  });

  // Associations
  UserSettings.associate = (models) => {
    UserSettings.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return UserSettings;
};
