"use strict";

module.exports = (sequelize, DataTypes) => {
  const LedgerAccount = sequelize.define(
    "LedgerAccount",
    {
      code: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      normalSide: {
        type: DataTypes.STRING(6), // 'debit' | 'credit'
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: "ledger_accounts",
      indexes: [
        { unique: true, fields: ["code"] },
        { fields: ["type"] },
        { fields: ["isActive"] }
      ]
    }
  );

  LedgerAccount.associate = models => {
    LedgerAccount.hasMany(models.JournalLine, {
      foreignKey: "accountId",
      as: "lines"
    });
  };

  return LedgerAccount;
};
