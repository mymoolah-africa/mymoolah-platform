'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductBrand extends Model {
    static associate(models) {
      // Define associations here
      ProductBrand.hasMany(models.Product, {
        foreignKey: 'brandId',
        as: 'products'
      });
    }
  }

  ProductBrand.init({
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
          msg: 'Brand name is required'
        },
        len: {
          args: [1, 255],
          msg: 'Brand name must be between 1 and 255 characters'
        }
      }
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'Logo URL must be a valid URL'
        }
      },
      comment: 'Brand logo URL'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Category is required'
        },
        isIn: {
          args: [['gaming', 'entertainment', 'transport', 'shopping', 'utilities', 'other']],
          msg: 'Invalid category'
        }
      },
      comment: 'Product category (gaming, entertainment, transport, etc.)'
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidTags(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Tags must be an array');
          }
          if (value && value.some(tag => typeof tag !== 'string')) {
            throw new Error('All tags must be strings');
          }
        }
      },
      comment: 'Searchable tags for the brand'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidMetadata(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Metadata must be an object');
          }
        }
      },
      comment: 'Additional brand metadata'
    }
  }, {
    sequelize,
    modelName: 'ProductBrand',
    tableName: 'product_brands',
    timestamps: true,
    indexes: [
      {
        name: 'idx_product_brands_category',
        fields: ['category']
      },
      {
        name: 'idx_product_brands_active',
        fields: ['isActive']
      }
    ],
    hooks: {
      beforeCreate: (brand) => {
        // Sanitize and validate data
        if (brand.name) {
          brand.name = brand.name.trim();
        }
        if (brand.category) {
          brand.category = brand.category.toLowerCase();
        }
      },
      beforeUpdate: (brand) => {
        // Sanitize and validate data
        if (brand.name) {
          brand.name = brand.name.trim();
        }
        if (brand.category) {
          brand.category = brand.category.toLowerCase();
        }
      }
    }
  });

  return ProductBrand;
};



