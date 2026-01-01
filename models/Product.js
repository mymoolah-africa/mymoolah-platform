'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // Define associations here
      Product.belongsTo(models.Supplier, {
        foreignKey: 'supplierId',
        as: 'supplier'
      });
      Product.belongsTo(models.ProductBrand, {
        foreignKey: 'brandId',
        as: 'brand'
      });
      Product.hasMany(models.ProductVariant, {
        foreignKey: 'productId',
        as: 'variants'
      });
      Product.hasMany(models.Order, {
        foreignKey: 'productId',
        as: 'orders'
      });
    }

    // Instance methods
    isAvailable() {
      return this.status === 'active';
    }

    getMinDenomination() {
      // Get from best variant
      if (this.variants && this.variants.length > 0) {
        const bestVariant = this.variants[0];
        if (bestVariant.denominations && Array.isArray(bestVariant.denominations)) {
          return Math.min(...bestVariant.denominations);
        }
      }
      return 0;
    }

    getMaxDenomination() {
      // Get from best variant
      if (this.variants && this.variants.length > 0) {
        const bestVariant = this.variants[0];
        if (bestVariant.denominations && Array.isArray(bestVariant.denominations)) {
          return Math.max(...bestVariant.denominations);
        }
      }
      return 0;
    }

    isValidDenomination(amount) {
      // Check in best variant
      if (this.variants && this.variants.length > 0) {
        const bestVariant = this.variants[0];
        if (bestVariant.denominations && Array.isArray(bestVariant.denominations)) {
          return bestVariant.denominations.includes(amount);
        }
      }
      return false;
    }

    getConstraints() {
      // Get from best variant
      if (this.variants && this.variants.length > 0) {
        const bestVariant = this.variants[0];
        return bestVariant.constraints || {};
      }
      return {};
    }
  }

  Product.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      validate: {
        notNull: {
          msg: 'Supplier ID is required'
        }
      },
      comment: 'Owning supplier for this product'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Product name is required'
        },
        len: {
          args: [1, 255],
          msg: 'Product name must be between 1 and 255 characters'
        }
      }
    },
    type: {
      type: DataTypes.ENUM('airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'cash_out'),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Product type is required'
        }
      }
    },

    brandId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'product_brands',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    supplierProductId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Supplier product ID is required'
        }
      },
      comment: 'Product ID from supplier system'
    },
    denominations: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidDenominations(value) {
          const productType = this.type;

          // Bill payment and electricity products are own-amount (no fixed denominations).
          // For these, we allow an empty array (or even null) and rely on `constraints.minAmount`/`maxAmount`.
          if (productType === 'bill_payment' || productType === 'electricity') {
            // Normalise null/undefined to an empty array for downstream code that expects an array.
            if (value == null) {
              this.setDataValue('denominations', []);
              return;
            }
            if (Array.isArray(value) && value.length === 0) {
              return;
            }
          }

          if (!Array.isArray(value)) {
            throw new Error('Denominations must be an array');
          }
          if (value.length === 0) {
            throw new Error('At least one denomination is required');
          }
          if (!value.every(amount => Number.isInteger(amount) && amount > 0)) {
            throw new Error('All denominations must be positive integers');
          }
          // Check for duplicates
          const unique = [...new Set(value)];
          if (unique.length !== value.length) {
            throw new Error('Denominations must be unique');
          }
        }
      },
      comment: 'Available denominations in cents'
    },
    constraints: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidConstraints(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Constraints must be an object');
          }
          if (value) {
            const allowedKeys = ['minAmount', 'maxAmount', 'dailyLimit', 'monthlyLimit', 'requiresRecipient'];
            const invalidKeys = Object.keys(value).filter(key => !allowedKeys.includes(key));
            if (invalidKeys.length > 0) {
              throw new Error(`Invalid constraint keys: ${invalidKeys.join(', ')}`);
            }
          }
        }
      },
      comment: 'Product constraints (min/max amounts, etc.)'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'discontinued', 'maintenance'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        notEmpty: {
          msg: 'Product status is required'
        }
      }
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether product appears in featured section'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Sort order must be non-negative'
        }
      },
      comment: 'Sort order for featured products'
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
      comment: 'Additional product metadata'
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    indexes: [
      {
        name: 'idx_products_supplier_type',
        fields: ['supplierId', 'type']
      },
      {
        name: 'idx_products_brand',
        fields: ['brandId']
      },
      {
        name: 'idx_products_featured',
        fields: ['isFeatured', 'sortOrder']
      },
      {
        name: 'idx_products_status',
        fields: ['status']
      },
      {
        name: 'idx_products_type_status',
        fields: ['type', 'status']
      }
    ],
    hooks: {
      beforeCreate: (product) => {
        // Sanitize and validate data
        if (product.name) {
          product.name = product.name.trim();
        }
        if (product.supplierProductId) {
          product.supplierProductId = product.supplierProductId.trim();
        }
        // Sort denominations for consistency
        if (product.denominations && Array.isArray(product.denominations)) {
          product.denominations.sort((a, b) => a - b);
        }
      },
      beforeUpdate: (product) => {
        // Sanitize and validate data
        if (product.name) {
          product.name = product.name.trim();
        }
        if (product.supplierProductId) {
          product.supplierProductId = product.supplierProductId.trim();
        }
        // Sort denominations for consistency
        if (product.denominations && Array.isArray(product.denominations)) {
          product.denominations.sort((a, b) => a - b);
        }
      }
    }
  });

  return Product;
};
