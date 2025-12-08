'use strict';

module.exports = (sequelize, DataTypes) => {
  const RecentPayerHide = sequelize.define('RecentPayerHide', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    requesterUserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    context: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'request-money'
    },
    hiddenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'RecentPayerHides',
    timestamps: true,
    indexes: [
      { fields: ['requesterUserId'] },
      { fields: ['payerUserId'] },
      { unique: true, fields: ['requesterUserId', 'payerUserId', 'context'] }
    ]
  });

  RecentPayerHide.associate = (models) => {
    RecentPayerHide.belongsTo(models.User, { foreignKey: 'requesterUserId', as: 'requester' });
    RecentPayerHide.belongsTo(models.User, { foreignKey: 'payerUserId', as: 'payer' });
  };

  return RecentPayerHide;
};

