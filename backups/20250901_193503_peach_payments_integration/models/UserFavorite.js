'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserFavorite extends Model {
    static associate(models) {
      // No associations for now to avoid startup issues
    }
  }

  UserFavorite.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'UserFavorite',
    tableName: 'user_favorites',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'productId'],
        name: 'user_favorites_user_product_unique'
      },
      {
        fields: ['userId'],
        name: 'user_favorites_user_id_idx'
      }
    ]
  });

  return UserFavorite;
};
