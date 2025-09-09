'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Supplier extends Model {
    static associate(models) {
      // Define associations here
      Supplier.hasMany(models.Product, {
        foreignKey: 'supplierId',
        as: 'products'
      });
      Supplier.hasMany(models.SupplierTransaction, {
        foreignKey: 'supplierId',
        as: 'transactions'
      });
      Supplier.hasMany(models.SupplierFloat, {
        foreignKey: 'supplierId',
        as: 'floats'
      });
    }

    // Instance methods
    isActive() {
      return this.isActive === true;
    }

    getCode() {
      return this.code;
    }

    getName() {
      return this.name;
    }
  }

  Supplier.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Supplier name is required'
        },
        len: {
          args: [1, 255],
          msg: 'Supplier name must be between 1 and 255 characters'
        }
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Supplier code is required'
        },
        len: {
          args: [1, 50],
          msg: 'Supplier code must be between 1 and 50 characters'
        },
        isUppercase: {
          args: true,
          msg: 'Supplier code must be uppercase'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Supplier',
    tableName: 'suppliers',
    timestamps: true,
    indexes: [
      {
        name: 'idx_suppliers_code',
        fields: ['code']
      },
      {
        name: 'idx_suppliers_active',
        fields: ['isActive']
      }
    ],
    hooks: {
      beforeCreate: (supplier) => {
        // Sanitize and validate data
        if (supplier.name) {
          supplier.name = supplier.name.trim();
        }
        if (supplier.code) {
          supplier.code = supplier.code.trim().toUpperCase();
        }
      },
      beforeUpdate: (supplier) => {
        // Sanitize and validate data
        if (supplier.name) {
          supplier.name = supplier.name.trim();
        }
        if (supplier.code) {
          supplier.code = supplier.code.trim().toUpperCase();
        }
      }
    }
  });

  return Supplier;
};





