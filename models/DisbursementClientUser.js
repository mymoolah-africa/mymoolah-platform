'use strict';

/**
 * DisbursementClientUser model
 * Portal user account for a disbursement client with maker-checker RBAC.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

module.exports = (sequelize, DataTypes) => {
  const DisbursementClientUser = sequelize.define('DisbursementClientUser', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'viewer',
      validate: { isIn: [['admin', 'maker', 'checker', 'viewer']] },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'disbursement_client_users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  DisbursementClientUser.associate = (models) => {
    DisbursementClientUser.belongsTo(models.DisbursementClient, {
      foreignKey: 'client_id',
      as: 'client',
    });
  };

  return DisbursementClientUser;
};
