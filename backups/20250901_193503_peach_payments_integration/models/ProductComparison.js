'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductComparison extends Model {
    static associate(models) {
      // Define associations here
      ProductComparison.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
      ProductComparison.belongsTo(models.ProductVariant, {
        foreignKey: 'bestVariantId',
        as: 'bestVariant'
      });
    }

    // Instance methods
    getComparisonData() {
      return this.comparisonData || {};
    }

    getBestVariant() {
      return this.bestVariant;
    }

    isStale(maxAgeMinutes = 15) {
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
      return Date.now() - new Date(this.lastUpdated).getTime() > maxAge;
    }
  }

  ProductComparison.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notNull: {
          msg: 'Product ID is required'
        }
      }
    },
    denomination: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Denomination is required'
        },
        min: {
          args: [1],
          msg: 'Denomination must be positive'
        }
      }
    },
    comparisonData: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidComparisonData(value) {
          if (!value || typeof value !== 'object') {
            throw new Error('Comparison data must be an object');
          }
          
          // Validate required fields
          if (!value.productId || !value.denomination || !value.variants) {
            throw new Error('Comparison data must contain productId, denomination, and variants');
          }
          
          if (!Array.isArray(value.variants)) {
            throw new Error('Variants must be an array');
          }
        }
      }
    },
    bestVariantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        notNull: {
          msg: 'Last updated timestamp is required'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'ProductComparison',
    tableName: 'product_comparisons',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['productId', 'denomination'],
        name: 'idx_product_comparisons_product_denomination'
      },
      {
        fields: ['lastUpdated'],
        name: 'idx_product_comparisons_last_updated'
      }
    ]
  });

  return ProductComparison;
};



