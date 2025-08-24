module.exports = (sequelize, DataTypes) => {
  const Beneficiary = sequelize.define('Beneficiary', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Owner user who made the payment',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'SA mobile number (27XXXXXXXXX) for MyMoolah or bank account number',
    },
    accountType: {
      type: DataTypes.ENUM('mymoolah', 'bank'),
      allowNull: false,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastPaidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    timesPaid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'beneficiaries',
    indexes: [
      { fields: ['userId'] },
      { unique: false, fields: ['userId', 'identifier', 'accountType'] },
    ],
  });

  Beneficiary.associate = (models) => {
    Beneficiary.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Beneficiary;
};




