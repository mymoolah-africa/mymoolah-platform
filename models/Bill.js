'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Bill extends Model {
    static associate(models) {
      // Define associations here if needed
      // Bill.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  Bill.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    easyPayNumber: {
      type: DataTypes.STRING(14),
      allowNull: false,
      unique: true,
      validate: {
        len: [14, 14],
        is: /^9\d{13}$/ // Must start with 9 and be 14 digits
      }
    },
    accountNumber: {
      type: DataTypes.STRING(13),
      allowNull: false,
      comment: 'Account number portion of EasyPay number'
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount in cents (e.g., 10000 = R100.00)',
      validate: {
        min: 1
      }
    },
    minAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Minimum acceptable amount in cents'
    },
    maxAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum acceptable amount in cents'
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Bill due date (YYYY-MM-DD format)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'paid', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    billType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Type of bill (e.g., electricity, water, etc.)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Bill description'
    },
    receiverId: {
      type: DataTypes.STRING(4),
      allowNull: false,
      comment: 'EasyPay receiver ID (4 digits)'
    },
    paidAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Amount actually paid in cents'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the bill was paid'
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External transaction ID'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional bill metadata'
    }
  }, {
    sequelize,
    modelName: 'Bill',
    tableName: 'bills',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['easyPayNumber']
      },
      {
        fields: ['accountNumber']
      },
      {
        fields: ['status']
      },
      {
        fields: ['dueDate']
      },
      {
        fields: ['receiverId']
      }
    ]
  });

  return Bill;
};