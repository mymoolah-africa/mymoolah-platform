// mymoolah/models/Bill.js

module.exports = (sequelize, DataTypes) => {
  const Bill = sequelize.define('Bill', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    easyPayNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billType: {
      type: DataTypes.STRING,
      defaultValue: 'utility',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    minAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'bills',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  });

  // Add associations here if needed, e.g.:
  // Bill.associate = (models) => { ... };

  return Bill;
};