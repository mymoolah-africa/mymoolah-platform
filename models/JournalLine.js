"use strict";

module.exports = (sequelize, DataTypes) => {
  const JournalLine = sequelize.define(
    "JournalLine",
    {
      entryId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      accountId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      dc: {
        type: DataTypes.STRING(6), // 'debit' | 'credit'
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
      },
      memo: {
        type: DataTypes.STRING(512),
        allowNull: true
      }
    },
    {
      tableName: "journal_lines",
      indexes: [
        { fields: ["entryId"] },
        { fields: ["accountId"] },
        { fields: ["dc"] }
      ]
    }
  );

  JournalLine.associate = models => {
    JournalLine.belongsTo(models.JournalEntry, {
      foreignKey: "entryId",
      as: "entry"
    });
    JournalLine.belongsTo(models.LedgerAccount, {
      foreignKey: "accountId",
      as: "account"
    });
  };

  return JournalLine;
};
