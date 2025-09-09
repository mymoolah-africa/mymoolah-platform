"use strict";

module.exports = (sequelize, DataTypes) => {
  const JournalEntry = sequelize.define(
    "JournalEntry",
    {
      reference: {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true
      },
      description: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      postedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: "journal_entries",
      indexes: [{ fields: ["postedAt"] }]
    }
  );

  JournalEntry.associate = models => {
    JournalEntry.hasMany(models.JournalLine, {
      foreignKey: "entryId",
      as: "lines"
    });
  };

  return JournalEntry;
};
