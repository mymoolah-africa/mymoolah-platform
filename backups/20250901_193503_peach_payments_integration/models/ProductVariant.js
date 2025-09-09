'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductVariant extends Model {
    static associate(models) {
      // Define associations here
      ProductVariant.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
      ProductVariant.belongsTo(models.Supplier, {
        foreignKey: 'supplierId',
        as: 'supplier'
      });
      ProductVariant.hasMany(models.Order, {
        foreignKey: 'variantId',
        as: 'orders'
      });
    }

    // Instance methods
    isAvailable() {
      return this.status === 'active';
    }

    getMinDenomination() {
      if (!this.denominations || !Array.isArray(this.denominations)) {
        return 0;
      }
      return Math.min(...this.denominations);
    }

    getMaxDenomination() {
      if (!this.denominations || !Array.isArray(this.denominations)) {
        return 0;
      }
      return Math.max(...this.denominations);
    }

    isValidDenomination(amount) {
      if (!this.denominations || !Array.isArray(this.denominations)) {
        return false;
      }
      return this.denominations.includes(amount);
    }

    getPricing() {
      return this.pricing || {};
    }

    getCommissionRate(denomination) {
      const pricing = this.getPricing();
      const commissionTiers = pricing.commissionTiers || [];
      
      // Find the appropriate commission tier for this denomination
      for (const tier of commissionTiers) {
        if (denomination >= tier.minAmount && denomination <= tier.maxAmount) {
          return tier.rate;
        }
      }
      
      return pricing.defaultCommissionRate || 0;
    }

    getFees(denomination) {
      const pricing = this.getPricing();
      return pricing.fees || {};
    }

    getTotalCost(denomination) {
      // Customer pays the denomination amount (e.g., R10.00)
      // MyMoolah earns commission from supplier
      return denomination;
    }

    getMyMoolahCommission(denomination) {
      const commissionRate = this.getCommissionRate(denomination);
      return (denomination * commissionRate) / 100;
    }

    getSupplierCost(denomination) {
      // What the supplier keeps after paying commission to MyMoolah
      const commission = this.getMyMoolahCommission(denomination);
      const fees = this.getFees(denomination);
      const totalFees = Object.values(fees).reduce((sum, fee) => sum + fee, 0);
      
      return denomination - commission - totalFees;
    }

    getMyMoolahNetCost(denomination) {
      // What MyMoolah actually pays (denomination - commission earned)
      const commission = this.getMyMoolahCommission(denomination);
      return denomination - commission;
    }

    getConstraints() {
      return this.constraints || {};
    }

    isPreferred() {
      return this.isPreferred === true;
    }
  }

  ProductVariant.init({
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
      }
    },
    supplierProductId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Supplier product ID is required'
        }
      }
    },
    denominations: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidDenominations(value) {
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
      }
    },
    pricing: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidPricing(value) {
          if (!value || typeof value !== 'object') {
            throw new Error('Pricing must be an object');
          }
          
          // Validate commission structure
          if (value.commissionTiers && !Array.isArray(value.commissionTiers)) {
            throw new Error('Commission tiers must be an array');
          }
          
          if (value.commissionTiers) {
            for (const tier of value.commissionTiers) {
              if (typeof tier.minAmount !== 'number' || typeof tier.maxAmount !== 'number' || typeof tier.rate !== 'number') {
                throw new Error('Commission tier must have minAmount, maxAmount, and rate as numbers');
              }
              if (tier.minAmount > tier.maxAmount) {
                throw new Error('Commission tier minAmount cannot be greater than maxAmount');
              }
              if (tier.rate < 0 || tier.rate > 100) {
                throw new Error('Commission rate must be between 0 and 100');
              }
            }
          }
          
          // Validate fees
          if (value.fees && typeof value.fees !== 'object') {
            throw new Error('Fees must be an object');
          }
        }
      }
    },
    constraints: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidConstraints(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Constraints must be an object');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'discontinued', 'maintenance'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        notEmpty: {
          msg: 'Product variant status is required'
        }
      }
    },
    isPreferred: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
      }
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
      }
    }
  }, {
    sequelize,
    modelName: 'ProductVariant',
    tableName: 'product_variants',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['productId', 'supplierId'],
        name: 'idx_product_variants_product_supplier'
      },
      {
        fields: ['supplierId', 'status'],
        name: 'idx_product_variants_supplier_status'
      },
      {
        fields: ['isPreferred'],
        name: 'idx_product_variants_preferred'
      }
    ]
  });

  return ProductVariant;
};
